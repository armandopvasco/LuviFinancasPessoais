package br.com.sosfamilia.ui

import br.com.sosfamilia.data.ContatoEmergencia
import br.com.sosfamilia.data.Perfil
import br.com.sosfamilia.localizacao.Distancia
import kotlin.math.roundToInt

data class LeituraGps(
    val permitido: Boolean = false,
    val ligado: Boolean = true,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val precisaoMetros: Float? = null,
    val instanteMillis: Long? = null,
    val agoraMillis: Long = 0L,
    val enderecoResolvidoAgora: String? = null,
    val geocodeFalhou: Boolean = false
)

data class EstadoPainel(
    val nome: String = "",
    val tipoSanguineo: String = "",
    val observacoes: String = "",
    val numeroAmbulancia: String = "192",
    val temSenhaCuidador: Boolean = false,
    val chavePix: String = "",
    val endereco: String = "",
    val enderecoEhUltimoConhecido: Boolean = false,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val precisaoMetros: Int? = null,
    val avisoLocal: String = "",
    val contatos: List<ContatoEmergencia> = emptyList(),
    val gpsPermitido: Boolean = false,
    val gpsLigado: Boolean = true,
    val cadastroCarregado: Boolean = false
)

object PainelMontador {
    /** Cerca de um quarteirão. Dentro disso, a rua guardada ainda serve. */
    const val RAIO_CONFIAVEL_METROS = 150.0
    private const val DOIS_MINUTOS_MS = 120_000L

    fun montar(perfil: Perfil?, contatos: List<ContatoEmergencia>, gps: LeituraGps): EstadoPainel {
        val (endereco, ultimo) = resolverEndereco(perfil, gps)
        return EstadoPainel(
            nome = perfil?.nome.orEmpty(),
            tipoSanguineo = perfil?.tipoSanguineo.orEmpty(),
            observacoes = perfil?.observacoesMedicas.orEmpty(),
            numeroAmbulancia = perfil?.numeroAmbulancia?.ifBlank { "192" } ?: "192",
            temSenhaCuidador = !perfil?.senhaCuidadorHash.isNullOrBlank(),
            chavePix = perfil?.chavePix.orEmpty(),
            endereco = endereco,
            enderecoEhUltimoConhecido = ultimo,
            latitude = gps.latitude,
            longitude = gps.longitude,
            precisaoMetros = gps.precisaoMetros?.roundToInt(),
            avisoLocal = aviso(gps, ultimo, endereco.isNotBlank()),
            contatos = contatos.sortedBy { it.ordem },
            gpsPermitido = gps.permitido,
            gpsLigado = gps.ligado,
            cadastroCarregado = true
        )
    }

    private fun resolverEndereco(perfil: Perfil?, gps: LeituraGps): Pair<String, Boolean> {
        val fresco = gps.enderecoResolvidoAgora?.trim().orEmpty()
        if (fresco.isNotBlank()) return fresco to false

        val cache = perfil?.ultimoEndereco?.trim().orEmpty()
        if (cache.isBlank()) return "" to false

        val latCache = perfil?.ultimaLatitude
        val lngCache = perfil?.ultimaLongitude
        val lat = gps.latitude
        val lng = gps.longitude
        val perto = if (lat != null && lng != null && latCache != null && lngCache != null) {
            Distancia.metros(lat, lng, latCache, lngCache) <= RAIO_CONFIAVEL_METROS
        } else {
            false
        }
        return cache to !perto
    }

    private fun aviso(gps: LeituraGps, enderecoEhUltimo: Boolean, temEndereco: Boolean): String {
        if (!gps.permitido) {
            return "Autorize a localização para mostrar onde você está."
        }
        if (gps.latitude == null) {
            return if (gps.ligado) {
                "Procurando o GPS…"
            } else {
                "O GPS do celular está desligado."
            }
        }
        if (!gps.ligado) {
            return "O GPS do celular está desligado. A posição abaixo pode não ser a atual."
        }
        val idade = gps.instanteMillis?.let { gps.agoraMillis - it }
        if (idade != null && idade > DOIS_MINUTOS_MS) {
            return "Esta posição tem mais de 2 minutos. Aguarde o GPS atualizar."
        }
        if (enderecoEhUltimo) {
            return "Este endereço pode estar desatualizado. Prefira as coordenadas."
        }
        if (!temEndereco && gps.geocodeFalhou) {
            return "Sem internet para o nome da rua. Leia as coordenadas em voz alta."
        }
        if (!temEndereco) {
            return "Buscando o nome da rua…"
        }
        return ""
    }
}
