package br.com.luvi.financaspessoais.transferencia.repository;
import br.com.luvi.financaspessoais.transferencia.entity.Transferencia;import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.math.BigDecimal;import java.time.LocalDate;import java.util.*;
public interface TransferenciaRepository extends JpaRepository<Transferencia,Long>{
@Query("select t from Transferencia t where (t.origem.id in :ids or t.destino.id in :ids) and t.data between :i and :f order by t.data desc,t.dataHoraCadastro desc") List<Transferencia> listar(@Param("ids")Collection<Long>ids,@Param("i")LocalDate i,@Param("f")LocalDate f);
@Query("select coalesce(sum(case when t.destino.id in :ids then t.valor else 0 end),0)-coalesce(sum(case when t.origem.id in :ids then t.valor else 0 end),0) from Transferencia t where t.data<:data") BigDecimal saldoAntes(@Param("ids")Collection<Long>ids,@Param("data")LocalDate data);
@Query("select coalesce(sum(case when t.destino.id in :ids then t.valor else 0 end),0)-coalesce(sum(case when t.origem.id in :ids then t.valor else 0 end),0) from Transferencia t where t.data between :i and :f") BigDecimal saldoPeriodo(@Param("ids")Collection<Long>ids,@Param("i")LocalDate i,@Param("f")LocalDate f);
@Query("select coalesce(sum(t.valor),0) from Transferencia t where t.destino.id=:id and t.data between :i and :f") BigDecimal entradas(@Param("id")Long id,@Param("i")LocalDate i,@Param("f")LocalDate f);
@Query("select coalesce(sum(t.valor),0) from Transferencia t where t.origem.id=:id and t.data between :i and :f") BigDecimal saidas(@Param("id")Long id,@Param("i")LocalDate i,@Param("f")LocalDate f);
}
