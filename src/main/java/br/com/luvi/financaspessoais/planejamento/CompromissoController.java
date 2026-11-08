package br.com.luvi.financaspessoais.planejamento;

import br.com.luvi.financaspessoais.conta.repository.ContaFinanceiraRepository;
import br.com.luvi.financaspessoais.conta.service.ContaService;
import br.com.luvi.financaspessoais.categoria.service.CategoriaService;
import br.com.luvi.financaspessoais.lancamento.dto.LancamentoRequest;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import br.com.luvi.financaspessoais.lancamento.service.LancamentoService;
import br.com.luvi.financaspessoais.lancamento.repository.LancamentoRepository;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/planejamento")
public class CompromissoController {
    private final br.com.luvi.financaspessoais.cartao.ParcelaRepository parcelas;
    private final CompromissoRepository repo;
    private final ContaService contas;
    private final ContaFinanceiraRepository contaRepo;
    private final CategoriaService categorias;
    private final UsuarioService usuarios;
    private final LancamentoService lancamentos;
    private final LancamentoRepository lancamentoRepo;

    public CompromissoController(
            CompromissoRepository r,
            ContaService cs,
            ContaFinanceiraRepository cr,
            CategoriaService cat,
            UsuarioService us,
            LancamentoService ls,
            LancamentoRepository lr,
            br.com.luvi.financaspessoais.cartao.ParcelaRepository pr) {
        parcelas = pr;
        repo = r;
        contas = cs;
        contaRepo = cr;
        categorias = cat;
        usuarios = us;
        lancamentos = ls;
        lancamentoRepo = lr;
    }

    public record Pedido(
            @NotNull Long contaId,
            @NotNull Long categoriaId,
            @NotNull TipoLancamento tipo,
            @NotBlank String descricao,
            @NotNull @DecimalMin("0.01") BigDecimal valor,
            @NotNull LocalDate vencimento,
            Integer quantidadeOcorrencias,
            String frequencia) {}

    public record Alteracao(
            @NotNull Long contaId,
            @NotNull Long categoriaId,
            @NotNull TipoLancamento tipo,
            @NotBlank String descricao,
            @NotNull @DecimalMin("0.01") BigDecimal valor,
            @NotNull LocalDate vencimento,
            @NotNull String alcance) {}

    public record Pagamento(
            @NotNull LocalDate data,
            @NotNull Long contaId,
            @NotNull @DecimalMin("0.01") BigDecimal valorEfetivo,
            @DecimalMin("0.00") BigDecimal desconto,
            @DecimalMin("0.00") BigDecimal acrescimo,
            String naturezaAcrescimo,
            String observacao) {}

    /** Grava uma célula da grade. O valor muda só neste mês; os demais campos nascem com a célula. */
    public record CelulaPedido(
            Long id,
            String linhaPlanejamento,
            @NotNull Long contaId,
            @NotNull Long categoriaId,
            @NotNull TipoLancamento tipo,
            @NotBlank String descricao,
            BigDecimal valor,
            @NotNull LocalDate vencimento,
            List<Long> vincular) {}

    /** Atualiza descrição, categoria, conta, tipo e dia de vencimento dos meses pendentes da linha. */
    public record LinhaPedido(
            @NotBlank String descricao,
            @NotNull Long categoriaId,
            @NotNull Long contaId,
            @NotNull TipoLancamento tipo,
            @NotNull @Min(1) @Max(31) Integer diaVencimento,
            List<Long> vincular) {}

    public record IdsPedido(List<Long> vincular) {}

    private Map<String, Object> dto(Compromisso c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("contaId", c.getConta().getId());
        m.put("contaNome", c.getConta().getNome());
        m.put("categoriaId", c.getCategoria().getId());
        m.put("categoria", c.getCategoria().getNome());
        m.put("tipo", c.getTipo().name());
        m.put("descricao", c.getDescricao());
        m.put("valor", c.getValor());
        m.put("vencimento", c.getVencimento());
        m.put("status", c.getStatus());
        m.put("serieRecorrencia", c.getSerieRecorrencia());
        m.put("dataPagamento", c.getDataPagamento());
        m.put("valorEfetivo", c.getValorEfetivo());
        m.put("desconto", c.getDesconto());
        m.put("acrescimo", c.getAcrescimo());
        m.put("naturezaAcrescimo", c.getNaturezaAcrescimo());
        m.put("observacao", c.getObservacaoPagamento());
        m.put("linhaPlanejamento", c.getLinhaPlanejamento());
        m.put("parcelaCartao", false);
        return m;
    }

