package br.com.sosfamilia

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.sosfamilia.ui.SosApp
import br.com.sosfamilia.ui.SosViewModel
import br.com.sosfamilia.ui.TemaSosFamilia

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(0xFFFFFFFF.toInt(), 0xFF1A1A1A.toInt()),
            navigationBarStyle = SystemBarStyle.light(0xFFFFFFFF.toInt(), 0xFF1A1A1A.toInt())
        )
        setContent {
            val modelo: SosViewModel = viewModel()
            TemaSosFamilia {
                SosApp(modelo)
            }
        }
    }
}
