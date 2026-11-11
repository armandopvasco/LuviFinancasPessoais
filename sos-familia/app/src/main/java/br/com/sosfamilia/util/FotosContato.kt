package br.com.sosfamilia.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

object FotosContato {
    fun salvar(contexto: Context, origem: Uri, ordem: Int): String? {
        val pasta = File(contexto.filesDir, "fotos").apply { mkdirs() }
        val destino = File(pasta, "contato_${ordem}_${System.currentTimeMillis()}.jpg")
        val original = contexto.contentResolver.openInputStream(origem)?.use { entrada ->
            BitmapFactory.decodeStream(entrada)
        } ?: return null
        val reduzida = reduzir(original, 480)
        FileOutputStream(destino).use { saida ->
            reduzida.compress(Bitmap.CompressFormat.JPEG, 85, saida)
        }
        return destino.absolutePath
    }

    fun apagarSeExistir(caminho: String?) {
        if (caminho.isNullOrBlank()) return
        runCatching { File(caminho).delete() }
    }

    private fun reduzir(origem: Bitmap, ladoMaximo: Int): Bitmap {
        val maiorLado = max(origem.width, origem.height)
        if (maiorLado <= ladoMaximo) return origem
        val fator = ladoMaximo.toFloat() / maiorLado
        val largura = (origem.width * fator).toInt().coerceAtLeast(1)
        val altura = (origem.height * fator).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(origem, largura, altura, true)
    }
}
