package br.com.luvi.financaspessoais.cartao;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
@Entity @Table(name="compras_cartao") public class Compra {
@Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
@ManyToOne(optional=false) @JoinColumn(name="cartao_id") public Cartao cartao;
@Column(nullable=false,length=200) public String descricao;
@Column(nullable=false) public LocalDate dataCompra;
@Column(nullable=false,precision=12,scale=2) public BigDecimal total;
@Column(nullable=false) public int quantidadeParcelas;
}
