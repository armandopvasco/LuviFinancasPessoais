package br.com.luvi.financaspessoais.config;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import br.com.luvi.financaspessoais.usuario.repository.UsuarioRepository;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
class PasskeyAccountTest {
 @Test void googleOnlyAccountHasNoUsablePasswordAndInactiveAccountIsRejected(){
  var repository=mock(UsuarioRepository.class);var account=new Usuario();account.setLogin("google@example.test");account.setAtivo(true);
  when(repository.findByLoginIgnoreCase(account.getLogin())).thenReturn(Optional.of(account));
  var service=new DatabaseUserDetailsService(repository);var details=service.loadUserByUsername(account.getLogin());
  assertFalse(new BCryptPasswordEncoder().matches("test-password",details.getPassword()));
  account.setAtivo(false);assertThrows(DisabledException.class,()->service.loadUserByUsername(account.getLogin()));
 }
 @Test void invalidProductionOriginRejected(){
  var config=new PasskeyConfig();assertThrows(IllegalArgumentException.class,()->config.passkeyOperations(null,null,"luvi.test","http://luvi.test"));
  assertThrows(IllegalArgumentException.class,()->config.passkeyOperations(null,null,"luvi.test","https://evil.test"));
 }
}
