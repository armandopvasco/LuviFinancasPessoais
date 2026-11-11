package br.com.sosfamilia.util

import br.com.sosfamilia.localizacao.Coordenadas

object MensagemAjuda {
    const val FRASE_PADRAO = "Preciso de ajuda, veja minha localização."

    fun montar(
        nome: String,
        endereco: String?,
        latitude: Double?,
        longitude: Double?,
        tipoSanguineo: String,
        observacoes: String
    ): String {
        val linhas = mutableListOf<String>()
        val nomeLimpo = nome.trim()
        if (nomeLimpo.isNotEmpty()) linhas += nomeLimpo
        linhas += FRASE_PADRAO
        val enderecoLimpo = endereco?.replace("\n", ", ")?.trim().orEmpty()
        if (enderecoLimpo.isNotEmpty()) linhas += "Endereço: $enderecoLimpo"
        if (latitude != null && longitude != null) {
            val ponto = Coordenadas.ponto(latitude, longitude)
            linhas += "Coordenadas: $ponto"
            linhas += "Mapa: https://maps.google.com/?q=$ponto"
        }
        if (tipoSanguineo.isNotBlank()) linhas += "Tipo sanguíneo: ${tipoSanguineo.trim()}"
        if (observacoes.isNotBlank()) linhas += "Alergias e observações: ${observacoes.trim()}"
        return linhas.joinToString("\n")
    }
}
