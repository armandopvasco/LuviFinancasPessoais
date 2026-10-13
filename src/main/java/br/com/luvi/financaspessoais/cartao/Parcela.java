package br.com.luvi.financaspessoais.cartao;

import jakarta.persistence.*;
import br.com.luvi.financaspessoais.planejamento.Compromisso;

@Entity
@Table(
        name = "parcelas_cartao",
        uniqueConstraints = @UniqueConstraint(columnNames = {"compra_id", "numero"}))
public class Parcela {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "compra_id")
    public Compra compra;

    @Column(nullable = false)
    public int numero;

    @OneToOne(optional = false)
    @JoinColumn(name = "compromisso_id", unique = true)
    public Compromisso compromisso;
}
