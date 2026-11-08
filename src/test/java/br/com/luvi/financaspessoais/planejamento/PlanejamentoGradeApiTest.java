package br.com.luvi.financaspessoais.planejamento;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.luvi.financaspessoais.cartao.Cartao;
import br.com.luvi.financaspessoais.cartao.CartaoRepository;
import br.com.luvi.financaspessoais.cartao.Compra;
import br.com.luvi.financaspessoais.cartao.CompraRepository;
import br.com.luvi.financaspessoais.cartao.Parcela;
import br.com.luvi.financaspessoais.cartao.ParcelaRepository;
import br.com.luvi.financaspessoais.categoria.dto.CategoriaResponse;
import br.com.luvi.financaspessoais.categoria.service.CategoriaService;
import br.com.luvi.financaspessoais.conta.entity.ContaFinanceira;
import br.com.luvi.financaspessoais.conta.service.ContaService;
import br.com.luvi.financaspessoais.lancamento.enums.TipoLancamento;
import br.com.luvi.financaspessoais.usuario.entity.Usuario;
import br.com.luvi.financaspessoais.usuario.service.UsuarioService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlanejamentoGradeApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UsuarioService usuarios;
    @Autowired ContaService contas;
    @Autowired CategoriaService categorias;
    @Autowired CompromissoRepository compromissos;
    @Autowired CartaoRepository cartoes;
    @Autowired CompraRepository compras;
    @Autowired ParcelaRepository parcelas;

    String email;
    Usuario usuario;
    ContaFinanceira conta;
    CategoriaResponse moradia;

    @BeforeEach
    void base() {
        email = "grade-" + UUID.randomUUID() + "@example.com";
        usuario = usuarios.cadastrar("Ana Grade", email, "senha123");
        conta = contas.criar("Conta da Ana", "BANCO", "#285681", usuario);
        moradia =
                categorias.listar(null, usuario).stream()
                        .filter(c -> c.tipo() == TipoLancamento.DESPESA && "Moradia".equals(c.nome()))
                        .findFirst()
                        .orElseThrow();
    }

    @Test
    void gradeMantemCamposEGravaSoOValorDoMes() throws Exception {
        var novembro = celula(null, "linha-aluguel", "Aluguel", "1800.00", "2026-11-10");
        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON).content(novembro))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.descricao").value("Aluguel"))
                .andExpect(jsonPath("$.categoria").value("Moradia"))
                .andExpect(jsonPath("$.tipo").value("DESPESA"))
                .andExpect(jsonPath("$.contaId").value(conta.getId()))
                .andExpect(jsonPath("$.vencimento").value("2026-11-10"))
                .andExpect(jsonPath("$.linhaPlanejamento").value("linha-aluguel"))
                .andExpect(jsonPath("$.parcelaCartao").value(false))
                .andExpect(jsonPath("$.status").value("PENDENTE"));
        long idNovembro = compromissos.findByLinhaPlanejamentoOrderByVencimentoAscIdAsc("linha-aluguel").get(0).getId();

        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(celula(null, "linha-aluguel", "Aluguel", "1900.00", "2026-12-10")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/planejamento").with(auth()).param("de", "2026-11").param("ate", "2027-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].vencimento").value("2026-11-10"))
                .andExpect(jsonPath("$[0].categoria").value("Moradia"))
                .andExpect(jsonPath("$[1].vencimento").value("2026-12-10"))
                .andExpect(jsonPath("$[1].descricao").value("Aluguel"));

        mvc.perform(get("/api/planejamento").with(auth()).param("mes", "11").param("ano", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(celula(idNovembro, "linha-aluguel", "Nome que nao pode gravar", "2000.00", "2026-11-01")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valor").value(2000.0))
                .andExpect(jsonPath("$.descricao").value("Aluguel"))
                .andExpect(jsonPath("$.vencimento").value("2026-11-10"));

        mvc.perform(post("/api/planejamento/" + idNovembro + "/pagar").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(pagamento(2000)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAGO"));

        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(celula(idNovembro, "linha-aluguel", "Aluguel", "2100.00", "2026-11-10")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("pago")));

        mvc.perform(put("/api/planejamento/linhas/linha-aluguel").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"descricao":"Aluguel novo","categoriaId":%d,"contaId":%d,"tipo":"DESPESA","diaVencimento":5}
                                """.formatted(moradia.id(), conta.getId())))
                .andExpect(status().isOk());

        JsonNode intervalo = corpo(mvc.perform(get("/api/planejamento").with(auth()).param("de", "2026-11").param("ate", "2026-12"))
                .andExpect(status().isOk())
                .andReturn());
        JsonNode pago = intervalo.get(0);
        JsonNode pendente = intervalo.get(1);
        org.junit.jupiter.api.Assertions.assertEquals("PAGO", pago.get("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Aluguel", pago.get("descricao").asText());
        org.junit.jupiter.api.Assertions.assertEquals("2026-11-10", pago.get("vencimento").asText());
        org.junit.jupiter.api.Assertions.assertEquals("PENDENTE", pendente.get("status").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Aluguel novo", pendente.get("descricao").asText());
        org.junit.jupiter.api.Assertions.assertEquals("Moradia", pendente.get("categoria").asText());
        org.junit.jupiter.api.Assertions.assertEquals("2026-12-05", pendente.get("vencimento").asText());

        mvc.perform(delete("/api/planejamento/linhas/linha-aluguel").with(auth()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/planejamento").with(auth()).param("de", "2026-11").param("ate", "2026-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("PAGO"))
                .andExpect(jsonPath("$[0].descricao").value("Aluguel"));

        long avulso = json.readTree(mvc.perform(post("/api/planejamento").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"contaId":%d,"categoriaId":%d,"tipo":"DESPESA","descricao":"Internet","valor":120.00,"vencimento":"2026-11-15","quantidadeOcorrencias":1}
                                """.formatted(conta.getId(), moradia.id())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(get("/api/planejamento").with(auth()).param("mes", "11").param("ano", "2026"))
                .andExpect(jsonPath("$[?(@.id == %d)].descricao".formatted(avulso)).value("Internet"))
                .andExpect(jsonPath("$[?(@.id == %d)].categoria".formatted(avulso)).value("Moradia"))
                .andExpect(jsonPath("$[?(@.id == %d)].vencimento".formatted(avulso)).value("2026-11-15"));

        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(celula(avulso, "linha-internet", "Internet", null, "2026-11-15")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.removido").value(true));
    }

    @Test
    void parcelaDeCartaoNaoEntraNaEdicao() throws Exception {
        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(celula(null, "linha-parcela", "Mercado", "150.00", "2026-11-12")))
                .andExpect(status().isOk());
        var compromisso = compromissos.findByLinhaPlanejamentoOrderByVencimentoAscIdAsc("linha-parcela").get(0);
        var cartao = new Cartao();
        cartao.nome = "Cartao teste";
        cartao.fechamento = 5;
        cartao.vencimento = 12;
        cartao.proprietario = usuario;
        cartao.contaPagamento = conta;
        cartao = cartoes.save(cartao);
        var compra = new Compra();
        compra.cartao = cartao;
        compra.descricao = "Mercado";
        compra.dataCompra = LocalDate.of(2026, 11, 2);
        compra.total = new BigDecimal("150.00");
        compra.quantidadeParcelas = 1;
        compra = compras.save(compra);
        var parcela = new Parcela();
        parcela.compra = compra;
        parcela.numero = 1;
        parcela.compromisso = compromisso;
        parcelas.saveAndFlush(parcela);

        mvc.perform(get("/api/planejamento").with(auth()).param("de", "2026-11").param("ate", "2026-11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].parcelaCartao").value(true))
                .andExpect(jsonPath("$[0].descricao").value("Mercado"))
                .andExpect(jsonPath("$[0].categoria").value("Moradia"));
        mvc.perform(put("/api/planejamento/celula").with(auth()).contentType(MediaType.APPLICATION_JSON)
                        .content(celula(compromisso.getId(), "linha-parcela", "Mercado", "180.00", "2026-11-12")))
                .andExpect(status().isConflict());
    }

    @Test
    void intervaloInvalidoEContaDeOutraPessoa() throws Exception {
        mvc.perform(get("/api/planejamento").with(auth()).param("de", "2026-01").param("ate", "2029-01"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/planejamento").with(auth()).param("de", "2026-11"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/planejamento").with(auth()))
                .andExpect(status().isBadRequest());

        String outroEmail = "outro-" + UUID.randomUUID() + "@example.com";
        usuarios.cadastrar("Outra Pessoa", outroEmail, "senha123");
        mvc.perform(get("/api/planejamento").with(user(outroEmail).roles("USER")).param("de", "2026-11").param("ate", "2026-12").param("contaId", String.valueOf(conta.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void paginaInicialAbreSemSplashEMantemOMenu() throws Exception {
        mvc.perform(get("/").with(auth()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("id=\"planejamentoGradeModal\"")))
                .andExpect(content().string(containsString("Despesas planejadas")))
                .andExpect(content().string(containsString("Novo compromisso")))
                .andExpect(content().string(not(containsString("luviWelcomeSplash"))))
                .andExpect(content().string(containsString("Contas financeiras")))
                .andExpect(content().string(containsString("Cartões de crédito")))
                .andExpect(content().string(containsString("> Categorias<")))
                .andExpect(content().string(containsString("> Grupos<")))
                .andExpect(content().string(containsString("id=\"reportsMenu\"")));
        mvc.perform(get("/css/style.css"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("#reportsMenu")))
                .andExpect(content().string(containsString("#passkeySettings")));
        mvc.perform(get("/css/login.css"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(".google-button")))
                .andExpect(content().string(containsString("#passkeyLogin")));
        mvc.perform(get("/js/planejamento-grade.js"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("/api/planejamento/celula")))
                .andExpect(content().string(containsString("parcelaCartao")));
    }

    private String celula(Long id, String linha, String descricao, String valor, String vencimento) throws Exception {
        ObjectNode no = json.createObjectNode();
        if (id != null) no.put("id", id);
        else no.putNull("id");
        no.put("linhaPlanejamento", linha);
        no.put("contaId", conta.getId());
        no.put("categoriaId", moradia.id());
        no.put("tipo", "DESPESA");
        no.put("descricao", descricao);
        if (valor == null) no.putNull("valor");
        else no.put("valor", new BigDecimal(valor));
        no.put("vencimento", vencimento);
        return json.writeValueAsString(no);
    }

    private String pagamento(int valor) throws Exception {
        ObjectNode no = json.createObjectNode();
        no.put("data", "2026-11-08");
        no.put("contaId", conta.getId());
        no.put("valorEfetivo", valor);
        no.put("desconto", 0);
        no.put("acrescimo", 0);
        no.put("naturezaAcrescimo", "OUTROS");
        return json.writeValueAsString(no);
    }

    private JsonNode corpo(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor auth() {
        return user(email).roles("USER");
    }
}
