package br.com.sosfamilia.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Até três familiares. A ordem (1, 2 ou 3) é a chave, no lugar de um id solto,
 * para o formulário sempre mostrar os mesmos três lugares.
 */
@Entity(tableName = "contato")
data class ContatoEmergencia(
    @PrimaryKey val ordem: Int,
    val nome: String,
    val telefone: String,
    val parentesco: String,
    val fotoCaminho: String? = null
)
