package br.com.sosfamilia.localizacao

import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

object Distancia {
    private const val RAIO_TERRA_METROS = 6_371_000.0

    fun metros(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val origem = Math.toRadians(lat1)
        val destino = Math.toRadians(lat2)
        val a = sin(dLat / 2).pow(2) + cos(origem) * cos(destino) * sin(dLon / 2).pow(2)
        return 2 * RAIO_TERRA_METROS * asin(sqrt(a))
    }
}
