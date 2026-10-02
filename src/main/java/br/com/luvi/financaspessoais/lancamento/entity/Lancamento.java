package br.com.luvi.financaspessoais.lancamento.entity;

import br.com.luvi.financaspessoais.lancamento.enums.Categoria;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "lancamentos")
public class Lancamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoLancamento tipo;

    @Column(nullable = false, length = 200)
    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Categoria categoria;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate data;

    public Lancamento() {
    }

    public Lancamento(Long id, TipoLancamento tipo, String descricao, Categoria categoria,
                      BigDecimal valor, LocalDate data) {
        this.id = id;
        this.tipo = tipo;
        this.descricao = descricao;
        this.categoria = categoria;
        this.valor = valor;
        this.data = data;
    }

    public Long getId() {
        return id;
    }

    public TipoLancamento getTipo() {
        return tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public Categoria getCategoria() {
        return categoria;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public LocalDate getData() {
        return data;
    }

    public void setTipo(TipoLancamento tipo) {
        this.tipo = tipo;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public void setCategoria(Categoria categoria) {
        this.categoria = categoria;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public void setData(LocalDate data) {
        this.data = data;
    }
}
