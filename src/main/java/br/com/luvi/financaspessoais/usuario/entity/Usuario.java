package br.com.luvi.financaspessoais.usuario.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="usuarios", uniqueConstraints={
 @UniqueConstraint(name="uk_usuario_login", columnNames="login"),
 @UniqueConstraint(name="uk_usuario_email", columnNames="email"),
 @UniqueConstraint(name="uk_usuario_google_subject", columnNames="google_subject")
})
public class Usuario {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=120) private String nome;
 @Column(nullable=false,length=160) private String login;
 @Column(length=160) private String email;
 @Column(length=100) private String senha;
 @Column(name="auth_provider",nullable=false,length=20) private String authProvider="LOCAL";
 @Column(name="google_subject",length=255) private String googleSubject;
 @Column(nullable=false) private boolean ativo=true;
 @Column(nullable=false) private LocalDateTime dataCadastro;
 @PrePersist void pre(){if(dataCadastro==null)dataCadastro=LocalDateTime.now();if(authProvider==null||authProvider.isBlank())authProvider="LOCAL";}
 public Long getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;}
 public String getLogin(){return login;} public void setLogin(String v){login=v;} public String getEmail(){return email;}
 public void setEmail(String v){email=v;} public String getSenha(){return senha;} public void setSenha(String v){senha=v;}
 public String getAuthProvider(){return authProvider;} public void setAuthProvider(String v){authProvider=v;}
 public String getGoogleSubject(){return googleSubject;} public void setGoogleSubject(String v){googleSubject=v;}
 public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;}
}