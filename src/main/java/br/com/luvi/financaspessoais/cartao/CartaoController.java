package br.com.luvi.financaspessoais.cartao;

import br.com.luvi.financaspessoais.conta.repository.ContaFinanceiraRepository;
import br.com.luvi.financaspessoais.conta.service.ContaService;
import br.com.luvi.financaspessoais.categoria.service.CategoriaService;
import br.com.luvi.financaspessoais.planejamento.*;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import br.com.luvi.financaspessoais.lancamento.dto.LancamentoRequest;
import br.com.luvi.financaspessoais.lancamento.service.LancamentoService;
import br.com.luvi.financaspessoais.lancamento.repository.LancamentoRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.*;
import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/cartoes")
public class CartaoController {
    private final CartaoRepository cartoes;
    private final CompraRepository compras;
    private final ParcelaRepository parcelas;
    private final CompromissoRepository compromissos;
    private final ContaFinanceiraRepository contasRepo;
    private final ContaService contas;
    private final CategoriaService categorias;
    private final UsuarioService usuarios;
    private final PagamentoFaturaRepository pagamentos;
    private final LancamentoService lancamentos;
    private final LancamentoRepository lancamentosRepo;

    public CartaoController(
            CartaoRepository c,
            CompraRepository co,
            ParcelaRepository p,
            CompromissoRepository cm,
            ContaFinanceiraRepository cr,
            ContaService cs,
            CategoriaService ca,
            UsuarioService u,
            PagamentoFaturaRepository pg,
            LancamentoService ls,
            LancamentoRepository lr) {
        cartoes = c;
        compras = co;
        parcelas = p;
        compromissos = cm;
        contasRepo = cr;
        contas = cs;
        categorias = ca;
        usuarios = u;
        pagamentos = pg;
        lancamentos = ls;
        lancamentosRepo = lr;
    }

    public record NovoCartao(
            @NotBlank String nome,
            Long contaPagamentoId,
            @Min(1) @Max(28) int fechamento,
            @Min(1) @Max(28) int vencimento,
            @DecimalMin("0.00") BigDecimal limiteCredito) {}

    public record ParcelaPedido(
            @NotNull LocalDate vencimento, @NotNull @DecimalMin("0.01") BigDecimal valor) {}

    public record NovaCompra(
            @NotNull Long cartaoId,
            @NotNull Long categoriaId,
            @NotBlank String descricao,
            @NotNull LocalDate dataCompra,
            @NotNull @DecimalMin("0.01") BigDecimal total,
            @Min(1) @Max(120) int quantidadeParcelas,
            @NotNull List<@Valid ParcelaPedido> parcelas) {}

    public record PagarFatura(
            @NotNull Long contaId,
            @NotNull LocalDate data,
            @NotNull @DecimalMin("0.01") BigDecimal valor) {}

    private Usuario usuario(Authentication a) {
        return usuarios.atual(a.getName());
    }

    private Cartao autorizado(Long id, Authentication a) {
        var c =
                cartoes.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Cartão não encontrado."));
        var u = usuario(a);
        if (c.proprietario != null) {
            if (!c.proprietario.getId().equals(u.getId()))
                throw new SecurityException("Acesso negado.");
        } else if (c.contaPagamento == null || !contas.podeAcessar(c.contaPagamento.getId(), u))
            throw new SecurityException("Acesso negado.");
        return c;
    }

