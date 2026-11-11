package br.com.sosfamilia.localizacao

/**
 * Monta um endereço em linhas curtas, para ler ao atendente da ambulância.
 *
 * Rua das Flores, 120
 * Centro
 * Campinas - SP
 * 13010-000
 */
object EnderecoLegivel {
    fun montar(
        rua: String?,
        numero: String?,
        bairro: String?,
        cidade: String?,
        estado: String?,
        cep: String?,
        linhaPronta: String?
    ): String {
        val ruaNumero = juntar(rua, numero, ", ")
        val cidadeEstado = juntar(cidade, estado, " - ")
        val partes = listOf(ruaNumero, bairro.limpo(), cidadeEstado, cep.limpo())
            .filter { it.isNotBlank() }
        if (partes.isNotEmpty()) return partes.joinToString("\n")
        return linhaPronta.limpo()
    }

    private fun juntar(primeira: String?, segunda: String?, separador: String): String {
        return listOf(primeira.limpo(), segunda.limpo())
            .filter { it.isNotBlank() }
            .joinToString(separador)
    }
}

private fun String?.limpo(): String = this?.trim().orEmpty()
