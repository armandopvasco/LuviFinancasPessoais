package br.com.luvi.financaspessoais.lancamento.enums;

public enum Categoria {

    SALARIO("Salário"),
    RENDA_EXTRA("Renda extra"),
    ALIMENTACAO("Alimentação"),
    MORADIA("Moradia"),
    TRANSPORTE("Transporte"),
    SAUDE("Saúde"),
    EDUCACAO("Educação"),
    LAZER("Lazer"),
    CONTAS("Contas"),
    OUTROS("Outros");

    private final String descricao;

    Categoria(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
