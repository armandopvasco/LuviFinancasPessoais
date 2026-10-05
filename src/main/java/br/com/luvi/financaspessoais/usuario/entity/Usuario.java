package br.com.luvi.financaspessoais.usuario.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name="usuarios", uniqueConstraints={@UniqueConstraint(name="uk_usuario_login", columnNames="login"), @UniqueConstraint(name="uk_usuario_email", columnNames="email")})
public class Usuario {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=120) private String nome;
 @Column(nullable=false,length=160) private String login;
 @Column(length=160) private String email;
 @Column(nullable=false,length=100) private String senha;
 @Column(nullable=false) private boolean ativo=true;
 @Column(nullable=false) private LocalDateTime dataCadastro;
 @PrePersist void pre(){if(dataCadastro==null)dataCadastro=LocalDateTime.now();}
 public Long getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getLogin(){return login;} public void setLogin(String v){login=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getSenha(){return senha;} public void setSenha(String v){senha=v;} public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;}
}