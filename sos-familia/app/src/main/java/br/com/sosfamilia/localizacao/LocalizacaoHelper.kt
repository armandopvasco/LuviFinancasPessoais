package br.com.sosfamilia.localizacao

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.launch
import java.util.concurrent.Executor
import java.util.function.Consumer

data class LocalizacaoAtual(
    val latitude: Double,
    val longitude: Double,
    val precisaoMetros: Float?,
    val instanteMillis: Long
)

/**
 * Lê o GPS pelo serviço do Android, sem biblioteca do Google Play.
 * O satélite não precisa de internet. Se o GPS estiver desligado, tenta a rede do celular.
 */
class LocalizacaoHelper(private val contexto: Context) {

    private val gerenciador =
        contexto.getSystemService(Context.LOCATION_SERVICE) as LocationManager

    fun temPermissao(): Boolean {
        val fina = ContextCompat.checkSelfPermission(
            contexto,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val aproximada = ContextCompat.checkSelfPermission(
            contexto,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fina || aproximada
    }

    fun gpsLigado(): Boolean {
        val gps = runCatching {
            gerenciador.isProviderEnabled(LocationManager.GPS_PROVIDER)
        }.getOrDefault(false)
        val rede = runCatching {
            gerenciador.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }.getOrDefault(false)
        return gps || rede
    }

    @SuppressLint("MissingPermission")
    fun ultimaConhecida(): LocalizacaoAtual? {
        if (!temPermissao()) return null
        val provedores = listOf(
            LocationManager.GPS_PROVIDER,
            LocationManager.NETWORK_PROVIDER,
            LocationManager.PASSIVE_PROVIDER
        )
        return provedores
            .mapNotNull { provedor ->
                runCatching { gerenciador.getLastKnownLocation(provedor) }.getOrNull()
            }
            .maxByOrNull { it.time }
            ?.paraAtual()
    }

    @SuppressLint("MissingPermission")
    fun acompanhar(escopo: CoroutineScope, aoReceber: (LocalizacaoAtual) -> Unit): Job {
        return escopo.launch {
            if (!temPermissao()) return@launch
            val provedor = provedorPreferido() ?: return@launch
            val ouvinte = LocationListener { local -> aoReceber(local.paraAtual()) }
            gerenciador.requestLocationUpdates(
                provedor,
                3_000L,
                5f,
                ouvinte,
                Looper.getMainLooper()
            )
            pedirLeituraImediata(provedor, aoReceber)
            try {
                awaitCancellation()
            } finally {
                gerenciador.removeUpdates(ouvinte)
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun pedirLeituraImediata(provedor: String, aoReceber: (LocalizacaoAtual) -> Unit) {
        if (Build.VERSION.SDK_INT < 30) return
        val executor = Executor { comando ->
            android.os.Handler(Looper.getMainLooper()).post(comando)
        }
        gerenciador.getCurrentLocation(
            provedor,
            null,
            executor,
            Consumer { local ->
                if (local != null) aoReceber(local.paraAtual())
            }
        )
    }

    private fun provedorPreferido(): String? {
        val gpsLigado = runCatching {
            gerenciador.isProviderEnabled(LocationManager.GPS_PROVIDER)
        }.getOrDefault(false)
        if (gpsLigado) return LocationManager.GPS_PROVIDER
        val redeLigada = runCatching {
            gerenciador.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }.getOrDefault(false)
        return if (redeLigada) LocationManager.NETWORK_PROVIDER else null
    }
}

private fun Location.paraAtual(): LocalizacaoAtual {
    return LocalizacaoAtual(
        latitude = latitude,
        longitude = longitude,
        precisaoMetros = if (hasAccuracy()) accuracy else null,
        instanteMillis = time
    )
}
