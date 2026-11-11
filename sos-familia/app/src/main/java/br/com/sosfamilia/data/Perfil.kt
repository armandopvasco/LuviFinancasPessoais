package br.com.sosfamilia.data

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Uma única linha, como uma entidade JPA de cadastro único.
 * O id fixo 1 evita tabela de usuários: o celular é de uma pessoa.
 */
@Entity(tableName = "perfil")
data class Perfil(
    @PrimaryKey val id: Int = 1,
    val nome: String = "",
    val tipoSanguineo: String = "",
    val observacoesMedicas: String = "",
    val numeroAmbulancia: String = "192",
    val senhaCuidadorHash: String = "",
    val chavePix: String = "",
    val ultimoEndereco: String = "",
    val ultimaLatitude: Double? = null,
    val ultimaLongitude: Double? = null
)
