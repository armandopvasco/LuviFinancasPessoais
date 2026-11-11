package br.com.sosfamilia.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.sp

val VermelhoEmergencia = Color(0xFFC62828)
val PretoTexto = Color(0xFF1A1A1A)
val VerdeWhatsapp = Color(0xFF0B5F2A)
val AzulLigar = Color(0xFF0D47A1)
val CremeFicha = Color(0xFFFFF4CC)

/**
 * Tema claro fixo, preto no branco. O modo escuro automático do celular
 * costuma baixar o contraste justo na hora em que a pessoa precisa ler.
 */
@Composable
fun TemaSosFamilia(conteudo: @Composable () -> Unit) {
    val cores = lightColorScheme(
        primary = VermelhoEmergencia,
        onPrimary = Color.White,
        background = Color.White,
        onBackground = PretoTexto,
        surface = Color.White,
        onSurface = PretoTexto
    )
    MaterialTheme(
        colorScheme = cores,
        typography = Typography(
            bodyLarge = TextStyle(fontSize = 22.sp, lineHeight = 30.sp, color = PretoTexto)
        ),
        content = conteudo
    )
}
