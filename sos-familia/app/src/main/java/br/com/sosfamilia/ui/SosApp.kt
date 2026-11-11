package br.com.sosfamilia.ui

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import br.com.sosfamilia.data.ContatoEmergencia
import br.com.sosfamilia.ui.ajustes.AjustesScreen
import br.com.sosfamilia.ui.ajustes.TelaSenha
import br.com.sosfamilia.ui.painel.PainelScreen
import br.com.sosfamilia.util.Chamadas
import br.com.sosfamilia.util.MensagemAjuda

private enum class Tela { PAINEL, SENHA, AJUSTES }

@Composable
fun SosApp(viewModel: SosViewModel) {
    val estado by viewModel.estado.collectAsState()
    val contexto = LocalContext.current
    val ciclo = LocalLifecycleOwner.current
    var tela by rememberSaveable { mutableStateOf(Tela.PAINEL) }
    var senhaErrada by rememberSaveable { mutableStateOf(false) }
    var pediuPermissao by rememberSaveable { mutableStateOf(false) }

    val pedido = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { resultado ->
        viewModel.definirPermissao(resultado.values.any { concedida -> concedida })
    }

    DisposableEffect(ciclo, contexto) {
        val observador = LifecycleEventObserver { _, evento ->
            when (evento) {
                Lifecycle.Event.ON_RESUME -> viewModel.definirPermissao(temPermissao(contexto))
                Lifecycle.Event.ON_STOP -> viewModel.pararGps()
                else -> Unit
            }
        }
        ciclo.lifecycle.addObserver(observador)
        onDispose { ciclo.lifecycle.removeObserver(observador) }
    }

    val janelaView = LocalView.current
    DisposableEffect(tela) {
        val janela = (janelaView.context as? Activity)?.window
        if (tela == Tela.PAINEL) {
            janela?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            janela?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        onDispose { janela?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }

    BackHandler(enabled = tela != Tela.PAINEL) {
        tela = Tela.PAINEL
        senhaErrada = false
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        when (tela) {
            Tela.PAINEL -> PainelScreen(
                estado = estado,
                aoLigarAmbulancia = {
                    val abriu = Chamadas.abrirDiscador(contexto, estado.numeroAmbulancia)
                    if (!abriu) avisar(contexto, "Não consegui abrir o telefone deste celular.")
                },
                aoLigarContato = { contato -> ligar(contexto, contato) },
                aoWhatsappContato = { contato -> whatsapp(contexto, estado, contato) },
                aoPedirLocalizacao = {
                    val activity = contexto as Activity
                    val podeExplicar = ActivityCompat.shouldShowRequestPermissionRationale(
                        activity,
                        Manifest.permission.ACCESS_FINE_LOCATION
                    )
                    if (pediuPermissao && !podeExplicar && !temPermissao(contexto)) {
                        contexto.startActivity(
                            Intent(
                                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                Uri.fromParts("package", contexto.packageName, null)
                            )
                        )
                    } else {
                        pediuPermissao = true
                        pedido.launch(
                            arrayOf(
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            )
                        )
                    }
                },
                aoAbrirAjustesGps = {
                    contexto.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS))
                },
                aoAbrirAjustes = {
                    senhaErrada = false
                    tela = if (estado.temSenhaCuidador) Tela.SENHA else Tela.AJUSTES
                }
            )

            Tela.SENHA -> TelaSenha(
                errou = senhaErrada,
                onSenhaCompleta = { digitada ->
                    if (viewModel.senhaConfere(digitada)) {
                        senhaErrada = false
                        tela = Tela.AJUSTES
                    } else {
                        senhaErrada = true
                    }
                },
                onVoltar = {
                    senhaErrada = false
                    tela = Tela.PAINEL
                }
            )

            Tela.AJUSTES -> AjustesScreen(
                estado = estado,
                onVoltar = { tela = Tela.PAINEL },
                onSalvar = { cadastro, aoTerminar ->
                    viewModel.salvarCadastro(cadastro) { mensagem ->
                        if (mensagem == null) {
                            avisar(contexto, "Salvo neste celular.")
                        }
                        aoTerminar(mensagem)
                    }
                },
                onGuardarFoto = { uri, ordem, aoConcluir ->
                    viewModel.guardarFoto(uri, ordem, aoConcluir)
                }
            )
        }
    }
}

private fun temPermissao(contexto: Context): Boolean {
    val fina = ContextCompat.checkSelfPermission(
        contexto,
        Manifest.permission.ACCESS_FINE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    val aproximada = ContextCompat.checkSelfPermission(
        contexto,
        Manifest.permission.ACCESS_COARSE_LOCATION
    ) == PackageManager.PERMISSION_GRANTED
    return fina || aproximada
}

private fun ligar(contexto: Context, contato: ContatoEmergencia) {
    val abriu = Chamadas.abrirDiscador(contexto, contato.telefone)
    if (!abriu) avisar(contexto, "Não consegui abrir o telefone deste celular.")
}

private fun whatsapp(contexto: Context, estado: EstadoPainel, contato: ContatoEmergencia) {
    val mensagem = MensagemAjuda.montar(
        nome = estado.nome,
        endereco = estado.endereco,
        latitude = estado.latitude,
        longitude = estado.longitude,
        tipoSanguineo = estado.tipoSanguineo,
        observacoes = estado.observacoes
    )
    val abriu = Chamadas.abrirWhatsapp(contexto, contato.telefone, mensagem)
    if (abriu) return
    avisar(contexto, "Não encontrei o WhatsApp. Abrindo o telefone.")
    ligar(contexto, contato)
}

private fun avisar(contexto: Context, texto: String) {
    Toast.makeText(contexto, texto, Toast.LENGTH_LONG).show()
}
