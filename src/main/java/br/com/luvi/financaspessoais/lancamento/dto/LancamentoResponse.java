package br.com.luvi.financaspessoais.lancamento.dto;

import br.com.luvi.financaspessoais.lancamento.entity.Lancamento;
import br.com.luvi.financaspessoais.lancamento.enums.Categoria;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record LancamentoResponse(
        Long id,
        TipoLancamento tipo,
        String descricao,
        Categoria categoria,
        BigDecimal valor,
        LocalDate data,
        LocalDateTime dataHoraCadastro
) {
    public static LancamentoResponse from(Lancamento lancamento) {
        return new LancamentoResponse(
                lancamento.getId(), lancamento.getTipo(), lancamento.getDescricao(),
                lancamento.getCategoria(), lancamento.getValor(), lancamento.getData(),
                lancamento.getDataHoraCadastro()
        );
    }
}
