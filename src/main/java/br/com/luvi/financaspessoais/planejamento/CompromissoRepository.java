package br.com.luvi.financaspessoais.planejamento;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface CompromissoRepository extends JpaRepository<Compromisso, Long> {
    List<Compromisso> findByContaIdInAndVencimentoBetweenOrderByVencimentoAscIdAsc(
            List<Long> ids, LocalDate inicio, LocalDate fim);

    List<Compromisso> findBySerieRecorrenciaOrderByVencimentoAscIdAsc(String serieRecorrencia);

    List<Compromisso> findByContaIdInOrderByVencimentoAscIdAsc(List<Long> ids);

    boolean existsByContaId(Long id);
}
