package br.com.luvi.financaspessoais.categoria.dto;
import br.com.luvi.financaspessoais.categoria.entity.Categoria; import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
public record CategoriaResponse(Long id,String nome,TipoLancamento tipo,boolean ativa,Long grupoId,boolean pessoal){
 public static CategoriaResponse from(Categoria c){return new CategoriaResponse(c.getId(),c.getNome(),c.getTipo(),c.isAtiva(),c.getGrupo()==null?null:c.getGrupo().getId(),c.getUsuario()!=null);}
}
