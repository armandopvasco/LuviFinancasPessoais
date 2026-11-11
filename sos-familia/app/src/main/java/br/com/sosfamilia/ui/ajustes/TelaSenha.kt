package br.com.sosfamilia.ui.ajustes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.sosfamilia.ui.PretoTexto
import br.com.sosfamilia.ui.VermelhoEmergencia

@Composable
fun TelaSenha(
    errou: Boolean,
    onSenhaCompleta: (String) -> Unit,
    onVoltar: () -> Unit
) {
    var digitos by rememberSaveable { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Senha do cuidador",
            color = PretoTexto,
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Text(
            text = "Digite os 4 números",
            color = PretoTexto,
            fontSize = 22.sp,
            textAlign = TextAlign.Center
        )
        Text(
            text = "●".repeat(digitos.length) + "○".repeat(4 - digitos.length),
            color = PretoTexto,
            fontSize = 36.sp
        )
        if (errou) {
            Text(
                text = "Senha incorreta. Tente de novo.",
                color = VermelhoEmergencia,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
        }
        listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←").chunked(3).forEach { linha ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                linha.forEach { tecla ->
                    if (tecla.isEmpty()) {
                        Spacer(modifier = Modifier.size(88.dp))
                    } else {
                        Button(
                            onClick = {
                                val proximo = if (tecla == "←") {
                                    digitos.dropLast(1)
                                } else {
                                    (digitos + tecla).take(4)
                                }
                                if (proximo.length == 4 && tecla != "←") {
                                    digitos = ""
                                    onSenhaCompleta(proximo)
                                } else {
                                    digitos = proximo
                                }
                            },
                            modifier = Modifier.size(88.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = PretoTexto,
                                contentColor = Color.White
                            ),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text(text = tecla, fontSize = 32.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        OutlinedButton(
            onClick = onVoltar,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp),
            border = BorderStroke(2.dp, PretoTexto),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text(text = "VOLTAR", color = PretoTexto, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        }
    }
}
