package br.com.luvi.financaspessoais.lancamento.controller;

import br.com.luvi.financaspessoais.lancamento.dto.LancamentoRequest;
import br.com.luvi.financaspessoais.lancamento.dto.LancamentoResponse;
import br.com.luvi.financaspessoais.lancamento.service.LancamentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/lancamentos")
@CrossOrigin(origins = "*")
public class LancamentoController {

    private final LancamentoService service;

    public LancamentoController(LancamentoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LancamentoResponse criar(@Valid @RequestBody LancamentoRequest request) {
        return service.criar(request);
    }

    @GetMapping
    public List<LancamentoResponse> listar(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano) {

        LocalDate hoje = LocalDate.now();

        if (mes == null) {
            mes = hoje.getMonthValue();
        }

        if (ano == null) {
            ano = hoje.getYear();
        }

        return service.listar(mes, ano);
    }

    @GetMapping("/{id}")
    public LancamentoResponse buscar(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public LancamentoResponse atualizar(
            @PathVariable Long id,
            @Valid @RequestBody LancamentoRequest request) {

        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}
