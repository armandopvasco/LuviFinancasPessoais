let dataAtual = new Date();

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const categorias = {
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

const mesAtual = document.getElementById("mesAtual");
const tabela = document.getElementById("tabelaLancamentos");
const semLancamentos = document.getElementById("semLancamentos");
const modal = document.getElementById("modal");
const form = document.getElementById("formLancamento");

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function atualizarTitulo() {
    mesAtual.textContent =
        `${meses[dataAtual.getMonth()]} / ${dataAtual.getFullYear()}`;
}

async function carregarLancamentos() {
    atualizarTitulo();

    const mes = dataAtual.getMonth() + 1;
    const ano = dataAtual.getFullYear();

    const resposta = await fetch(`/api/lancamentos?mes=${mes}&ano=${ano}`);
    const lancamentos = await resposta.json();

    tabela.innerHTML = "";

    let receitas = 0;
    let despesas = 0;

    lancamentos.forEach(lancamento => {
        if (lancamento.tipo === "RECEITA") {
            receitas += Number(lancamento.valor);
        } else {
            despesas += Number(lancamento.valor);
        }

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatarData(lancamento.data)}</td>
            <td>${escaparHtml(lancamento.descricao)}</td>
            <td>${categorias[lancamento.categoria] || lancamento.categoria}</td>
            <td class="${lancamento.tipo === "RECEITA" ? "tipo-receita" : "tipo-despesa"}">
                ${lancamento.tipo === "RECEITA" ? "Receita" : "Despesa"}
            </td>
            <td>${formatarMoeda(lancamento.valor)}</td>
            <td>
                <button class="btn-editar" onclick="editar(${lancamento.id})">✏️</button>
                <button class="btn-excluir" onclick="excluir(${lancamento.id})">🗑️</button>
            </td>
        `;

        tabela.appendChild(tr);
    });

    document.getElementById("totalReceitas").textContent = formatarMoeda(receitas);
    document.getElementById("totalDespesas").textContent = formatarMoeda(despesas);
    document.getElementById("saldo").textContent = formatarMoeda(receitas - despesas);

    semLancamentos.style.display = lancamentos.length ? "none" : "block";
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function abrirNovo() {
    form.reset();
    document.getElementById("id").value = "";
    document.getElementById("tituloModal").textContent = "Novo lançamento";

    const hoje = new Date();
    const data = new Date(
        hoje.getTime() - hoje.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];

    document.getElementById("data").value = data;
    modal.classList.remove("escondido");
}

function fecharModal() {
    modal.classList.add("escondido");
}

async function editar(id) {
    const resposta = await fetch(`/api/lancamentos/${id}`);
    const lancamento = await resposta.json();

    document.getElementById("id").value = lancamento.id;
    document.getElementById("tipo").value = lancamento.tipo;
    document.getElementById("descricao").value = lancamento.descricao;
    document.getElementById("categoria").value = lancamento.categoria;
    document.getElementById("valor").value = lancamento.valor;
    document.getElementById("data").value = lancamento.data;

    document.getElementById("tituloModal").textContent = "Editar lançamento";
    modal.classList.remove("escondido");
}

async function excluir(id) {
    if (!confirm("Deseja realmente excluir este lançamento?")) {
        return;
    }

    const resposta = await fetch(`/api/lancamentos/${id}`, {
        method: "DELETE"
    });

    if (resposta.ok) {
        await carregarLancamentos();
    } else {
        alert("Não foi possível excluir o lançamento.");
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const id = document.getElementById("id").value;

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

    if (resposta.ok) {
        fecharModal();
        await carregarLancamentos();
    } else {
        const erro = await resposta.json().catch(() => null);
        alert(erro?.message || "Não foi possível salvar o lançamento.");
    }
});

document.getElementById("novoLancamento").addEventListener("click", abrirNovo);
document.getElementById("fecharModal").addEventListener("click", fecharModal);
document.getElementById("cancelar").addEventListener("click", fecharModal);

document.getElementById("mesAnterior").addEventListener("click", () => {
    dataAtual.setMonth(dataAtual.getMonth() - 1);
    carregarLancamentos();
});

document.getElementById("mesProximo").addEventListener("click", () => {
    dataAtual.setMonth(dataAtual.getMonth() + 1);
    carregarLancamentos();
});

carregarLancamentos();
