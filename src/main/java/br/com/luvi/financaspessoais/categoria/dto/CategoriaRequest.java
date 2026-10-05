package br.com.luvi.financaspessoais.categoria.dto;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento; import jakarta.validation.constraints.*;
public record CategoriaRequest(@NotBlank @Size(max=80) String nome,@NotNull TipoLancamento tipo,Long grupoId){}
