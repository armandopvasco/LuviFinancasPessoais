package br.com.sosfamilia.util

object Telefone {
    fun apenasDigitos(telefone: String): String = telefone.filter { it.isDigit() }

    fun paraDiscagem(telefone: String): String {
        return telefone.filter { it.isDigit() || it == '+' || it == '*' || it == '#' }
    }

    /**
     * O link do WhatsApp exige o código do país.
     * Telefone brasileiro de 10 ou 11 dígitos recebe o 55.
     */
    fun paraWhatsapp(telefone: String): String {
        val digitos = apenasDigitos(telefone).trimStart('0')
        return when {
            digitos.startsWith("55") && digitos.length >= 12 -> digitos
            digitos.length in 10..11 -> "55$digitos"
            else -> digitos
        }
    }

    fun exibir(telefone: String): String {
        val digitos = apenasDigitos(telefone)
        return when (digitos.length) {
            11 -> "(${digitos.substring(0, 2)}) ${digitos.substring(2, 7)}-${digitos.substring(7)}"
            10 -> "(${digitos.substring(0, 2)}) ${digitos.substring(2, 6)}-${digitos.substring(6)}"
            else -> telefone.trim()
        }
    }
}
