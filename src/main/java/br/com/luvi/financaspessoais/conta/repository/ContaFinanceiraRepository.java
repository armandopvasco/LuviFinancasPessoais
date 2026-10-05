package br.com.luvi.financaspessoais.conta.repository;

import br.com.luvi.financaspessoais.conta.entity.ContaFinanceira;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ContaFinanceiraRepository extends JpaRepository<ContaFinanceira,Long>{
    List<ContaFinanceira> findByProprietarioAndAtivaTrueOrderByNome(Usuario u);
    @Query("select distinct c from ContaFinanceira c left join ContaGrupo cg on cg.conta=c where c.ativa=true and (c.proprietario.id=:uid or cg.grupo.id in :gids) order by c.nome")
    List<ContaFinanceira> acessiveis(@Param("uid")Long uid,@Param("gids")Collection<Long> gids);
}
