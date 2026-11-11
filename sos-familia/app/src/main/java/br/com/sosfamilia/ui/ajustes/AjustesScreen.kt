package br.com.sosfamilia.ui.ajustes

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import br.com.sosfamilia.data.CadastroLocal
import br.com.sosfamilia.data.ContatoEmergencia
import br.com.sosfamilia.ui.EstadoPainel
import br.com.sosfamilia.ui.PretoTexto
import br.com.sosfamilia.ui.VermelhoEmergencia
import br.com.sosfamilia.util.Apoio
import br.com.sosfamilia.util.FotosContato

private val tiposSanguineos = listOf("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Não sei")

@Composable
fun AjustesScreen(
    estado: EstadoPainel,
    onVoltar: () -> Unit,
    onSalvar: (CadastroLocal, (String?) -> Unit) -> Unit,
    onGuardarFoto: (Uri, Int, (String?) -> Unit) -> Unit
) {
    val contexto = LocalContext.current
    var nome by remember { mutableStateOf(estado.nome) }
    var tipo by remember { mutableStateOf(estado.tipoSanguineo) }
    var observacoes by remember { mutableStateOf(estado.observacoes) }
    var ambulancia by remember { mutableStateOf(estado.numeroAmbulancia) }
    var chavePix by remember { mutableStateOf(estado.chavePix.ifBlank { Apoio.CHAVE_PIX }) }
    var senha by remember { mutableStateOf("") }
    var removerSenha by remember { mutableStateOf(false) }
    var contatos by remember { mutableStateOf(tresSlots(estado.contatos)) }
    var erro by remember { mutableStateOf<String?>(null) }
    var salvando by remember { mutableStateOf(false) }
    var copiou by remember { mutableStateOf(false) }
    var ordemFoto by remember { mutableIntStateOf(1) }
    val salvou = remember { mutableStateOf(false) }
    val fotosNovas = remember { mutableListOf<String>() }
    var originais by remember { mutableStateOf(estado.contatos.associate { it.ordem to it.fotoCaminho }) }
    var formularioPronto by remember { mutableStateOf(estado.cadastroCarregado) }
    val contatosAtuais = rememberUpdatedState(contatos)

    LaunchedEffect(estado.cadastroCarregado) {
        if (estado.cadastroCarregado && !formularioPronto) {
            nome = estado.nome
            tipo = estado.tipoSanguineo
            observacoes = estado.observacoes
            ambulancia = estado.numeroAmbulancia
            chavePix = estado.chavePix.ifBlank { Apoio.CHAVE_PIX }
            contatos = tresSlots(estado.contatos)
            originais = estado.contatos.associate { it.ordem to it.fotoCaminho }
            formularioPronto = true
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            if (!salvou.value) {
                fotosNovas.forEach { FotosContato.apagarSeExistir(it) }
            }
        }
    }

    val seletor = rememberLauncherForActivityResult(PickVisualMedia()) { uri ->
        val ordem = ordemFoto
        if (uri != null) {
            onGuardarFoto(uri, ordem) { caminho ->
                if (caminho == null) {
                    erro = "Não consegui guardar a foto. Tente outra."
                } else {
                    definirFoto(ordem, caminho, contatosAtuais.value, originais, fotosNovas) { atualizados ->
                        contatos = atualizados
                    }
                }
            }
        }
    }

    LaunchedEffect(chavePix) { copiou = false }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .imePadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OutlinedButton(
            onClick = onVoltar,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp),
            border = BorderStroke(2.dp, PretoTexto),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text("VOLTAR", color = PretoTexto, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }

        if (!formularioPronto) {
            Text(
                text = "Abrindo o cadastro salvo neste celular…",
                color = PretoTexto,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 36.sp
            )
            return@Column
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Ajustes do cuidador",
                color = PretoTexto,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Esta tela é para o familiar configurar. Os dados ficam só neste celular. Se trocar de aparelho, é preciso cadastrar de novo.",
                color = PretoTexto,
                fontSize = 20.sp,
                lineHeight = 28.sp
            )
            CampoGrande("Nome do idoso", nome, { nome = it.take(80) })
            Text("Tipo sanguíneo", color = PretoTexto, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            tiposSanguineos.chunked(3).forEach { linha ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    linha.forEach { opcao ->
                        BotaoOpcao(
                            texto = opcao,
                            selecionado = tipo == opcao,
                            modifier = Modifier.weight(1f),
                            onClick = { tipo = if (tipo == opcao) "" else opcao }
                        )
                    }
                }
            }
            CampoGrande(
                rotulo = "Alergias e observações",
                valor = observacoes,
                onChange = { observacoes = it.take(400) },
                umaLinha = false,
                minLinhas = 3
            )
            CampoGrande(
                rotulo = "Telefone da ambulância",
                valor = ambulancia,
                onChange = { ambulancia = it.take(16) },
                teclado = KeyboardType.Phone
            )
            Text(
                text = "No Brasil, a ambulância do SAMU é 192.",
                color = PretoTexto,
                fontSize = 18.sp
            )

            contatos.forEach { contato ->
                EditorContato(
                    contato = contato,
                    onChange = { atualizado ->
                        contatos = contatos.map { if (it.ordem == atualizado.ordem) atualizado else it }
                    },
                    onEscolherFoto = {
                        ordemFoto = contato.ordem
                        seletor.launch(PickVisualMediaRequest(PickVisualMedia.ImageOnly))
                    },
                    onApagar = {
                        val foto = contato.fotoCaminho
                        if (foto != null && foto != originais[contato.ordem]) {
                            FotosContato.apagarSeExistir(foto)
                            fotosNovas.remove(foto)
                        }
                        contatos = contatos.map {
                            if (it.ordem == contato.ordem) {
                                ContatoEmergencia(contato.ordem, "", "", "", null)
                            } else {
                                it
                            }
                        }
                    }
                )
            }

            Text("Senha do cuidador", color = PretoTexto, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text(
                text = "Opcional. Quatro números para ninguém alterar o cadastro sem querer.",
                color = PretoTexto,
                fontSize = 18.sp,
                lineHeight = 24.sp
            )
            CampoGrande(
                rotulo = if (estado.temSenhaCuidador) "Nova senha de 4 números" else "Criar senha de 4 números",
                valor = senha,
                onChange = { senha = it.filter { digito -> digito.isDigit() }.take(4) },
                teclado = KeyboardType.NumberPassword,
                senha = true
            )
            if (estado.temSenhaCuidador) {
                BotaoOpcao(
                    texto = if (removerSenha) "A SENHA SERÁ REMOVIDA" else "REMOVER SENHA",
                    selecionado = removerSenha,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { removerSenha = !removerSenha }
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Apoie o desenvolvedor",
                color = PretoTexto,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Este aplicativo é gratuito e não tem anúncios. Ele não envia os dados da família para nenhum servidor. Se quiser agradecer, a doação é voluntária.",
                color = PretoTexto,
                fontSize = 20.sp,
                lineHeight = 28.sp
            )
            CampoGrande(
                rotulo = "Chave Pix",
                valor = chavePix,
                onChange = { chavePix = it.take(120) }
            )
            val chaveEfetiva = chavePix.ifBlank { Apoio.CHAVE_PIX }
            if (chaveEfetiva.isNotBlank()) {
                Button(
                    onClick = {
                        val gerente = contexto.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        gerente.setPrimaryClip(ClipData.newPlainText("Chave Pix", chaveEfetiva))
                        copiou = true
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 72.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PretoTexto,
                        contentColor = Color.White
                    )
                ) {
                    Text("COPIAR CHAVE PIX", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                }
                if (copiou) {
                    Text(
                        text = "Chave Pix copiada.",
                        color = PretoTexto,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            } else {
                Text(
                    text = "Ainda não há chave Pix. Digite a sua acima e toque em salvar, ou coloque em Apoio.kt antes de gerar o aplicativo.",
                    color = PretoTexto,
                    fontSize = 18.sp,
                    lineHeight = 24.sp
                )
            }
            Text(
                text = "Toque em SALVAR para guardar neste celular.",
                color = PretoTexto,
                fontSize = 18.sp
            )
        }

        if (!erro.isNullOrBlank()) {
            Text(
                text = erro.orEmpty(),
                color = VermelhoEmergencia,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Button(
            onClick = {
                salvando = true
                erro = null
                onSalvar(
                    CadastroLocal(
                        nome = nome,
                        tipoSanguineo = tipo,
                        observacoesMedicas = observacoes,
                        numeroAmbulancia = ambulancia,
                        chavePix = chavePix,
                        novaSenha = senha,
                        removerSenha = removerSenha,
                        contatos = contatos
                    )
                ) { mensagem ->
                    salvando = false
                    if (mensagem == null) {
                        salvou.value = true
                        onVoltar()
                    } else {
                        erro = mensagem
                    }
                }
            },
            enabled = !salvando,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 72.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = PretoTexto,
                contentColor = Color.White
            )
        ) {
            Text("SALVAR NESTE CELULAR", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
    }
}

private fun definirFoto(
    ordem: Int,
    caminho: String,
    contatos: List<ContatoEmergencia>,
    originais: Map<Int, String?>,
    fotosNovas: MutableList<String>,
    publicar: (List<ContatoEmergencia>) -> Unit
) {
    val atual = contatos.first { it.ordem == ordem }
    val anterior = atual.fotoCaminho
    if (anterior != null && anterior != originais[ordem] && anterior != caminho) {
        FotosContato.apagarSeExistir(anterior)
        fotosNovas.remove(anterior)
    }
    fotosNovas.add(caminho)
    publicar(contatos.map { if (it.ordem == ordem) it.copy(fotoCaminho = caminho) else it })
}

@Composable
private fun EditorContato(
    contato: ContatoEmergencia,
    onChange: (ContatoEmergencia) -> Unit,
    onEscolherFoto: () -> Unit,
    onApagar: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Familiar ${contato.ordem}",
            color = PretoTexto,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold
        )
        CampoGrande("Nome", contato.nome, { onChange(contato.copy(nome = it.take(40))) })
        CampoGrande(
            rotulo = "Telefone",
            valor = contato.telefone,
            onChange = { onChange(contato.copy(telefone = it.take(20))) },
            teclado = KeyboardType.Phone
        )
        CampoGrande(
            rotulo = "Parentesco",
            valor = contato.parentesco,
            onChange = { onChange(contato.copy(parentesco = it.take(30))) }
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            BotaoOpcao("FOTO", false, Modifier.weight(1f), onEscolherFoto)
            BotaoOpcao("APAGAR", false, Modifier.weight(1f), onApagar)
        }
        if (!contato.fotoCaminho.isNullOrBlank()) {
            Text("Foto escolhida.", color = PretoTexto, fontSize = 18.sp)
        }
    }
}

@Composable
private fun CampoGrande(
    rotulo: String,
    valor: String,
    onChange: (String) -> Unit,
    teclado: KeyboardType = KeyboardType.Text,
    umaLinha: Boolean = true,
    minLinhas: Int = 1,
    senha: Boolean = false
) {
    OutlinedTextField(
        value = valor,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(rotulo, fontSize = 18.sp) },
        textStyle = TextStyle(fontSize = 22.sp, color = PretoTexto),
        singleLine = umaLinha,
        minLines = if (umaLinha) 1 else minLinhas,
        keyboardOptions = KeyboardOptions(keyboardType = teclado),
        visualTransformation = if (senha) PasswordVisualTransformation() else VisualTransformation.None,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = PretoTexto,
            unfocusedTextColor = PretoTexto,
            focusedBorderColor = PretoTexto,
            unfocusedBorderColor = PretoTexto,
            focusedLabelColor = PretoTexto,
            unfocusedLabelColor = PretoTexto,
            cursorColor = PretoTexto
        )
    )
}

@Composable
private fun BotaoOpcao(
    texto: String,
    selecionado: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = 56.dp),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(2.dp, PretoTexto),
        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 8.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selecionado) PretoTexto else Color.White,
            contentColor = if (selecionado) Color.White else PretoTexto
        )
    ) {
        Text(text = texto, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

private fun tresSlots(contatos: List<ContatoEmergencia>): List<ContatoEmergencia> {
    return (1..3).map { ordem ->
        contatos.firstOrNull { it.ordem == ordem }
            ?: ContatoEmergencia(ordem = ordem, nome = "", telefone = "", parentesco = "")
    }
}
