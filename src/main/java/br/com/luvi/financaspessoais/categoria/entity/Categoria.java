package br.com.luvi.financaspessoais.categoria.entity;

import br.com.luvi.financaspessoais.grupo.entity.Grupo;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import jakarta.persistence.*;

@Entity
@Table(name = "categorias")
public class Categoria {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=80) private String nome;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private TipoLancamento tipo;
    @Column(nullable=false) private boolean ativa = true;
    @ManyToOne @JoinColumn(name="grupo_id") private Grupo grupo;
    @ManyToOne @JoinColumn(name="usuario_id") private Usuario usuario;
    public Long getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;}
    public TipoLancamento getTipo(){return tipo;} public void setTipo(TipoLancamento v){tipo=v;}
    public boolean isAtiva(){return ativa;} public void setAtiva(boolean v){ativa=v;}
    public Grupo getGrupo(){return grupo;} public void setGrupo(Grupo v){grupo=v;}
    public Usuario getUsuario(){return usuario;} public void setUsuario(Usuario v){usuario=v;}
}
