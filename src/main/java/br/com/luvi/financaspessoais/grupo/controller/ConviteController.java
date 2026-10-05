package br.com.luvi.financaspessoais.grupo.controller;

import br.com.luvi.financaspessoais.grupo.entity.ConviteGrupo;
import br.com.luvi.financaspessoais.grupo.entity.GrupoMembro;
import br.com.luvi.financaspessoais.grupo.enums.PerfilGrupo;
import br.com.luvi.financaspessoais.grupo.repository.ConviteGrupoRepository;
import br.com.luvi.financaspessoais.grupo.repository.GrupoMembroRepository;
import br.com.luvi.financaspessoais.grupo.repository.GrupoRepository;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@Controller
public class ConviteController {
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final GrupoRepository grupos;
    private final GrupoMembroRepository membros;
    private final ConviteGrupoRepository convites;
    private final UsuarioService usuarios;

    public ConviteController(GrupoRepository grupos, GrupoMembroRepository membros,
                             ConviteGrupoRepository convites, UsuarioService usuarios) {
        this.grupos = grupos;
        this.membros = membros;
        this.convites = convites;
        this.usuarios = usuarios;
    }

    @ResponseBody
    @PostMapping("/api/grupos/{id}/convites")
    @Transactional
    public Map<String, String> gerar(@PathVariable Long id, Authentication authentication) {
        var usuario = usuarios.atual(authentication.getName());
        var membro = membros.findByGrupoIdAndUsuarioId(id, usuario.getId()).orElseThrow();
        if (membro.getPerfil() != PerfilGrupo.ADMIN) {
            throw new SecurityException("Somente administrador pode convidar.");
        }

        ConviteGrupo convite = new ConviteGrupo();
        convite.setGrupo(grupos.findById(id).orElseThrow());
        convite.setCriadoPor(usuario);
        convite.setToken(gerarCodigoUnico());
        convite.setExpiraEm(LocalDateTime.now().plusDays(7));
        convites.save(convite);

        return Map.of("codigo", convite.getToken());
    }

    @ResponseBody
    @PostMapping("/api/convites/aceitar")
    @Transactional
    public Map<String, Object> aceitar(@RequestBody Map<String, String> body, Authentication authentication) {
        String codigo = normalizarCodigo(body.get("codigo"));
        if (codigo.isBlank()) {
            throw new IllegalArgumentException("Informe o código do convite.");
        }

        ConviteGrupo convite = convites.findByToken(codigo)
                .orElseThrow(() -> new IllegalArgumentException("Código de convite inválido."));

        if (convite.isUsado()) {
            throw new IllegalArgumentException("Este convite já foi utilizado.");
        }
        if (convite.getExpiraEm().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Este convite expirou.");
        }

        var usuario = usuarios.atual(authentication.getName());
        Long grupoId = convite.getGrupo().getId();

        if (membros.existsByGrupoIdAndUsuarioId(grupoId, usuario.getId())) {
            throw new IllegalArgumentException("Você já participa deste grupo.");
        }

        GrupoMembro membro = new GrupoMembro();
        membro.setGrupo(convite.getGrupo());
        membro.setUsuario(usuario);
        membro.setPerfil(PerfilGrupo.MEMBRO);
        membros.save(membro);

        convite.setUsado(true);
        return Map.of("grupoId", grupoId, "grupoNome", convite.getGrupo().getNome());
    }

    private String gerarCodigoUnico() {
        String codigo;
        do {
            StringBuilder sb = new StringBuilder("FAM-");
            for (int i = 0; i < 6; i++) {
                sb.append(ALFABETO.charAt(RANDOM.nextInt(ALFABETO.length())));
            }
            codigo = sb.toString();
        } while (convites.findByToken(codigo).isPresent());
        return codigo;
    }

    private String normalizarCodigo(String codigo) {
        return codigo == null ? "" : codigo.trim().toUpperCase(Locale.ROOT);
    }
}
