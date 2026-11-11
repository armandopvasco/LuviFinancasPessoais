package br.com.sosfamilia.util

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

object Chamadas {
    /** Abre o discador com o número preenchido. A pessoa ainda toca no botão verde. */
    fun abrirDiscador(contexto: Context, numero: String): Boolean {
        val limpo = Telefone.paraDiscagem(numero)
        if (limpo.isBlank()) return false
        val intento = Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", limpo, null))
        return iniciar(contexto, intento)
    }

    fun abrirWhatsapp(contexto: Context, telefone: String, mensagem: String): Boolean {
        val numero = Telefone.paraWhatsapp(telefone)
        if (numero.length < 12) return false
        val uri = Uri.parse("https://wa.me/$numero?text=${Uri.encode(mensagem)}")
        val intento = Intent(Intent.ACTION_VIEW, uri)
        return iniciar(contexto, intento)
    }

    private fun iniciar(contexto: Context, intento: Intent): Boolean {
        return try {
            contexto.startActivity(intento)
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }
}
