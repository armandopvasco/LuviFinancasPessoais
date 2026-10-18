package br.com.luvi.financaspessoais.cartao;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ParcelaRepository extends JpaRepository<Parcela, Long> {
    java.util.List<Parcela> findByCompraIdOrderByNumeroAsc(Long id);

    java.util.List<Parcela> findByCompraId(Long id);

    java.util.List<Parcela> findByCompraIdIn(java.util.List<Long> ids);

    boolean existsByCompromissoId(Long id);
}
