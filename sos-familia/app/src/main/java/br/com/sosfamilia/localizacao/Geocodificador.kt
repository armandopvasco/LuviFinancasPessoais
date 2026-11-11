package br.com.sosfamilia.localizacao

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume

/**
 * Transforma latitude e longitude em rua, bairro e cidade.
 *
 * O ponto GPS já chega sem internet. Esta tradução usa o geocodificador do
 * Android, que na maioria dos aparelhos consulta a rede. Se ela falhar, o
 * método devolve null e a tela continua mostrando os números da coordenada.
 * O último endereço que deu certo fica salvo no Room para a próxima abertura.
 */
class Geocodificador(private val contexto: Context) {

    suspend fun enderecoDe(latitude: Double, longitude: Double): String? = withContext(Dispatchers.IO) {
        if (!Geocoder.isPresent()) return@withContext null
        val geocoder = Geocoder(contexto, Locale.forLanguageTag("pt-BR"))
        val enderecos = try {
            if (Build.VERSION.SDK_INT >= 33) {
                withTimeoutOrNull(8_000) {
                    buscarModerno(geocoder, latitude, longitude)
                }.orEmpty()
            } else {
                @Suppress("DEPRECATION")
                geocoder.getFromLocation(latitude, longitude, 1).orEmpty()
            }
        } catch (cancelamento: kotlinx.coroutines.CancellationException) {
            throw cancelamento
        } catch (_: Exception) {
            emptyList()
        }
        enderecos.firstOrNull()?.let(::deAddress)?.takeIf { it.isNotBlank() }
    }

    private suspend fun buscarModerno(
        geocoder: Geocoder,
        latitude: Double,
        longitude: Double
    ): List<Address> = suspendCancellableCoroutine { continuacao ->
        geocoder.getFromLocation(
            latitude,
            longitude,
            1,
            object : Geocoder.GeocodeListener {
                override fun onGeocode(addresses: MutableList<Address>) {
                    if (continuacao.isActive) continuacao.resume(addresses)
                }

                override fun onError(errorMessage: String?) {
                    if (continuacao.isActive) continuacao.resume(emptyList())
                }
            }
        )
    }
}

private fun deAddress(endereco: Address): String {
    val linha = if (endereco.maxAddressLineIndex >= 0) endereco.getAddressLine(0) else null
    return EnderecoLegivel.montar(
        rua = endereco.thoroughfare,
        numero = endereco.subThoroughfare,
        bairro = endereco.subLocality,
        cidade = endereco.locality ?: endereco.subAdminArea,
        estado = endereco.adminArea,
        cep = endereco.postalCode,
        linhaPronta = linha
    )
}
