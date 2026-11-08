package br.com.luvi.financaspessoais.cartao;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParcelaRepository extends JpaRepository<Parcela, Long> {
    java.util.List<Parcela> findByCompraIdOrderByNumeroAsc(Long id);

    java.util.List<Parcela> findByCompraId(Long id);

    java.util.List<Parcela> findByCompraIdIn(java.util.List<Long> ids);

    boolean existsByCompromissoId(Long id);

    @Query("select p.compromisso.id from Parcela p where p.compromisso.id in :ids")
    List<Long> findCompromissoIdsByCompromissoIdIn(@Param("ids") Collection<Long> ids);
}
