package br.com.luvi.financaspessoais.cartao;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface PagamentoFaturaRepository extends JpaRepository<PagamentoFatura, Long> {
    boolean existsByLancamentoId(Long lancamentoId);

    List<PagamentoFatura> findByCartaoIdOrderByCompetenciaAscIdAsc(Long cartaoId);
}
