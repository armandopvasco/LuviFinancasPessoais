package br.com.sosfamilia

import br.com.sosfamilia.data.ContatoEmergencia
import br.com.sosfamilia.data.Perfil
import br.com.sosfamilia.localizacao.Coordenadas
import br.com.sosfamilia.localizacao.Distancia
import br.com.sosfamilia.localizacao.EnderecoLegivel
import br.com.sosfamilia.ui.LeituraGps
import br.com.sosfamilia.ui.PainelMontador
import br.com.sosfamilia.util.MensagemAjuda
import br.com.sosfamilia.util.SenhaCuidador
import br.com.sosfamilia.util.Telefone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RegrasDoAppTest {

    @Test
    fun whatsappGanhaDdiDoBrasil() {
        assertEquals("5511988887777", Telefone.paraWhatsapp("(11) 98888-7777"))
        assertEquals("551133334444", Telefone.paraWhatsapp("11 3333-4444"))
        assertEquals("5511988887777", Telefone.paraWhatsapp("+55 11 98888-7777"))
    }

    @Test
    fun discagemMantemEmergenciaCurta() {
        assertEquals("192", Telefone.paraDiscagem("192"))
        assertEquals("(11) 98888-7777", Telefone.exibir("11988887777"))
    }

    @Test
    fun mensagemComecaComAFrasePedidaELevaCoordenada() {
        val texto = MensagemAjuda.montar(
            nome = "Maria",
            endereco = "Rua das Flores, 120",
            latitude = -23.55,
            longitude = -46.63,
            tipoSanguineo = "O+",
            observacoes = "Dipirona"
        )
        assertTrue(texto.contains(MensagemAjuda.FRASE_PADRAO))
        assertTrue(texto.contains("https://maps.google.com/?q=-23.55000,-46.63000"))
        assertTrue(texto.contains("Tipo sanguíneo: O+"))
        assertEquals("-23.55000,-46.63000", Coordenadas.ponto(-23.55, -46.63))
    }

    @Test
    fun enderecoEmLinhasCurtas() {
        val texto = EnderecoLegivel.montar(
            rua = "Rua das Flores",
            numero = "120",
            bairro = "Centro",
            cidade = "Campinas",
            estado = "SP",
            cep = "13010-000",
            linhaPronta = null
        )
        assertEquals("Rua das Flores, 120\nCentro\nCampinas - SP\n13010-000", texto)
        assertEquals("Rua pronta", EnderecoLegivel.montar(null, null, null, null, null, null, "Rua pronta"))
    }

    @Test
    fun senhaConfereERecusaOutroNumero() {
        val hash = SenhaCuidador.hash("1234")
        assertTrue(SenhaCuidador.confere("1234", hash))
        assertFalse(SenhaCuidador.confere("9999", hash))
        assertFalse(SenhaCuidador.valida("12"))
    }

    @Test
    fun distanciaZeroNoMesmoPonto() {
        assertEquals(0.0, Distancia.metros(-22.9, -47.06, -22.9, -47.06), 0.01)
        val umGrau = Distancia.metros(0.0, 0.0, 1.0, 0.0)
        assertTrue(umGrau in 110_000.0..112_000.0)
    }

    @Test
    fun semPermissaoPedeAutorizacaoEAmbulanciaPadraoE192() {
        val estado = PainelMontador.montar(null, emptyList(), LeituraGps(permitido = false))
        assertEquals("192", estado.numeroAmbulancia)
        assertTrue(estado.cadastroCarregado)
        assertEquals("Autorize a localização para mostrar onde você está.", estado.avisoLocal)
    }

    @Test
    fun enderecoPertoDoCacheContinuaValendoSemRede() {
        val perfil = Perfil(
            nome = "Maria",
            ultimoEndereco = "Rua das Flores, 120",
            ultimaLatitude = -22.9,
            ultimaLongitude = -47.06
        )
        val estado = PainelMontador.montar(
            perfil,
            listOf(ContatoEmergencia(1, "Ana", "11988887777", "Filha")),
            LeituraGps(
                permitido = true,
                latitude = -22.9004,
                longitude = -47.06,
                instanteMillis = 1_000,
                agoraMillis = 2_000,
                geocodeFalhou = true
            )
        )
        assertEquals("Rua das Flores, 120", estado.endereco)
        assertFalse(estado.enderecoEhUltimoConhecido)
        assertEquals("", estado.avisoLocal)
    }

    @Test
    fun enderecoLongeDoCacheFicaMarcadoComoUltimo() {
        val perfil = Perfil(
            ultimoEndereco = "Rua das Flores, 120",
            ultimaLatitude = -22.9,
            ultimaLongitude = -47.06
        )
        val estado = PainelMontador.montar(
            perfil,
            emptyList(),
            LeituraGps(
                permitido = true,
                latitude = -22.902,
                longitude = -47.06,
                instanteMillis = 1_000,
                agoraMillis = 2_000,
                geocodeFalhou = true
            )
        )
        assertTrue(estado.enderecoEhUltimoConhecido)
        assertEquals(
            "Este endereço pode estar desatualizado. Prefira as coordenadas.",
            estado.avisoLocal
        )
    }

    @Test
    fun posicaoVelhaAvisaParaEsperarOGps() {
        val estado = PainelMontador.montar(
            null,
            emptyList(),
            LeituraGps(
                permitido = true,
                latitude = -22.9,
                longitude = -47.06,
                instanteMillis = 0,
                agoraMillis = 130_000,
                enderecoResolvidoAgora = "Rua das Flores, 120"
            )
        )
        assertEquals(
            "Esta posição tem mais de 2 minutos. Aguarde o GPS atualizar.",
            estado.avisoLocal
        )
        assertFalse(estado.enderecoEhUltimoConhecido)
    }
}
