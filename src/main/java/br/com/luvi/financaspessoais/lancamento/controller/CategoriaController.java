package br.com.luvi.financaspessoais.lancamento.controller;

import br.com.luvi.financaspessoais.lancamento.enums.Categoria;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    @GetMapping
    public List<Map<String, String>> listar() {
        return Arrays.stream(Categoria.values())
                .map(categoria -> Map.of(
                        "valor", categoria.name(),
                        "descricao", categoria.getDescricao()
                ))
                .toList();
    }
}
