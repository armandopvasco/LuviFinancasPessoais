package br.com.luvi.financaspessoais.planejamento;

import br.com.luvi.financaspessoais.conta.entity.ContaFinanceira;
import br.com.luvi.financaspessoais.categoria.entity.Categoria;
import br.com.luvi.financaspessoais.lancamento.entity.Lancamento;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "compromissos_financeiros")
public class Compromisso {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "conta_id", nullable = false)
    private ContaFinanceira conta;

    @ManyToOne(optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoLancamento tipo;

    @Column(nullable = false, length = 200)
    private String descricao;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(name = "vencimento", nullable = false)
    private LocalDate vencimento;

    @Column(name = "serie_recorrencia", length = 36)
    private String serieRecorrencia;

    @Column(nullable = false, length = 20)
    private String status = "PENDENTE";

    @Column(name = "data_pagamento")
    private LocalDate dataPagamento;

    @Column(name = "valor_efetivo", precision = 12, scale = 2)
    private BigDecimal valorEfetivo;

    @Column(name = "desconto", precision = 12, scale = 2)
    private BigDecimal desconto;

    @Column(name = "acrescimo", precision = 12, scale = 2)
    private BigDecimal acrescimo;

    @Column(name = "natureza_acrescimo", length = 20)
    private String naturezaAcrescimo;

    @Column(name = "observacao_pagamento", length = 250)
    private String observacaoPagamento;

    @OneToOne
    @JoinColumn(name = "lancamento_id", unique = true)
    private Lancamento lancamento;

    public String getSerieRecorrencia() {
        return serieRecorrencia;
    }

    public void setSerieRecorrencia(String x) {
        serieRecorrencia = x;
    }

    public Long getId() {
        return id;
    }

    public ContaFinanceira getConta() {
        return conta;
    }

    public void setConta(ContaFinanceira x) {
        conta = x;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public void setCategoria(Categoria x) {
        categoria = x;
    }

    public TipoLancamento getTipo() {
        return tipo;
    }

    public void setTipo(TipoLancamento x) {
        tipo = x;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String x) {
        descricao = x;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal x) {
        valor = x;
    }

    public LocalDate getVencimento() {
        return vencimento;
    }

    public void setVencimento(LocalDate x) {
        vencimento = x;
    }

    public LocalDate getDataPagamento() {
        return dataPagamento;
    }

    public void setDataPagamento(LocalDate x) {
        dataPagamento = x;
    }

    public BigDecimal getValorEfetivo() {
        return valorEfetivo;
    }

    public void setValorEfetivo(BigDecimal x) {
        valorEfetivo = x;
    }

    public BigDecimal getDesconto() {
        return desconto;
    }

    public void setDesconto(BigDecimal x) {
        desconto = x;
    }

    public BigDecimal getAcrescimo() {
        return acrescimo;
    }

    public void setAcrescimo(BigDecimal x) {
        acrescimo = x;
    }

    public String getNaturezaAcrescimo() {
        return naturezaAcrescimo;
    }

    public void setNaturezaAcrescimo(String x) {
        naturezaAcrescimo = x;
    }

    public String getObservacaoPagamento() {
        return observacaoPagamento;
    }

    public void setObservacaoPagamento(String x) {
        observacaoPagamento = x;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String x) {
        status = x;
    }

    public Lancamento getLancamento() {
        return lancamento;
    }

    public void setLancamento(Lancamento x) {
        lancamento = x;
    }
}
