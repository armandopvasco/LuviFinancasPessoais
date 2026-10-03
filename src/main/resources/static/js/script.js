let dataAtual = new Date();
let lancamentos = [];
let ordenacao = { campo: "data", direcao: "desc" };
const nomesMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const form = document.getElementById("lancamentoForm");
const modal = document.getElementById("modal");

document.addEventListener("DOMContentLoaded", async () => {
    await carregarCategorias(); await carregarDadosMes();
    document.getElementById("mesAnterior").addEventListener("click", async () => { dataAtual.setMonth(dataAtual.getMonth()-1); await carregarDadosMes(); });
    document.getElementById("mesProximo").addEventListener("click", async () => { dataAtual.setMonth(dataAtual.getMonth()+1); await carregarDadosMes(); });
    document.getElementById("novoLancamento").addEventListener("click", abrirNovo);
    document.getElementById("fecharModal").addEventListener("click", fecharModal);
    document.getElementById("cancelarModal").addEventListener("click", fecharModal);
    form.addEventListener("submit", salvarLancamento);
    document.querySelectorAll("th.sortable").forEach(th => th.addEventListener("click", () => alterarOrdenacao(th.dataset.sort)));
});

async function carregarCategorias() {
    const resposta = await fetch("/api/categorias"); if (!resposta.ok) return;
    const categorias = await resposta.json();
    document.getElementById("categoria").innerHTML = categorias.map(c => `<option value="${c.valor}">${c.descricao}</option>`).join("");
}
async function carregarDadosMes() { await Promise.all([carregarLancamentos(), carregarResumo()]); }
async function carregarLancamentos() {
    const mes=dataAtual.getMonth()+1, ano=dataAtual.getFullYear();
    document.getElementById("mesAtual").textContent=`${nomesMeses[mes-1]} de ${ano}`;
    const resposta=await fetch(`/api/lancamentos?mes=${mes}&ano=${ano}`);
    if (resposta.status===401 || resposta.redirected) { window.location.href="/login"; return; }
    if (!resposta.ok) { alert("Não foi possível carregar os lançamentos."); return; }
    lancamentos=await resposta.json(); renderizar();
}
async function carregarResumo() {
    const mes=dataAtual.getMonth()+1, ano=dataAtual.getFullYear();
    const resposta=await fetch(`/api/lancamentos/resumo?mes=${mes}&ano=${ano}`); if(!resposta.ok) return;
    const r=await resposta.json();
    document.getElementById("saldoInicial").textContent=formatarMoeda(Number(r.saldoInicial));
    document.getElementById("totalReceitas").textContent=formatarMoeda(Number(r.receitas));
    document.getElementById("totalDespesas").textContent=formatarMoeda(Number(r.despesas));
    document.getElementById("saldoFinal").textContent=formatarMoeda(Number(r.saldoFinal));
    document.getElementById("movimentacaoPeriodo").textContent=`Movimentação do período: ${formatarMoeda(Number(r.movimentacao))}`;
}
function alterarOrdenacao(campo) {
    if (ordenacao.campo===campo) ordenacao.direcao=ordenacao.direcao==="asc"?"desc":"asc";
    else { ordenacao.campo=campo; ordenacao.direcao="asc"; }
    renderizar();
}
function lancamentosOrdenados() {
    return [...lancamentos].sort((a,b) => {
        let av,bv;
        if(ordenacao.campo==="valor") { av=Number(a.valor); bv=Number(b.valor); }
        else if(ordenacao.campo==="descricao") { av=a.descricao.toLocaleLowerCase("pt-BR"); bv=b.descricao.toLocaleLowerCase("pt-BR"); }
        else if(ordenacao.campo==="categoria") { av=formatarCategoria(a.categoria).toLocaleLowerCase("pt-BR"); bv=formatarCategoria(b.categoria).toLocaleLowerCase("pt-BR"); }
        else { av=`${a.data}|${a.dataHoraCadastro || ""}|${String(a.id).padStart(20,"0")}`; bv=`${b.data}|${b.dataHoraCadastro || ""}|${String(b.id).padStart(20,"0")}`; }
        let c = typeof av === "number" ? av-bv : av.localeCompare(bv,"pt-BR");
        return ordenacao.direcao==="asc"?c:-c;
    });
}
function renderizar() {
    const body=document.getElementById("lancamentosBody"), vazio=document.getElementById("semLancamentos"); body.innerHTML="";
    vazio.style.display=lancamentos.length===0?"block":"none";
    lancamentosOrdenados().forEach(l => {
        const tr=document.createElement("tr"), receita=l.tipo==="RECEITA";
        tr.innerHTML=`<td>${formatarData(l.data)}</td><td class="valor-lancamento ${receita?"valor-receita":"valor-despesa"}">${receita?"+":"-"} ${formatarMoeda(Number(l.valor))}</td><td>${escaparHtml(l.descricao)}</td><td>${formatarCategoria(l.categoria)}</td><td><button class="acao editar" onclick="editarLancamento(${l.id})">Editar</button><button class="acao excluir" onclick="excluirLancamento(${l.id})">Excluir</button></td>`;
        body.appendChild(tr);
    }); atualizarIndicadoresOrdenacao();
}
function atualizarIndicadoresOrdenacao() { document.querySelectorAll("th.sortable").forEach(th => { th.querySelector(".sort-indicator").textContent=th.dataset.sort===ordenacao.campo?(ordenacao.direcao==="asc"?"▲":"▼"):""; }); }
function abrirNovo(){ document.getElementById("modalTitulo").textContent="Novo lançamento"; document.getElementById("lancamentoId").value=""; document.getElementById("tipo").value="DESPESA"; document.getElementById("descricao").value=""; document.getElementById("categoria").value="OUTROS"; document.getElementById("valor").value=""; document.getElementById("data").value=hojeISO(); document.getElementById("formError").textContent=""; modal.classList.remove("hidden"); }
function editarLancamento(id){ const l=lancamentos.find(x=>x.id===id); if(!l)return; document.getElementById("modalTitulo").textContent="Editar lançamento"; document.getElementById("lancamentoId").value=l.id; document.getElementById("tipo").value=l.tipo; document.getElementById("descricao").value=l.descricao; document.getElementById("categoria").value=l.categoria; document.getElementById("valor").value=l.valor; document.getElementById("data").value=l.data; document.getElementById("formError").textContent=""; modal.classList.remove("hidden"); }
async function salvarLancamento(event){ event.preventDefault(); const id=document.getElementById("lancamentoId").value; const dados={tipo:document.getElementById("tipo").value,descricao:document.getElementById("descricao").value,categoria:document.getElementById("categoria").value,valor:Number(document.getElementById("valor").value),data:document.getElementById("data").value}; const resposta=await fetch(id?`/api/lancamentos/${id}`:"/api/lancamentos",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(dados)}); if(!resposta.ok){let mensagem="Não foi possível salvar o lançamento.";try{const erro=await resposta.json();if(erro.message)mensagem=erro.message;}catch(_){} document.getElementById("formError").textContent=mensagem;return;} fecharModal();await carregarDadosMes(); }
async function excluirLancamento(id){ if(!confirm("Deseja realmente excluir este lançamento?"))return; const resposta=await fetch(`/api/lancamentos/${id}`,{method:"DELETE"}); if(!resposta.ok){alert("Não foi possível excluir o lançamento.");return;} await carregarDadosMes(); }
function fecharModal(){modal.classList.add("hidden");}
function formatarMoeda(v){return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function formatarData(data){const [a,m,d]=data.split("-");return `${d}/${m}/${a}`;}
function formatarCategoria(c){const mapa={SALARIO:"Salário",RENDA_EXTRA:"Renda extra",ALIMENTACAO:"Alimentação",MORADIA:"Moradia",TRANSPORTE:"Transporte",SAUDE:"Saúde",EDUCACAO:"Educação",LAZER:"Lazer",CONTAS:"Contas",OUTROS:"Outros"};return mapa[c]||c;}
function hojeISO(){const h=new Date(),o=h.getTimezoneOffset(),d=new Date(h.getTime()-o*60000);return d.toISOString().slice(0,10);}
function escaparHtml(t){const d=document.createElement("div");d.textContent=t;return d.innerHTML;}
