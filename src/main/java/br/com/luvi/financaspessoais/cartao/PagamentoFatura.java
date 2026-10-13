package br.com.luvi.financaspessoais.cartao;

import jakarta.persistence.*;
import br.com.luvi.financaspessoais.conta.entity.ContaFinanceira;
import br.com.luvi.financaspessoais.lancamento.entity.Lancamento;
import java.time.LocalDate;
import java.math.BigDecimal;

@Entity
@Table(
        name = "pagamentos_fatura",
        uniqueConstraints = @UniqueConstraint(columnNames = {"cartao_id", "competencia"}))
public class PagamentoFatura {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "cartao_id")
    public Cartao cartao;

    @Column(nullable = false)
    public LocalDate competencia;

    @ManyToOne(optional = false)
    @JoinColumn(name = "conta_id")
    public ContaFinanceira conta;

    @Column(nullable = false)
    public LocalDate dataPagamento;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal valor;

    @OneToOne(optional = false)
    @JoinColumn(name = "lancamento_id", unique = true)
    public Lancamento lancamento;
}
