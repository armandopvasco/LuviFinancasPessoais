package br.com.sosfamilia.data

/** O que a tela de ajustes devolve para gravar. Não é uma tabela. */
data class CadastroLocal(
    val nome: String,
    val tipoSanguineo: String,
    val observacoesMedicas: String,
    val numeroAmbulancia: String,
    val chavePix: String,
    val novaSenha: String?,
    val removerSenha: Boolean,
    val contatos: List<ContatoEmergencia>
)
