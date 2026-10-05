package br.com.luvi.financaspessoais.conta.entity;

import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contas_financeiras")
public class ContaFinanceira {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false,length=120) private String nome;
    @Column(nullable=false,length=30) private String tipo="BANCO";
    @ManyToOne(optional=false) private Usuario proprietario;
    @Column(nullable=false) private boolean ativa=true;
    @Column(nullable=false) private LocalDateTime dataCriacao;
    @PrePersist void pre(){ if(dataCriacao==null) dataCriacao=LocalDateTime.now(); }
    public Long getId(){return id;}
    public String getNome(){return nome;}
    public void setNome(String v){nome=v;}
    public String getTipo(){return tipo;}
    public void setTipo(String v){tipo=v;}
    public Usuario getProprietario(){return proprietario;}
    public void setProprietario(Usuario v){proprietario=v;}
    public boolean isAtiva(){return ativa;}
    public void setAtiva(boolean v){ativa=v;}
}
