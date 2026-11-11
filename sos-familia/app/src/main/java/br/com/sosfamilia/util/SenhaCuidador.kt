package br.com.sosfamilia.util

import java.security.MessageDigest

/**
 * Trava simples contra toque sem querer. Não é cofre: o banco está no mesmo celular.
 * A senha não fica em texto puro; só o hash SHA-256.
 */
object SenhaCuidador {
    fun valida(senha: String): Boolean = senha.length == 4 && senha.all { it.isDigit() }

    fun hash(senha: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(senha.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    fun confere(digitada: String, hashGuardado: String): Boolean {
        if (hashGuardado.isBlank()) return true
        if (!valida(digitada)) return false
        return hash(digitada) == hashGuardado
    }
}