    private Map<String, Object> dto(Compromisso c, boolean parcelaCartao) {
        var m = dto(c);
        m.put("parcelaCartao", parcelaCartao);
        return m;
    }

    private List<Map<String, Object>> mapear(List<Compromisso> lista) {
        if (lista.isEmpty()) return List.of();
        var ids = lista.stream().map(Compromisso::getId).toList();
        var deParcelas = new HashSet<>(parcelas.findCompromissoIdsByCompromissoIdIn(ids));
        return lista.stream().map(c -> dto(c, deParcelas.contains(c.getId()))).toList();
    }

    private Usuario usuario(Authentication a) {
        return usuarios.atual(a.getName());
    }

    private Compromisso exigir(Long id, Usuario u) {
        var c =
                repo.findById(id)
                        .orElseThrow(
                                () -> new IllegalArgumentException("Compromisso não encontrado."));
        if (!contas.podeAcessar(c.getConta().getId(), u))
            throw new SecurityException("Acesso negado.");
        return c;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano,
            @RequestParam(required = false) String de,
            @RequestParam(required = false) String ate,
            @RequestParam(required = false) Long contaId,
            @RequestParam(required = false) Long grupoId,
            Authentication a) {
        var u = usuario(a);
        var ids = idsDasContas(contaId, grupoId, u);
        if (ids.isEmpty()) return List.of();
        LocalDate inicio;
        LocalDate fim;
        if (texto(de) || texto(ate)) {
            if (!texto(de) || !texto(ate))
                throw new IllegalArgumentException("Informe de e ate no formato aaaa-mm.");
            var inicioMes = lerMes(de, "de");
            var fimMes = lerMes(ate, "ate");
            long quantidade = java.time.temporal.ChronoUnit.MONTHS.between(inicioMes, fimMes) + 1;
            if (quantidade < 1)
                throw new IllegalArgumentException(
                        "A data inicial não pode ser posterior à final.");
            if (quantidade > 36)
                throw new IllegalArgumentException("O intervalo pode ter no máximo 36 meses.");
            inicio = inicioMes.atDay(1);
            fim = fimMes.atEndOfMonth();
        } else if (mes != null && ano != null) {
            YearMonth ym;
            try {
                ym = YearMonth.of(ano, mes);
            } catch (DateTimeException e) {
                throw new IllegalArgumentException("Mês ou ano inválido.");
            }
            inicio = ym.atDay(1);
            fim = ym.atEndOfMonth();
        } else {
            throw new IllegalArgumentException("Informe mes e ano, ou de e ate.");
        }
        return mapear(
                repo.findByContaIdInAndVencimentoBetweenOrderByVencimentoAscIdAsc(ids, inicio, fim));
    }

    /** Dados do relatório limitados às contas acessíveis ao usuário autenticado. */
    @GetMapping("/relatorio")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> relatorio(Authentication authentication) {
        var usuario = usuario(authentication);
        var ids = contas.acessiveis(usuario).stream().map(conta -> conta.getId()).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return mapear(repo.findByContaIdInOrderByVencimentoAscIdAsc(ids));
    }

