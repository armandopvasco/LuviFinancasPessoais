// Meses lado a lado, cada um com a lista no tamanho do extrato. Cada valor é um compromisso.
const PG_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let pgInicio = new Date();
let pgLista = [];
let pgNovas = [];
let pgCtx = null;
let pgCategorias = new Map();
let pgFila = Promise.resolve();
let pgScrollAlvo = null;

function pgAttr(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function pgNovoId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function pgEnfileirar(fn) {
  const exec = () => Promise.resolve().then(fn).catch(ex => {
    console.error(ex);
    pgErro(ex.message || 'Não foi possível salvar.');
  });
  pgFila = pgFila.then(exec, exec);
  return pgFila;
}
function pgErro(texto) {
  const el = document.getElementById('planejamentoGradeErro');
  if (el) el.textContent = texto || '';
}
function pgDataDoMes(ano, mes, dia) {
  const ultimo = new Date(ano, mes, 0).getDate();
  const d = Math.min(Math.max(Number(dia) || 1, 1), ultimo);
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function pgMeses() {
  const lista = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(pgInicio.getFullYear(), pgInicio.getMonth() + i, 1);
    const ano = d.getFullYear();
    const mes = d.getMonth() + 1;
    lista.push({
      ano,
      mes,
      chave: `${ano}-${String(mes).padStart(2, '0')}`,
      rotulo: `${PG_MESES[mes - 1]} de ${ano}`
    });
  }
  return lista;
}
function pgContasDaVisao(ctx) {
  const todas = ctx?.contas || [];
  if (ctx?.contaSelecionada) return todas.filter(c => c.id === ctx.contaSelecionada);
  if (ctx?.grupoSelecionado) return todas.filter(c => (c.grupos || []).some(g => g === ctx.grupoSelecionado));
  return todas;
}
function pgLinhaNaVisao(linha, ctx) {
  if (ctx?.contaSelecionada && linha.contaId !== ctx.contaSelecionada) return false;
  if (ctx?.grupoSelecionado) {
    const conta = (ctx.contas || []).find(c => c.id === linha.contaId);
    if (!conta || !(conta.grupos || []).some(g => g === ctx.grupoSelecionado)) return false;
  }
  return true;
}
async function pgCategoriasDaConta(contaId) {
  const id = Number(contaId);
  if (pgCategorias.has(id)) return pgCategorias.get(id);
  const r = await fetch(`/api/categorias?contaId=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(await erro(r));
  const lista = (await r.json()).filter(c => c.tipo === 'DESPESA' && c.ativa !== false);
  pgCategorias.set(id, lista);
  return lista;
}
function pgReferencia(items) {
  const pendentes = items.filter(i => i.status !== 'PAGO');
  const base = (pendentes.length ? pendentes : items)
    .slice()
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento) || b.id - a.id);
  return base[0];
}
function pgFatiar(items, linha) {
  const rows = [];
  let resto = items.slice().sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.id - b.id);
  let n = 0;
  while (resto.length) {
    const celulas = {};
    const sobra = [];
    for (const item of resto) {
      const mes = item.vencimento.slice(0, 7);
      if (celulas[mes]) sobra.push(item);
      else celulas[mes] = item;
    }
    const todos = Object.values(celulas);
    const ref = pgReferencia(todos);
    rows.push({
      key: linha ? `${linha}#${n}` : `avulso-${todos.map(i => i.id).join('-')}`,
      linhaPlanejamento: linha,
      descricao: ref.descricao,
      categoriaId: ref.categoriaId,
      categoria: ref.categoria,
      contaId: ref.contaId,
      contaNome: ref.contaNome,
      tipo: ref.tipo || 'DESPESA',
      dia: Number(ref.vencimento.slice(8, 10)) || 1,
      celulas,
      nova: false
    });
    resto = sobra;
    n++;
  }
  return rows;
}
function pgLinhasDoServidor(lista) {
  const despesas = (lista || []).filter(c => c.tipo === 'DESPESA' && !c.parcelaCartao);
  const grupos = new Map();
  const avulsos = new Map();
  for (const c of despesas) {
    if (c.linhaPlanejamento) {
      if (!grupos.has(c.linhaPlanejamento)) grupos.set(c.linhaPlanejamento, []);
      grupos.get(c.linhaPlanejamento).push(c);
    } else {
      const dia = Number(String(c.vencimento).slice(8, 10)) || 1;
      const chave = `${c.contaId}|${c.categoriaId}|${c.descricao}|${dia}`;
      if (!avulsos.has(chave)) avulsos.set(chave, []);
      avulsos.get(chave).push(c);
    }
  }
  const linhas = [];
  for (const [linha, items] of grupos) linhas.push(...pgFatiar(items, linha));
  for (const items of avulsos.values()) linhas.push(...pgFatiar(items, null));
  linhas.sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR') || String(a.contaNome).localeCompare(String(b.contaNome), 'pt-BR'));
  return linhas;
}
function pgOpcoes(lista, atualId, atualNome) {
  const ids = new Set(lista.map(c => Number(c.id)));
  const extras = atualId && !ids.has(Number(atualId)) ? [{id: atualId, nome: atualNome || 'Categoria'}] : [];
  return [...extras, ...lista].map(c => `<option value="${c.id}"${Number(c.id) === Number(atualId) ? ' selected' : ''}>${pgAttr(c.nome)}</option>`).join('');
}
function pgSel(key) {
  const seguro = window.CSS?.escape ? CSS.escape(key) : String(key).replace(/"/g, '');
  return `#planejamentoGradeScroll .pg-registro[data-key="${seguro}"]`;
}
function pgGrupo(el) {
  const art = el?.classList?.contains('pg-registro') ? el : el?.closest?.('.pg-registro');
  if (!art) return [];
  return [...document.querySelectorAll(pgSel(art.dataset.key))];
}
function pgHtmlRegistro(linha, mes, contas) {
  const item = linha.celulas[mes.chave];
  const prevista = pgDataDoMes(mes.ano, mes.mes, linha.dia);
  const pago = item && item.status === 'PAGO';
  const valores = Object.values(linha.celulas);
  const somentePago = valores.length > 0 && valores.every(c => c.status === 'PAGO');
  const trava = somentePago ? ' disabled' : '';
  const tipo = linha.tipo === 'RECEITA' ? 'A receber' : 'A pagar';
  const categorias = pgCategorias.get(Number(linha.contaId)) || [];
  const variasContas = contas.length > 1 && !somentePago;
  const conta = variasContas
    ? `<select class="pg-conta" data-original="${linha.contaId}" aria-label="Conta">${pgOpcoes(contas, linha.contaId, linha.contaNome)}</select>`
    : `<span>${pgAttr(linha.contaNome || '')}</span>`;
  const data = item ? item.vencimento : prevista;
  const valor = item ? String(Number(item.valor)) : '';
  const id = item ? ` data-id="${item.id}"` : '';
  const venc = item && !pago ? ` data-vencimento="${item.vencimento}"` : '';
  const quantia = pago
    ? `<span class="pg-pago-valor" data-id="${item.id}" data-valor="${Number(item.valor)}">${formatarMoeda(Number(item.valor))}</span>`
    : `<input class="pg-valor luvi-money-input" type="number" inputmode="decimal" min="0" step="0.01" value="${pgAttr(valor)}" data-original="${pgAttr(valor)}"${id}${venc} aria-label="${pgAttr(`${linha.descricao} em ${mes.rotulo}`)}" autocomplete="off">`;
  return `<article class="pg-registro${pago ? ' pg-pago' : ''}" data-key="${pgAttr(linha.key)}" data-linha="${pgAttr(linha.linhaPlanejamento || '')}" data-conta="${linha.contaId}" data-tipo="${pgAttr(linha.tipo || 'DESPESA')}" data-mes="${mes.chave}" data-dia="${linha.dia || 1}"${linha.nova ? ' data-nova="1"' : ''}>
    <div class="pg-titulo"><input class="pg-desc" maxlength="200" value="${pgAttr(linha.descricao)}" data-original="${pgAttr(linha.descricao)}" aria-label="Descrição" autocomplete="off"${trava}>${linha.linhaPlanejamento ? '' : '<small class="pg-avulso">Avulso</small>'}</div>
    ${quantia}
    <select class="pg-cat" data-original="${linha.categoriaId}" aria-label="Categoria"${trava}>${pgOpcoes(categorias, linha.categoriaId, linha.categoria)}</select>
    <span class="pg-data${item ? '' : ' pg-data-prevista'}">${formatarData(data)}${pago ? ' · Pago' : ''}</span>
    <span class="pg-conta-linha">${conta}<span class="pg-tipo">· ${tipo}</span></span>
    <details class="pg-acoes"><summary aria-label="Ações da linha">⋯</summary><div class="pg-acoes-painel"><label class="pg-dia-campo">Vence no dia<input class="pg-dia" type="number" min="1" max="31" inputmode="numeric" value="${linha.dia || 1}" data-original="${linha.dia || 1}" aria-label="Dia do vencimento"${trava}></label><button type="button" data-pg-acao="copiar">Copiar este valor nos meses vazios à direita</button><button type="button" data-pg-acao="excluir">Excluir a linha</button></div></details>
  </article>`;
}
function pgAtualizarTotais() {
  document.querySelectorAll('#planejamentoGradeScroll .pg-painel').forEach(painel => {
    let soma = 0;
    painel.querySelectorAll('.pg-registro').forEach(art => {
      const pago = art.querySelector('.pg-pago-valor');
      if (pago) soma += Number(pago.dataset.valor) || 0;
      else {
        const input = art.querySelector('input.pg-valor');
        if (input && input.value !== '') soma += Number(input.value) || 0;
      }
    });
    const total = painel.querySelector('.pg-painel-total');
    if (total) total.textContent = formatarMoeda(soma);
  });
}
function pgRender() {
  const scroll = document.getElementById('planejamentoGradeScroll');
  const esquerda = scroll ? scroll.scrollLeft : 0;
  const meses = pgMeses();
  const ctx = pgCtx || (typeof luviContextoTela === 'function' ? luviContextoTela() : {contas: []});
  const contas = pgContasDaVisao(ctx);
  const presentes = new Set((pgLista || []).map(l => l.linhaPlanejamento).filter(Boolean));
  const novas = pgNovas.filter(l => pgLinhaNaVisao(l, ctx) && !presentes.has(l.linhaPlanejamento));
  const linhas = [...novas, ...(pgLista || [])];
  scroll.innerHTML = meses.map(mes => {
    const itens = linhas.map(l => pgHtmlRegistro(l, mes, contas)).join('');
    return `<section class="pg-painel" data-mes="${mes.chave}" aria-label="${pgAttr(mes.rotulo)}">
      <header class="pg-painel-topo"><h3>${mes.rotulo}</h3><strong class="pg-painel-total">${formatarMoeda(0)}</strong></header>
      <div class="pg-lista">${itens || '<p class="pg-vazio">Nenhuma despesa neste mês.</p>'}</div>
    </section>`;
  }).join('');
  pgAtualizarTotais();
  void scroll.offsetWidth;
  if (pgScrollAlvo === 'fim') scroll.scrollLeft = scroll.scrollWidth;
  else if (pgScrollAlvo === 'inicio') scroll.scrollLeft = 0;
  else scroll.scrollLeft = esquerda;
  pgScrollAlvo = null;
}
async function pgCarregar() {
  const ctx = typeof luviContextoTela === 'function' ? luviContextoTela() : {contas: [], ano: pgInicio.getFullYear(), mes: pgInicio.getMonth() + 1};
  pgCtx = ctx;
  const meses = pgMeses();
  const params = new URLSearchParams({de: meses[0].chave, ate: meses[11].chave});
  if (ctx.contaSelecionada) params.set('contaId', String(ctx.contaSelecionada));
  if (ctx.grupoSelecionado) params.set('grupoId', String(ctx.grupoSelecionado));
  const r = await fetch(`/api/planejamento?${params}`);
  if (!r.ok) {
    pgErro(await erro(r));
    return;
  }
  const lista = await r.json();
  await Promise.all(pgContasDaVisao(ctx).map(c => pgCategoriasDaConta(c.id)));
  pgLista = pgLinhasDoServidor(lista);
  pgErro('');
  pgRender();
}
function pgLer(art) {
  const conta = art.querySelector('.pg-conta');
  const dia = Math.min(31, Math.max(1, Number(art.querySelector('.pg-dia')?.value) || Number(art.dataset.dia) || 1));
  return {
    key: art.dataset.key,
    descricao: art.querySelector('.pg-desc')?.value.trim() || '',
    categoriaId: Number(art.querySelector('.pg-cat')?.value),
    contaId: conta ? Number(conta.value) : Number(art.dataset.conta),
    dia
  };
}
function pgIds(art) {
  return [...new Set(pgGrupo(art).flatMap(a => [...a.querySelectorAll('[data-id]')].map(el => Number(el.dataset.id)).filter(Boolean)))];
}
function pgGarantirLinha(art) {
  let linha = art.dataset.linha;
  if (!linha) linha = pgNovoId();
  pgGrupo(art).forEach(a => { a.dataset.linha = linha; });
  return linha;
}
function pgSincronizarNova(art, dados) {
  const i = pgNovas.findIndex(l => l.key === art.dataset.key);
  if (i < 0) return;
  const cat = (pgCategorias.get(dados.contaId) || []).find(c => Number(c.id) === dados.categoriaId);
  const conta = (pgCtx?.contas || []).find(c => c.id === dados.contaId);
  pgNovas[i] = {
    ...pgNovas[i],
    descricao: dados.descricao,
    categoriaId: dados.categoriaId,
    categoria: cat ? cat.nome : pgNovas[i].categoria,
    contaId: dados.contaId,
    contaNome: conta ? conta.nome : pgNovas[i].contaNome,
    dia: dados.dia,
    linhaPlanejamento: art.dataset.linha || pgNovas[i].linhaPlanejamento
  };
}
function pgDatasVazias(art, dia) {
  pgGrupo(art).forEach(a => {
    if (a.querySelector('.pg-pago-valor')) return;
    const input = a.querySelector('input.pg-valor');
    if (input?.dataset.id) return;
    const [ano, mes] = a.dataset.mes.split('-').map(Number);
    const data = a.querySelector('.pg-data');
    if (data) {
      data.textContent = formatarData(pgDataDoMes(ano, mes, dia));
      data.classList.add('pg-data-prevista');
    }
    a.dataset.dia = String(dia);
  });
}
function pgMetaMudou(art) {
  const desc = art.querySelector('.pg-desc');
  const cat = art.querySelector('.pg-cat');
  const dia = art.querySelector('.pg-dia');
  const conta = art.querySelector('.pg-conta');
  if (!desc || desc.value.trim() !== desc.dataset.original) return true;
  if (cat && cat.value !== cat.dataset.original) return true;
  if (dia && String(Math.min(31, Math.max(1, Number(dia.value) || 1))) !== String(dia.dataset.original)) return true;
  if (conta && conta.value !== conta.dataset.original) return true;
  return false;
}
async function pgPreencherCategorias(art) {
  const selectConta = art.querySelector('.pg-conta');
  if (!selectConta) return;
  const contaId = Number(selectConta.value);
  const lista = await pgCategoriasDaConta(contaId);
  const atual = Number(art.querySelector('.pg-cat')?.value);
  const html = pgOpcoes(lista, lista.some(c => Number(c.id) === atual) ? atual : lista[0]?.id, '');
  pgGrupo(art).forEach(a => {
    const sel = a.querySelector('.pg-cat');
    if (sel) sel.innerHTML = html;
    const conta = a.querySelector('.pg-conta');
    if (conta) conta.value = String(contaId);
  });
}
async function pgSalvarMetadados(art) {
  const dados = pgLer(art);
  if (!dados.descricao) {
    pgErro('Informe a descrição da linha.');
    return;
  }
  if (!dados.categoriaId || !dados.contaId) {
    pgErro('Escolha a categoria e a conta.');
    return;
  }
  pgSincronizarNova(art, dados);
  const ids = pgIds(art);
  if (!ids.length) {
    pgDatasVazias(art, dados.dia);
    pgGrupo(art).forEach(a => {
      const desc = a.querySelector('.pg-desc');
      if (desc) { desc.value = dados.descricao; desc.dataset.original = dados.descricao; }
      const cat = a.querySelector('.pg-cat');
      if (cat) cat.dataset.original = String(dados.categoriaId);
      const dia = a.querySelector('.pg-dia');
      if (dia) { dia.value = String(dados.dia); dia.dataset.original = String(dados.dia); }
      const conta = a.querySelector('.pg-conta');
      if (conta) conta.dataset.original = String(dados.contaId);
      a.dataset.conta = String(dados.contaId);
      a.dataset.dia = String(dados.dia);
    });
    pgErro('');
    return;
  }
  const linha = pgGarantirLinha(art);
  const r = await fetch(`/api/planejamento/linhas/${encodeURIComponent(linha)}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      descricao: dados.descricao,
      categoriaId: dados.categoriaId,
      contaId: dados.contaId,
      tipo: 'DESPESA',
      diaVencimento: dados.dia,
      vincular: ids
    })
  });
  if (!r.ok) {
    pgErro(await erro(r));
    return;
  }
  pgErro('');
  await pgCarregar();
}
function pgMudouValor(input) {
  const atual = input.value.trim();
  const original = input.dataset.original || '';
  if (atual === '' && original === '') return false;
  if (atual === '' || original === '') return true;
  return Number(atual) !== Number(original);
}
async function pgGravarCelula(input) {
  if (!pgMudouValor(input) || input.dataset.salvando === '1') return;
  const art = input.closest('.pg-registro');
  const dados = pgLer(art);
  if (!dados.descricao || !dados.categoriaId || !dados.contaId) {
    pgErro('A linha precisa de descrição, categoria e conta.');
    input.value = input.dataset.original || '';
    return;
  }
  input.dataset.salvando = '1';
  try {
    const linha = pgGarantirLinha(art);
    const [ano, mes] = art.dataset.mes.split('-').map(Number);
    const apagar = input.value.trim() === '';
    const r = await fetch('/api/planejamento/celula', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: input.dataset.id ? Number(input.dataset.id) : null,
        linhaPlanejamento: linha,
        contaId: dados.contaId,
        categoriaId: dados.categoriaId,
        tipo: 'DESPESA',
        descricao: dados.descricao,
        valor: apagar ? null : Number(input.value),
        vencimento: input.dataset.vencimento || pgDataDoMes(ano, mes, dados.dia),
        vincular: pgIds(art)
      })
    });
    if (!r.ok) {
      input.value = input.dataset.original || '';
      pgErro(await erro(r));
      return;
    }
    const corpo = await r.json();
    const data = art.querySelector('.pg-data');
    if (corpo.removido) {
      delete input.dataset.id;
      delete input.dataset.vencimento;
      input.dataset.original = '';
      input.value = '';
      if (data) {
        data.textContent = formatarData(pgDataDoMes(ano, mes, dados.dia));
        data.classList.add('pg-data-prevista');
      }
    } else {
      input.dataset.id = String(corpo.id);
      input.dataset.original = String(Number(corpo.valor));
      input.value = input.dataset.original;
      if (corpo.vencimento && data) {
        input.dataset.vencimento = corpo.vencimento;
        data.textContent = formatarData(corpo.vencimento);
        data.classList.remove('pg-data-prevista');
      }
    }
    pgGrupo(art).forEach(a => {
      if (corpo.linhaPlanejamento) a.dataset.linha = corpo.linhaPlanejamento;
      a.querySelector('.pg-avulso')?.remove();
    });
    pgSincronizarNova(art, dados);
    pgErro('');
    pgAtualizarTotais();
  } finally {
    input.dataset.salvando = '0';
  }
}
async function pgCopiar(art) {
  const artigos = pgGrupo(art).sort((a, b) => a.dataset.mes.localeCompare(b.dataset.mes));
  const origemInput = art.querySelector('input.pg-valor');
  const preenchidos = artigos.map(a => a.querySelector('input.pg-valor')).filter(i => i && i.value.trim() !== '');
  const fonte = origemInput && origemInput.value.trim() !== '' ? origemInput : preenchidos[preenchidos.length - 1];
  if (!fonte || fonte.value.trim() === '') {
    pgErro('Digite um valor para copiar aos meses vazios à direita.');
    return;
  }
  const mesFonte = fonte.closest('.pg-registro').dataset.mes;
  const alvos = artigos
    .filter(a => a.dataset.mes > mesFonte)
    .map(a => a.querySelector('input.pg-valor'))
    .filter(i => i && i.value.trim() === '' && !i.dataset.id);
  if (!alvos.length) {
    pgErro('Não há meses vazios à direita deste valor.');
    return;
  }
  for (const input of alvos) {
    input.value = fonte.value;
    await pgGravarCelula(input);
    if (input.value.trim() === '') return;
  }
  art.querySelector('.pg-acoes')?.removeAttribute('open');
  pgErro('');
}
async function pgExcluir(art) {
  const nome = art.querySelector('.pg-desc')?.value.trim() || 'esta linha';
  if (!await confirmar(`Excluir os meses pendentes de “${nome}”? Meses já pagos permanecem no extrato.`)) return;
  const ids = pgIds(art);
  if (!ids.length) {
    pgNovas = pgNovas.filter(l => l.key !== art.dataset.key);
    pgRender();
    return;
  }
  const linha = pgGarantirLinha(art);
  const r = await fetch(`/api/planejamento/linhas/${encodeURIComponent(linha)}`, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({vincular: ids})
  });
  if (!r.ok) {
    pgErro(await erro(r));
    return;
  }
  pgNovas = pgNovas.filter(l => l.linhaPlanejamento !== linha && l.key !== art.dataset.key);
  await pgCarregar();
}
async function pgAbrir() {
  if (typeof fecharSubtelasPrincipais === 'function') fecharSubtelasPrincipais('planejamentoGradeModal');
  if (typeof toggleMenu === 'function') toggleMenu(false);
  const ctx = typeof luviContextoTela === 'function' ? luviContextoTela() : null;
  const ano = ctx?.ano || new Date().getFullYear();
  const mes = ctx?.mes || new Date().getMonth() + 1;
  pgInicio = new Date(ano, mes - 1, 1);
  pgScrollAlvo = 'inicio';
  document.getElementById('planejamentoGradeForm')?.classList.add('hidden');
  abrirCamada('planejamentoGradeModal');
  try {
    await pgCarregar();
  } catch (ex) {
    pgErro(ex.message || 'Não foi possível abrir as despesas planejadas.');
  }
}
async function pgAbrirFormulario() {
  const ctx = pgCtx || luviContextoTela();
  const contas = pgContasDaVisao(ctx);
  if (!contas.length) {
    await mensagem('Cadastre uma conta financeira antes.');
    return;
  }
  const campo = document.getElementById('pgContaCampo');
  const select = document.getElementById('pgConta');
  select.innerHTML = contas.map(c => `<option value="${c.id}">${pgAttr(c.nome)}</option>`).join('');
  campo.classList.toggle('hidden', contas.length === 1);
  await pgCategoriasDaConta(contas[0].id);
  await pgFormCategorias();
  document.getElementById('pgDescricao').value = '';
  document.getElementById('pgDia').value = '';
  document.getElementById('pgFormErro').textContent = '';
  document.getElementById('planejamentoGradeForm').classList.remove('hidden');
  document.getElementById('pgDescricao').focus();
}
async function pgFormCategorias() {
  const contaId = Number(document.getElementById('pgConta').value);
  const lista = await pgCategoriasDaConta(contaId);
  const select = document.getElementById('pgCategoria');
  select.innerHTML = lista.map(c => `<option value="${c.id}">${pgAttr(c.nome)}</option>`).join('');
  document.getElementById('pgFormErro').textContent = lista.length ? '' : 'Cadastre uma categoria de despesa antes.';
}
function pgAdicionarLinha(e) {
  e.preventDefault();
  const descricao = document.getElementById('pgDescricao').value.trim();
  const categoriaId = Number(document.getElementById('pgCategoria').value);
  const contaId = Number(document.getElementById('pgConta').value);
  const dia = Math.min(31, Math.max(1, Number(document.getElementById('pgDia').value) || 1));
  const erroForm = document.getElementById('pgFormErro');
  if (!descricao || !categoriaId || !contaId) {
    erroForm.textContent = 'Informe descrição, categoria e conta.';
    return;
  }
  const cats = pgCategorias.get(contaId) || [];
  const cat = cats.find(c => Number(c.id) === categoriaId);
  const conta = (pgCtx?.contas || []).find(c => c.id === contaId);
  const linha = pgNovoId();
  pgNovas.unshift({
    key: linha,
    linhaPlanejamento: linha,
    descricao,
    categoriaId,
    categoria: cat ? cat.nome : '',
    contaId,
    contaNome: conta ? conta.nome : '',
    tipo: 'DESPESA',
    dia,
    celulas: {},
    nova: true
  });
  document.getElementById('planejamentoGradeForm').classList.add('hidden');
  pgRender();
  const scroll = document.getElementById('planejamentoGradeScroll');
  const paineis = [...scroll.querySelectorAll('.pg-painel')];
  const visivel = paineis.find(p => Math.abs(p.offsetLeft - scroll.scrollLeft) < 8) || paineis[0];
  const chave = window.CSS?.escape ? CSS.escape(linha) : linha;
  visivel?.querySelector(`.pg-registro[data-key="${chave}"] input.pg-valor`)?.focus();
}
async function pgMover(direcao) {
  const scroll = document.getElementById('planejamentoGradeScroll');
  const painel = scroll.querySelector('.pg-painel');
  const passo = painel ? painel.offsetWidth : scroll.clientWidth;
  const maximo = scroll.scrollWidth - scroll.clientWidth - 2;
  if (direcao < 0 && scroll.scrollLeft <= 2) {
    pgScrollAlvo = 'inicio';
    pgInicio = new Date(pgInicio.getFullYear(), pgInicio.getMonth() - 1, 1);
    await pgCarregar();
    return;
  }
  if (direcao > 0 && scroll.scrollLeft >= maximo) {
    pgScrollAlvo = 'fim';
    pgInicio = new Date(pgInicio.getFullYear(), pgInicio.getMonth() + 1, 1);
    await pgCarregar();
    return;
  }
  scroll.scrollTo({left: scroll.scrollLeft + direcao * passo, behavior: 'smooth'});
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('luviOpenGrade')?.addEventListener('click', () => pgEnfileirar(pgAbrir));
  document.getElementById('despesasPlanejadasMenu')?.addEventListener('click', () => pgEnfileirar(pgAbrir));
  document.getElementById('planejamentoGradeNova')?.addEventListener('click', () => pgEnfileirar(pgAbrirFormulario));
  document.getElementById('pgCancelarLinha')?.addEventListener('click', () => document.getElementById('planejamentoGradeForm')?.classList.add('hidden'));
  document.getElementById('planejamentoGradeForm')?.addEventListener('submit', pgAdicionarLinha);
  document.getElementById('pgConta')?.addEventListener('change', () => pgEnfileirar(pgFormCategorias));
  document.getElementById('planejamentoGradeAnterior')?.addEventListener('click', () => pgEnfileirar(() => pgMover(-1)));
  document.getElementById('planejamentoGradeProximo')?.addEventListener('click', () => pgEnfileirar(() => pgMover(1)));
  const faixa = document.getElementById('planejamentoGradeScroll');
  faixa?.addEventListener('focusin', e => {
    const input = e.target.closest('input.pg-valor');
    if (input) input.closest('.pg-registro').dataset.copiaMes = input.closest('.pg-registro').dataset.mes;
  });
  faixa?.addEventListener('input', e => {
    if (e.target.classList?.contains('pg-valor')) pgAtualizarTotais();
  });
  faixa?.addEventListener('focusout', e => {
    const input = e.target.closest('input.pg-valor');
    if (!input || !pgMudouValor(input)) return;
    pgEnfileirar(() => pgGravarCelula(input));
  });
  faixa?.addEventListener('change', e => {
    const el = e.target;
    if (!el.matches?.('.pg-desc, .pg-cat, .pg-conta, .pg-dia')) return;
    const art = el.closest('.pg-registro');
    pgEnfileirar(async () => {
      if (el.classList.contains('pg-conta')) await pgPreencherCategorias(art);
      if (!pgMetaMudou(art)) return;
      await pgSalvarMetadados(art);
    });
  });
  faixa?.addEventListener('click', e => {
    const btn = e.target.closest('[data-pg-acao]');
    if (!btn) return;
    e.preventDefault();
    const art = btn.closest('.pg-registro');
    pgEnfileirar(() => btn.dataset.pgAcao === 'copiar' ? pgCopiar(art) : pgExcluir(art));
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const ativo = document.activeElement;
    if (ativo?.closest?.('#planejamentoGradeModal') && (ativo.classList.contains('pg-valor') || ativo.classList.contains('pg-desc') || ativo.classList.contains('pg-dia'))) ativo.blur();
  }, true);
});
