package br.com.luvi.financaspessoais.lancamento.dto;

import br.com.luvi.financaspessoais.lancamento.enums.Categoria;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LancamentoRequest(
        @NotNull(message = "O tipo é obrigatório")
        TipoLancamento tipo,

        @NotBlank(message = "A descrição é obrigatória")
        @Size(max = 200, message = "A descrição deve ter no máximo 200 caracteres")
        String descricao,

        @NotNull(message = "A categoria é obrigatória")
        Categoria categoria,

        @NotNull(message = "O valor é obrigatório")
        @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
        BigDecimal valor,

        @NotNull(message = "A data é obrigatória")
        LocalDate data
) {
}