    /** Retorna todas as ocorrências visíveis da série, sem o filtro mensal da previsão. */
    @GetMapping("/{id}/recorrencia")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarRecorrencia(
            @PathVariable Long id, Authentication authentication) {
        var usuario = usuario(authentication);
        var compromisso = exigir(id, usuario);
        var serie = compromisso.getSerieRecorrencia();
        var ocorrencias = serie == null
                ? List.of(compromisso)
                : repo.findBySerieRecorrenciaOrderByVencimentoAscIdAsc(serie);

        // Uma série pode ter contas diferentes após a edição de ocorrências.
        return mapear(
                ocorrencias.stream()
                        .filter(item -> contas.podeAcessar(item.getConta().getId(), usuario))
                        .toList());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> criar(@Valid @RequestBody Pedido p, Authentication a) {
        var u = usuario(a);
        if (!contas.podeAcessar(p.contaId(), u))
            throw new SecurityException("Conta não permitida.");
        if (p.descricao().trim().length() > 200)
            throw new IllegalArgumentException("Descrição deve ter até 200 caracteres.");
        var cat = categorias.obter(p.categoriaId(), u);
        categorias.validarParaConta(cat, p.contaId(), u);
        if (cat.getTipo() != p.tipo())
            throw new IllegalArgumentException("Categoria incompatível com o tipo.");
        int qtd = p.quantidadeOcorrencias() == null ? 1 : p.quantidadeOcorrencias();
        if (qtd < 1 || qtd > 120)
            throw new IllegalArgumentException(
                    "A quantidade de ocorrências deve estar entre 1 e 120.");
        String freq = p.frequencia() == null ? "MENSAL" : p.frequencia();
        if (!List.of("MENSAL", "SEMANAL", "ANUAL").contains(freq))
            throw new IllegalArgumentException("Frequência inválida.");
        var conta = contaRepo.findById(p.contaId()).orElseThrow();
        String serie = qtd > 1 ? UUID.randomUUID().toString() : null;
        Compromisso primeiro = null;
        for (int i = 0; i < qtd; i++) {
            LocalDate data =
                    switch (freq) {
                        case "SEMANAL" -> p.vencimento().plusWeeks(i);
                        case "ANUAL" -> p.vencimento().plusYears(i);
                        default -> p.vencimento().plusMonths(i);
                    };
            var c = new Compromisso();
            c.setConta(conta);
            c.setCategoria(cat);
            c.setTipo(p.tipo());
            c.setDescricao(p.descricao().trim());
            c.setValor(p.valor());
            c.setVencimento(data);
            c.setSerieRecorrencia(serie);
            c = repo.save(c);
            if (primeiro == null) primeiro = c;
        }
        return dto(primeiro);
    }

    @PutMapping("/{id}")
    @Transactional
    public Map<String, Object> editar(
            @PathVariable Long id, @Valid @RequestBody Alteracao p, Authentication a) {
        var u = usuario(a);
        var atual = exigir(id, u);
        if (parcelas.existsByCompromissoId(id))
            throw new IllegalStateException("Parcelas do cartão não podem ser editadas aqui.");
        if (!"PENDENTE".equals(atual.getStatus()))
            throw new IllegalStateException("Compromisso pago não pode ser alterado.");
        if (!List.of("ATUAL", "PROXIMAS").contains(p.alcance()))
            throw new IllegalArgumentException("Alcance inválido.");
        if (!contas.podeAcessar(p.contaId(), u))
            throw new SecurityException("Conta não permitida.");
        if (p.descricao().trim().length() > 200)
            throw new IllegalArgumentException("Descrição muito longa.");
        var categoria = categorias.obter(p.categoriaId(), u);
        categorias.validarParaConta(categoria, p.contaId(), u);
        if (categoria.getTipo() != p.tipo())
            throw new IllegalArgumentException("Categoria incompatível.");
        var conta = contaRepo.findById(p.contaId()).orElseThrow();
        var lista =
                "PROXIMAS".equals(p.alcance()) && atual.getSerieRecorrencia() != null
                        ? repo.findBySerieRecorrenciaOrderByVencimentoAscIdAsc(
                                atual.getSerieRecorrencia())
                        : List.of(atual);
        long diferencaDias =
                java.time.temporal.ChronoUnit.DAYS.between(atual.getVencimento(), p.vencimento());
        for (var item : lista) {
            if (item.getVencimento().isBefore(atual.getVencimento())
                    || (item.getVencimento().equals(atual.getVencimento())
                            && item.getId() < atual.getId())) continue;
            if (!"PENDENTE".equals(item.getStatus())) continue;
            if (parcelas.existsByCompromissoId(item.getId())) continue;
            if (!contas.podeAcessar(item.getConta().getId(), u))
                throw new SecurityException("Acesso negado à série.");
            item.setConta(conta);
            item.setCategoria(categoria);
            item.setTipo(p.tipo());
            item.setDescricao(p.descricao().trim());
            item.setValor(p.valor());
            item.setVencimento(
                    item.getId().equals(id)
                            ? p.vencimento()
                            : item.getVencimento().plusDays(diferencaDias));
            repo.save(item);
        }
        return dto(atual);
    }

    @DeleteMapping("/{id}/proximas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void excluirProximas(@PathVariable Long id, Authentication a) {
        var u = usuario(a);
        var atual = exigir(id, u);
        if (parcelas.existsByCompromissoId(id))
            throw new IllegalStateException("Compras de cartão devem ser gerenciadas pelo cartão.");
        if (!"PENDENTE".equals(atual.getStatus()))
            throw new IllegalStateException("Selecione uma ocorrência pendente.");
        var lista =
                atual.getSerieRecorrencia() == null
                        ? List.of(atual)
                        : repo.findBySerieRecorrenciaOrderByVencimentoAscIdAsc(
                                atual.getSerieRecorrencia());
        for (var item : lista) {
            if (item.getVencimento().isBefore(atual.getVencimento())
                    || (item.getVencimento().equals(atual.getVencimento()) && item.getId() < id))
                continue;
            if (!contas.podeAcessar(item.getConta().getId(), u))
                throw new SecurityException("Acesso negado à série.");
            if ("PENDENTE".equals(item.getStatus())
                    && !parcelas.existsByCompromissoId(item.getId())) repo.delete(item);
        }
    }

    @PostMapping("/{id}/pagar")
    @Transactional
    public Map<String, Object> pagar(
            @PathVariable Long id, @Valid @RequestBody Pagamento p, Authentication a) {
        var u = usuario(a);
        var c = exigir(id, u);
        if (parcelas.existsByCompromissoId(id))
            throw new IllegalStateException("Pague a fatura do cartão, não a parcela individual.");
        if (!"PENDENTE".equals(c.getStatus()))
            throw new IllegalStateException("Compromisso já realizado.");
        if (!contas.podeAcessar(p.contaId(), u))
            throw new SecurityException("Conta não permitida.");
        var desconto = p.desconto() == null ? BigDecimal.ZERO : p.desconto();
        var acrescimo = p.acrescimo() == null ? BigDecimal.ZERO : p.acrescimo();
        if (desconto.signum() < 0 || acrescimo.signum() < 0)
            throw new IllegalArgumentException("Desconto e acréscimo não podem ser negativos.");
        if (c.getValor().subtract(desconto).add(acrescimo).compareTo(p.valorEfetivo()) != 0)
            throw new IllegalArgumentException(
                    "O valor efetivo deve ser igual ao previsto menos desconto mais acréscimo.");
        if (p.naturezaAcrescimo() != null
                && !List.of("JUROS", "OUTROS").contains(p.naturezaAcrescimo()))
            throw new IllegalArgumentException("Origem do acréscimo inválida.");
        if (p.observacao() != null && p.observacao().length() > 250)
            throw new IllegalArgumentException("Observação muito longa.");
        var contaPagamento = contaRepo.findById(p.contaId()).orElseThrow();
        categorias.validarParaConta(c.getCategoria(), p.contaId(), u);
        var lanc =
                lancamentos.criar(
                        new LancamentoRequest(
                                c.getTipo(),
                                c.getDescricao(),
                                c.getCategoria().getId(),
                                p.valorEfetivo(),
                                p.data(),
                                contaPagamento.getId()),
                        u);
        c.setDataPagamento(p.data());
        c.setValorEfetivo(p.valorEfetivo());
        c.setDesconto(desconto);
        c.setAcrescimo(acrescimo);
        c.setNaturezaAcrescimo(p.naturezaAcrescimo());
        c.setObservacaoPagamento(p.observacao());
        // Vincula o compromisso ao lançamento real em uma única transação.
        c.setLancamento(lancamentoRepo.findById(lanc.id()).orElseThrow());
        c.setStatus("PAGO");
        return dto(repo.save(c));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void excluir(@PathVariable Long id, Authentication a) {
        var c = exigir(id, usuario(a));
        if (parcelas.existsByCompromissoId(id))
            throw new IllegalStateException("Compras de cartão devem ser gerenciadas pelo cartão.");
        if (!"PENDENTE".equals(c.getStatus()))
            throw new IllegalStateException(
                    "Um compromisso pago não pode ser excluído. Consulte o extrato.");
        repo.delete(c);
    }

    @PutMapping("/celula")
    @Transactional
    public Map<String, Object> salvarCelula(
            @Valid @RequestBody CelulaPedido p, Authentication a) {
        var u = usuario(a);
        if (!contas.podeAcessar(p.contaId(), u))
            throw new SecurityException("Conta não permitida.");
        if (p.descricao().trim().length() > 200)
            throw new IllegalArgumentException("Descrição deve ter até 200 caracteres.");
        boolean preenchido = valorPreenchido(p.valor());
        if (p.id() == null && !preenchido)
            throw new IllegalArgumentException("Informe o valor da célula.");
        String linha = normalizarLinha(p.linhaPlanejamento(), p.id() == null);
        if (linha != null) vincular(linha, p.vincular(), u);
        if (p.id() == null) return dto(criarCelula(p, u, linha));

        var atual = exigir(p.id(), u);
        if (parcelas.existsByCompromissoId(atual.getId()))
            throw new IllegalStateException("Parcelas do cartão não podem ser editadas aqui.");
        if (!"PENDENTE".equals(atual.getStatus()))
            throw new IllegalStateException("Compromisso pago não pode ser alterado.");
        if (linha != null) {
            var atualLinha = atual.getLinhaPlanejamento();
            if (atualLinha != null && !atualLinha.equals(linha))
                throw new IllegalArgumentException("A célula pertence a outra linha.");
            atual.setLinhaPlanejamento(linha);
        }
        if (!preenchido) {
            Long id = atual.getId();
            repo.delete(atual);
            var resposta = new LinkedHashMap<String, Object>();
            resposta.put("removido", true);
            resposta.put("id", id);
            if (linha != null) resposta.put("linhaPlanejamento", linha);
            return resposta;
        }
        atual.setValor(p.valor());
        return dto(repo.save(atual));
    }

    @PutMapping("/linhas/{linha}")
    @Transactional
    public List<Map<String, Object>> atualizarLinha(
            @PathVariable String linha, @Valid @RequestBody LinhaPedido p, Authentication a) {
        var u = usuario(a);
        String idLinha = normalizarLinha(linha, false);
        if (idLinha == null)
            throw new IllegalArgumentException("Identificador da linha inválido.");
        if (!contas.podeAcessar(p.contaId(), u))
            throw new SecurityException("Conta não permitida.");
        if (p.descricao().trim().length() > 200)
            throw new IllegalArgumentException("Descrição deve ter até 200 caracteres.");
        var categoria = categorias.obter(p.categoriaId(), u);
        categorias.validarParaConta(categoria, p.contaId(), u);
        if (categoria.getTipo() != p.tipo())
            throw new IllegalArgumentException("Categoria incompatível com o tipo.");
        var conta = contaRepo.findById(p.contaId()).orElseThrow();
        vincular(idLinha, p.vincular(), u);
        for (var item : repo.findByLinhaPlanejamentoOrderByVencimentoAscIdAsc(idLinha)) {
            if (!contas.podeAcessar(item.getConta().getId(), u)) continue;
            if (parcelas.existsByCompromissoId(item.getId())) continue;
            if (!"PENDENTE".equals(item.getStatus())) continue;
            item.setConta(conta);
            item.setCategoria(categoria);
            item.setTipo(p.tipo());
            item.setDescricao(p.descricao().trim());
            int dia = Math.min(p.diaVencimento(), item.getVencimento().lengthOfMonth());
            item.setVencimento(item.getVencimento().withDayOfMonth(dia));
            repo.save(item);
        }
        return mapear(
                repo.findByLinhaPlanejamentoOrderByVencimentoAscIdAsc(idLinha).stream()
                        .filter(item -> contas.podeAcessar(item.getConta().getId(), u))
                        .toList());
    }

    @DeleteMapping("/linhas/{linha}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void excluirLinha(
            @PathVariable String linha,
            @RequestBody(required = false) IdsPedido body,
            Authentication a) {
        var u = usuario(a);
        String idLinha = normalizarLinha(linha, false);
        if (idLinha == null)
            throw new IllegalArgumentException("Identificador da linha inválido.");
        if (body != null) vincular(idLinha, body.vincular(), u);
        for (var item : repo.findByLinhaPlanejamentoOrderByVencimentoAscIdAsc(idLinha)) {
            if (!contas.podeAcessar(item.getConta().getId(), u)) continue;
            if (parcelas.existsByCompromissoId(item.getId())) continue;
            if (!"PENDENTE".equals(item.getStatus())) continue;
            repo.delete(item);
        }
    }

    private List<Long> idsDasContas(Long contaId, Long grupoId, Usuario u) {
        if (contaId != null) {
            if (!contas.podeAcessar(contaId, u))
                throw new SecurityException("Conta não permitida.");
            return List.of(contaId);
        }
        if (grupoId != null) return contas.doGrupo(grupoId, u).stream().map(c -> c.getId()).toList();
        return contas.acessiveis(u).stream().map(c -> c.getId()).toList();
    }

    private boolean texto(String valor) {
        return valor != null && !valor.isBlank();
    }

    private YearMonth lerMes(String valor, String nome) {
        try {
            return YearMonth.parse(valor.trim());
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("Informe " + nome + " no formato aaaa-mm.");
        }
    }

    private boolean valorPreenchido(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) == 0) return false;
        if (valor.compareTo(new BigDecimal("0.01")) < 0)
            throw new IllegalArgumentException("Informe um valor maior que zero.");
        return true;
    }

