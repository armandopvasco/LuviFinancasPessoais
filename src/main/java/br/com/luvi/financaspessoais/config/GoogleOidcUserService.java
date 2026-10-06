package br.com.luvi.financaspessoais.config;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import org.springframework.security.oauth2.client.oidc.userinfo.*; import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.*; import org.springframework.stereotype.Service; import org.springframework.context.annotation.Profile;
@Service @Profile("google") public class GoogleOidcUserService extends OidcUserService {
 private final UsuarioService usuarios; public GoogleOidcUserService(UsuarioService u){usuarios=u;}
 @Override public OidcUser loadUser(OidcUserRequest req)throws OAuth2AuthenticationException{OidcUser g=super.loadUser(req);String email=g.getEmail();if(email==null||email.isBlank()||!Boolean.TRUE.equals(g.getEmailVerified()))throw new OAuth2AuthenticationException("A conta Google precisa possuir um e-mail verificado.");usuarios.cadastrarOuVincularGoogle(g.getFullName(),email,g.getSubject());return new DefaultOidcUser(g.getAuthorities(),g.getIdToken(),g.getUserInfo(),"email");}
}