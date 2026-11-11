package br.com.sosfamilia.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * SQLite no próprio celular. Não há URL de banco, usuário nem servidor.
 * Se o modelo mudar no futuro, crie uma Migration (o equivalente ao Flyway)
 * em vez de apagar o arquivo: aqui estão dados médicos.
 */
@Database(
    entities = [Perfil::class, ContatoEmergencia::class],
    version = 1,
    exportSchema = false
)
abstract class SosDatabase : RoomDatabase() {
    abstract fun perfilDao(): PerfilDao
    abstract fun contatoDao(): ContatoDao

    companion object {
        @Volatile
        private var instancia: SosDatabase? = null

        fun criar(contexto: Context): SosDatabase {
            return instancia ?: synchronized(this) {
                instancia ?: Room.databaseBuilder(
                    contexto.applicationContext,
                    SosDatabase::class.java,
                    "sos_familia.db"
                ).build().also { instancia = it }
            }
        }
    }
}
