package br.com.sosfamilia.ui.painel

import android.content.Context
import android.graphics.BitmapFactory
import android.os.SystemClock
import android.view.accessibility.AccessibilityManager
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.sosfamilia.data.ContatoEmergencia
import br.com.sosfamilia.localizacao.Coordenadas
import br.com.sosfamilia.ui.AzulLigar
import br.com.sosfamilia.ui.CremeFicha
import br.com.sosfamilia.ui.EstadoPainel
import br.com.sosfamilia.ui.PretoTexto
import br.com.sosfamilia.ui.TemaSosFamilia
import br.com.sosfamilia.ui.VerdeWhatsapp
import br.com.sosfamilia.ui.VermelhoEmergencia
import br.com.sosfamilia.util.Telefone
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Tela única do idoso.
 *
 * O botão vermelho fica preso no meio: o texto de cima e os familiares de baixo
 * rolam nas suas metades, mas a ambulância não sai da tela.
 * Um toque simples num familiar não liga. Isso evita chamada no bolso.
 * Segurar o nome liga. Dois toques abrem o WhatsApp. Os botões grandes repetem
 * esses gestos, porque gesto escondido é difícil de lembrar.
 */
@Composable
fun PainelScreen(
    estado: EstadoPainel,
    aoLigarAmbulancia: () -> Unit,
    aoLigarContato: (ContatoEmergencia) -> Unit,
    aoWhatsappContato: (ContatoEmergencia) -> Unit,
    aoPedirLocalizacao: () -> Unit,
    aoAbrirAjustesGps: () -> Unit,
    aoAbrirAjustes: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    val topo = rememberScrollState()
    val baixo = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(topo)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = estado.nome.ifBlank { "S.O.S. Família" },
                color = PretoTexto,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 40.sp
            )
            BlocoEndereco(estado)
            if (estado.latitude != null && estado.longitude != null) {
                Text(
                    text = "Leia para a ambulância:",
                    color = PretoTexto,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = Coordenadas.leitura(estado.latitude, estado.longitude),
                    color = PretoTexto,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 34.sp
                )
                if (estado.precisaoMetros != null) {
                    Text(
                        text = "Precisão de cerca de ${estado.precisaoMetros} metros",
                        color = PretoTexto,
                        fontSize = 18.sp
                    )
                }
            }
            if (estado.avisoLocal.isNotBlank()) {
                Text(
                    text = estado.avisoLocal,
                    color = PretoTexto,
                    fontSize = 22.sp,
                    lineHeight = 28.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            if (!estado.gpsPermitido) {
                BotaoPreto("AUTORIZAR LOCALIZAÇÃO", aoPedirLocalizacao)
            } else if (!estado.gpsLigado) {
                BotaoPreto("LIGAR O GPS", aoAbrirAjustesGps)
            }
            FichaMedica(estado.tipoSanguineo, estado.observacoes)
        }

        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
            Button(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    aoLigarAmbulancia()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 112.dp),
                shape = RoundedCornerShape(24.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = VermelhoEmergencia,
                    contentColor = Color.White
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "LIGAR PARA AMBULÂNCIA",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        lineHeight = 32.sp
                    )
                    Text(
                        text = estado.numeroAmbulancia,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Text(
                text = "O telefone vai abrir no ${estado.numeroAmbulancia}. Depois toque no botão verde.",
                color = PretoTexto,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                lineHeight = 26.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 6.dp)
            )
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(baixo)
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Segure o nome para ligar. Dois toques no nome abrem o WhatsApp. Os botões fazem a mesma coisa.",
                color = PretoTexto,
                fontSize = 18.sp,
                lineHeight = 24.sp
            )
            if (estado.contatos.isEmpty()) {
                Text(
                    text = "Nenhum familiar cadastrado. Peça para segurarem Ajustes do cuidador e gravarem os telefones.",
                    color = PretoTexto,
                    fontSize = 22.sp,
                    lineHeight = 30.sp,
                    fontWeight = FontWeight.Bold
                )
            } else {
                estado.contatos.forEach { contato ->
                    CartaoContato(
                        contato = contato,
                        aoLigar = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            aoLigarContato(contato)
                        },
                        aoWhatsapp = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            aoWhatsappContato(contato)
                        }
                    )
                }
            }
            SegurarParaAbrir(aoAbrirAjustes)
        }
    }
}

@Composable
private fun BlocoEndereco(estado: EstadoPainel) {
    val titulo = when {
        estado.endereco.isBlank() -> "Onde você está"
        estado.enderecoEhUltimoConhecido -> "Último endereço conhecido"
        else -> "Onde você está"
    }
    Text(text = titulo, color = PretoTexto, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    Text(
        text = estado.endereco.ifBlank { "Ainda sem endereço" },
        color = PretoTexto,
        fontSize = 32.sp,
        fontWeight = FontWeight.Bold,
        lineHeight = 40.sp
    )
}

@Composable
private fun FichaMedica(tipoSanguineo: String, observacoes: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = CremeFicha,
        border = BorderStroke(3.dp, PretoTexto),
        shadowElevation = 0.dp
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                text = "Sangue: ${tipoSanguineo.ifBlank { "não informado" }}",
                color = PretoTexto,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Alergias e observações: ${observacoes.ifBlank { "não informadas" }}",
                color = PretoTexto,
                fontSize = 22.sp,
                lineHeight = 30.sp
            )
        }
    }
}

