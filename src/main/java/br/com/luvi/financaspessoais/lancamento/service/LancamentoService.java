package br.com.luvi.financaspessoais.lancamento.service;

import br.com.luvi.financaspessoais.lancamento.dto.LancamentoRequest;
import br.com.luvi.financaspessoais.lancamento.dto.LancamentoResponse;
import br.com.luvi.financaspessoais.lancamento.entity.Lancamento;
import br.com.luvi.financaspessoais.lancamento.repository.LancamentoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class LancamentoService {

    private final LancamentoRepository repository;

    public LancamentoService(LancamentoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public LancamentoResponse criar(LancamentoRequest request) {
        Lancamento lancamento = new Lancamento(
                null,
                request.tipo(),
                request.descricao().trim(),
                request.categoria(),
                request.valor(),
                request.data()
        );

        return LancamentoResponse.fromEntity(repository.save(lancamento));
    }

    @Transactional(readOnly = true)
    public List<LancamentoResponse> listar(Integer mes, Integer ano) {
        YearMonth periodo = YearMonth.of(ano, mes);
        LocalDate inicio = periodo.atDay(1);
        LocalDate fim = periodo.atEndOfMonth();

        return repository.findByDataBetweenOrderByDataAscIdAsc(inicio, fim)
                .stream()
                .map(LancamentoResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public LancamentoResponse buscarPorId(Long id) {
        return repository.findById(id)
                .map(LancamentoResponse::fromEntity)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));
    }

    @Transactional
    public LancamentoResponse atualizar(Long id, LancamentoRequest request) {
        Lancamento lancamento = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lançamento não encontrado"));

        lancamento.setTipo(request.tipo());
        lancamento.setDescricao(request.descricao().trim());
        lancamento.setCategoria(request.categoria());
        lancamento.setValor(request.valor());
        lancamento.setData(request.data());

        return LancamentoResponse.fromEntity(repository.save(lancamento));
    }

    @Transactional
    public void excluir(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Lançamento não encontrado");
        }

        repository.deleteById(id);
    }
}
