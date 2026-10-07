package br.com.luvi.financaspessoais.app;

import br.com.luvi.financaspessoais.conta.repository.ContaGrupoRepository;
import br.com.luvi.financaspessoais.conta.service.ContaService;
import br.com.luvi.financaspessoais.grupo.service.GrupoService;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/app")
public class AppController {
    private final UsuarioService us; private final ContaService cs; private final GrupoService gs; private final ContaGrupoRepository cg;
    public AppController(UsuarioService u,ContaService c,GrupoService g,ContaGrupoRepository x){us=u;cs=c;gs=g;cg=x;}

    @GetMapping("/contexto")
    public Map<String,Object> contexto(Authentication a){
        var u=us.atual(a.getName());
        var meusGids=gs.meus(u).stream().map(m->m.getGrupo().getId()).collect(java.util.stream.Collectors.toSet());
        var contas=cs.acessiveis(u).stream().map(c->{
            var gids=cg.findByContaId(c.getId()).stream().map(x->x.getGrupo().getId()).filter(meusGids::contains).toList();
            return Map.<String,Object>of("id",c.getId(),"nome",c.getNome(),"tipo",c.getTipo(),"proprietario",c.getProprietario().getNome(),"propria",c.getProprietario().getId().equals(u.getId()),"grupos",gids);
        }).toList();
        var grupos=gs.meus(u).stream().map(m->Map.<String,Object>of("id",m.getGrupo().getId(),"nome",m.getGrupo().getNome(),"perfil",m.getPerfil().name())).toList();
        return Map.of("usuario",Map.of("id",u.getId(),"nome",u.getNome(),"login",u.getLogin()),"contas",contas,"grupos",grupos);
    }
    @PostMapping("/contas") public Map<String,Object> criarConta(@RequestBody Map<String,String>b,Authentication a){var c=cs.criar(b.get("nome"),b.get("tipo"),us.atual(a.getName()));return Map.of("id",c.getId(),"nome",c.getNome());}
    @PutMapping("/contas/{id}") public Map<String,Object> alterarConta(@PathVariable Long id,@RequestBody Map<String,String>b,Authentication a){var c=cs.alterar(id,b.get("nome"),b.get("tipo"),us.atual(a.getName()));return Map.of("id",c.getId(),"nome",c.getNome());}
    @DeleteMapping("/contas/{id}") public void excluirConta(@PathVariable Long id,Authentication a){cs.excluir(id,us.atual(a.getName()));}
    @PostMapping("/grupos") public Map<String,Object> criarGrupo(@RequestBody Map<String,String>b,Authentication a){var g=gs.criar(b.get("nome"),us.atual(a.getName()));return Map.of("id",g.getId(),"nome",g.getNome());}
    @PostMapping("/contas/{cid}/grupos/{gid}") public void compartilhar(@PathVariable Long cid,@PathVariable Long gid,Authentication a){cs.compartilhar(cid,gid,us.atual(a.getName()));}
    @DeleteMapping("/contas/{cid}/grupos/{gid}") public void descompartilhar(@PathVariable Long cid,@PathVariable Long gid,Authentication a){cs.descompartilhar(cid,gid,us.atual(a.getName()));}
    @GetMapping("/grupos/{gid}/membros") public List<Map<String,Object>> membros(@PathVariable Long gid,Authentication a){return gs.membros(gid,us.atual(a.getName())).stream().map(m->Map.<String,Object>of("id",m.getUsuario().getId(),"nome",m.getUsuario().getNome(),"perfil",m.getPerfil().name())).toList();}
    @DeleteMapping("/grupos/{gid}/membros/{uid}") public void removerMembro(@PathVariable Long gid,@PathVariable Long uid,Authentication a){gs.removerMembro(gid,uid,us.atual(a.getName()));}
}
