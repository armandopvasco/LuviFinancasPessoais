package br.com.luvi.financaspessoais.cartao;

import jakarta.persistence.*;
import br.com.luvi.financaspessoais.conta.entity.ContaFinanceira;
import java.math.BigDecimal;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;

@Entity
@Table(name = "cartoes_credito")
public class Cartao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 120)
    public String nome;

    @Column(length = 7)
    public String cor;

    @ManyToOne
    @JoinColumn(name = "conta_pagamento_id")
    public ContaFinanceira contaPagamento;

    @ManyToOne
    @JoinColumn(name = "proprietario_id")
    public Usuario proprietario;

    @Column(nullable = false)
    public int fechamento;

    @Column(nullable = false)
    public int vencimento;

    @Column(precision = 12, scale = 2)
    public BigDecimal limiteCredito;
}