    private Map<String, Object> dto(Cartao c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id);
        m.put("nome", c.nome);
        m.put("contaPagamentoId", c.contaPagamento == null ? null : c.contaPagamento.getId());
        m.put("fechamento", c.fechamento);
        m.put("vencimento", c.vencimento);
        m.put("limiteCredito", c.limiteCredito);
        return m;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Authentication a) {
        var u = usuario(a);
        return cartoes.findAll().stream()
                .filter(
                        c ->
                                c.proprietario != null
                                        ? c.proprietario.getId().equals(u.getId())
                                        : c.contaPagamento != null
                                                && contas.podeAcessar(c.contaPagamento.getId(), u))
                .map(this::dto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> criar(@Valid @RequestBody NovoCartao p, Authentication a) {
        var u = usuario(a);
        if (p.nome().trim().length() > 120) throw new IllegalArgumentException("Nome muito longo.");
        var c = new Cartao();
        c.nome = p.nome().trim();
        c.proprietario = u;
        if (p.contaPagamentoId() != null) {
            if (!contas.podeAcessar(p.contaPagamentoId(), u))
                throw new SecurityException("Conta não permitida.");
            c.contaPagamento = contasRepo.findById(p.contaPagamentoId()).orElseThrow();
        }
        c.fechamento = p.fechamento();
        c.vencimento = p.vencimento();
        c.limiteCredito = p.limiteCredito();
        return dto(cartoes.save(c));
    }

    @GetMapping("/{id}/categorias")
    @Transactional
    public List<br.com.luvi.financaspessoais.categoria.dto.CategoriaResponse> categoriasCompra(
            @PathVariable Long id, Authentication a) {
        var c = autorizado(id, a);
        var u = usuario(a);
        var contaReferencia = c.contaPagamento;
        if (contaReferencia == null) {
            var disponiveis = contas.acessiveis(u);
            if (disponiveis.isEmpty())
                throw new IllegalArgumentException(
                        "Cadastre uma conta financeira para organizar as previsões.");
            contaReferencia = disponiveis.get(0);
        }
        return categorias.listarPorConta(contaReferencia.getId(), u);
    }

    @PostMapping("/compras")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, Object> comprar(@Valid @RequestBody NovaCompra p, Authentication a) {
        var c = autorizado(p.cartaoId(), a);
        var u = usuario(a);
        var cat = categorias.obter(p.categoriaId(), u);
        if (cat.getTipo() != TipoLancamento.DESPESA)
            throw new IllegalArgumentException("Selecione uma categoria de despesa.");
        if (p.descricao().trim().length() > 200)
            throw new IllegalArgumentException("Descrição muito longa.");
        if (p.parcelas().size() != p.quantidadeParcelas())
            throw new IllegalArgumentException("Quantidade de parcelas inválida.");
        if (p.total().scale() > 2 || p.parcelas().stream().anyMatch(x -> x.valor().scale() > 2))
            throw new IllegalArgumentException("Use no máximo duas casas decimais.");
        var soma =
                p.parcelas().stream()
                        .map(ParcelaPedido::valor)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (soma.compareTo(p.total()) != 0)
            throw new IllegalArgumentException(
                    "A soma das parcelas deve ser igual ao valor total.");
        // Para compras novas, exigimos uma conta padrão apenas como referência de escopo da
        // categoria.
        // Não há débito nesta conta até que a fatura seja paga.
        var contaReferencia = c.contaPagamento;
        if (contaReferencia == null) {
            var disponiveis = contas.acessiveis(u);
            if (disponiveis.isEmpty())
                throw new IllegalArgumentException(
                        "Cadastre uma conta financeira para organizar as previsões.");
            contaReferencia = disponiveis.get(0);
        }
        categorias.validarParaConta(cat, contaReferencia.getId(), u);
        var compra = new Compra();
        compra.cartao = c;
        compra.descricao = p.descricao().trim();
        compra.dataCompra = p.dataCompra();
        compra.total = p.total();
        compra.quantidadeParcelas = p.quantidadeParcelas();
        compra = compras.save(compra);
        int i = 0;
        LocalDate anterior = null;
        for (var pp : p.parcelas()) {
            if (anterior != null && !pp.vencimento().isAfter(anterior))
                throw new IllegalArgumentException("As datas das parcelas devem ser crescentes.");
            anterior = pp.vencimento();
            var compromisso = new Compromisso();
            compromisso.setConta(contaReferencia);
            compromisso.setCategoria(cat);
            compromisso.setTipo(TipoLancamento.DESPESA);
            compromisso.setDescricao(
                    compra.descricao + " (" + (++i) + "/" + p.quantidadeParcelas() + ")");
            compromisso.setValor(pp.valor());
            compromisso.setVencimento(pp.vencimento());
            compromisso = compromissos.save(compromisso);
            var parcela = new Parcela();
            parcela.compra = compra;
            parcela.numero = i;
            parcela.compromisso = compromisso;
            parcelas.save(parcela);
        }
        return Map.of("compraId", compra.id, "parcelas", i);
    }

    @GetMapping("/{id}/faturas")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> faturas(@PathVariable Long id, Authentication a) {
        var c = autorizado(id, a);
        var comprasCartao = compras.findByCartaoId(id);
        if (comprasCartao.isEmpty()) return List.of();
        var ids = comprasCartao.stream().map(x -> x.id).toList();
        var todos = parcelas.findByCompraCartaoIdIn(ids);
        Map<YearMonth, List<Parcela>> grupos = new TreeMap<>();
        for (var p : todos)
            grupos.computeIfAbsent(
                            YearMonth.from(p.compromisso.getVencimento()), k -> new ArrayList<>())
                    .add(p);
        List<Map<String, Object>> saida = new ArrayList<>();
        for (var e : grupos.entrySet()) {
            var competencia = e.getKey().atDay(1);
            var pg = pagamentos.findByCartaoIdAndCompetencia(id, competencia);
            var total =
                    e.getValue().stream()
                            .map(x -> x.compromisso.getValor())
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
            List<Map<String, Object>> itens = new ArrayList<>();
            for (var x : e.getValue()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("compromissoId", x.compromisso.getId());
                item.put("descricao", x.compra.descricao);
                item.put("numero", x.numero);
                item.put("quantidade", x.compra.quantidadeParcelas);
                item.put("valor", x.compromisso.getValor());
                item.put("vencimento", x.compromisso.getVencimento());
                item.put("categoria", x.compromisso.getCategoria().getNome());
                itens.add(item);
            }
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("competencia", competencia);
            f.put("total", total);
            f.put("paga", pg.isPresent());
            f.put("dataPagamento", pg.map(x -> x.dataPagamento).orElse(null));
            f.put("contaPagamentoId", pg.map(x -> x.conta.getId()).orElse(null));
            f.put("itens", itens);
            saida.add(f);
        }
        return saida;
    }

    @PostMapping("/{id}/faturas/{ano}/{mes}/pagar")
    @Transactional
    public Map<String, Object> pagar(
            @PathVariable Long id,
            @PathVariable int ano,
            @PathVariable int mes,
            @Valid @RequestBody PagarFatura pedido,
            Authentication a) {
        var cartao = autorizado(id, a);
        var u = usuario(a);
        var ym = YearMonth.of(ano, mes);
        var competencia = ym.atDay(1);
        if (pagamentos.findByCartaoIdAndCompetencia(id, competencia).isPresent())
            throw new IllegalStateException("Fatura já paga.");
        if (!contas.podeAcessar(pedido.contaId(), u))
            throw new SecurityException("Conta não permitida.");
        var comprasCartao = compras.findByCartaoId(id);
        if (comprasCartao.isEmpty())
            throw new IllegalArgumentException("Não há compras nesta fatura.");
        var todas = parcelas.findByCompraCartaoIdIn(comprasCartao.stream().map(x -> x.id).toList());
        var itens =
                todas.stream()
                        .filter(x -> YearMonth.from(x.compromisso.getVencimento()).equals(ym))
                        .toList();
        if (itens.isEmpty()) throw new IllegalArgumentException("Fatura vazia.");
        var total =
                itens.stream()
                        .map(x -> x.compromisso.getValor())
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (pedido.valor().compareTo(total) != 0)
            throw new IllegalArgumentException(
                    "Nesta versão, o pagamento deve ser integral e sem ajustes.");
        for (var x : itens)
            if (!"PENDENTE".equals(x.compromisso.getStatus()))
                throw new IllegalStateException(
                        "Há parcelas já quitadas individualmente. Verifique a fatura antes de pagar.");
        // Uma saída bancária única. As parcelas recebem status PAGO sem criar lançamentos
        // adicionais.
        var categoria = categorias.categoriaPagamentoFatura(pedido.contaId(), u);
        var lanc =
                lancamentos.criar(
                        new LancamentoRequest(
                                TipoLancamento.DESPESA,
                                "Pagamento fatura " + cartao.nome + " " + ym,
                                categoria.getId(),
                                total,
                                pedido.data(),
                                pedido.contaId()),
                        u);
        var lancamento = lancamentosRepo.findById(lanc.id()).orElseThrow();
        var pg = new PagamentoFatura();
        pg.cartao = cartao;
        pg.competencia = competencia;
        pg.conta = contasRepo.findById(pedido.contaId()).orElseThrow();
        pg.dataPagamento = pedido.data();
        pg.valor = total;
        pg.lancamento = lancamento;
        pagamentos.saveAndFlush(pg);
        for (var x : itens) {
            x.compromisso.setStatus("PAGO");
            x.compromisso.setDataPagamento(pedido.data());
            x.compromisso.setValorEfetivo(x.compromisso.getValor());
            compromissos.save(x.compromisso);
        }
        return Map.of("total", total, "parcelasQuitadas", itens.size());
    }
}
