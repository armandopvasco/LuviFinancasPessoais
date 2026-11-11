package br.com.sosfamilia.data

import androidx.room.withTransaction
import br.com.sosfamilia.util.FotosContato
import br.com.sosfamilia.util.SenhaCuidador
import br.com.sosfamilia.util.Telefone
import kotlinx.coroutines.flow.Flow

class SosRepository(private val banco: SosDatabase) {

    fun observarPerfil(): Flow<Perfil?> = banco.perfilDao().observar()

    fun observarContatos(): Flow<List<ContatoEmergencia>> = banco.contatoDao().observar()

    suspend fun salvarCadastro(cadastro: CadastroLocal) {
        val fotosAntigas = (1..3).associateWith { ordem ->
            banco.contatoDao().obter(ordem)?.fotoCaminho
        }
        banco.withTransaction {
            val atual = banco.perfilDao().obter()
            val senha = when {
                cadastro.removerSenha -> ""
                cadastro.novaSenha.isNullOrBlank() -> atual?.senhaCuidadorHash.orEmpty()
                else -> SenhaCuidador.hash(cadastro.novaSenha)
            }
            banco.perfilDao().salvar(
                Perfil(
                    id = 1,
                    nome = cadastro.nome.trim().take(80),
                    tipoSanguineo = cadastro.tipoSanguineo.trim().take(20),
                    observacoesMedicas = cadastro.observacoesMedicas.trim().take(400),
                    numeroAmbulancia = Telefone.paraDiscagem(cadastro.numeroAmbulancia)
                        .ifBlank { "192" }
                        .take(16),
                    senhaCuidadorHash = senha,
                    chavePix = cadastro.chavePix.trim().take(120),
                    ultimoEndereco = atual?.ultimoEndereco.orEmpty(),
                    ultimaLatitude = atual?.ultimaLatitude,
                    ultimaLongitude = atual?.ultimaLongitude
                )
            )
            cadastro.contatos.forEach { contato ->
                val nome = contato.nome.trim().take(40)
                val telefone = Telefone.paraDiscagem(contato.telefone).take(20)
                if (nome.isBlank() && telefone.isBlank()) {
                    banco.contatoDao().remover(contato.ordem)
                } else {
                    banco.contatoDao().salvar(
                        contato.copy(
                            nome = nome.ifBlank { "Familiar" },
                            telefone = telefone,
                            parentesco = contato.parentesco.trim().take(30)
                        )
                    )
                }
            }
        }
        cadastro.contatos.forEach { contato ->
            val novaFoto = if (contato.nome.isBlank() && Telefone.paraDiscagem(contato.telefone).isBlank()) {
                null
            } else {
                contato.fotoCaminho
            }
            val antiga = fotosAntigas[contato.ordem]
            if (!antiga.isNullOrBlank() && antiga != novaFoto) {
                FotosContato.apagarSeExistir(antiga)
            }
        }
    }

    /** Guarda a última rua resolvida para continuar legível quando a rede cair. */
    suspend fun guardarLocalizacao(endereco: String, latitude: Double, longitude: Double) {
        banco.withTransaction {
            val atual = banco.perfilDao().obter() ?: Perfil()
            banco.perfilDao().salvar(
                atual.copy(
                    ultimoEndereco = endereco,
                    ultimaLatitude = latitude,
                    ultimaLongitude = longitude
                )
            )
        }
    }
}
