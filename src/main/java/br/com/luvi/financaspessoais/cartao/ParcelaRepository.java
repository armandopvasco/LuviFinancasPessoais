package br.com.luvi.financaspessoais.cartao;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ParcelaRepository extends JpaRepository<Parcela,Long>{ java.util.List<Parcela> findByCompraCartaoIdOrderByNumeroAsc(Long id);
 java.util.List<Parcela> findByCompraCartaoId(Long id);
 java.util.List<Parcela> findByCompraCartaoIdIn(java.util.List<Long> ids);
 boolean existsByCompromissoId(Long id);}
