package br.com.luvi.financaspessoais.planejamento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
public interface CompromissoRepository extends JpaRepository<Compromisso,Long> {
 List<Compromisso> findByContaIdInAndVencimentoBetweenOrderByVencimentoAscIdAsc(List<Long> ids,LocalDate inicio,LocalDate fim);
 boolean existsByContaId(Long id);
}
