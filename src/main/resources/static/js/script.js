let dataAtual = new Date();
let lancamentos = [];

const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const form = document.getElementById("lancamentoForm");
const modal = document.getElementById("modal");

document.addEventListener("DOMContentLoaded", async () => {
    await carregarCategorias();
    await carregarLancamentos();

    document.getElementById("mesAnterior").addEventListener("click", async () => {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
        await carregarLancamentos();
    });

    document.getElementById("mesProximo").addEventListener("click", async () => {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        await carregarLancamentos();
    });

    document.getElementById("novoLancamento").addEventListener("click", abrirNovo);
    document.getElementById("fecharModal").addEventListener("click", fecharModal);
    document.getElementById("cancelarModal").addEventListener("click", fecharModal);
    form.addEventListener("submit", salvarLancamento);
});

async function carregarCategorias() {
    const resposta = await fetch("/api/categorias");

    if (!resposta.ok) {
        return;
    }

    const categorias = await resposta.json();
    const select = document.getElementById("categoria");

    select.innerHTML = categorias
        .map(c => `<option value="${c.valor}">${c.descricao}</option>`)
        .join("");
}

async function carregarLancamentos() {
    const mes = dataAtual.getMonth() + 1;
    const ano = dataAtual.getFullYear();

    document.getElementById("mesAtual").textContent =
        `${nomesMeses[mes - 1]} de ${ano}`;

    const resposta = await fetch(`/api/lancamentos?mes=${mes}&ano=${ano}`);

    if (resposta.status === 401 || resposta.redirected) {
        window.location.href = "/login";
        return;
    }

    if (!resposta.ok) {
        alert("Não foi possível carregar os lançamentos.");
        return;
    }

    lancamentos = await resposta.json();
    renderizar();
}

function renderizar() {
    const body = document.getElementById("lancamentosBody");
    const vazio = document.getElementById("semLancamentos");

    body.innerHTML = "";

    if (lancamentos.length === 0) {
        vazio.style.display = "block";
    } else {
        vazio.style.display = "none";
    }

    let receitas = 0;
    let despesas = 0;

    lancamentos.forEach(lancamento => {
        const valor = Number(lancamento.valor);

        if (lancamento.tipo === "RECEITA") {
            receitas += valor;
        } else {
            despesas += valor;
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatarData(lancamento.data)}</td>
            <td class="${lancamento.tipo === "RECEITA" ? "tipo-receita" : "tipo-despesa"}">
                ${lancamento.tipo === "RECEITA" ? "Receita" : "Despesa"}
            </td>
            <td>${escaparHtml(lancamento.descricao)}</td>
            <td>${formatarCategoria(lancamento.categoria)}</td>
            <td>${formatarMoeda(valor)}</td>
            <td>
                <button class="acao editar" onclick="editarLancamento(${lancamento.id})">Editar</button>
                <button class="acao excluir" onclick="excluirLancamento(${lancamento.id})">Excluir</button>
            </td>
        `;

        body.appendChild(tr);
    });

    document.getElementById("totalReceitas").textContent = formatarMoeda(receitas);
    document.getElementById("totalDespesas").textContent = formatarMoeda(despesas);
    document.getElementById("saldo").textContent = formatarMoeda(receitas - despesas);
}

function abrirNovo() {
    document.getElementById("modalTitulo").textContent = "Novo lançamento";
    document.getElementById("lancamentoId").value = "";
    document.getElementById("tipo").value = "DESPESA";
    document.getElementById("descricao").value = "";
    document.getElementById("categoria").value = "OUTROS";
    document.getElementById("valor").value = "";
    document.getElementById("data").value = hojeISO();
    document.getElementById("formError").textContent = "";

    modal.classList.remove("hidden");
}

function editarLancamento(id) {
    const lancamento = lancamentos.find(l => l.id === id);

    if (!lancamento) {
        return;
    }

    document.getElementById("modalTitulo").textContent = "Editar lançamento";
    document.getElementById("lancamentoId").value = lancamento.id;
    document.getElementById("tipo").value = lancamento.tipo;
    document.getElementById("descricao").value = lancamento.descricao;
    document.getElementById("categoria").value = lancamento.categoria;
    document.getElementById("valor").value = lancamento.valor;
    document.getElementById("data").value = lancamento.data;
    document.getElementById("formError").textContent = "";

    modal.classList.remove("hidden");
}

async function salvarLancamento(event) {
    event.preventDefault();

    const id = document.getElementById("lancamentoId").value;

    const dados = {
        tipo: document.getElementById("tipo").value,
        descricao: document.getElementById("descricao").value,
        categoria: document.getElementById("categoria").value,
        valor: Number(document.getElementById("valor").value),
        data: document.getElementById("data").value
    };

    const resposta = await fetch(
        id ? `/api/lancamentos/${id}` : "/api/lancamentos",
        {
            method: id ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        }
    );

    if (!resposta.ok) {
        let mensagem = "Não foi possível salvar o lançamento.";

        try {
            const erro = await resposta.json();
            if (erro.message) {
                mensagem = erro.message;
            }
        } catch (_) {
            // Mantém a mensagem padrão.
        }

        document.getElementById("formError").textContent = mensagem;
        return;
    }

    fecharModal();
    await carregarLancamentos();
}

async function excluirLancamento(id) {
    if (!confirm("Deseja realmente excluir este lançamento?")) {
        return;
    }

    const resposta = await fetch(`/api/lancamentos/${id}`, {
        method: "DELETE"
    });

    if (!resposta.ok) {
        alert("Não foi possível excluir o lançamento.");
        return;
    }

    await carregarLancamentos();
}

function fecharModal() {
    modal.classList.add("hidden");
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarCategoria(categoria) {
    const mapa = {
        SALARIO: "Salário",
        RENDA_EXTRA: "Renda extra",
        ALIMENTACAO: "Alimentação",
        MORADIA: "Moradia",
        TRANSPORTE: "Transporte",
        SAUDE: "Saúde",
        EDUCACAO: "Educação",
        LAZER: "Lazer",
        CONTAS: "Contas",
        OUTROS: "Outros"
    };

    return mapa[categoria] || categoria;
}

function hojeISO() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const data = new Date(hoje.getTime() - offset * 60 * 1000);
    return data.toISOString().slice(0, 10);
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}
