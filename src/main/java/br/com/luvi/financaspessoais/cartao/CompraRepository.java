package br.com.luvi.financaspessoais.cartao;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CompraRepository extends JpaRepository<Compra, Long> {
    java.util.List<Compra> findByCartaoId(Long id);
}
