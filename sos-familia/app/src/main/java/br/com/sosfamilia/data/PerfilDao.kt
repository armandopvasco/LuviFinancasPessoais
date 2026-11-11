package br.com.sosfamilia.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

/** Equivale ao repository do Spring Data JPA. O Room escreve a implementação. */
@Dao
interface PerfilDao {
    @Query("SELECT * FROM perfil WHERE id = 1")
    fun observar(): Flow<Perfil?>

    @Query("SELECT * FROM perfil WHERE id = 1")
    suspend fun obter(): Perfil?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun salvar(perfil: Perfil)
}
