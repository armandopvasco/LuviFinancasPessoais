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
@RestController @RequestMapping("/api/planejamento")
public class CompromissoController {
 private final br.com.luvi.financaspessoais.cartao.ParcelaRepository parcelas;private final CompromissoRepository repo;private final ContaService contas;private final ContaFinanceiraRepository contaRepo;private final CategoriaService categorias;private final UsuarioService usuarios;private final LancamentoService lancamentos;private final LancamentoRepository lancamentoRepo;
 public CompromissoController(CompromissoRepository r,ContaService cs,ContaFinanceiraRepository cr,CategoriaService cat,UsuarioService us,LancamentoService ls,LancamentoRepository lr,br.com.luvi.financaspessoais.cartao.ParcelaRepository pr){parcelas=pr;repo=r;contas=cs;contaRepo=cr;categorias=cat;usuarios=us;lancamentos=ls;lancamentoRepo=lr;}
 public record Pedido(@NotNull Long contaId,@NotNull Long categoriaId,@NotNull TipoLancamento tipo,@NotBlank String descricao,@NotNull @DecimalMin("0.01") BigDecimal valor,@NotNull LocalDate vencimento){}
 public record Pagamento(@NotNull LocalDate data,@NotNull Long contaId,@NotNull @DecimalMin("0.01") BigDecimal valorEfetivo,@DecimalMin("0.00") BigDecimal desconto,@DecimalMin("0.00") BigDecimal acrescimo,String naturezaAcrescimo,String observacao){}
 private Map<String,Object> dto(Compromisso c){Map<String,Object> m=new LinkedHashMap<>();m.put("id",c.getId());m.put("contaId",c.getConta().getId());m.put("contaNome",c.getConta().getNome());m.put("categoriaId",c.getCategoria().getId());m.put("categoria",c.getCategoria().getNome());m.put("tipo",c.getTipo().name());m.put("descricao",c.getDescricao());m.put("valor",c.getValor());m.put("vencimento",c.getVencimento());m.put("status",c.getStatus());m.put("dataPagamento",c.getDataPagamento());m.put("valorEfetivo",c.getValorEfetivo());m.put("desconto",c.getDesconto());m.put("acrescimo",c.getAcrescimo());m.put("naturezaAcrescimo",c.getNaturezaAcrescimo());m.put("observacao",c.getObservacaoPagamento());return m;}
 private Usuario usuario(Authentication a){return usuarios.atual(a.getName());}
 private Compromisso exigir(Long id,Usuario u){var c=repo.findById(id).orElseThrow(()->new IllegalArgumentException("Compromisso não encontrado."));if(!contas.podeAcessar(c.getConta().getId(),u))throw new SecurityException("Acesso negado.");return c;}
 @GetMapping @Transactional(readOnly=true) public List<Map<String,Object>> listar(@RequestParam int mes,@RequestParam int ano,@RequestParam(required=false) Long contaId,@RequestParam(required=false) Long grupoId,Authentication a){var u=usuario(a);List<Long> ids;
 if(contaId!=null){if(!contas.podeAcessar(contaId,u))throw new SecurityException("Conta não permitida.");ids=List.of(contaId);}else if(grupoId!=null){ids=contas.doGrupo(grupoId,u).stream().map(c->c.getId()).toList();}else{ids=contas.acessiveis(u).stream().map(c->c.getId()).toList();}
 if(ids.isEmpty())return List.of();var ym=YearMonth.of(ano,mes);return repo.findByContaIdInAndVencimentoBetweenOrderByVencimentoAscIdAsc(ids,ym.atDay(1),ym.atEndOfMonth()).stream().map(this::dto).toList();}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional public Map<String,Object> criar(@Valid @RequestBody Pedido p,Authentication a){var u=usuario(a);if(!contas.podeAcessar(p.contaId(),u))throw new SecurityException("Conta não permitida.");if(p.descricao().trim().length()>200)throw new IllegalArgumentException("Descrição deve ter até 200 caracteres.");var cat=categorias.obter(p.categoriaId(),u);categorias.validarParaConta(cat,p.contaId(),u);if(cat.getTipo()!=p.tipo())throw new IllegalArgumentException("Categoria incompatível com o tipo.");var c=new Compromisso();c.setConta(contaRepo.findById(p.contaId()).orElseThrow());c.setCategoria(cat);c.setTipo(p.tipo());c.setDescricao(p.descricao().trim());c.setValor(p.valor());c.setVencimento(p.vencimento());return dto(repo.save(c));}
 @PostMapping("/{id}/pagar") @Transactional public Map<String,Object> pagar(@PathVariable Long id,@Valid @RequestBody Pagamento p,Authentication a){var u=usuario(a);var c=exigir(id,u);if(parcelas.existsByCompromissoId(id))throw new IllegalStateException("Pague a fatura do cartão, não a parcela individual.");if(!"PENDENTE".equals(c.getStatus()))throw new IllegalStateException("Compromisso já realizado.");
 if(!contas.podeAcessar(p.contaId(),u))throw new SecurityException("Conta não permitida.");
 var desconto=p.desconto()==null?BigDecimal.ZERO:p.desconto();var acrescimo=p.acrescimo()==null?BigDecimal.ZERO:p.acrescimo();
 if(desconto.signum()<0||acrescimo.signum()<0)throw new IllegalArgumentException("Desconto e acréscimo não podem ser negativos.");
 if(c.getValor().subtract(desconto).add(acrescimo).compareTo(p.valorEfetivo())!=0)throw new IllegalArgumentException("O valor efetivo deve ser igual ao previsto menos desconto mais acréscimo.");
 if(p.naturezaAcrescimo()!=null&&!List.of("JUROS","OUTROS").contains(p.naturezaAcrescimo()))throw new IllegalArgumentException("Origem do acréscimo inválida.");
 if(p.observacao()!=null&&p.observacao().length()>250)throw new IllegalArgumentException("Observação muito longa.");
 var contaPagamento=contaRepo.findById(p.contaId()).orElseThrow();
 categorias.validarParaConta(c.getCategoria(),p.contaId(),u);
 var lanc=lancamentos.criar(new LancamentoRequest(c.getTipo(),c.getDescricao(),c.getCategoria().getId(),p.valorEfetivo(),p.data(),contaPagamento.getId()),u);
 c.setDataPagamento(p.data());c.setValorEfetivo(p.valorEfetivo());c.setDesconto(desconto);c.setAcrescimo(acrescimo);c.setNaturezaAcrescimo(p.naturezaAcrescimo());c.setObservacaoPagamento(p.observacao());
 // Vincula o compromisso ao lançamento real em uma única transação.
 c.setLancamento(lancamentoRepo.findById(lanc.id()).orElseThrow());c.setStatus("PAGO");return dto(repo.save(c));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional public void excluir(@PathVariable Long id,Authentication a){var c=exigir(id,usuario(a));if(parcelas.existsByCompromissoId(id))throw new IllegalStateException("Compras de cartão devem ser gerenciadas pelo cartão.");if(!"PENDENTE".equals(c.getStatus()))throw new IllegalStateException("Um compromisso pago não pode ser excluído. Consulte o extrato.");repo.delete(c);}
}
