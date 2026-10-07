package br.com.luvi.financaspessoais.categoria.controller;
import br.com.luvi.financaspessoais.categoria.dto.*; import br.com.luvi.financaspessoais.categoria.service.CategoriaService; import br.com.luvi.financaspessoais.usuario.service.UsuarioService; import jakarta.validation.Valid; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/categorias") public class CategoriaController{
 private final CategoriaService service; private final UsuarioService usuarios; public CategoriaController(CategoriaService s,UsuarioService u){service=s;usuarios=u;}
 @GetMapping public List<CategoriaResponse> listar(@RequestParam(required=false)Long grupoId,@RequestParam(required=false)Long contaId,Authentication a){var u=usuarios.atual(a.getName());return contaId!=null?service.listarPorConta(contaId,u):service.listar(grupoId,u);}
 @PostMapping public CategoriaResponse criar(@Valid @RequestBody CategoriaRequest r,Authentication a){return service.criar(r,usuarios.atual(a.getName()));}
 @PutMapping("/{id}") public CategoriaResponse atualizar(@PathVariable Long id,@Valid @RequestBody CategoriaRequest r,Authentication a){return service.atualizar(id,r,usuarios.atual(a.getName()));}
 @PatchMapping("/{id}/ativa") public CategoriaResponse alternar(@PathVariable Long id,Authentication a){return service.alternar(id,usuarios.atual(a.getName()));}
 @DeleteMapping("/{id}") public void excluir(@PathVariable Long id,Authentication a){service.excluir(id,usuarios.atual(a.getName()));}
}
