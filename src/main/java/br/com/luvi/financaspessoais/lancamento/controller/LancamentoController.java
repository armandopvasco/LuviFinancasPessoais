package br.com.luvi.financaspessoais.lancamento.controller;

import br.com.luvi.financaspessoais.lancamento.dto.LancamentoRequest;
import br.com.luvi.financaspessoais.lancamento.dto.LancamentoResponse;
import br.com.luvi.financaspessoais.lancamento.dto.ResumoMensalResponse;
import br.com.luvi.financaspessoais.lancamento.service.LancamentoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/lancamentos")
public class LancamentoController {

    private final LancamentoService service;

    public LancamentoController(LancamentoService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<LancamentoResponse> criar(
            @Valid @RequestBody LancamentoRequest request) {

        LancamentoResponse response = service.criar(request);

        return ResponseEntity
                .created(URI.create("/api/lancamentos/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<LancamentoResponse> listar(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano) {

        LocalDate hoje = LocalDate.now();

        int mesConsulta = mes != null ? mes : hoje.getMonthValue();
        int anoConsulta = ano != null ? ano : hoje.getYear();

        return service.listarPorMes(mesConsulta, anoConsulta);
    }

    @GetMapping("/resumo")
    public ResumoMensalResponse resumo(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano) {

        LocalDate hoje = LocalDate.now();
        int mesConsulta = mes != null ? mes : hoje.getMonthValue();
        int anoConsulta = ano != null ? ano : hoje.getYear();
        return service.resumoPorMes(mesConsulta, anoConsulta);
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
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
