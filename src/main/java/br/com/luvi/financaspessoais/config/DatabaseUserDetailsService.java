package br.com.luvi.financaspessoais.config;

import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import br.com.luvi.financaspessoais.usuario.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {
    private final UsuarioRepository repo;
    private final String unavailablePassword =
            new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                    .encode(java.util.UUID.randomUUID().toString());

    public DatabaseUserDetailsService(UsuarioRepository r) {
        repo = r;
    }

    public UserDetails loadUserByUsername(String login) {
        Usuario u =
                repo.findByLoginIgnoreCase(login)
                        .orElseGet(
                                () ->
                                        repo.findByEmailIgnoreCase(login)
                                                .orElseThrow(
                                                        () ->
                                                                new UsernameNotFoundException(
                                                                        "Usuário não encontrado")));
        if (!u.isAtivo()) {
            throw new org.springframework.security.authentication.DisabledException(
                    "Conta desativada.");
        }
        return User.withUsername(u.getLogin())
                .password(
                        u.getSenha() == null || u.getSenha().isBlank()
                                ? unavailablePassword
                                : u.getSenha())
                .roles("USER")
                .disabled(!u.isAtivo())
                .build();
    }
}
