package br.com.sosfamilia.localizacao

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import kotlin.math.abs

object Coordenadas {
    /** Formato internacional, com ponto, para o link do mapa. */
    fun ponto(latitude: Double, longitude: Double): String {
        return String.format(Locale.US, "%.5f,%.5f", latitude, longitude)
    }

    /**
     * Texto para ler em voz alta. O sinal e a palavra (sul/oeste) vão juntos
     * porque o sinal de menos some fácil numa tela e numa ligação.
     */
    fun leitura(latitude: Double, longitude: Double): String {
        val formato = DecimalFormat(
            "0.00000",
            DecimalFormatSymbols(Locale.forLanguageTag("pt-BR"))
        )
        val sulOuNorte = if (latitude < 0) "sul" else "norte"
        val oesteOuLeste = if (longitude < 0) "oeste" else "leste"
        val lat = formato.format(abs(latitude))
        val lng = formato.format(abs(longitude))
        return "Latitude $lat $sulOuNorte\nLongitude $lng $oesteOuLeste"
    }
}