@Composable
private fun CartaoContato(
    contato: ContatoEmergencia,
    aoLigar: () -> Unit,
    aoWhatsapp: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(3.dp, PretoTexto),
        shadowElevation = 0.dp
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 88.dp)
                    .pointerInput(contato.telefone) {
                        detectTapGestures(
                            onLongPress = { aoLigar() },
                            onDoubleTap = { aoWhatsapp() }
                        )
                    },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                AvatarContato(contato.nome, contato.fotoCaminho, contato.ordem)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = contato.nome,
                        color = PretoTexto,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 34.sp
                    )
                    if (contato.parentesco.isNotBlank()) {
                        Text(text = contato.parentesco, color = PretoTexto, fontSize = 20.sp)
                    }
                    Text(
                        text = Telefone.exibir(contato.telefone),
                        color = PretoTexto,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            BotaoCheio("LIGAR", AzulLigar, aoLigar)
            BotaoCheio("WHATSAPP", VerdeWhatsapp, aoWhatsapp)
        }
    }
}

@Composable
private fun BotaoCheio(rotulo: String, cor: Color, aoClicar: () -> Unit) {
    Button(
        onClick = aoClicar,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = cor, contentColor = Color.White)
    ) {
        Text(text = rotulo, fontSize = 22.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun BotaoPreto(rotulo: String, aoClicar: () -> Unit) {
    Button(
        onClick = aoClicar,
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = PretoTexto, contentColor = Color.White)
    ) {
        Text(text = rotulo, fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
    }
}

@Composable
private fun AvatarContato(nome: String, caminho: String?, ordem: Int) {
    val bitmap by produceState<ImageBitmap?>(initialValue = null, caminho) {
        value = withContext(Dispatchers.IO) {
            if (caminho.isNullOrBlank()) null
            else BitmapFactory.decodeFile(caminho)?.asImageBitmap()
        }
    }
    val imagem = bitmap
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(corDoContato(ordem)),
        contentAlignment = Alignment.Center
    ) {
        if (imagem != null) {
            Image(
                bitmap = imagem,
                contentDescription = "Foto de $nome",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            val letra = nome.trim().firstOrNull()?.uppercaseChar()?.toString() ?: ordem.toString()
            Text(text = letra, color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
        }
    }
}

private fun corDoContato(ordem: Int): Color {
    return when (ordem) {
        1 -> AzulLigar
        2 -> VerdeWhatsapp
        else -> Color(0xFF4A148C)
    }
}

@Composable
private fun SegurarParaAbrir(onLiberar: () -> Unit) {
    val contexto = LocalContext.current
    val talkback = remember(contexto) { talkbackAtivo(contexto) }
    if (talkback) {
        BotaoPreto("Abrir ajustes do cuidador", onLiberar)
        return
    }

    var progresso by remember { mutableFloatStateOf(0f) }
    val escopo = rememberCoroutineScope()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 72.dp)
            .padding(vertical = 8.dp)
            .semantics(mergeDescendants = true) {
                role = Role.Button
                contentDescription = "Ajustes do cuidador. Segure por 2 segundos."
            }
            .pointerInput(onLiberar) {
                detectTapGestures(
                    onPress = {
                        val atualizacao = escopo.launch {
                            val inicio = SystemClock.uptimeMillis()
                            while (isActive) {
                                val decorrido = SystemClock.uptimeMillis() - inicio
                                progresso = (decorrido / 2_000f).coerceAtMost(1f)
                                if (decorrido >= 2_000) {
                                    onLiberar()
                                    break
                                }
                                delay(32)
                            }
                        }
                        tryAwaitRelease()
                        atualizacao.cancel()
                        progresso = 0f
                    }
                )
            },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Ajustes do cuidador",
            color = PretoTexto,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Segure por 2 segundos",
            color = PretoTexto,
            fontSize = 18.sp,
            textAlign = TextAlign.Center
        )
        if (progresso > 0f) {
            LinearProgressIndicator(
                progress = { progresso },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp)
                    .height(10.dp),
                color = PretoTexto,
                trackColor = Color(0xFFE6E6E6)
            )
        }
    }
}

private fun talkbackAtivo(contexto: Context): Boolean {
    val gerente = contexto.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
    return gerente.isEnabled && gerente.isTouchExplorationEnabled
}

@Preview(showBackground = true, widthDp = 360, heightDp = 740)
@Composable
private fun PreviewPainel() {
    TemaSosFamilia {
        PainelScreen(
            estado = estadoExemplo(),
            aoLigarAmbulancia = {},
            aoLigarContato = {},
            aoWhatsappContato = {},
            aoPedirLocalizacao = {},
            aoAbrirAjustesGps = {},
            aoAbrirAjustes = {}
        )
    }
}

@Preview(name = "Letras grandes", showBackground = true, widthDp = 360, heightDp = 740, fontScale = 1.3f)
@Composable
private fun PreviewPainelLetrasGrandes() {
    TemaSosFamilia {
        PainelScreen(
            estado = estadoExemplo(),
            aoLigarAmbulancia = {},
            aoLigarContato = {},
            aoWhatsappContato = {},
            aoPedirLocalizacao = {},
            aoAbrirAjustesGps = {},
            aoAbrirAjustes = {}
        )
    }
}

private fun estadoExemplo(): EstadoPainel {
    return EstadoPainel(
        nome = "Maria Souza",
        tipoSanguineo = "O+",
        observacoes = "Alergia a dipirona",
        numeroAmbulancia = "192",
        endereco = "Rua das Flores, 120\nCentro\nCampinas - SP",
        latitude = -22.9056,
        longitude = -47.0608,
        precisaoMetros = 12,
        contatos = listOf(
            ContatoEmergencia(1, "Ana", "11988887777", "Filha", null),
            ContatoEmergencia(2, "Paulo", "11977776666", "Filho", null)
        ),
        gpsPermitido = true,
        gpsLigado = true
    )
}
