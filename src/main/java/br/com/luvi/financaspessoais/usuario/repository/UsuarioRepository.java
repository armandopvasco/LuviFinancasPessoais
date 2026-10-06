package br.com.luvi.financaspessoais.usuario.repository;
import br.com.luvi.financaspessoais.usuario.entity.Usuario; import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface UsuarioRepository extends JpaRepository<Usuario,Long>{
 Optional<Usuario> findByLoginIgnoreCase(String login); Optional<Usuario> findByEmailIgnoreCase(String email);
 Optional<Usuario> findByGoogleSubject(String googleSubject); boolean existsByEmailIgnoreCase(String email);
}