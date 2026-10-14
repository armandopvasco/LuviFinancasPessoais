package br.com.luvi.financaspessoais.config;

import br.com.luvi.financaspessoais.usuario.repository.UsuarioRepository;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferencias")
public class PreferenciasController {
    private final UsuarioService usuarios;
    private final UsuarioRepository repository;

    public PreferenciasController(UsuarioService usuarios, UsuarioRepository repository) {
        this.usuarios = usuarios;
        this.repository = repository;
    }

    public record Preferencias(boolean avisosAtivos, @Min(1) @Max(365) int avisosDias) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Preferencias consultar(Authentication authentication) {
        var usuario = usuarios.atual(authentication.getName());
        return new Preferencias(usuario.isAvisosAtivos(), usuario.getAvisosDias());
    }

    @PutMapping
    @Transactional
    public Preferencias salvar(@Valid @RequestBody Preferencias preferencias,
                              Authentication authentication) {
        var usuario = usuarios.atual(authentication.getName());
        usuario.setAvisosAtivos(preferencias.avisosAtivos());
        usuario.setAvisosDias(preferencias.avisosDias());
        repository.save(usuario);
        return preferencias;
    }
}
