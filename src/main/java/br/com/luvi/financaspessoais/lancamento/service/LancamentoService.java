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
        Lancamento lancamento = new Lancamento();
        atualizarDados(lancamento, request);
        return LancamentoResponse.from(repository.save(lancamento));
    }

    @Transactional(readOnly = true)
    public List<LancamentoResponse> listarPorMes(int mes, int ano) {
        YearMonth yearMonth = YearMonth.of(ano, mes);
        LocalDate inicio = yearMonth.atDay(1);
        LocalDate fim = yearMonth.atEndOfMonth();

        return repository.findByDataBetweenOrderByDataAscIdAsc(inicio, fim)
                .stream()
                .map(LancamentoResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public LancamentoResponse buscarPorId(Long id) {
        return repository.findById(id)
                .map(LancamentoResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Lançamento não encontrado"));
    }

    @Transactional
    public LancamentoResponse atualizar(Long id, LancamentoRequest request) {
        Lancamento lancamento = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Lançamento não encontrado"));

        atualizarDados(lancamento, request);
        return LancamentoResponse.from(repository.save(lancamento));
    }

    @Transactional
    public void excluir(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Lançamento não encontrado");
        }

        repository.deleteById(id);
    }

    private void atualizarDados(Lancamento lancamento, LancamentoRequest request) {
        lancamento.setTipo(request.tipo());
        lancamento.setDescricao(request.descricao().trim());
        lancamento.setCategoria(request.categoria());
        lancamento.setValor(request.valor());
        lancamento.setData(request.data());
    }
}
