package br.com.sosfamilia.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import br.com.sosfamilia.data.CadastroLocal
import br.com.sosfamilia.data.SosDatabase
import br.com.sosfamilia.data.SosRepository
import br.com.sosfamilia.localizacao.Distancia
import br.com.sosfamilia.localizacao.Geocodificador
import br.com.sosfamilia.localizacao.LocalizacaoAtual
import br.com.sosfamilia.localizacao.LocalizacaoHelper
import br.com.sosfamilia.util.FotosContato
import br.com.sosfamilia.util.SenhaCuidador
import br.com.sosfamilia.util.Telefone
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SosViewModel(aplicativo: Application) : AndroidViewModel(aplicativo) {

    private val repositorio = SosRepository(SosDatabase.criar(aplicativo))
    private val geocodificador = Geocodificador(aplicativo)
    private val localizacao = LocalizacaoHelper(aplicativo)

    private val gps = MutableStateFlow(LeituraGps(agoraMillis = System.currentTimeMillis()))
    private var escuta: Job? = null
    private var geocodeJob: Job? = null
    private var hashSenha: String = ""

    val estado: StateFlow<EstadoPainel> = combine(
        repositorio.observarPerfil(),
        repositorio.observarContatos(),
        gps
    ) { perfil, contatos, leitura ->
        PainelMontador.montar(perfil, contatos, leitura)
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        EstadoPainel()
    )

    init {
        viewModelScope.launch {
            repositorio.observarPerfil().collect { perfil ->
                hashSenha = perfil?.senhaCuidadorHash.orEmpty()
            }
        }
        viewModelScope.launch {
            while (isActive) {
                delay(15_000)
                gps.update {
                    it.copy(
                        agoraMillis = System.currentTimeMillis(),
                        ligado = if (it.permitido) localizacao.gpsLigado() else it.ligado
                    )
                }
            }
        }
    }

    fun definirPermissao(concedida: Boolean) {
        if (!concedida) {
            pararGps()
            gps.update { it.copy(permitido = false, agoraMillis = System.currentTimeMillis()) }
            return
        }
        gps.update {
            it.copy(
                permitido = true,
                ligado = localizacao.gpsLigado(),
                agoraMillis = System.currentTimeMillis()
            )
        }
        acompanharGps()
    }

    fun senhaConfere(digitada: String): Boolean = SenhaCuidador.confere(digitada, hashSenha)

    fun pararGps() {
        escuta?.cancel()
        escuta = null
    }

    fun salvarCadastro(cadastro: CadastroLocal, aoTerminar: (String?) -> Unit) {
        val nova = cadastro.novaSenha?.trim().orEmpty()
        if (nova.isNotEmpty() && !SenhaCuidador.valida(nova)) {
            aoTerminar("A senha precisa ter 4 números.")
            return
        }
        val semTelefone = cadastro.contatos.any { contato ->
            contato.nome.isNotBlank() && Telefone.paraDiscagem(contato.telefone).isBlank()
        }
        if (semTelefone) {
            aoTerminar("Todo familiar com nome precisa de um telefone.")
            return
        }
        viewModelScope.launch {
            repositorio.salvarCadastro(cadastro.copy(novaSenha = nova.ifBlank { null }))
            aoTerminar(null)
        }
    }

    fun guardarFoto(uri: Uri, ordem: Int, aoConcluir: (String?) -> Unit) {
        viewModelScope.launch {
            val caminho = withContext(Dispatchers.IO) {
                FotosContato.salvar(getApplication(), uri, ordem)
            }
            aoConcluir(caminho)
        }
    }

    private fun acompanharGps() {
        if (!localizacao.temPermissao()) {
            gps.update { it.copy(permitido = false) }
            return
        }
        localizacao.ultimaConhecida()?.let { aplicarPonto(it) }
        if (escuta?.isActive == true) return
        escuta = localizacao.acompanhar(viewModelScope) { aplicarPonto(it) }
    }

    private fun aplicarPonto(ponto: LocalizacaoAtual) {
        val anterior = gps.value
        val mudouPouco = anterior.latitude != null &&
            anterior.longitude != null &&
            !anterior.enderecoResolvidoAgora.isNullOrBlank() &&
            Distancia.metros(
                anterior.latitude,
                anterior.longitude,
                ponto.latitude,
                ponto.longitude
            ) < 30.0
        gps.update {
            it.copy(
                permitido = true,
                ligado = localizacao.gpsLigado(),
                latitude = ponto.latitude,
                longitude = ponto.longitude,
                precisaoMetros = ponto.precisaoMetros,
                instanteMillis = ponto.instanteMillis,
                agoraMillis = System.currentTimeMillis(),
                geocodeFalhou = if (mudouPouco) it.geocodeFalhou else false
            )
        }
        if (mudouPouco) return
        geocodeJob?.cancel()
        geocodeJob = viewModelScope.launch {
            val endereco = geocodificador.enderecoDe(ponto.latitude, ponto.longitude)
            if (!isActive) return@launch
            if (endereco == null) {
                gps.update {
                    it.copy(geocodeFalhou = true, agoraMillis = System.currentTimeMillis())
                }
            } else {
                repositorio.guardarLocalizacao(endereco, ponto.latitude, ponto.longitude)
                gps.update {
                    it.copy(
                        enderecoResolvidoAgora = endereco,
                        geocodeFalhou = false,
                        agoraMillis = System.currentTimeMillis()
                    )
                }
            }
        }
    }
}
