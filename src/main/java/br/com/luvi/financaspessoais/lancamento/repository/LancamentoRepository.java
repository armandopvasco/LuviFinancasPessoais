package br.com.luvi.financaspessoais.lancamento.repository;

import br.com.luvi.financaspessoais.lancamento.entity.Lancamento;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface LancamentoRepository extends JpaRepository<Lancamento, Long> {

    List<Lancamento> findByDataBetweenOrderByDataDescDataHoraCadastroDescIdDesc(LocalDate inicio, LocalDate fim);

    @Query("""
        select coalesce(sum(l.valor), 0)
        from Lancamento l
        where l.tipo = :tipo and l.data < :data
        """)
    BigDecimal somarAntesDe(@Param("tipo") TipoLancamento tipo, @Param("data") LocalDate data);

    @Query("""
        select coalesce(sum(l.valor), 0)
        from Lancamento l
        where l.tipo = :tipo and l.data between :inicio and :fim
        """)
    BigDecimal somarNoPeriodo(@Param("tipo") TipoLancamento tipo,
                             @Param("inicio") LocalDate inicio,
                             @Param("fim") LocalDate fim);
}
