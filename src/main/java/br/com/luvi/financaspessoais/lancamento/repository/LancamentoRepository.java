package br.com.luvi.financaspessoais.lancamento.repository;

import br.com.luvi.financaspessoais.lancamento.entity.Lancamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LancamentoRepository extends JpaRepository<Lancamento, Long> {

    List<Lancamento> findByDataBetweenOrderByDataAscIdAsc(
            LocalDate inicio,
            LocalDate fim
    );
}
