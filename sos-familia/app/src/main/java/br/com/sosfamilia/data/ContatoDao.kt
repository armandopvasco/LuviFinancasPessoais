package br.com.sosfamilia.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ContatoDao {
    @Query("SELECT * FROM contato ORDER BY ordem ASC")
    fun observar(): Flow<List<ContatoEmergencia>>

    @Query("SELECT * FROM contato WHERE ordem = :ordem")
    suspend fun obter(ordem: Int): ContatoEmergencia?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun salvar(contato: ContatoEmergencia)

    @Query("DELETE FROM contato WHERE ordem = :ordem")
    suspend fun remover(ordem: Int)
}
