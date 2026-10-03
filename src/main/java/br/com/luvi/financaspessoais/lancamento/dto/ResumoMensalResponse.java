package br.com.luvi.financaspessoais.lancamento.dto;

import java.math.BigDecimal;

public record ResumoMensalResponse(
        BigDecimal saldoInicial,
        BigDecimal receitas,
        BigDecimal despesas,
        BigDecimal movimentacao,
        BigDecimal saldoFinal
) {
}