    private String normalizarLinha(String linha, boolean gerar) {
        if (linha == null || linha.isBlank()) return gerar ? UUID.randomUUID().toString() : null;
        String t = linha.trim();
        if (t.length() > 36 || !t.matches("[A-Za-z0-9-]+"))
            throw new IllegalArgumentException("Identificador da linha inválido.");
        return t;
    }

    private void vincular(String linha, List<Long> ids, Usuario u) {
        if (ids == null) return;
        for (Long id : ids) {
            if (id == null) continue;
            var item = exigir(id, u);
            if (parcelas.existsByCompromissoId(item.getId()))
                throw new IllegalStateException("Parcelas do cartão não entram na grade.");
            var atual = item.getLinhaPlanejamento();
            if (atual != null && !atual.equals(linha))
                throw new IllegalArgumentException("A célula pertence a outra linha.");
            if (atual == null) {
                item.setLinhaPlanejamento(linha);
                repo.save(item);
            }
        }
    }

    private void exigirMesLivre(String linha, LocalDate vencimento) {
        var ym = YearMonth.from(vencimento);
        for (var item : repo.findByLinhaPlanejamentoOrderByVencimentoAscIdAsc(linha)) {
            if (parcelas.existsByCompromissoId(item.getId())) continue;
            if (YearMonth.from(item.getVencimento()).equals(ym))
                throw new IllegalStateException("Já existe um valor neste mês da linha.");
        }
    }

    private Compromisso criarCelula(CelulaPedido p, Usuario u, String linha) {
        var cat = categorias.obter(p.categoriaId(), u);
        categorias.validarParaConta(cat, p.contaId(), u);
        if (cat.getTipo() != p.tipo())
            throw new IllegalArgumentException("Categoria incompatível com o tipo.");
        exigirMesLivre(linha, p.vencimento());
        var c = new Compromisso();
        c.setConta(contaRepo.findById(p.contaId()).orElseThrow());
        c.setCategoria(cat);
        c.setTipo(p.tipo());
        c.setDescricao(p.descricao().trim());
        c.setValor(p.valor());
        c.setVencimento(p.vencimento());
        c.setLinhaPlanejamento(linha);
        c.setStatus("PENDENTE");
        return repo.save(c);
    }
}
