// LUVI Finanças v6.0.2 - correções mobile
let categoriaEscopoPreferido="",dataAtual=new Date(),lancamentos=[],transferencias=[],contas=[],grupos=[],categorias=[],categoriasGerencia=[],graficos=[],contaSelecionada=null,grupoSelecionado=null,ordenacao={campo:"data",direcao:"desc"},grupoGerenciado=null,conviteAtual=null,retornarAoGrupoAposConvite=false,contaCompartilhamento=null;
const nomesMeses=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const $=id=>document.getElementById(id), form=$("lancamentoForm");

// v5.9 - toda chamada à API detecta sessão expirada, inclusive quando o Spring
// responde com redirect para /login e o fetch o segue automaticamente.
const fetchOriginal=window.fetch.bind(window);
window.fetch=async(...args)=>{
  const r=await fetchOriginal(...args);
  const url=(r.url||"").toLowerCase();
  if(r.status===401 || r.status===403 && url.includes("/login") || r.redirected && url.includes("/login")){
    window.location.replace("/login?expired");
    return new Promise(()=>{});
  }
  return r;
};
const icone=(tipo)=>tipo==="editar"?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5Zm16.7-9.8a1 1 0 0 0 0-1.4l-2-2a1 1 0 0 0-1.4 0L15.5 5l3.5 3.5 1.7-1.8Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21a2 2 0 0 1-2-2V7h14v12a2 2 0 0 1-2 2H7Zm10-17h-3.5l-1-1h-5l-1 1H3v2h18V4h-4Z"/></svg>';
const botaoIcone=(tipo,acao,rotulo)=>`<button type="button" class="icon-action ${tipo}" onclick="${acao}" title="${rotulo}" aria-label="${rotulo}">${icone(tipo)}</button>`;
const modais=()=>["settingsModal","notificationsModal","reportsModal","luviRecurrenceModal","shareAccountModal","membersModal","groupsModal","groupCreateModal","viewModal","categoryEditModal","categoriesModal","dashboardModal","accountEditModal","accountsModal","inviteGeneratedModal","inviteCodeModal","groupModal","transferModal","luviFutureModal","luviPayModal","luviCardModal","modal","messageModal"].map($).filter(x=>x&&!x.classList.contains("hidden"));

document.addEventListener("DOMContentLoaded",async()=>{
  // v5.11.1: delegação central. Continua funcionando mesmo para conteúdo criado dinamicamente.
  document.addEventListener("click",async e=>{
    const close=e.target.closest("[data-close-modal]");
    if(close){e.preventDefault();e.stopPropagation();const id=close.dataset.closeModal;if(id==="luviCardModal"){luviCardsBack();return;}if(id==="dashboardModal"){luviDashboardBack();return;}if(id==="membersModal"){fecharCamada(id);if(grupoGerenciado)await abrirGrupo(grupoGerenciado)}else if(id==="shareAccountModal"){fecharCamada(id);abrirContas()}else if(id==="groupCreateModal"){fecharCamada(id,false);abrirGrupos();return true}if(id==="accountEditModal"){fecharCamada(id,false);abrirContas()}else if(id==="categoryEditModal"){fecharCamada(id,false);await abrirCategorias()}else if(id==="inviteGeneratedModal"){await fecharConviteGerado()}else fecharCamada(id);return}
    const group=e.target.closest("[data-open-group]");
    if(group){e.preventDefault();e.stopPropagation();await abrirGrupo(+group.dataset.openGroup);return}
    const members=e.target.closest('[data-action="open-members"]');
    if(members){e.preventDefault();e.stopPropagation();await abrirMembros();return}
    const action=e.target.closest("[data-ui-action]");
    if(action){e.preventDefault();e.stopPropagation();const a=action.dataset.uiAction;if(a==="new-account")abrirEdicaoConta();else if(a==="new-category")abrirEdicaoCategoria();else if(a==="members")await abrirMembros();return}
  });
  document.addEventListener("change",async e=>{
    if(e.target?.id==="categoryScope"){categoriaEscopoPreferido=e.target.value;await carregarCategoriasGerencia()}
  });

  // v6.1.7: o Voltar do Android / gesto de retorno do iOS fecha a camada
  // atual como Escape, sem retornar ao login pelo histórico do navegador.
  // Usamos uma entrada sentinela da History API, sem alterar a URL.
  iniciarVoltarNativo();

  // Eventos críticos precisam existir antes dos carregamentos assíncronos,
  // sem alterar a ordem original de carga dos dados.
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      e.preventDefault();
      fecharTopo();
    }
  });
  document.addEventListener("click",async e=>{
    const alvo=e.target.closest("#shareInviteButton,#cancelarInviteGenerated,#fecharInviteGenerated");
    if(!alvo)return;
    e.preventDefault();
    e.stopPropagation();
    if(alvo.id==="shareInviteButton") await compartilharConvite();
    else await fecharConviteGerado();
  });

  // Navegação de grupos deve funcionar independentemente das chamadas iniciais.
  $("fecharGroups").onclick=()=>fecharCamada("groupsModal");
  $("novoGrupoButton").onclick=abrirCadastroGrupo;
  $("groupCreateForm").onsubmit=criarGrupo;
  $("luviViewReal").onclick=()=>alternarVisaoLuvi(false);
  $("luviViewForecast").onclick=()=>alternarVisaoLuvi(true);
  $("luviNewFuture").onclick=abrirCompromissoLuvi;
  $("luviFutureForm").onsubmit=salvarCompromissoLuvi;
  $("luviEditFutureForm").onsubmit=salvarEdicaoCompromissoLuvi;
  $("luviEditFutureAccount").onchange=carregarCategoriasEdicaoLuvi;
  $("luviEditFutureType").onchange=carregarCategoriasEdicaoLuvi;
  $("luviFutureRepeat").onchange=()=>$("luviFutureRepeatOptions").classList.toggle('hidden',!$("luviFutureRepeat").checked);
  $("luviPayForm").onsubmit=salvarPagamentoLuvi;
  ["luviPayValue","luviPayDiscount","luviPayExtra"].forEach(id=>$(id).addEventListener("input",atualizarCalculoPagamentoLuvi));
  $("luviFutureAccount").onchange=carregarCategoriasCompromissoLuvi;
  $("luviFutureType").onchange=carregarCategoriasCompromissoLuvi;
  $("mesAnterior").onclick=async()=>{dataAtual.setMonth(dataAtual.getMonth()-1);await carregarDadosMes()};
  $("mesProximo").onclick=async()=>{dataAtual.setMonth(dataAtual.getMonth()+1);await carregarDadosMes()};
  $("novoLancamento").onclick=abrirNovo; $("novaTransferencia").onclick=abrirTransferencia;
  $("mobileNew").onclick=abrirNovo; $("mobileTransfer").onclick=abrirTransferencia;
  $("mobileNavDashboard").onclick=()=>{abrirDashboard();marcarNavMobile("dashboard")};
  $("mobileNavHome").onclick=luviIrParaInicio;
  $("mobileNavCards").onclick=async()=>{luviFecharTelasDireto();await luviOpenCards();marcarNavMobile("cards")};

  $("mobileNavMore").onclick=()=>{toggleMenu(true);marcarNavMobile("more")};

  $("fecharModal").onclick=$("cancelarModal").onclick=()=>fecharCamada("modal");
  $("fecharTransfer").onclick=$("cancelarTransfer").onclick=()=>fecharCamada("transferModal");
  form.onsubmit=salvarLancamento; $("tipo").onchange=atualizarSelectCategorias; $("conta").onchange=carregarCategorias; $("transferForm").onsubmit=salvarTransferencia;
  document.querySelectorAll("th.sortable").forEach(th=>th.onclick=()=>alterarOrdenacao(th.dataset.sort));
  $("menuButton").onclick=()=>toggleMenu(); $("overlay").onclick=()=>toggleMenu(false);
  $("dashboardMenu").onclick=abrirDashboard; $("contasMenu").onclick=abrirContas; $("categoriasMenu").onclick=abrirCategorias; $("gruposMenu").onclick=abrirGrupos; $("visaoHeaderButton").onclick=abrirVisao;
  $("entrarGrupoMenu").onclick=abrirEntradaConvite;
  $("fecharView").onclick=$("cancelarView").onclick=()=>fecharCamada("viewModal");
  $("fecharGroups").onclick=()=>fecharCamada("groupsModal"); $("novoGrupoButton").onclick=abrirCadastroGrupo;
  $("fecharMembers").onclick=$("cancelarMembers").onclick=async()=>{fecharCamada("membersModal");if(grupoGerenciado)await abrirGrupo(grupoGerenciado)}; $("membersInviteButton").onclick=()=>{if(grupoGerenciado)gerarConvite(grupoGerenciado)};
  $("fecharShareAccount").onclick=$("cancelarShareAccount").onclick=()=>{fecharCamada("shareAccountModal");abrirContas()};
  $("usuarioMenuButton").onclick=e=>{e.stopPropagation();const aberto=$("usuarioDropdown").classList.toggle("hidden")===false;$("usuarioMenuButton").setAttribute("aria-expanded",String(aberto))}; document.addEventListener("click",e=>{if(!e.target.closest(".user-menu-wrap")){ $("usuarioDropdown").classList.add("hidden"); $("usuarioMenuButton").setAttribute("aria-expanded","false") }});
  $("fecharInviteCode").onclick=$("cancelarInviteCode").onclick=()=>fecharCamada("inviteCodeModal");
  $("abrirInviteCode").onclick=usarCodigoConvite; $("pasteInviteButton").onclick=colarConvite;
  $("fecharGroup").onclick=()=>fecharCamada("groupModal");
  $("groupMembersButton").onclick=abrirMembros;
  $("fecharAccounts").onclick=()=>fecharCamada("accountsModal"); $("fecharCategories").onclick=()=>fecharCamada("categoriesModal"); $("novaCategoriaButton").onclick=()=>abrirEdicaoCategoria(); $("categoryForm").onsubmit=salvarCategoria; $("fecharCategoryEdit").onclick=$("cancelarCategoryEdit").onclick=async()=>{fecharCamada("categoryEditModal",false);await abrirCategorias()}; $("fecharDashboard").onclick=luviDashboardBack;
  $("novaContaButton").onclick=()=>abrirEdicaoConta(); $("accountForm").onsubmit=salvarConta;
  $("fecharAccountEdit").onclick=$("cancelarAccountEdit").onclick=()=>{fecharCamada("accountEditModal",false);abrirContas()};
  $("copyInviteButton").onclick=()=>copiarConvite(false);
  $("fecharMessage").onclick=$("messageCancel").onclick=()=>resolverMensagem(false); $("messageOk").onclick=()=>resolverMensagem(true);
  window.luviLayerOrder=window.luviLayerOrder||0;
  const splashInicio=Date.now();
  let falhaInicial=null;
  try { await carregarContexto(); await carregarCategorias(); await carregarDadosMes(); await iniciarAvisosLuvi(); }
  catch (e) { console.error("Falha ao carregar os dados iniciais", e); falhaInicial=e; }
  finally { const restante=Math.max(0,700-(Date.now()-splashInicio)); setTimeout(()=>$("luviWelcomeSplash")?.classList.add("luvi-splash-done"),restante); }
  if(falhaInicial) await mensagem("Não foi possível carregar os dados. Atualize a página para tentar novamente.");
});

function marcarNavMobile(alvo){const mapa={home:"mobileNavHome",dashboard:"mobileNavDashboard",cards:"mobileNavCards",more:"mobileNavMore"};Object.values(mapa).forEach(id=>$(id)?.classList.remove("active"));$(mapa[alvo])?.classList.add("active")}
async function carregarContexto(){const r=await fetch("/api/app/contexto");if(!r.ok)return;const c=await r.json();contas=c.contas;grupos=c.grupos;window.usuarioAtual=c.usuario;$("usuarioNome").textContent=c.usuario.nome;$("usuarioAvatar").textContent=(c.usuario.nome||"U").trim().charAt(0).toUpperCase();if($("mobileGreeting"))$("mobileGreeting").textContent=`Olá, ${(c.usuario.nome||"").trim().split(/\\s+/)[0]||""}!`;const opts=contas.map(x=>`<option value="${x.id}">${escaparHtml(x.nome)}</option>`).join("");$("conta").innerHTML=opts;$("transferOrigem").innerHTML=opts;$("transferDestino").innerHTML=opts}

function abrirContas(){fecharSubtelasPrincipais("accountsModal");toggleMenu(false);renderContas();abrirCamada("accountsModal")}
function corIdentificacaoConta(c){
  return /^#[0-9a-fA-F]{6}$/.test(c?.cor||'') ? c.cor : '#285681';
}
function marcadorCorConta(c){
  return `<span class="luvi-account-color-marker" style="background-color:${corIdentificacaoConta(c)}" aria-hidden="true"></span>`;
}
function renderContas(){
  const proprias=contas.filter(c=>c.propria);
  const acoes=c=>`${botaoIcone("editar",`abrirEdicaoConta(${c.id})`,"Editar conta")}${botaoIcone("excluir",`excluirConta(${c.id})`,"Excluir conta")}<button type="button" class="icon-action share-action" onclick="abrirCompartilhamentoConta(${c.id})" title="Compartilhar conta" aria-label="Compartilhar conta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2"/></svg></button>`;
  const desktop=`<div class="account-table account-desktop"><div class="account-row account-head"><span>Nome</span><span>Tipo</span><span>Compartilhamento</span><span>Ações</span></div>${proprias.map(c=>`<div class="account-row"><span class="luvi-account-name-cell">${marcadorCorConta(c)}<strong>${escaparHtml(c.nome)}</strong></span><span>${rotuloTipoConta(c.tipo)}</span><span>${c.grupos.length?`${c.grupos.length} grupo(s)`:'Privada'}</span><span>${acoes(c)}</span></div>`).join('')}</div>`;
  const mobile=`<div class="account-mobile">${proprias.map(c=>`<details class="account-mobile-item"><summary><span class="account-mobile-name luvi-account-name-cell">${marcadorCorConta(c)}${escaparHtml(c.nome)}</span><span class="account-mobile-type">${rotuloTipoConta(c.tipo)}</span><span class="account-mobile-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></summary><div class="account-mobile-detail"><span>${c.grupos.length?`${c.grupos.length} grupo(s)`:'Privada'}</span><div class="account-mobile-actions">${acoes(c)}</div></div></details>`).join('')}</div>`;
  $("accountsContent").innerHTML=proprias.length?desktop+mobile:'<div class="empty-state">Você ainda não possui contas próprias.</div>';
}
function abrirEdicaoConta(id=null){fecharCamada("accountsModal",false);const c=id?contas.find(x=>x.id===id):null;$("accountId").value=c?.id||"";$("accountName").value=c?.nome||"";$("accountType").value=c?.tipo||"BANCO";$("accountColor").value=c?.cor||"#285681";$("accountEditTitle").textContent=c?"Editar conta":"Nova conta";$("accountError").textContent="";abrirCamada("accountEditModal");setTimeout(()=>$("accountName").focus(),30)}
async function salvarConta(e){e.preventDefault();const id=$("accountId").value,d={nome:$("accountName").value.trim(),tipo:$("accountType").value,cor:$("accountColor").value};const r=await fetch(id?`/api/app/contas/${id}`:"/api/app/contas",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("accountError").textContent=await erro(r);return}fecharCamada("accountEditModal",false);await carregarContexto();abrirContas()}
async function excluirConta(id){const c=contas.find(x=>x.id===id);if(!await confirmar(`Deseja excluir a conta “${c?.nome||''}”?\n\nA exclusão só será permitida se ela não possuir movimentações.`))return;const r=await fetch(`/api/app/contas/${id}`,{method:"DELETE"});if(!r.ok){mensagem(await erro(r),"Não foi possível excluir");return}if(contaSelecionada===id)selecionarVisaoGeral();await carregarContexto();renderContas();toast("Conta excluída.")}

function abrirCadastroGrupo(){
  toggleMenu(false);
  fecharCamada("groupsModal",false);
  $("groupCreateForm").reset();
  $("groupCreateError").textContent="";
  abrirCamada("groupCreateModal");
  setTimeout(()=>$("groupCreateName").focus(),30);
}
async function criarGrupo(e){
  e.preventDefault();
  const nome=$("groupCreateName").value.trim();
  const erroEl=$("groupCreateError");
  erroEl.textContent="";
  if(!nome){erroEl.textContent="Informe um nome para o grupo.";return}
  const botao=$("groupCreateForm").querySelector('button[type="submit"]');
  botao.disabled=true;
  try{
    const r=await fetch("/api/app/grupos",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({nome})
    });
    if(!r.ok){erroEl.textContent=await erro(r);return}
    await carregarContexto();
    fecharCamada("groupCreateModal",false);
    abrirGrupos();
  }catch(err){
    console.error("Erro ao criar grupo",err);
    erroEl.textContent="Não foi possível criar o grupo. Tente novamente.";
  }finally{botao.disabled=false}
}
async function gerarConvite(id){const veioDeMembros=$("membersModal")&&!$("membersModal").classList.contains("hidden");if(veioDeMembros){retornarAoGrupoAposConvite=true;fecharCamada("membersModal",false)}const r=await fetch(`/api/grupos/${id}/convites`,{method:"POST"});if(!r.ok){mensagem(await erro(r),"Não foi possível gerar o convite");return}const x=await r.json(),g=grupos.find(v=>v.id===id);conviteAtual={codigo:x.codigo,grupo:g?.nome||"seu grupo"};$("inviteGeneratedCode").textContent=x.codigo;$("inviteHelp").textContent=`Envie a mensagem abaixo para a pessoa que deseja adicionar ao grupo ${conviteAtual.grupo}. O código é válido por 7 dias e para um único uso.`;$("inviteShareText").value=textoConvite();$("inviteFeedback").textContent="";$("shareInviteButton").style.display="";abrirCamada("inviteGeneratedModal");await copiarConvite(true)}
async function fecharConviteGerado(){const voltarMembros=retornarAoGrupoAposConvite,grupoId=grupoGerenciado;retornarAoGrupoAposConvite=false;fecharCamada("inviteGeneratedModal",false);if(voltarMembros&&grupoId)await abrirMembros()}
function textoConvite(){return`Você foi convidado para participar do grupo ${conviteAtual.grupo} no LUVI Finanças. Entre no LUVI Finanças, escolha “Entrar com convite” e informe o código ${conviteAtual.codigo}.`}
function feedbackConvite(texto){$("inviteFeedback").textContent=texto}
async function copiarTextoFallback(texto){
  const ta=document.createElement("textarea");
  ta.value=texto;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";
  document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,ta.value.length);
  let ok=false;try{ok=document.execCommand("copy")}catch(_){}
  document.body.removeChild(ta);return ok;
}
async function copiarConvite(silencioso){
  const texto=textoConvite();
  let ok=false;
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(texto);ok=true}
  }catch(_){}
  if(!ok)ok=await copiarTextoFallback(texto);
  feedbackConvite(ok?"✓ Convite copiado para a área de transferência.":"Não foi possível copiar automaticamente. Selecione a mensagem acima e copie-a manualmente.");
  if(ok&&!silencioso)setTimeout(()=>feedbackConvite(""),3500);
  return ok;
}
async function compartilharConvite(){
  if(!conviteAtual)return;
  if(navigator.share){
    try{
      await navigator.share({title:"Convite LUVI Finanças",text:textoConvite()});
      feedbackConvite("✓ Compartilhamento aberto/concluído pelo dispositivo.");return;
    }catch(e){
      if(e&&e.name==="AbortError"){feedbackConvite("Compartilhamento cancelado.");return}
    }
  }
  const copiado=await copiarConvite(true);
  feedbackConvite(copiado?"Compartilhamento direto não está disponível neste navegador. O convite foi copiado para você enviar manualmente.":"Compartilhamento direto não está disponível neste navegador. Selecione a mensagem acima e copie-a manualmente.");
}

function selecionarVisaoGeral(){fecharSubtelasPrincipais();contaSelecionada=null;grupoSelecionado=null;$("contextoTitulo").textContent="Visão geral";toggleMenu(false);carregarDadosMes()}
function selecionarConta(id,nome){fecharSubtelasPrincipais();contaSelecionada=id;grupoSelecionado=null;$("contextoTitulo").textContent=nome;toggleMenu(false);carregarDadosMes()}
function selecionarGrupo(id,nome){fecharSubtelasPrincipais();grupoSelecionado=id;contaSelecionada=null;$("contextoTitulo").textContent="Grupo: "+nome;toggleMenu(false);carregarDadosMes()}
function toggleMenu(force){const s=$("sidebar"),open=force===undefined?!s.classList.contains("open"):force;s.classList.toggle("open",open);$("overlay").classList.toggle("hidden",!open);if(open)registrarCamada()}
function abrirVisao(){fecharSubtelasPrincipais("viewModal");toggleMenu(false);$("viewContent").innerHTML=`<button class="selection-item" onclick="selecionarVisaoGeral();fecharCamada('viewModal',false)"><strong>Visão geral</strong><span>Todas as contas que você pode visualizar</span></button>`+contas.map(c=>`<button class="selection-item" onclick="selecionarConta(${c.id},'${js(c.nome)}');fecharCamada('viewModal',false)"><strong>${escaparHtml(c.nome)}</strong><span>${c.propria?(c.grupos.length?'Compartilhada':'Privada'):'Compartilhada comigo'}</span></button>`).join("");abrirCamada("viewModal")}
function abrirGrupos(){fecharSubtelasPrincipais("groupsModal");toggleMenu(false);renderGrupos();abrirCamada("groupsModal")}
function renderGrupos(){
  $("groupsContent").innerHTML=grupos.length?grupos.map(g=>`
    <div class="luvi-group-row ${g.ativo===false?'luvi-group-inactive':''}">
      <button type="button" class="selection-item luvi-group-open" data-open-group="${g.id}">
        <span class="luvi-list-main"><strong>${escaparHtml(g.nome)}</strong>
        <small>${g.perfil==='ADMIN'?'Administrador':'Membro'} · ${g.ativo===false?'Inativo':'Ativo'}</small></span>
        <span aria-hidden="true">›</span>
      </button>
      ${g.proprietario?`<label class="luvi-switch" title="${g.ativo===false?'Ativar':'Inativar'} grupo">
        <input type="checkbox" aria-label="Grupo ${escaparHtml(g.nome)} ativo" data-group-status="${g.id}" ${g.ativo!==false?'checked':''}>
        <span class="luvi-switch-track"></span></label>`:''}
    </div>`).join(""):'<div class="empty-state">Você ainda não participa de grupos.</div>';
  $("groupsContent").querySelectorAll("[data-group-status]").forEach(input=>input.addEventListener("change",async()=>{
    const id=Number(input.dataset.groupStatus),ativo=input.checked;
    input.disabled=true;
    try{
      const r=await fetch(`/api/app/grupos/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ativo})});
      if(!r.ok)throw new Error(await erro(r));
      await carregarContexto();renderGrupos();
    }catch(e){input.checked=!ativo;await mensagem(e.message||"Não foi possível alterar o grupo.");input.disabled=false;}
  }));
}
async function alterarCompartilhamento(cid,gid,marcar,el){el.disabled=true;const r=await fetch(`/api/app/contas/${cid}/grupos/${gid}`,{method:marcar?"POST":"DELETE"});if(!r.ok){el.checked=!marcar;await mensagem(await erro(r),"Não foi possível alterar o compartilhamento")}else await carregarContexto();el.disabled=false}
async function usarCodigoConvite(){
  const codigo=$("inviteCodeInput").value.trim().toUpperCase();
  $("inviteError").textContent="";
  if(!codigo){$("inviteError").textContent="Informe o código do convite.";return}
  const botao=$("abrirInviteCode");botao.disabled=true;
  try{
    const r=await fetch("/api/convites/aceitar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({codigo})});
    if(!r.ok){$("inviteError").textContent=await erro(r);return}
    fecharCamada("inviteCodeModal",false);
    await carregarContexto();
    toast("Convite aceito. Você já participa do grupo.");
  }catch(e){console.error("Erro ao aceitar convite",e);$("inviteError").textContent="Não foi possível aceitar o convite. Tente novamente."}
  finally{botao.disabled=false}
}
async function colarConvite(){
  try{
    if(!navigator.clipboard?.readText){$("inviteError").textContent="Cole o código manualmente no campo.";return}
    const texto=await navigator.clipboard.readText();
    const codigo=texto.match(/FAM-[A-Z2-9]{6}/i)?.[0]||texto.trim();
    $("inviteCodeInput").value=codigo.toUpperCase();
    $("inviteError").textContent="";
  }catch(e){$("inviteError").textContent="Não foi possível ler a área de transferência. Cole o código manualmente."}
}
function abrirEntradaConvite(){fecharSubtelasPrincipais();toggleMenu(false);$("inviteCodeInput").value="";$("inviteError").textContent="";abrirCamada("inviteCodeModal");setTimeout(()=>$("inviteCodeInput").focus(),30)}
async function abrirGrupo(id,e){if(e)e.stopPropagation();fecharSubtelasPrincipais("groupModal");toggleMenu(false);grupoGerenciado=id;const g=grupos.find(x=>x.id===id);$("groupModalTitle").textContent=g?`Grupo: ${g.nome}`:"Grupo";const proprias=contas.filter(c=>c.propria),outras=contas.filter(c=>!c.propria&&c.grupos.includes(id));$("groupContent").innerHTML=`<section class="group-panel"><div class="group-panel-title"><h3>Contas no grupo</h3></div><div class="group-scroll"><div class="group-table group-accounts"><div class="group-table-head"><span>Conta</span><span>Compartilhamento</span></div>${proprias.map(c=>`<div class="group-table-row"><span><strong>${escaparHtml(c.nome)}</strong></span><span><input aria-label="Compartilhar ${escaparHtml(c.nome)}" type="checkbox" ${c.grupos.includes(id)?'checked':''} onchange="alterarCompartilhamentoGrupo(${c.id},${id},this.checked,this)"></span></div>`).join('')}${outras.map(c=>`<div class="group-table-row"><span><strong>${escaparHtml(c.nome)}</strong><small>de ${escaparHtml(c.proprietario)}</small></span><span><span class="shared-badge">Compartilhada comigo</span></span></div>`).join('')}${!proprias.length&&!outras.length?'<div class="empty-state">Nenhuma conta disponível.</div>':''}</div></div></section>`;$("groupMembersButton").style.display="";abrirCamada("groupModal")}
async function alterarCompartilhamentoGrupo(cid,gid,marcar,el){el.disabled=true;const r=await fetch(`/api/app/contas/${cid}/grupos/${gid}`,{method:marcar?"POST":"DELETE"});if(!r.ok){el.checked=!marcar;el.disabled=false;await mensagem(await erro(r),"Não foi possível alterar o compartilhamento");return}await carregarContexto();el.disabled=false;await abrirGrupo(gid)}
async function abrirMembros(){if(!grupoGerenciado)return;const g=grupos.find(x=>x.id===grupoGerenciado),r=await fetch(`/api/app/grupos/${grupoGerenciado}/membros`);if(!r.ok){mensagem(await erro(r));return}const ms=await r.json();$("membersTitle").textContent=`Membros · ${g?.nome||''}`;$("membersContent").innerHTML=ms.length?`<div class="member-list">${ms.map(m=>`<div class="member-row"><span><strong>${escaparHtml(m.nome)}</strong><small>${m.perfil}</small></span>${g?.perfil==='ADMIN'&&m.id!==window.usuarioAtual?.id?botaoIcone("excluir",`removerMembro(${m.id})`,"Remover membro"):''}</div>`).join('')}</div>`:'<div class="empty-state">Nenhum membro.</div>';$("membersInviteButton").style.display=g?.perfil==='ADMIN'?"":"none";fecharCamada("groupModal",false);fecharSubtelasPrincipais("membersModal");abrirCamada("membersModal")}
async function removerMembro(uid){if(!grupoGerenciado||!await confirmar("Deseja remover este membro do grupo?"))return;const r=await fetch(`/api/app/grupos/${grupoGerenciado}/membros/${uid}`,{method:"DELETE"});if(!r.ok){mensagem(await erro(r),"Não foi possível remover o membro");return}await carregarContexto();await abrirMembros();toast("Membro removido do grupo.")}
async function abrirCompartilhamentoConta(cid){const c=contas.find(x=>x.id===cid);if(!c)return;fecharCamada("accountsModal",false);fecharSubtelasPrincipais("shareAccountModal");contaCompartilhamento=cid;$("shareAccountName").textContent=`Conta: ${c.nome} · ${c.grupos.length?"Compartilhada":"Privada"}`;$("shareAccountContent").innerHTML=grupos.length?grupos.map(g=>`<label class="share-choice"><span><strong>${escaparHtml(g.nome)}</strong><small>${c.grupos.includes(g.id)?'Compartilhada com este grupo':'Compartilhar com este grupo'}</small></span><input type="radio" name="shareGroup" ${c.grupos.includes(g.id)?'checked':''} onchange="definirCompartilhamentoConta(${cid},${g.id})"></label>`).join('')+(c.grupos.length?`<button class="danger-link" onclick="removerCompartilhamentoConta(${cid},${c.grupos[0]})">Remover compartilhamento</button>`:''):'<div class="empty-state">Você precisa participar de um grupo para compartilhar esta conta.</div>';abrirCamada("shareAccountModal")}
async function definirCompartilhamentoConta(cid,gid){const c=contas.find(x=>x.id===cid),atual=c?.grupos?.[0];if(atual&&atual!==gid){const d=await fetch(`/api/app/contas/${cid}/grupos/${atual}`,{method:"DELETE"});if(!d.ok){mensagem(await erro(d));return}}const r=await fetch(`/api/app/contas/${cid}/grupos/${gid}`,{method:"POST"});if(!r.ok){mensagem(await erro(r),"Não foi possível compartilhar a conta");return}await carregarContexto();renderContas();await abrirCompartilhamentoConta(cid)}
async function removerCompartilhamentoConta(cid,gid){const r=await fetch(`/api/app/contas/${cid}/grupos/${gid}`,{method:"DELETE"});if(!r.ok){mensagem(await erro(r));return}await carregarContexto();renderContas();await abrirCompartilhamentoConta(cid)}

async function carregarCategorias(){
  const contaId=+$("conta")?.value;
  if(!contaId){categorias=[];atualizarSelectCategorias();return}
  const r=await fetch(`/api/categorias?contaId=${contaId}`);
  if(!r.ok){categorias=[];atualizarSelectCategorias();mensagem(await erro(r),"Não foi possível carregar as categorias");return}
  categorias=(await r.json()).filter(c=>c.ativa);
  atualizarSelectCategorias();
}
function atualizarSelectCategorias(){
  const tipo=$("tipo")?.value||"DESPESA",lista=categorias.filter(c=>c.tipo===tipo);
  $("categoria").innerHTML=lista.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join("");
  if(!lista.length)$("categoria").innerHTML='<option value="">Nenhuma categoria ativa para este tipo</option>';
}
async function carregarDadosMes(){await Promise.all([carregarLancamentos(),carregarTransferencias(),carregarResumo()]);renderizar();if(luviPrevisaoAtiva)await carregarCompromissosLuvi();await atualizarAvisosLuvi()}
function qs(){const m=dataAtual.getMonth()+1,a=dataAtual.getFullYear();return`mes=${m}&ano=${a}${contaSelecionada?`&contaId=${contaSelecionada}`:""}${grupoSelecionado?`&grupoId=${grupoSelecionado}`:""}`}
async function carregarLancamentos(){const m=dataAtual.getMonth()+1,a=dataAtual.getFullYear();$("mesAtual").textContent=`${nomesMeses[m-1]} de ${a}`;const r=await fetch(`/api/lancamentos?${qs()}`);if(!r.ok){mensagem(await erro(r));return}lancamentos=await r.json()}
async function carregarTransferencias(){const r=await fetch(`/api/transferencias?${qs()}`);transferencias=r.ok?await r.json():[]}
async function carregarResumo(){const r=await fetch(`/api/lancamentos/resumo?${qs()}`);if(!r.ok)return;const x=await r.json();$("saldoInicial").textContent=formatarMoeda(+x.saldoInicial);$("totalReceitas").textContent=formatarMoeda(+x.receitas);$("totalDespesas").textContent=formatarMoeda(+x.despesas);$("saldoFinal").textContent=formatarMoeda(+x.saldoFinal);$("movimentacaoPeriodo").textContent=`Movimentação do período: ${formatarMoeda(+x.movimentacao)}`}
function alterarOrdenacao(c){if(ordenacao.campo===c)ordenacao.direcao=ordenacao.direcao==="asc"?"desc":"asc";else{ordenacao.campo=c;ordenacao.direcao="asc"}renderizar()}
function movimentos(){const ls=lancamentos.map(x=>({...x,natureza:"LANCAMENTO"}));const ts=transferencias.map(t=>({id:t.id,data:t.data,dataHoraCadastro:t.dataHoraCadastro,valor:t.valor,descricao:t.descricao||"Transferência",categoria:"TRANSFERENCIA",natureza:"TRANSFERENCIA",origemId:t.origemId,origemNome:t.origemNome,destinoId:t.destinoId,destinoNome:t.destinoNome}));return[...ls,...ts]}
function ordenados(){return movimentos().sort((a,b)=>{let av,bv;if(ordenacao.campo==="valor"){av=+a.valor;bv=+b.valor}else if(ordenacao.campo==="descricao"){av=a.descricao.toLowerCase();bv=b.descricao.toLowerCase()}else if(ordenacao.campo==="categoria"){av=formatarCategoria(a.categoria);bv=formatarCategoria(b.categoria)}else{av=`${a.data}|${a.dataHoraCadastro||""}|${a.id}`;bv=`${b.data}|${b.dataHoraCadastro||""}|${b.id}`}let c=typeof av==="number"?av-bv:av.localeCompare(bv,"pt-BR");return ordenacao.direcao==="asc"?c:-c})}
function renderizar(){const body=$("lancamentosBody");body.innerHTML="";$("semLancamentos").style.display=movimentos().length?"none":"block";ordenados().forEach(l=>{const tr=document.createElement("tr");if(l.natureza==="TRANSFERENCIA"){let sinal="⇄",classe="",rotulo="Transferência";if(contaSelecionada){if(l.origemId===contaSelecionada){sinal="-";classe="valor-despesa";rotulo="Transferência enviada"}else if(l.destinoId===contaSelecionada){sinal="+";classe="valor-receita";rotulo="Transferência recebida"}}tr.innerHTML=`<td>${formatarData(l.data)}</td><td class="valor-lancamento ${classe}">${sinal} ${formatarMoeda(+l.valor)}</td><td>${escaparHtml(l.descricao)}</td><td>${rotulo}</td><td>${escaparHtml(l.origemNome)} → ${escaparHtml(l.destinoNome)}</td><td>${botaoIcone("excluir",`excluirTransferencia(${l.id})`,"Excluir transferência")}</td>`}else{const rec=l.tipo==="RECEITA";tr.innerHTML=`<td>${formatarData(l.data)}</td><td class="valor-lancamento ${rec?"valor-receita":"valor-despesa"}">${rec?"+":"-"} ${formatarMoeda(+l.valor)}</td><td>${escaparHtml(l.descricao)}</td><td>${l.categoria}</td><td>${escaparHtml(l.contaNome)}</td><td>${botaoIcone("editar",`editarLancamento(${l.id})`,"Editar lançamento")}${botaoIcone("excluir",`excluirLancamento(${l.id})`,"Excluir lançamento")}</td>`}body.appendChild(tr)});document.querySelectorAll("th.sortable").forEach(th=>th.querySelector(".sort-indicator").textContent=th.dataset.sort===ordenacao.campo?(ordenacao.direcao==="asc"?"▲":"▼"):"")}
function luviPreferenciaChave(contexto){const usuario=window.usuarioAtual?.id;return usuario?`luvi.ultimaConta.${usuario}.${contexto}`:null;}
function luviLerConta(contexto){const chave=luviPreferenciaChave(contexto);const id=chave?Number(localStorage.getItem(chave)):0;return contas.some(c=>c.id===id)?id:null;}
function luviGuardarConta(contexto,id){const chave=luviPreferenciaChave(contexto);if(chave&&id)localStorage.setItem(chave,String(id));}
function contaPadrao(){const id=luviLerConta('lancamento');return contas.some(c=>c.id===id)?id:(contaSelecionada&&contas.some(c=>c.id===contaSelecionada)?contaSelecionada:contas[0]?.id)}
async function abrirNovo(){if(!contas.length){mensagem("Crie uma conta financeira primeiro no menu ☰.");return}$("modalTitulo").textContent="Novo lançamento";$("lancamentoId").value="";$("conta").value=contaPadrao();$("tipo").value="DESPESA";await carregarCategorias();$("descricao").value="";$("valor").value="";$("data").value=hojeISO();$("formError").textContent="";abrirCamada("modal")}
async function editarLancamento(id){const l=lancamentos.find(x=>x.id===id);if(!l)return;$("modalTitulo").textContent="Editar lançamento";$("lancamentoId").value=l.id;$("conta").value=l.contaId;$("tipo").value=l.tipo;await carregarCategorias();$("descricao").value=l.descricao;$("categoria").value=l.categoriaId;$("valor").value=l.valor;$("data").value=l.data;$("formError").textContent="";abrirCamada("modal")}
async function salvarLancamento(e){e.preventDefault();const id=$("lancamentoId").value,d={contaId:+$("conta").value,tipo:$("tipo").value,descricao:$("descricao").value,categoriaId:+$("categoria").value,valor:+$("valor").value,data:$("data").value};const r=await fetch(id?`/api/lancamentos/${id}`:"/api/lancamentos",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("formError").textContent=await erro(r);return}luviGuardarConta("lancamento",d.contaId);fecharCamada("modal",false);
  const dataSalva=new Date(`${d.data}T12:00:00`);
  if(!Number.isNaN(dataSalva.getTime())&&(dataSalva.getMonth()!==dataAtual.getMonth()||dataSalva.getFullYear()!==dataAtual.getFullYear()))dataAtual=dataSalva;
  await carregarDadosMes();
  if(!id){requestAnimationFrame(()=>document.querySelector(".table-card")?.scrollIntoView({behavior:"smooth",block:"start"}));}}
function abrirTransferencia(){if(contas.length<2){mensagem("Você precisa ter acesso a pelo menos duas contas.");return}const padrao=luviLerConta('transferOrigem')||contaPadrao();if(padrao)$("transferOrigem").value=padrao;const destino=luviLerConta('transferDestino');if(destino&&destino!==Number($("transferOrigem").value))$("transferDestino").value=destino;$("transferValor").value="";$("transferData").value=hojeISO();$("transferDescricao").value="Transferência";$("transferError").textContent="";abrirCamada("transferModal")}
async function salvarTransferencia(e){e.preventDefault();const d={origemId:+$("transferOrigem").value,destinoId:+$("transferDestino").value,valor:+$("transferValor").value,data:$("transferData").value,descricao:$("transferDescricao").value};const r=await fetch("/api/transferencias",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("transferError").textContent=await erro(r);return}luviGuardarConta("transferOrigem",d.origemId);luviGuardarConta("transferDestino",d.destinoId);fecharCamada("transferModal",false);await carregarDadosMes();window.scrollTo({top:0,behavior:"smooth"})}
async function excluirLancamento(id){if(!await confirmar("Deseja realmente excluir este lançamento?"))return;const r=await fetch(`/api/lancamentos/${id}`,{method:"DELETE"});if(r.ok){await carregarDadosMes();toast("Lançamento excluído.")}else mensagem(await erro(r))}
async function excluirTransferencia(id){if(!await confirmar("Deseja realmente excluir esta transferência?"))return;const r=await fetch(`/api/transferencias/${id}`,{method:"DELETE"});if(r.ok){await carregarDadosMes();toast("Transferência excluída.")}else mensagem(await erro(r))}

let messageResolver=null;function mensagem(texto,titulo="LUVI Finanças"){return new Promise(resolve=>{$("messageTitle").textContent=titulo;$("messageText").textContent=texto;$("messageCancel").classList.add("hidden");$("messageOk").textContent="OK";messageResolver=resolve;abrirCamada("messageModal")})}function confirmar(texto){return new Promise(resolve=>{$("messageTitle").textContent="LUVI Finanças";$("messageText").textContent=texto;$("messageCancel").classList.remove("hidden");$("messageOk").textContent="Confirmar";messageResolver=resolve;abrirCamada("messageModal")})}function resolverMensagem(v){const r=messageResolver;messageResolver=null;if(r)r(v);fecharCamada("messageModal",false)}
function solicitarTexto(titulo,label,placeholder){return new Promise(resolve=>{const antigo=$("messageText").innerHTML;$("messageTitle").textContent=titulo;$("messageText").innerHTML=`<label class="inline-label">${escaparHtml(label)}</label><input id="genericTextInput" class="generic-input" placeholder="${escaparHtml(placeholder)}">`;$("messageCancel").classList.remove("hidden");$("messageOk").textContent="Continuar";messageResolver=v=>{const valor=v?($("genericTextInput")?.value.trim()||""):null;$("messageText").innerHTML=antigo;resolve(valor)};abrirCamada("messageModal");setTimeout(()=>$("genericTextInput")?.focus(),30)})}
function toast(texto){mensagem(texto)}
// V19: navegação direta não chama rotinas de "Voltar" nem altera dados dos formulários.
// A lógica de retorno em cascata permanece intacta nos botões próprios das subtelas.
function luviFecharTelasDireto(){
 document.querySelectorAll('.modal:not(.hidden)').forEach(el=>{
  el.classList.add('hidden');delete el.dataset.openOrder;el.style.zIndex='';
 });
 $('usuarioDropdown')?.classList.add('hidden');
 $('usuarioMenuButton')?.setAttribute('aria-expanded','false');
 toggleMenu(false);
 sincronizarCamadas();
}
function luviIrParaInicio(){
 luviFecharTelasDireto();
 window.scrollTo({top:0,behavior:'smooth'});
 marcarNavMobile('home');
}
function fecharSubtelasPrincipais(excecao=null){["settingsModal","notificationsModal","reportsModal","categoriesModal","dashboardModal","accountsModal","groupModal","groupsModal","groupCreateModal","viewModal","membersModal","shareAccountModal"].forEach(id=>{if(id!==excecao){const el=$(id);if(el&&!el.classList.contains("hidden")){el.classList.add("hidden");delete el.dataset.openOrder;el.style.zIndex=""}}});sincronizarCamadas()}
function abrirCamada(id){const el=$(id);if(!el)return false;const ordem=++window.luviLayerOrder;const novaAbertura=el.classList.contains("hidden");if(novaAbertura)el.classList.remove("hidden");el.dataset.openOrder=String(ordem);el.style.zIndex=String(100+ordem);sincronizarCamadas();if(novaAbertura)registrarCamadaNoHistorico(id);return true}
function fecharCamada(id){const el=$(id);if(!el||el.classList.contains("hidden"))return false;el.classList.add("hidden");delete el.dataset.openOrder;el.style.zIndex="";sincronizarCamadas();return true}
function registrarCamada(){}
function sincronizarCamadas(){const temModal=modais().length>0;document.body.classList.toggle("modal-open",temModal)}
function fecharTopo(){const abertos=modais().sort((a,b)=>(+(b.dataset.openOrder||0))-(+(a.dataset.openOrder||0)));if(abertos.length){const id=abertos[0].id;if(id==="luviCardModal"){luviCardsBack();return true}if(id==="dashboardModal"){luviDashboardBack();return true}if(id==="membersModal"){fecharCamada(id);if(grupoGerenciado)abrirGrupo(grupoGerenciado);return true}if(id==="shareAccountModal"){fecharCamada(id);abrirContas();return true}if(id==="groupCreateModal"){fecharCamada(id,false);abrirGrupos();return true}if(id==="accountEditModal"){fecharCamada(id,false);abrirContas();return true}if(id==="categoryEditModal"){fecharCamada(id,false);abrirCategorias();return true}if(id==="inviteGeneratedModal"){fecharConviteGerado();return true}return fecharCamada(id);}if($("usuarioDropdown")&&!$("usuarioDropdown").classList.contains("hidden")){ $("usuarioDropdown").classList.add("hidden");$("usuarioMenuButton").setAttribute("aria-expanded","false");return true}if($("sidebar").classList.contains("open")){toggleMenu(false);return true}return false}
// v6.1.10: cada abertura real de tela cria uma entrada do navegador.
// O retorno de uma subtela restaura a tela anterior SEM criar outra entrada.
// Isso resolve o caso Início > Categorias > Nova categoria > Categorias > Início.
let luviHistoricoPronto=false;
let luviSuprimirAbertura=null;
function registrarCamadaNoHistorico(id){
  if(!luviHistoricoPronto)return;
  if(luviSuprimirAbertura===id){luviSuprimirAbertura=null;return}
  try{history.pushState({__luviTela:id},"",location.href)}
  catch(e){console.warn("Não foi possível registrar a tela no histórico:",e)}
}
function iniciarVoltarNativo(){
  if(luviHistoricoPronto)return;
  try{
    // Mantém uma entrada de Início antes das telas internas. O login anterior
    // não é acionado ao fechar uma tela, mesmo em fluxos com várias etapas.
    history.replaceState({...((history.state&&typeof history.state==="object")?history.state:{}),__luviRaiz:true},"",location.href);
    history.pushState({__luviInicio:true},"",location.href);
    luviHistoricoPronto=true;
    window.addEventListener("popstate",()=>{
      const topo=modais().sort((a,b)=>(+(b.dataset.openOrder||0))-(+(a.dataset.openOrder||0)))[0];
      if(topo){
        const anterior={categoryEditModal:"categoriesModal",accountEditModal:"accountsModal",membersModal:"groupModal",shareAccountModal:"accountsModal"}[topo.id];
        luviSuprimirAbertura=anterior||null;
        fecharTopo();
        // Limpa o marcador se a restauração não precisar abrir a tela.
        if(anterior)setTimeout(()=>{if(luviSuprimirAbertura===anterior)luviSuprimirAbertura=null},1500);
      }else if($( "usuarioDropdown")&&!$("usuarioDropdown").classList.contains("hidden")||$("sidebar")?.classList.contains("open")){
        fecharTopo();
      }else{
        // Já estamos em Início: preserva uma entrada de navegação local.
        try{history.pushState({__luviInicio:true},"",location.href)}catch(e){console.warn(e)}
      }
    });
  }catch(e){console.warn("Navegação interna indisponível:",e)}
}
function rotuloTipoConta(t){return({BANCO:"Banco",CARTEIRA:"Carteira",OUTROS:"Outros"})[t]||t}
function formatarMoeda(v){return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}function formatarData(d){const[a,m,x]=d.split("-");return`${x}/${m}/${a}`}function formatarCategoria(c){return({SALARIO:"Salário",RENDA_EXTRA:"Renda extra",ALIMENTACAO:"Alimentação",MORADIA:"Moradia",TRANSPORTE:"Transporte",SAUDE:"Saúde",EDUCACAO:"Educação",LAZER:"Lazer",CONTAS:"Contas",OUTROS:"Outros",TRANSFERENCIA:"Transferência"})[c]||c}function hojeISO(){const h=new Date(),d=new Date(h.getTime()-h.getTimezoneOffset()*60000);return d.toISOString().slice(0,10)}function escaparHtml(t){const d=document.createElement("div");d.textContent=t||"";return d.innerHTML}function js(t){return String(t||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'")}async function erro(r){try{const x=await r.json();return x.message||x.detail||"Operação não permitida."}catch(_){return"Não foi possível concluir a operação no LUVI Finanças."}}


async function abrirCategorias(){fecharSubtelasPrincipais("categoriesModal");toggleMenu(false);$("categoryScope").innerHTML=`<option value="">Pessoal</option>`+grupos.map(g=>`<option value="${g.id}">Grupo: ${escaparHtml(g.nome)}</option>`).join("");$("categoryScope").value=grupos.some(g=>String(g.id)===String(categoriaEscopoPreferido))?String(categoriaEscopoPreferido):(grupos.length?String(grupos[0].id):"");await carregarCategoriasGerencia();abrirCamada("categoriesModal")}
async function carregarCategoriasGerencia(){const gid=$("categoryScope").value;const r=await fetch(`/api/categorias${gid?`?grupoId=${gid}`:""}`);if(!r.ok){mensagem(await erro(r));return}categoriasGerencia=await r.json();renderCategoriasGerencia()}
function renderCategoriasGerencia(){$("categoriesContent").innerHTML=categoriasGerencia.length?`<div class="category-table"><div class="category-row category-head"><span>Nome</span><span>Tipo</span><span>Ativa</span><span>Ações</span></div>${categoriasGerencia.map(c=>`<details class="category-mobile-item"><summary><span class="category-mobile-name"><strong>${escaparHtml(c.nome)}</strong><small>${c.tipo==="RECEITA"?"Receita":"Despesa"}</small></span><span class="category-mobile-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span></summary><div class="category-mobile-detail"><label class="switch" title="${c.ativa?'Categoria ativa':'Categoria inativa'}"><input type="checkbox" ${c.ativa?'checked':''} onchange="alternarCategoria(${c.id},this)"><span class="switch-slider"></span><span class="sr-only">${c.ativa?'Ativa':'Inativa'}</span></label><span class="category-actions">${botaoIcone("editar",`abrirEdicaoCategoria(${c.id})`,"Editar categoria")}${botaoIcone("excluir",`excluirCategoria(${c.id})`,"Excluir categoria")}</span></div></details><div class="category-row category-desktop-row"><span class="category-name"><strong>${escaparHtml(c.nome)}</strong></span><span class="category-type">${c.tipo==="RECEITA"?"Receita":"Despesa"}</span><span class="category-active"><label class="switch" title="${c.ativa?'Categoria ativa':'Categoria inativa'}"><input type="checkbox" ${c.ativa?'checked':''} onchange="alternarCategoria(${c.id},this)"><span class="switch-slider"></span><span class="sr-only">${c.ativa?'Ativa':'Inativa'}</span></label></span><span class="category-actions">${botaoIcone("editar",`abrirEdicaoCategoria(${c.id})`,"Editar categoria")}${botaoIcone("excluir",`excluirCategoria(${c.id})`,"Excluir categoria")}</span></div>`).join('')}</div>`:'<div class="empty-state">Nenhuma categoria cadastrada.</div>'}
function abrirEdicaoCategoria(id=null){fecharCamada("categoriesModal",false);const c=id?categoriasGerencia.find(x=>x.id===id):null;$("categoryId").value=c?.id||"";$("categoryName").value=c?.nome||"";$("categoryType").value=c?.tipo||"DESPESA";$("categoryEditTitle").textContent=c?"Editar categoria":"Nova categoria";$("categoryError").textContent="";abrirCamada("categoryEditModal")}
async function salvarCategoria(e){e.preventDefault();const id=$("categoryId").value,gid=$("categoryScope").value;categoriaEscopoPreferido=gid;const d={nome:$("categoryName").value.trim(),tipo:$("categoryType").value,grupoId:gid?+gid:null};const r=await fetch(id?`/api/categorias/${id}`:"/api/categorias",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("categoryError").textContent=await erro(r);return}await carregarCategorias();await carregarCategoriasGerencia();fecharCamada("categoryEditModal",false);await abrirCategorias()}
async function alternarCategoria(id,el=null){if(el)el.disabled=true;const r=await fetch(`/api/categorias/${id}/ativa`,{method:"PATCH"});if(!r.ok){if(el){el.checked=!el.checked;el.disabled=false}mensagem(await erro(r));return}await carregarCategoriasGerencia();await carregarCategorias()}
async function excluirCategoria(id){if(!await confirmar("Deseja excluir esta categoria? Se ela já tiver lançamentos, o LUVI pedirá que você a desative."))return;const r=await fetch(`/api/categorias/${id}`,{method:"DELETE"});if(!r.ok){mensagem(await erro(r),"Não foi possível excluir");return}await carregarCategoriasGerencia();await carregarCategorias();toast("Categoria excluída.")}
// LUVI v6.8: dashboard gerencial. Nenhuma gravação financeira.
let luviDashView=null,luviDashChart=null,luviDashData=null;
let luviDashPeriod=null,luviDashCardStatus='abertas';
function luviDashboardBack(){if(luviDashView){luviDashView=null;luviDashboardDestroyChart();luviDashboardShowHome();}else {luviDashboardDestroyChart();fecharCamada('dashboardModal');}}
function luviDashboardDestroyChart(){
 try{if(luviDashChart&&typeof luviDashChart.destroy==='function')luviDashChart.destroy();}catch(e){console.warn('Falha ao liberar gráfico anterior',e)}
 luviDashChart=null;
 const area=document.querySelector('#luviDashboardDetail .luvi-dashboard-chart');
 if(area){area.replaceChildren();const canvas=document.createElement('canvas');canvas.id='luviDashboardAnalysisChart';area.appendChild(canvas);}
}
function luviDashboardEmpty(message){
 const area=document.querySelector('#luviDashboardDetail .luvi-dashboard-chart');
 if(!area)return;
 area.replaceChildren();const msg=document.createElement('p');msg.className='luvi-dashboard-empty';msg.textContent=message;area.appendChild(msg);
}
function luviDashboardPieFallback(labels,values){
 const area=document.querySelector('#luviDashboardDetail .luvi-dashboard-chart');if(!area)return;
 area.replaceChildren();
 const total=values.reduce((a,b)=>a+b,0);if(total<=0){luviDashboardEmpty('Nenhuma despesa encontrada no período selecionado.');return}
 const colors=['#102f59','#2681bb','#1f9d75','#f59e0b','#8257c5','#dd6472','#3d8290','#8a9aab'];
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 220');svg.setAttribute('role','img');svg.setAttribute('aria-label','Distribuição das despesas por categoria');svg.classList.add('luvi-dashboard-pie-svg');
 let offset=0;const circumference=2*Math.PI*76;
 values.forEach((value,i)=>{if(value<=0)return;const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','110');circle.setAttribute('cy','110');circle.setAttribute('r','76');circle.setAttribute('fill','none');circle.setAttribute('stroke',colors[i%colors.length]);circle.setAttribute('stroke-width','35');circle.setAttribute('stroke-dasharray',`${value/total*circumference} ${circumference}`);circle.setAttribute('stroke-dashoffset',String(-offset*circumference));circle.setAttribute('transform','rotate(-90 110 110)');svg.appendChild(circle);offset+=value/total;});
 const center=document.createElementNS(ns,'text');center.setAttribute('x','110');center.setAttribute('y','114');center.setAttribute('text-anchor','middle');center.setAttribute('font-size','15');center.setAttribute('font-weight','700');center.setAttribute('fill','#102f59');center.textContent=luviDashMoney(total);svg.appendChild(center);
 const legend=document.createElement('div');legend.className='luvi-dashboard-pie-legend';labels.forEach((label,i)=>{const item=document.createElement('div');const dot=document.createElement('span');dot.style.background=colors[i%colors.length];const title=document.createElement('span');title.textContent=label;const val=document.createElement('strong');val.textContent=luviDashMoney(values[i]);item.append(dot,title,val);legend.appendChild(item);});
 const wrap=document.createElement('div');wrap.className='luvi-dashboard-pie-fallback';wrap.append(svg,legend);area.appendChild(wrap);
}
function luviDashboardShowHome(){
 $('luviDashboardHome').classList.remove('hidden');$('luviDashboardDetail').classList.add('hidden');
 $('dashboardHeaderTitle').textContent='Dashboard financeiro';
 const body=$('dashboardModal').querySelector('.modal-body');if(body)body.scrollTop=0;
}
const luviDashMoney=v=>formatarMoeda(Number(v)||0);
const luviDashNum=v=>Number(v)||0;
const luviDashMonth=(y,m)=>`${y}-${String(m).padStart(2,'0')}`;
const luviDashMonthLabel=key=>{const [y,m]=key.split('-').map(Number);return `${String(m).padStart(2,'0')}/${y}`};
function luviDashAddMonth(y,m,offset){const d=new Date(y,m-1+offset,1);return luviDashMonth(d.getFullYear(),d.getMonth()+1)}
luviDashPeriod={start:luviDashMonth(new Date().getFullYear(),new Date().getMonth()+1),end:luviDashAddMonth(new Date().getFullYear(),new Date().getMonth()+1,5)};
function luviDashDatePlus(days){const d=new Date();d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
async function luviDashLoad(start=luviDashPeriod.start,end=luviDashPeriod.end){
 const [sy,sm]=start.split('-').map(Number),[ey,em]=end.split('-').map(Number);const count=(ey-sy)*12+em-sm+1;
 if(count<1||count>36)throw new Error('Selecione um intervalo entre 1 e 36 meses.');
 const months=Array.from({length:count},(_,i)=>luviDashAddMonth(sy,sm,i));
 const plan=await Promise.all(months.map(async key=>{const [y,m]=key.split('-');const params=new URLSearchParams({mes:String(Number(m)),ano:y});if(contaSelecionada)params.set('contaId',contaSelecionada);if(grupoSelecionado)params.set('grupoId',grupoSelecionado);try{const r=await fetch(`/api/planejamento?${params}`);return r.ok?await r.json():[]}catch(_){return []}}));
 let cards=[];try{const r=await fetch('/api/cartoes');if(r.ok)cards=await r.json()}catch(_){}
 const invoiceGroups=await Promise.all(cards.map(async card=>{try{const r=await fetch(`/api/cartoes/${card.id}/faturas`);return r.ok?(await r.json()).map(f=>({...f,cartaoNome:card.nome})):[]}catch(_){return []}}));
 const invoices=invoiceGroups.flat(),installmentIds=new Set(invoices.flatMap(f=>(f.itens||[]).map(i=>String(i.compromissoId))));
 const rows=plan.flatMap((items,i)=>items.map(c=>({...c,mesRef:months[i]}))).filter(c=>!installmentIds.has(String(c.id)));
 const due=rows.filter(c=>c.status==='PENDENTE');
 const pendingInvoices=invoices.filter(f=>Number(f.saldo)>0);
 // Faturas com vencimento no mês indicado pelos compromissos das parcelas; não somar parcelas novamente.
 const installments=plan.flatMap(items=>items);
 const invoiceRows=invoices.map(f=>{const matching=(f.itens||[]).map(i=>installments.find(c=>String(c.id)===String(i.compromissoId))).filter(Boolean);const date=matching[0]?.vencimento||null;return {...f,vencimento:date};});
 const openInvoiceRows=invoiceRows.filter(f=>Number(f.saldo)>0);
 const today=hojeISO(),end30=luviDashDatePlus(30);
 const between=date=>date&&date>=today&&date<=end30;
 const pending30=due.filter(c=>c.tipo==='DESPESA'&&between(c.vencimento)).reduce((a,c)=>a+luviDashNum(c.valor),0)+openInvoiceRows.filter(f=>between(f.vencimento)).reduce((a,f)=>a+luviDashNum(f.total),0);
 const income30=due.filter(c=>c.tipo==='RECEITA'&&between(c.vencimento)).reduce((a,c)=>a+luviDashNum(c.valor),0);
 const byMonth=months.map(key=>({key,label:luviDashMonthLabel(key),income:due.filter(c=>c.tipo==='RECEITA'&&c.vencimento?.startsWith(key)).reduce((a,c)=>a+luviDashNum(c.valor),0),expense:due.filter(c=>c.tipo==='DESPESA'&&c.vencimento?.startsWith(key)).reduce((a,c)=>a+luviDashNum(c.valor),0),cards:openInvoiceRows.filter(f=>f.vencimento?.startsWith(key)).reduce((a,f)=>a+luviDashNum(f.total),0),cardsPaid:invoiceRows.filter(f=>f.paga&&f.vencimento?.startsWith(key)).reduce((a,f)=>a+luviDashNum(f.total),0)}));
 return {months,byMonth,invoiceRows,pending30,income30,cardTotal:pendingInvoices.reduce((a,f)=>a+luviDashNum(f.total),0),cards,errors:!plan.some(x=>x.length)&&!invoices.length};
}
async function abrirDashboard(){
 fecharSubtelasPrincipais('dashboardModal');toggleMenu(false);luviDashView=null;luviDashboardDestroyChart();luviDashData=null;luviDashboardShowHome();abrirCamada('dashboardModal');
 $('dashboardContext').textContent='Resumo financeiro e análises • dados cadastrados no LUVI';
 ['dashSaldo','dashPagar30','dashFaturas','dashReceber30'].forEach(id=>$(id).textContent='Carregando…');
 try{
  const [res,data]=await Promise.all([fetch(`/api/dashboard?${qs()}`),luviDashLoad()]);
  if(!res.ok)throw new Error(await erro(res));
  const d=await res.json();luviDashData={...data,current:d};
  $('dashSaldo').textContent=$('saldoFinal')?.textContent||'—';
  $('dashPagar30').textContent=luviDashMoney(data.pending30);
  $('dashFaturas').textContent=luviDashMoney(data.cardTotal);
  $('dashReceber30').textContent=luviDashMoney(data.income30);
  $('dashOverviewNote').textContent='Saldo: extrato do período selecionado. Previsões: compromissos pendentes e faturas acessíveis, sem duplicar parcelas. Faturas futuras: todas as faturas em aberto cadastradas.';
 }catch(e){['dashSaldo','dashPagar30','dashFaturas','dashReceber30'].forEach(id=>$(id).textContent='Indisponível');$('dashOverviewNote').textContent=`Não foi possível carregar todos os indicadores: ${e.message}`;}
}
function luviDashControls(view){
 const host=$('luviDashboardFilters');if(!host)return;host.replaceChildren();
 if(!['payables','balance','cards'].includes(view))return;
 const period=document.createElement('div');period.className='luvi-dash-filter-row';
 period.innerHTML='<label>Início <input id="luviDashStart" type="month"></label><label>Fim <input id="luviDashEnd" type="month"></label><button type="button" id="luviDashApply" class="secondary-button">Aplicar</button>';host.appendChild(period);
 $('luviDashStart').value=luviDashPeriod.start;$('luviDashEnd').value=luviDashPeriod.end;
 $('luviDashApply').onclick=async()=>{const start=$('luviDashStart').value,end=$('luviDashEnd').value;if(!start||!end||start>end){mensagem('Informe um período válido.');return;}const [a,b]=start.split('-').map(Number),[c,d]=end.split('-').map(Number);if((c-a)*12+d-b>=36){mensagem('Selecione no máximo 36 meses.');return;}luviDashPeriod={start,end};$('luviDashApply').disabled=true;try{const data=await luviDashLoad();luviDashData={...data,current:luviDashData.current};luviDashboardOpen(view)}catch(e){mensagem(e.message)}finally{const btn=$('luviDashApply');if(btn)btn.disabled=false}};
 if(view==='cards'){const select=document.createElement('label');select.textContent='Situação das faturas ';select.className='luvi-dash-card-status';const field=document.createElement('select');field.innerHTML='<option value="abertas">Em aberto</option><option value="pagas">Pagas</option><option value="todas">Todas</option>';field.value=luviDashCardStatus;field.onchange=()=>{luviDashCardStatus=field.value;luviDashboardOpen(view)};select.appendChild(field);host.appendChild(select)}
}
function luviDashboardOpen(view){
 if(!luviDashData){mensagem('Os dados do Dashboard ainda não foram carregados.');return}
 luviDashView=view;
 const titles={payables:'Contas a pagar',balance:'Evolução do saldo',categories:'Despesas por categoria',cards:'Cartões de crédito',income:'Receitas × despesas'};
 $('dashboardHeaderTitle').textContent=titles[view]||'Dashboard';$('luviDashboardHome').classList.add('hidden');$('luviDashboardDetail').classList.remove('hidden');
 const body=$('dashboardModal').querySelector('.modal-body');if(body)body.scrollTop=0;
 luviDashboardDestroyChart();luviDashControls(view);
 $('luviDashboardDetailDescription').textContent='';$('luviDashboardDetailTotals').textContent='';$('luviDashboardDetailFootnote').textContent='';
 try{
 const d=luviDashData,rows=d.byMonth,labelsDefault=rows.map(x=>x.label);let labels=labelsDefault,datasets=[],type='bar',note='',description='',total='';
 if(view==='payables'){description='Pagamentos pendentes no período selecionado';datasets=[{label:'Compromissos',data:rows.map(x=>x.expense)},{label:'Faturas',data:rows.map(x=>x.cards)}];total=`Total no período: ${luviDashMoney(rows.reduce((a,x)=>a+x.expense+x.cards,0))}`;note='Parcelas do cartão são representadas apenas pela fatura. Valores com vencimento cadastrado.';}
 else if(view==='balance'){description='Variação acumulada prevista a partir dos compromissos pendentes';type='line';let acc=0;datasets=[{label:'Variação acumulada',data:rows.map(x=>{acc+=x.income-x.expense-x.cards;return acc;})}];total=`Variação prevista: ${luviDashMoney(acc)}`;note='Variação projetada, não saldo bancário futuro: não inclui lançamentos recorrentes ainda não cadastrados.';}
 else if(view==='cards'){description='Faturas por mês de vencimento';datasets=luviDashCardStatus==='pagas'?[{label:'Pagas',data:rows.map(x=>x.cardsPaid)}]:luviDashCardStatus==='todas'?[{label:'Em aberto',data:rows.map(x=>x.cards)},{label:'Pagas',data:rows.map(x=>x.cardsPaid)}]:[{label:'Em aberto',data:rows.map(x=>x.cards)}];total=`Total exibido no período: ${luviDashMoney(datasets.reduce((a,ds)=>a+ds.data.reduce((x,v)=>x+v,0),0))}`;note='Faturas agrupadas pelo vencimento cadastrado; valores pagos não são somados novamente aos compromissos.';}
 else if(view==='income'){description='Receitas e despesas realizadas no mês selecionado';labels=['Mês selecionado'];datasets=[{label:'Receitas',data:[luviDashNum(d.current.receitas)]},{label:'Despesas',data:[luviDashNum(d.current.despesas)]}];total=`Resultado: ${luviDashMoney(d.current.resultado)}`;note='Valores realizados, conforme o Dashboard existente.';}
 else if(view==='categories'){type='doughnut';description='Despesas realizadas por categoria no mês selecionado';const cats=Array.isArray(d.current.despesasPorCategoria)?d.current.despesasPorCategoria:[];labels=cats.map(x=>x.categoria||'Sem categoria');datasets=[{label:'Despesas',data:cats.map(x=>luviDashNum(x.valor))}];total=`Total por categorias: ${luviDashMoney(cats.reduce((a,x)=>a+luviDashNum(x.valor),0))}`;note='Valores realizados no período selecionado, agrupados por categoria. Pagamentos de fatura seguem a classificação do extrato bancário.';}
 else {luviDashboardEmpty('Análise não encontrada.');return}
 $('luviDashboardDetailDescription').textContent=description;$('luviDashboardDetailTotals').textContent=total;$('luviDashboardDetailFootnote').textContent=note;
 const values=datasets[0]?.data||[];
 if(!labels.length||!datasets.some(ds=>ds.data.some(v=>Number.isFinite(Number(v))&&Number(v)!==0))){luviDashboardEmpty(view==='categories'?'Nenhuma despesa encontrada no período selecionado.':'Nenhum valor diferente de zero encontrado nesta análise no período.');return}
 if(type==='doughnut' && typeof Chart==='undefined'){luviDashboardPieFallback(labels,values);return}
 if(typeof Chart==='undefined'){luviDashboardEmpty('Não foi possível carregar a biblioteca de gráficos. Verifique a conexão com a internet.');return}
 const chartOptions={responsive:true,maintainAspectRatio:false,plugins:{tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${luviDashMoney(c.raw)}`}}}};
 if(type==='doughnut'){chartOptions.plugins.legend={position:'bottom',labels:{boxWidth:12,padding:14}};chartOptions.cutout='48%';}
 else{chartOptions.scales={y:{ticks:{callback:v=>luviDashMoney(v)}}};}
 // LUVI v6.8.5: cores semânticas suaves para faturas (azul = pagas; rosa = em aberto).
 if(view==='cards'){
   datasets=datasets.map(ds=>({
     ...ds,
     backgroundColor:ds.label==='Pagas'?'rgba(147, 197, 253, 0.85)':'rgba(253, 164, 175, 0.85)',
     borderColor:ds.label==='Pagas'?'rgba(96, 165, 250, 1)':'rgba(251, 113, 133, 1)',
     borderWidth:1
   }));
 }
 luviDashChart=new Chart($('luviDashboardAnalysisChart'),{type,data:{labels,datasets},options:chartOptions});
 }catch(e){console.error('Erro ao renderizar análise do Dashboard',e);luviDashboardEmpty('Não foi possível desenhar este gráfico. Consulte o console do navegador para detalhes.');$('luviDashboardDetailFootnote').textContent='Ocorreu um erro de exibição; nenhum dado financeiro foi alterado.';}
}
document.querySelectorAll('[data-dash-view]').forEach(button=>button.addEventListener('click',()=>luviDashboardOpen(button.dataset.dashView)));

// LUVI v6.5 - compromissos financeiros. Extrato original preservado.
let luviPrevisaoAtiva=false,luviCompromissos=[];
async function alternarVisaoLuvi(prevista){
 luviPrevisaoAtiva=prevista;
 $("luviViewReal").classList.toggle("luvi-view-selected",!prevista);
 $("luviViewForecast").classList.toggle("luvi-view-selected",prevista);
 $("luviForecast").classList.toggle("hidden",!prevista);
 if(prevista)await carregarCompromissosLuvi();
}
async function carregarCompromissosLuvi(){
 const r=await fetch(`/api/planejamento?${qs()}`);
 if(!r.ok){await mensagem(await erro(r));return;}
 luviCompromissos=await r.json();
 // Cartão: substituir parcelas individuais pela fatura consolidada na previsão.
 try{
   const cr=await fetch('/api/cartoes');
   if(cr.ok){
     const cards=await cr.json();const ids=new Set();const faturas=[];
     for(const card of cards){
       const fr=await fetch(`/api/cartoes/${card.id}/faturas`);if(!fr.ok)continue;
       for(const f of await fr.json()){
         const visiveis=f.itens.filter(item=>luviCompromissos.some(c=>c.id===item.compromissoId));
         if(!visiveis.length)continue;
         visiveis.forEach(item=>ids.add(item.compromissoId));
         const referencia=luviCompromissos.find(c=>c.id===visiveis[0].compromissoId);
         faturas.push({id:`fatura-${card.id}-${f.competencia}`,cartaoId:card.id,competencia:f.competencia,contaId:f.paga?(f.contaPagamentoId??referencia.contaId):(card.contaPagamentoId??referencia.contaId),contaNome:card.nome,categoria:'Cartões de crédito',tipo:'DESPESA',descricao:`Fatura ${card.nome}`,valor:visiveis.reduce((v,x)=>v+Number(x.valor),0),vencimento:visiveis[0].vencimento,status:f.paga?'PAGO':'PENDENTE',dataPagamento:f.dataPagamento,valorEfetivo:f.paga?f.total:null});
       }
     }
     luviCompromissos=[...luviCompromissos.filter(c=>!ids.has(c.id)),...faturas];
   }
 }catch(ex){console.warn('Faturas indisponíveis na previsão',ex);}
 renderizarCompromissosLuvi();
}
function renderizarCompromissosLuvi(){
 const pendentes=luviCompromissos.filter(x=>x.status==='PENDENTE');
 const receitas=pendentes.filter(x=>x.tipo==='RECEITA').reduce((v,x)=>v+Number(x.valor),0);
 const despesas=pendentes.filter(x=>x.tipo==='DESPESA').reduce((v,x)=>v+Number(x.valor),0);
 const saldoTexto=$("saldoFinal").textContent;
 const saldoReal=Number(saldoTexto.replace(/[^0-9,-]/g,'').replace(/\./g,'').replace(',','.'))||0;
 $("luviFutureIncome").textContent=formatarMoeda(receitas);
 $("luviFutureExpense").textContent=formatarMoeda(despesas);
 $("luviFutureBalance").textContent=formatarMoeda(saldoReal+receitas-despesas);
 const expandidas = new Set([...$("luviFutureRows").querySelectorAll("details[data-category-key][open]")].map(el=>el.dataset.categoryKey));
 $("luviFutureRows").innerHTML=renderizarCategoriasPrevisaoLuvi(luviCompromissos, expandidas);
 $("luviFutureRows").querySelectorAll('[data-future-series]').forEach(button=>button.onclick=()=>abrirRecorrenciaLuvi(Number(button.dataset.futureSeries)));
 $("luviFutureRows").querySelectorAll('[data-future-pay]').forEach(b=>b.onclick=()=>{const id=b.dataset.futurePay;const c=luviCompromissos.find(x=>String(x.id)===id);if(c?.cartaoId){luviOpenCards().then(()=>luviOpenInvoice(`${c.cartaoId}|${c.competencia}`));}else pagarCompromissoLuvi(Number(id));});
 $("luviFutureRows").querySelectorAll('[data-future-edit]').forEach(b=>b.onclick=()=>abrirEdicaoCompromissoLuvi(Number(b.dataset.futureEdit)));
 $("luviFutureRows").querySelectorAll('[data-future-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.futureDelete;const c=luviCompromissos.find(x=>String(x.id)===id);if(c?.cartaoId){luviOpenCards().then(()=>luviOpenInvoice(`${c.cartaoId}|${c.competencia}`));}else excluirCompromissoLuvi(Number(id));});
}
async function abrirCompromissoLuvi(){
 if(!contas.length){await mensagem('Cadastre uma conta financeira antes.');return;}
 $("luviFutureForm").reset();$("luviFutureRepeatOptions").classList.add("hidden");$("luviFutureError").textContent='';
 $("luviFutureAccount").innerHTML=contas.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');
 $("luviFutureAccount").value=contaPadrao();$("luviFutureDate").value=hojeISO();
 await carregarCategoriasCompromissoLuvi();abrirCamada('luviFutureModal');
}
async function carregarCategoriasCompromissoLuvi(){
 const id=$("luviFutureAccount").value,tipo=$("luviFutureType").value;
 if(!id)return;
 const r=await fetch(`/api/categorias?contaId=${encodeURIComponent(id)}`);
 if(!r.ok){$("luviFutureError").textContent=await erro(r);return;}
 const cats=await r.json();
 $("luviFutureCategory").innerHTML=cats.filter(c=>c.tipo===tipo && c.ativa!==false).map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');
}
async function salvarCompromissoLuvi(e){
 e.preventDefault();const d={contaId:Number($("luviFutureAccount").value),tipo:$("luviFutureType").value,descricao:$("luviFutureDescription").value,categoriaId:Number($("luviFutureCategory").value),valor:Number($("luviFutureValue").value),vencimento:$("luviFutureDate").value,quantidadeOcorrencias:$("luviFutureRepeat").checked?Number($("luviFutureOccurrences").value):1,frequencia:$("luviFutureRepeat").checked?$("luviFutureFrequency").value:"MENSAL"};
 const r=await fetch('/api/planejamento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
 if(!r.ok){$("luviFutureError").textContent=await erro(r);return;}
 fecharCamada('luviFutureModal',false);await carregarCompromissosLuvi();
}
let luviPagamentoSelecionado=null;
function pagarCompromissoLuvi(id, selecionado=null){
 const c=selecionado||luviCompromissos.find(x=>x.id===id);luviPagamentoSelecionado=c;if(!c)return;
 $("luviPayId").value=String(id);
 $("luviPayTitle").textContent=c.tipo==='RECEITA'?'Registrar recebimento':'Registrar pagamento';
 $("luviPayInfo").textContent=`${c.descricao} · Previsto: ${formatarMoeda(Number(c.valor))} · Vencimento: ${formatarData(c.vencimento)}`;
 $("luviPayAccount").innerHTML=contas.map(x=>`<option value="${x.id}">${escaparHtml(x.nome)}</option>`).join('');
 $("luviPayAccount").value=String(c.contaId);
 $("luviPayDate").value=hojeISO();$("luviPayValue").value=Number(c.valor).toFixed(2);
 $("luviPayDiscount").value='0';$("luviPayExtra").value='0';$("luviPayExtraKind").value='OUTROS';
 $("luviPayNote").value='';$("luviPayError").textContent='';atualizarCalculoPagamentoLuvi();abrirCamada('luviPayModal');
}
function atualizarCalculoPagamentoLuvi(){
 const c=luviPagamentoSelecionado||luviCompromissos.find(x=>x.id===Number($("luviPayId").value));if(!c)return;
 const esperado=Math.round(Number(c.valor)*100)-Math.round(Number($("luviPayDiscount").value||0)*100)+Math.round(Number($("luviPayExtra").value||0)*100);
 const efetivo=Math.round(Number($("luviPayValue").value||0)*100);
 $("luviPayCalc").textContent=`Valor calculado: ${formatarMoeda(esperado/100)}${efetivo!==esperado?' · Informe desconto/acréscimo para justificar a diferença.':''}`;
}
async function salvarPagamentoLuvi(e){
 e.preventDefault();const id=Number($("luviPayId").value),c=luviPagamentoSelecionado||luviCompromissos.find(x=>x.id===id);if(!c)return;
 const dados={contaId:Number($("luviPayAccount").value),data:$("luviPayDate").value,valorEfetivo:Number($("luviPayValue").value),desconto:Number($("luviPayDiscount").value||0),acrescimo:Number($("luviPayExtra").value||0),naturezaAcrescimo:$("luviPayExtraKind").value,observacao:$("luviPayNote").value.trim()};
 const cent=v=>Math.round(v*100);
 if(cent(dados.valorEfetivo)!==cent(Number(c.valor))-cent(dados.desconto)+cent(dados.acrescimo)){$("luviPayError").textContent='O valor efetivo deve ser igual ao previsto menos desconto mais acréscimo.';return;}
 const botao=$("luviPayForm").querySelector('button[type="submit"]');botao.disabled=true;
 try{const r=await fetch(`/api/planejamento/${id}/pagar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});if(!r.ok)throw new Error(await erro(r));fecharCamada('luviPayModal',false);await carregarDadosMes();}
 catch(ex){$("luviPayError").textContent=ex.message||'Erro ao registrar pagamento.';}
 finally{botao.disabled=false;}
}
async function carregarCategoriasEdicaoLuvi(){
 const id=$("luviEditFutureAccount").value,tipo=$("luviEditFutureType").value;
 if(!id)return;const r=await fetch(`/api/categorias?contaId=${encodeURIComponent(id)}`);
 if(!r.ok){$("luviEditFutureError").textContent=await erro(r);return;}
 const cats=await r.json();$("luviEditFutureCategory").innerHTML=cats.filter(c=>c.tipo===tipo&&c.ativa!==false).map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');
}
async function abrirEdicaoCompromissoLuvi(id){
 const c=luviCompromissos.find(x=>x.id===id);if(!c||c.status!=='PENDENTE'||c.cartaoId)return;
 $("luviEditFutureError").textContent='';$("luviEditFutureId").value=id;
 $("luviEditFutureAccount").innerHTML=contas.map(x=>`<option value="${x.id}">${escaparHtml(x.nome)}</option>`).join('');
 $("luviEditFutureAccount").value=c.contaId;$("luviEditFutureType").value=c.tipo;
 $("luviEditFutureDescription").value=c.descricao;$("luviEditFutureValue").value=Number(c.valor).toFixed(2);$("luviEditFutureDate").value=c.vencimento;
 $("luviEditFutureScope").value='ATUAL';$("luviEditFutureScope").disabled=!c.serieRecorrencia;
 await carregarCategoriasEdicaoLuvi();$("luviEditFutureCategory").value=c.categoriaId;abrirCamada('luviEditFutureModal');
}
async function salvarEdicaoCompromissoLuvi(e){
 e.preventDefault();const id=Number($("luviEditFutureId").value);
 const d={contaId:Number($("luviEditFutureAccount").value),tipo:$("luviEditFutureType").value,descricao:$("luviEditFutureDescription").value,categoriaId:Number($("luviEditFutureCategory").value),valor:Number($("luviEditFutureValue").value),vencimento:$("luviEditFutureDate").value,alcance:$("luviEditFutureScope").value};
 const b=$("luviEditFutureForm").querySelector('button[type="submit"]');b.disabled=true;
 try{const r=await fetch(`/api/planejamento/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(!r.ok)throw new Error(await erro(r));fecharCamada('luviEditFutureModal',false);await carregarDadosMes();}
 catch(ex){$("luviEditFutureError").textContent=ex.message||'Não foi possível editar.';}finally{b.disabled=false;}
}
async function excluirCompromissoLuvi(id){
 const c=luviCompromissos.find(x=>x.id===id);if(!c||c.status!=='PENDENTE')return;
 let futuras=false;
 if(c.serieRecorrencia){futuras=await confirmar('Excluir esta ocorrência e as próximas pendentes? Clique em Cancelar para escolher excluir somente esta.');
 if(!futuras && !await confirmar('Excluir somente esta ocorrência pendente?'))return;
 }else if(!await confirmar('Excluir este compromisso pendente?'))return;
 const r=await fetch(`/api/planejamento/${id}${futuras?'/proximas':''}`,{method:'DELETE'});
 if(!r.ok){await mensagem(await erro(r));return;}
 await carregarDadosMes();
}

// LUVI 6.6: cartões e pré-visualização das parcelas antes da gravação.
let luviCards=[],luviDraft=[],luviEditingCardId=null;
async function luviLoadCards(){const r=await fetch('/api/cartoes');if(!r.ok)throw new Error(await erro(r));luviCards=await r.json();const selected=$('luviPurchaseCard').value;$('luviPurchaseCard').innerHTML=luviCards.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');if(luviCards.some(c=>String(c.id)===selected))$('luviPurchaseCard').value=selected;await luviRenderCardList();}
// Navegação hierárquica dos cartões: visão geral > formulário/faturas > detalhe.
let luviCardsTrail=[''];
function luviCardSection(section, mode='push'){
 if(mode==='reset')luviCardsTrail=[section];
 else if(mode==='back')luviCardsTrail.pop();
 else if(mode==='replace')luviCardsTrail[luviCardsTrail.length-1]=section;
 else if(luviCardsTrail[luviCardsTrail.length-1]!==section)luviCardsTrail.push(section);
 const current=luviCardsTrail[luviCardsTrail.length-1]||'';
 for(const id of ['luviCardFormWrap','luviPurchaseFormWrap','luviInvoiceDetails','luviCardInvoicesView'])$(id).classList.toggle('hidden',id!==current);
 $('luviCardOverview').classList.toggle('hidden',Boolean(current));
 $('luviCardModal').querySelector('.luvi-card-actions').classList.toggle('hidden',Boolean(current));
 const titles={'':'Cartões de crédito',luviCardFormWrap:luviEditingCardId?'Editar cartão':'Novo cartão',luviPurchaseFormWrap:'Nova compra',luviCardInvoicesView:'Faturas',luviInvoiceDetails:'Detalhes da fatura'};
 $('luviCardsHeaderTitle').textContent=titles[current];
 $('luviCardsHeaderBack').setAttribute('aria-label',current?'Voltar à tela anterior':'Fechar cartões de crédito');
 const body=$('luviCardModal').querySelector('.modal-body');if(body)body.scrollTop=0;
}
function luviCardsBack(){
 if(luviCardsTrail.length>1)luviCardSection('', 'back');
 else fecharCamada('luviCardModal');
}
let luviSelectedCard=null,luviSelectedInvoices=[];
function luviRenderInvoices(){
 const year=$('luviInvoiceYear').value,status=$('luviInvoiceStatus').value;
 const list=luviSelectedInvoices.filter(f=>f.competencia.startsWith(year)&&(status==='all'||(status==='paid'?f.paga:!f.paga)));
 $('luviInvoiceList').innerHTML=list.length?list.map(f=>`<button type="button" class="luvi-invoice-row" data-luvi-invoice="${luviSelectedCard.id}|${f.competencia}"><span><strong>${f.competencia.slice(0,7).split('-').reverse().join('/')}</strong><small>${Number(f.credito)>0?'Com crédito':f.paga?'Quitada':'Em aberto'}</small></span><strong>${formatarMoeda(Number(f.saldo))} ›</strong></button>`).join(''):'<div class="empty-state">Nenhuma fatura encontrada para os filtros selecionados.</div>';
 $('luviInvoiceList').querySelectorAll('[data-luvi-invoice]').forEach(b=>b.onclick=()=>luviOpenInvoice(b.dataset.luviInvoice));
}
async function luviOpenCardInvoices(cardId){
 const card=luviCards.find(c=>c.id===Number(cardId));if(!card)return;
 const r=await fetch(`/api/cartoes/${card.id}/faturas`);if(!r.ok){await mensagem(await erro(r));return;}
 luviSelectedCard=card;luviSelectedInvoices=await r.json();
 $('luviSelectedCardTitle').textContent=`Faturas — ${card.nome}`;
 const years=[...new Set(luviSelectedInvoices.map(f=>f.competencia.slice(0,4)))].sort().reverse();if(!years.length)years.push(String(new Date().getFullYear()));
 $('luviInvoiceYear').innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');
 const firstOpen=luviSelectedInvoices.find(f=>!f.paga);if(firstOpen)$('luviInvoiceYear').value=firstOpen.competencia.slice(0,4);
 $('luviInvoiceStatus').value='all';luviRenderInvoices();luviCardSection('luviCardInvoicesView');
}
async function luviRenderCardList(){
 const results=await Promise.all(luviCards.map(async c=>{const r=await fetch(`/api/cartoes/${c.id}/faturas`);return {c,faturas:r.ok?await r.json():[]};}));
 $('luviCardList').innerHTML=results.length?results.map(({c,faturas})=>{const next=faturas.filter(f=>Number(f.saldo ?? f.total ?? 0)>0).sort((a,b)=>a.competencia.localeCompare(b.competencia))[0];return `<div class="luvi-card-tile"><div class="luvi-card-heading"><span class="luvi-card-color" style="background:${/^#[0-9a-fA-F]{6}$/.test(c.cor||'')?c.cor:'#64748B'}"></span><strong>${escaparHtml(c.nome)}</strong></div><small>Fecha dia ${c.fechamento} · Vence dia ${c.vencimento}</small><div class="luvi-card-summary">${next?`<small>Próxima fatura em aberto</small><strong>${formatarMoeda(Number(next.saldo ?? next.total ?? 0))}</strong><small>${next.competencia.slice(0,7).split('-').reverse().join('/')}</small>`:'<small>Nenhuma fatura em aberto</small>'}</div><button type="button" class="secondary-button" data-luvi-card-invoices="${c.id}">Ver faturas →</button> <button type="button" class="secondary-button" data-luvi-edit-card="${c.id}">Editar cartão</button></div>`;}).join(''):'<div class="empty-state">Nenhum cartão cadastrado.</div>';
 $('luviCardList').querySelectorAll('[data-luvi-card-invoices]').forEach(b=>b.onclick=()=>luviOpenCardInvoices(b.dataset.luviCardInvoices));
 $('luviCardList').querySelectorAll('[data-luvi-edit-card]').forEach(b=>b.onclick=()=>luviEditCard(Number(b.dataset.luviEditCard)));
}
$('luviInvoiceYear')?.addEventListener('change',luviRenderInvoices);
$('luviInvoiceStatus')?.addEventListener('change',luviRenderInvoices);
$('luviCardsHeaderBack')?.addEventListener('click',luviCardsBack);

let luviInvoiceSelected=null, luviEditingPurchaseId=null;
async function luviOpenInvoice(key){
 const [cardId,competencia]=key.split('|');
 const card=luviCards.find(x=>x.id===Number(cardId));
 const r=await fetch(`/api/cartoes/${cardId}/faturas`);
 if(!r.ok){await mensagem(await erro(r));return;}
 const f=(await r.json()).find(x=>x.competencia===competencia);if(!f)return;
 luviSelectedCard=card;luviInvoiceSelected={card,f};luviCardSection('luviInvoiceDetails');
 $('luviInvoiceTitle').textContent=`Fatura ${card.nome} · ${competencia.slice(0,7).split('-').reverse().join('/')}`;
 const linhas=f.itens.map(x=>`<div class="luvi-invoice-line"><span>${escaparHtml(x.descricao)} (${x.numero}/${x.quantidade})<small>${escaparHtml(x.categoria)}</small><span class="luvi-invoice-edit-actions"><button type="button" class="primary-button" data-luvi-edit-purchase="${x.compraId}">Editar compra</button><button type="button" class="secondary-button luvi-delete-purchase" data-luvi-delete-purchase="${x.compraId}">Excluir</button></span></span><strong>${formatarMoeda(Number(x.valor))}</strong></div>`).join('');
 const historico=(f.pagamentos||[]).map(p=>`<div class="luvi-invoice-line"><span>Pagamento em ${formatarData(p.data)}</span><strong>${formatarMoeda(Number(p.valor))}</strong></div>`).join('');
 $('luviInvoiceItems').innerHTML=linhas+`<div class="luvi-invoice-total"><strong>Compras do mês</strong><strong>${formatarMoeda(Number(f.total))}</strong></div><div class="luvi-invoice-line"><span>Saldo anterior (negativo = crédito)</span><strong>${formatarMoeda(Number(f.saldoAnterior))}</strong></div><div class="luvi-invoice-line"><span>Pagamentos deste mês</span><strong>${formatarMoeda(Number(f.totalPago))}</strong></div><div class="luvi-invoice-total"><strong>${Number(f.credito)>0?'Crédito para próximas faturas':'Saldo a pagar'}</strong><strong>${formatarMoeda(Number(f.credito)>0?Number(f.credito):Number(f.saldo))}</strong></div>`+(historico?`<h4>Histórico de pagamentos</h4>${historico}`:'');
 $('luviInvoiceItems').querySelectorAll('[data-luvi-edit-purchase]').forEach(b=>b.onclick=()=>luviEditPurchase(Number(b.dataset.luviEditPurchase)));
 $('luviInvoiceItems').querySelectorAll('[data-luvi-delete-purchase]').forEach(b=>b.onclick=()=>luviDeletePurchase(Number(b.dataset.luviDeletePurchase)));
 $('luviInvoicePayForm').classList.remove('hidden');
 $('luviInvoiceAccount').innerHTML=contas.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');
 $('luviInvoiceAccount').value=String(card.contaPagamentoId||contas[0]?.id||'');
 $('luviInvoiceDate').value=hojeISO();$('luviInvoiceValue').value=Number(f.saldo)>0?Number(f.saldo).toFixed(2):'';
 $('luviInvoiceError').textContent='';
}

async function luviEditPurchase(id){
 try{
  const r=await fetch(`/api/cartoes/compras/${id}`);if(!r.ok)throw new Error(await erro(r));
  const c=await r.json();luviEditingPurchaseId=id;
  $('luviPurchaseFormTitle').textContent='Editar compra';
  $('luviPurchaseCard').value=String(c.cartaoId);
  await luviLoadPurchaseCategories();
  $('luviPurchaseCategory').value=String(c.categoriaId);
  $('luviPurchaseDescription').value=c.descricao;
  $('luviPurchaseDate').value=c.dataCompra;
  $('luviPurchaseTotal').value=Number(c.total).toFixed(2);
  $('luviPurchaseCount').value=c.quantidadeParcelas;
  $('luviPurchaseCount').disabled=false;
  $('luviPurchaseCount').readOnly=true;
  luviDraft=c.parcelas.map(x=>({vencimento:x.vencimento,valor:Number(x.valor)}));
  luviCardSection('luviPurchaseFormWrap');
  $('luviPreviewPurchase').classList.add('hidden');
  $('luviSaveSinglePurchase').classList.add('hidden');
  $('luviPurchasePreview').classList.remove('hidden');
  luviRenderDraft();
 }catch(e){await mensagem(e.message);}
}
async function luviDeletePurchase(id){
 if(!await confirmar('Excluir esta compra e suas parcelas? Os pagamentos já realizados serão preservados e os saldos recalculados.'))return;
 try{
  const r=await fetch(`/api/cartoes/compras/${id}`,{method:'DELETE'});
  if(!r.ok)throw new Error(await erro(r));
  const cardId=luviInvoiceSelected?.card.id;
  await luviLoadCards();await carregarDadosMes();
  if(cardId)await luviOpenCardInvoices(cardId);
  toast('Compra excluída.');
 }catch(e){await mensagem(e.message);}
}

async function luviOpenCards(){try{await luviLoadCards();$('luviCardAccount').innerHTML='<option value="">Sem conta padrão</option>'+contas.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');await luviLoadPurchaseCategories();$('luviPurchaseDate').value=hojeISO();luviCardSection('','reset');abrirCamada('luviCardModal');}catch(e){await mensagem(e.message);}}
$('cartoesMenu')?.addEventListener('click',()=>{toggleMenu(false);luviOpenCards();});
function luviEditCard(id){
 const c=luviCards.find(x=>x.id===id);if(!c)return;
 luviEditingCardId=id;
 $('luviCardFormTitle').textContent='Editar cartão';
 $('luviCardName').value=c.nome;
 $('luviCardColor').value=/^#[0-9a-fA-F]{6}$/.test(c.cor||'')?c.cor:'#64748B';
 $('luviCardAccount').value=c.contaPagamentoId==null?'':String(c.contaPagamentoId);
 $('luviCardClose').value=c.fechamento;$('luviCardDue').value=c.vencimento;
 luviCardSection('luviCardFormWrap');
}
$('luviShowNewCard')?.addEventListener('click',()=>{luviEditingCardId=null;$('luviCardForm').reset();$('luviCardFormTitle').textContent='Novo cartão';luviCardSection('luviCardFormWrap');});
$('luviShowNewPurchase')?.addEventListener('click',async()=>{luviEditingPurchaseId=null;$('luviPurchaseFormTitle').textContent='Nova compra';$('luviPurchaseCount').disabled=false;$('luviPurchaseCount').readOnly=false;$('luviPurchaseForm').reset();$('luviPurchaseDate').value=hojeISO();luviCardSection('luviPurchaseFormWrap');luviUpdatePurchaseMode();await luviLoadPurchaseCategories();});
$('luviCancelCard')?.addEventListener('click',luviCardsBack);
$('luviInvoiceCancel')?.addEventListener('click',luviCardsBack);
function luviUpdatePurchaseMode(){const n=Number($('luviPurchaseCount').value);const parcelado=Number.isInteger(n)&&n>1;$('luviPreviewPurchase').classList.toggle('hidden',!parcelado);$('luviSaveSinglePurchase').classList.toggle('hidden',parcelado);$('luviPurchasePreview').classList.add('hidden');$('luviPurchaseInstallments').innerHTML='';luviDraft=[];$('luviPurchaseError').textContent='';}
$('luviPurchaseCount')?.addEventListener('input',luviUpdatePurchaseMode);
for(const id of ['luviPurchaseTotal','luviPurchaseDate','luviPurchaseCard'])$(id)?.addEventListener('change',()=>{if(!luviEditingPurchaseId && !$('luviPurchasePreview').classList.contains('hidden')){$('luviPurchasePreview').classList.add('hidden');luviDraft=[];}});
$('luviCardForm')?.addEventListener('submit',async e=>{e.preventDefault();try{const r=await fetch(luviEditingCardId?`/api/cartoes/${luviEditingCardId}`:'/api/cartoes',{method:luviEditingCardId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:$('luviCardName').value,cor:$('luviCardColor').value,contaPagamentoId:$('luviCardAccount').value?Number($('luviCardAccount').value):null,fechamento:Number($('luviCardClose').value),vencimento:Number($('luviCardDue').value)})});if(!r.ok)throw new Error(await erro(r));e.target.reset();luviEditingCardId=null;await luviLoadCards();luviCardSection('','reset');}catch(err){await mensagem(err.message);}});
$('luviInvoicePayForm')?.addEventListener('submit',async e=>{e.preventDefault();if(!luviInvoiceSelected)return;const {card,f}=luviInvoiceSelected;const [ano,mes]=f.competencia.split('-');const btn=e.target.querySelector('[type=submit]');btn.disabled=true;try{const r=await fetch(`/api/cartoes/${card.id}/faturas/${ano}/${Number(mes)}/pagar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contaId:Number($('luviInvoiceAccount').value),data:$('luviInvoiceDate').value,valor:Number($('luviInvoiceValue').value)})});if(!r.ok)throw new Error(await erro(r));await luviLoadCards();await luviOpenCardInvoices(card.id);await carregarDadosMes();}catch(err){$('luviInvoiceError').textContent=err.message;}finally{btn.disabled=false;}});
function luviGenerateDraft(){const card=luviCards.find(c=>c.id===Number($('luviPurchaseCard').value));const total=Math.round(Number($('luviPurchaseTotal').value)*100),n=Number($('luviPurchaseCount').value),date=$('luviPurchaseDate').value;if(!card||!date||!Number.isSafeInteger(total)||total<n||n<1||n>120){$('luviPurchaseError').textContent='Preencha cartão, data, valor e quantidade de parcelas.';return;}const base=Math.floor(total/n),resto=total%n;const d=new Date(date+'T12:00:00');const ym=new Date(d.getFullYear(),d.getMonth()+(d.getDate()>card.fechamento?1:0),1);luviDraft=Array.from({length:n},(_,i)=>{const mes=new Date(ym.getFullYear(),ym.getMonth()+i,1);const v=new Date(mes.getFullYear(),mes.getMonth(),card.vencimento);if(v<=d)v.setMonth(v.getMonth()+1);return {vencimento:[v.getFullYear(),String(v.getMonth()+1).padStart(2,'0'),String(v.getDate()).padStart(2,'0')].join('-'),valor:(base+(i===n-1?resto:0))/100};});luviRenderDraft();$('luviPurchasePreview').classList.remove('hidden');return true;}
$('luviPreviewPurchase')?.addEventListener('click',luviGenerateDraft);
function luviRenderDraft(){$('luviPurchaseInstallments').innerHTML=luviDraft.map((p,i)=>`<div class="luvi-parcela-edit"><label>Parcela ${i+1}/${luviDraft.length}<input type="date" data-luvi-date="${i}" value="${p.vencimento}" required></label><label>Valor (R$)<input type="number" min="0.01" step="0.01" inputmode="decimal" class="luvi-money-input" data-luvi-value="${i}" value="${p.valor.toFixed(2)}" required></label></div>`).join('');$('luviPurchaseInstallments').querySelectorAll('[data-luvi-value]').forEach(el=>el.addEventListener('input',luviUpdateDraft));$('luviPurchaseInstallments').querySelectorAll('[data-luvi-date]').forEach(el=>el.addEventListener('change',luviUpdateDraft));luviUpdateDraft();}
function luviUpdateDraft(){luviDraft.forEach((p,i)=>{p.valor=Number(document.querySelector(`[data-luvi-value="${i}"]`).value);p.vencimento=document.querySelector(`[data-luvi-date="${i}"]`).value;});const soma=luviDraft.reduce((a,p)=>a+Math.round(p.valor*100),0),total=Math.round(Number($('luviPurchaseTotal').value)*100);$('luviPurchaseSum').textContent=`Total das parcelas: ${formatarMoeda(soma/100)} / Compra: ${formatarMoeda(total/100)}`;$('luviSavePurchase').disabled=false;$('luviPurchaseError').textContent=soma!==total?'A soma das parcelas deve corresponder ao total da compra.':'';}
$('luviPurchaseForm')?.addEventListener('submit',async e=>{e.preventDefault();if(Number($('luviPurchaseCount').value)===1 && !luviEditingPurchaseId){if(!luviGenerateDraft())return;}else if(!luviDraft.length){$('luviPurchaseError').textContent='Pré-visualize as parcelas antes de salvar.';return;}luviUpdateDraft();const selectedCardId=Number($('luviPurchaseCard').value);if(!luviCards.some(c=>c.id===selectedCardId)){$('luviPurchaseError').textContent='Selecione um cartão válido.';return;}if(!luviDraft.length||luviDraft.some(p=>!p.vencimento||!Number.isFinite(p.valor)||p.valor<=0)||Math.round(luviDraft.reduce((a,p)=>a+p.valor,0)*100)!==Math.round(Number($('luviPurchaseTotal').value)*100)){$('luviPurchaseError').textContent='Confira as parcelas e seus valores antes de salvar.';return;}const payload={cartaoId:selectedCardId,categoriaId:Number($('luviPurchaseCategory').value),descricao:$('luviPurchaseDescription').value,dataCompra:$('luviPurchaseDate').value,total:Number($('luviPurchaseTotal').value),quantidadeParcelas:luviDraft.length,parcelas:luviDraft};try{const r=await fetch(luviEditingPurchaseId?`/api/cartoes/compras/${luviEditingPurchaseId}`:'/api/cartoes/compras',{method:luviEditingPurchaseId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await erro(r));e.target.reset();luviEditingPurchaseId=null;$('luviPurchaseCount').disabled=false;$('luviPurchaseCount').readOnly=false;$('luviPurchaseFormTitle').textContent='Nova compra';luviDraft=[];$('luviPurchasePreview').classList.add('hidden');luviUpdatePurchaseMode();luviCardSection('','reset');await luviLoadCards();await carregarDadosMes();}catch(err){$('luviPurchaseError').textContent=err.message;}});

// v6.7.2: ao navegar pelo menu móvel, recolher a gaveta antes de abrir o destino.
$('sidebar')?.addEventListener('click',event=>{if(event.target.closest('button.nav-item'))toggleMenu(false);});

// Categorias próprias do escopo do cartão, sem depender do formulário de lançamentos.
let luviPurchaseCategoryRequest=0;
async function luviLoadPurchaseCategories(){
 const request=++luviPurchaseCategoryRequest, select=$('luviPurchaseCategory'), cardId=$('luviPurchaseCard').value;
 select.disabled=true;select.innerHTML='<option value="">Carregando categorias...</option>';
 try{
  if(!cardId){select.innerHTML='<option value="">Cadastre ou selecione um cartão</option>';return;}
  const r=await fetch(`/api/cartoes/${encodeURIComponent(cardId)}/categorias`);
  if(!r.ok)throw new Error(await erro(r));
  const lista=(await r.json()).filter(c=>c.tipo==='DESPESA'&&c.ativa!==false);
  if(request!==luviPurchaseCategoryRequest)return;
  select.innerHTML=lista.length?lista.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join(''):'<option value="">Nenhuma categoria de despesa ativa</option>';
  $('luviPurchaseError').textContent='';
 }catch(e){if(request===luviPurchaseCategoryRequest){select.innerHTML='<option value="">Não foi possível carregar categorias</option>';$('luviPurchaseError').textContent=e.message;}}
 finally{if(request===luviPurchaseCategoryRequest)select.disabled=false;}
}
$('luviPurchaseCard')?.addEventListener('change',luviLoadPurchaseCategories);

// Resumo completo da série, incluindo ocorrências realizadas e meses futuros.
let luviRecurrenceItems = [];
let luviRecurrenceRequest = 0;
function situacaoRecorrenciaLuvi(item) {
  if (item.status === "PAGO") {
    const situacao = item.tipo === "RECEITA" ? "Recebido" : "Pago";
    return item.dataPagamento ? `${situacao} em ${formatarData(item.dataPagamento)}` : situacao;
  }
  return item.vencimento < hojeISO() ? "Pendente · vencido" : "Pendente";
}
function resumoRecorrenciaLuvi(items) {
  const realizados = items.filter(item => item.status === "PAGO").length;
  const total = items.reduce((sum, item) => sum + Number(item.valor), 0);
  return `${items.length} ocorrências · ${realizados} realizadas · ${items.length - realizados} pendentes · Total previsto: ${formatarMoeda(total)}`;
}
function listaRecorrenciaLuvi(items) {
  return items.map((item, index) => `<li class="luvi-series-item">
    <span class="luvi-series-date">${index + 1}. ${formatarData(item.vencimento)}<small>${escaparHtml(item.descricao)} · ${escaparHtml(item.contaNome)}</small></span>
    <strong>${formatarMoeda(Number(item.valor))}</strong>
    <span class="luvi-series-status ${item.status === "PAGO" ? "paid" : ""}">${escaparHtml(situacaoRecorrenciaLuvi(item))}${item.status === "PAGO" && item.dataPagamento ? `<small>${item.valorEfetivo != null ? `Valor realizado: ${formatarMoeda(Number(item.valorEfetivo))}` : ""}</small>` : ""}</span>
  </li>`).join("");
}
async function abrirRecorrenciaLuvi(id) {
  const request = ++luviRecurrenceRequest;
  luviRecurrenceItems = [];
  $("luviRecurrencePrint").disabled = true;
  $("luviRecurrenceSummary").textContent = "Carregando ocorrências...";
  $("luviRecurrenceList").innerHTML = "";
  $("luviRecurrenceTitle").textContent = "Recorrência";
  abrirCamada("luviRecurrenceModal");
  try {
    const response = await fetch(`/api/planejamento/${id}/recorrencia`);
    if (!response.ok) throw new Error(await erro(response));
    const items = await response.json();
    if (request !== luviRecurrenceRequest) return;
    luviRecurrenceItems = items;
    $("luviRecurrenceTitle").textContent = items[0]?.descricao || "Recorrência";
    $("luviRecurrenceSummary").textContent = items.length ? resumoRecorrenciaLuvi(items) : "Nenhuma ocorrência disponível.";
    $("luviRecurrenceList").innerHTML = listaRecorrenciaLuvi(items);
    $("luviRecurrencePrint").disabled = !items.length;
  } catch (error) {
    if (request === luviRecurrenceRequest) $("luviRecurrenceSummary").textContent = error.message;
  }
}
function imprimirRecorrenciaLuvi() {
  if (!luviRecurrenceItems.length) return;
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) { mensagem("Permita abrir a janela de impressão no navegador para salvar o PDF."); return; }
  popup.opener = null;
  const title = escaparHtml($("luviRecurrenceTitle").textContent);
  popup.document.open();
  popup.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>LUVI — ${title}</title><style>
    @page{size:A4;margin:16mm}body{font:14px Arial,sans-serif;color:#172c45;margin:24px}h1{font-size:21px}p{line-height:1.5}ul{list-style:none;padding:0}.luvi-series-item{display:grid;grid-template-columns:1fr auto auto;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid #ddd;break-inside:avoid}small{display:block;font-size:11px;color:#555;margin-top:4px}.luvi-series-status{min-width:110px}button{padding:10px 16px;cursor:pointer}@media print{button{display:none}body{margin:0}}
    </style></head><body><h1>LUVI Finanças · Recorrência</h1><h2>${title}</h2><p>${escaparHtml(resumoRecorrenciaLuvi(luviRecurrenceItems))}</p><ul>${listaRecorrenciaLuvi(luviRecurrenceItems)}</ul><p><small>Emitido em ${escaparHtml(new Date().toLocaleString("pt-BR"))}. Valores da coluna principal são os previstos; valores realizados aparecem junto à situação.</small></p><button type="button" id="print">Imprimir / Salvar PDF</button></body></html>`);
  popup.document.close();
  popup.document.getElementById("print").onclick = () => popup.print();
  popup.focus();
  popup.print();
}
$("luviRecurrencePrint")?.addEventListener("click", imprimirRecorrenciaLuvi);

function linhaCompromissoPrevisaoLuvi(x) { return `<div class="luvi-future-row"><div class="luvi-future-description"><strong>${escaparHtml(x.descricao)}</strong><small>${formatarData(x.vencimento)} · ${escaparHtml(x.contaNome)} · ${escaparHtml(x.categoria)}${x.status==='PAGO'&&x.dataPagamento?` · Realizado em ${formatarData(x.dataPagamento)}${x.valorEfetivo!=null?` por ${formatarMoeda(Number(x.valorEfetivo))}`:''}`:''}</small></div><span class="${x.tipo==='RECEITA'?'valor-receita':'valor-despesa'}">${x.tipo==='RECEITA'?'+':'−'} ${formatarMoeda(Number(x.valor))}</span><span class="luvi-future-status ${x.status==='PAGO'?'paid':''}">${x.status==='PAGO'?(x.dataPagamento&&x.dataPagamento<x.vencimento?'Pago antecipadamente':'Pago'):'Pendente'}</span>${x.status==='PENDENTE'?`<button type="button" class="secondary-button" data-future-pay="${x.id}">${x.cartaoId?'Ver fatura':x.tipo==='RECEITA'?'Receber':'Pagar'}</button>${x.cartaoId?'':`<button type="button" class="icon-action editar" data-future-edit="${x.id}" aria-label="Editar compromisso" title="Editar compromisso">${icone("editar")}</button>`}<button type="button" class="icon-action excluir" data-future-delete="${x.id}" aria-label="Excluir compromisso" title="Excluir compromisso">${icone("excluir")}</button>`:''}${x.serieRecorrencia&&!x.cartaoId?`<button type="button" class="icon-action" data-future-series="${x.id}" aria-label="Ver recorrência" title="Ver recorrência"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v15H4V2h2Zm1 2H6v16h12V8h-5V4H7Zm8 1v1h1l-1-1ZM8 11h8v2H8v-2Zm0 4h8v2H8v-2Z"/></svg></button>`:''}</div>`; }

function agruparCategoriasPrevisaoLuvi(items) {
  const grupos = new Map();
  for (const item of items) {
    const nome = item.cartaoId ? "Cartões de crédito" : (item.categoria || "Sem categoria");
    const key = item.cartaoId ? "DESPESA:cartoes" : `${item.tipo}:${item.categoriaId != null ? item.categoriaId : nome}`;
    if (!grupos.has(key)) grupos.set(key, {key, nome, tipo:item.tipo, items:[], pendente:0, previsto:0});
    const grupo = grupos.get(key);
    grupo.items.push(item);
    grupo.previsto += Number(item.valor);
    if (item.status === "PENDENTE") grupo.pendente += Number(item.valor);
  }
  return [...grupos.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR") || a.tipo.localeCompare(b.tipo));
}
function renderizarCategoriasPrevisaoLuvi(items, expandidas = new Set()) {
  if (!items.length) return '<div class="empty-state">Nenhum compromisso neste mês. Cadastre um lançamento futuro.</div>';
  return agruparCategoriasPrevisaoLuvi(items).map(grupo=>`<details class="luvi-forecast-category ${grupo.tipo === "RECEITA" ? "income" : "expense"} ${grupo.items.every(item=>item.status === "PAGO") ? "settled" : ""}" data-category-key="${escaparHtml(grupo.key)}" ${expandidas.has(grupo.key) ? "open" : ""}>
    <summary><span class="luvi-forecast-category-name"><strong>${escaparHtml(grupo.nome)}</strong>${grupo.items.every(item=>item.status === "PAGO") ? `<span class="luvi-category-check" title="100% pago" aria-label="Categoria totalmente paga">✓</span>` : ""}<small>${grupo.tipo === "RECEITA" ? "Receita" : "Despesa"} · ${grupo.items.length} ${grupo.items.length === 1 ? "registro" : "registros"}</small></span><span class="luvi-forecast-category-total"><strong>${formatarMoeda(grupo.pendente)}</strong><small>Pendente · Total previsto: ${formatarMoeda(grupo.previsto)}</small></span><svg class="luvi-forecast-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg></summary>
    <div class="luvi-forecast-category-items">${grupo.items.map(linhaCompromissoPrevisaoLuvi).join("")}</div>
  </details>`).join("");
}

// Relatórios consultam todos os meses e reutilizam a fatura consolidada.
let luviReportItems = [], luviReportFiltered = [], luviReportRequest = 0;
function chaveCategoriaRelatorioLuvi(item) {
  return item.cartaoId ? "FATURAS" : `${item.tipo}:${item.categoriaId ?? item.categoria}`;
}
async function abrirRelatoriosLuvi() {
  fecharSubtelasPrincipais("reportsModal"); toggleMenu(false);
  abrirCamada("reportsModal");
  await carregarRelatoriosLuvi();
}
async function carregarRelatoriosLuvi() {
  const request = ++luviReportRequest;
  $("reportMessage").textContent = "Carregando registros...";
  $("reportPrint").disabled = true;
  $("reportRefresh").disabled = true;
  luviReportItems = []; luviReportFiltered = [];
  $("reportRows").innerHTML = ""; $("reportTotals").innerHTML = "";
  try {
    const consolidated = await buscarCompromissosConsolidadosLuvi();
    if (request !== luviReportRequest) return;
    luviReportItems = consolidated;
    const accountValue = $("reportAccount").value, categoryValue = $("reportCategory").value;
    const accounts = new Map(luviReportItems.map(item=>[String(item.contaId),item.contaNome]));
    contas.forEach(c=>accounts.set(String(c.id),c.nome));
    $("reportAccount").innerHTML = '<option value="">Todas as contas</option>'+[...accounts].map(([id,name])=>`<option value="${escaparHtml(id)}">${escaparHtml(name)}</option>`).join("");
    $("reportAccount").value = accounts.has(accountValue)?accountValue:"";
    const categories = new Map(luviReportItems.map(item=>[chaveCategoriaRelatorioLuvi(item),`${item.categoria || "Sem categoria"} · ${item.tipo==="RECEITA"?"Receita":"Despesa"}`]));
    $("reportCategory").innerHTML = '<option value="">Todas as categorias</option>'+[...categories].sort((a,b)=>a[1].localeCompare(b[1],"pt-BR")).map(([key,name])=>`<option value="${escaparHtml(key)}">${escaparHtml(name)}</option>`).join("");
    $("reportCategory").value = categories.has(categoryValue)?categoryValue:"";
    renderizarRelatorioLuvi();
  } catch(error) {
    if (request===luviReportRequest) $("reportMessage").textContent = `Não foi possível carregar o relatório: ${error.message}`;
  } finally { if(request===luviReportRequest) $("reportRefresh").disabled=false; }
}
function filtrarRelatorioLuvi(items, filters, today=hojeISO()) {
  const limitDate = new Date(`${today}T12:00:00`); limitDate.setDate(limitDate.getDate()+Number(filters.days));
  const limit = `${limitDate.getFullYear()}-${String(limitDate.getMonth()+1).padStart(2,'0')}-${String(limitDate.getDate()).padStart(2,'0')}`;
  return items.filter(item=>{
    const pending=item.status==="PENDENTE", date=item.vencimento;
    if(filters.status==="ABERTO"&&!pending)return false;
    if(filters.status==="VENCIDO"&&(!pending||date>=today))return false;
    if(filters.status==="HOJE"&&(!pending||date!==today))return false;
    if(filters.status==="PROXIMOS"&&(!pending||date<=today||date>limit))return false;
    if(filters.status==="REALIZADO"&&item.status!=="PAGO")return false;
    return (!filters.account||String(item.contaId)===filters.account)&&(!filters.category||chaveCategoriaRelatorioLuvi(item)===filters.category)&&(!filters.type||item.tipo===filters.type)&&(!filters.start||date>=filters.start)&&(!filters.end||date<=filters.end);
  }).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)||a.descricao.localeCompare(b.descricao,"pt-BR"));
}
function filtrosRelatorioLuvi() {
  return {status:$("reportStatus").value,days:$("reportDays").value,account:$("reportAccount").value,category:$("reportCategory").value,type:$("reportType").value,start:$("reportStart").value,end:$("reportEnd").value};
}
function totaisRelatorioLuvi(items) {
  return {receitas:items.filter(x=>x.tipo==="RECEITA").reduce((v,x)=>v+Number(x.valor),0),despesas:items.filter(x=>x.tipo==="DESPESA").reduce((v,x)=>v+Number(x.valor),0)};
}
function linhasRelatorioLuvi(items) {
  return items.map(item=>`<article class="luvi-report-row"><div><strong>${escaparHtml(item.descricao)}</strong><small>${escaparHtml(item.categoria)} · ${escaparHtml(item.contaNome)}</small></div><span>${formatarData(item.vencimento)}</span><strong class="${item.tipo==="RECEITA"?"valor-receita":"valor-despesa"}">${item.tipo==="RECEITA"?"+":"−"} ${formatarMoeda(Number(item.valor))}</strong><span>${escaparHtml(situacaoRecorrenciaLuvi(item))}</span></article>`).join("");
}
function renderizarRelatorioLuvi() {
  const f=filtrosRelatorioLuvi(); $("reportDays").disabled=f.status!=="PROXIMOS";
  $("reportPrint").disabled=true;
  if(f.start&&f.end&&f.start>f.end){luviReportFiltered=[];$("reportMessage").textContent="O início do período deve ser anterior ou igual ao fim.";$("reportRows").innerHTML="";$("reportTotals").innerHTML="";return;}
  luviReportFiltered=filtrarRelatorioLuvi(luviReportItems,f);
  const total=totaisRelatorioLuvi(luviReportFiltered);
  const despesasLabel = ["REALIZADO","TODOS"].includes(f.status) ? "Despesas previstas" : "A pagar";
  const receitasLabel = ["REALIZADO","TODOS"].includes(f.status) ? "Receitas previstas" : "A receber";
  $("reportMessage").textContent=luviReportFiltered.length?`${luviReportFiltered.length} registros encontrados. Valores previstos dos registros selecionados.`:"Nenhum registro para estes filtros.";
  $("reportTotals").innerHTML=`<div><small>${despesasLabel}</small><strong>${formatarMoeda(total.despesas)}</strong></div><div><small>${receitasLabel}</small><strong>${formatarMoeda(total.receitas)}</strong></div><div><small>Registros</small><strong>${luviReportFiltered.length}</strong></div>`;
  $("reportRows").innerHTML=linhasRelatorioLuvi(luviReportFiltered);
  $("reportPrint").disabled=!luviReportFiltered.length;
}
function imprimirRelatorioLuvi() {
  if(!luviReportFiltered.length)return;
  const popup=window.open("","_blank","width=1000,height=750");
  if(!popup){mensagem("Permita abrir a janela de impressão para salvar o PDF.");return;}
  popup.opener=null;
  const filters=["reportStatus","reportAccount","reportCategory","reportType"].map(id=>$(id).selectedOptions[0]?.textContent||"");
  if($("reportStatus").value==="PROXIMOS")filters.push($("reportDays").selectedOptions[0].textContent);
  filters.push(`Vencimento: ${$("reportStart").value?formatarData($("reportStart").value):"sem início"} a ${$("reportEnd").value?formatarData($("reportEnd").value):"sem fim"}`);
  const total=totaisRelatorioLuvi(luviReportFiltered);
  popup.document.open();popup.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>LUVI — Relatório de compromissos</title><style>@page{size:A4 landscape;margin:14mm}body{font:12px Arial;color:#172c45}h1{font-size:21px}.luvi-report-row{display:grid;grid-template-columns:2fr 90px 120px 150px;gap:12px;padding:10px 0;border-bottom:1px solid #ddd;break-inside:avoid}small{display:block;margin-top:4px;color:#555}.valor-receita{color:#146e38}.valor-despesa{color:#a12828}@media print{button{display:none}}</style></head><body><h1>LUVI Finanças · Compromissos</h1><p>${escaparHtml(filters.join(" · "))}</p><p>${luviReportFiltered.length} registros · Despesas previstas: ${formatarMoeda(total.despesas)} · Receitas previstas: ${formatarMoeda(total.receitas)}</p><p>Valores previstos. Período por vencimento. Emitido em ${escaparHtml(new Date().toLocaleString("pt-BR"))}.</p>${linhasRelatorioLuvi(luviReportFiltered)}<button id="print" type="button">Imprimir / Salvar PDF</button></body></html>`);popup.document.close();popup.document.getElementById("print").onclick=()=>popup.print();popup.focus();popup.print();
}
$("reportsMenu")?.addEventListener("click",abrirRelatoriosLuvi);
$("reportRefresh")?.addEventListener("click",carregarRelatoriosLuvi);
$("reportPrint")?.addEventListener("click",imprimirRelatorioLuvi);
for(const id of ["reportStatus","reportDays","reportAccount","reportCategory","reportType","reportStart","reportEnd"])$(id)?.addEventListener("change",renderizarRelatorioLuvi);

async function buscarCompromissosConsolidadosLuvi() {
    const r = await fetch("/api/planejamento/relatorio");
    if (!r.ok) throw new Error(await erro(r));
    const items = await r.json();
    const cr = await fetch("/api/cartoes");
    if (!cr.ok) throw new Error(await erro(cr));
    const cards = await cr.json(), parcelaIds = new Set(), invoices = [];
    const byId = new Map(items.map(item=>[item.id,item]));
    for (const card of cards) {
      const fr = await fetch(`/api/cartoes/${card.id}/faturas`);
      if (!fr.ok) throw new Error(await erro(fr));
      for (const invoice of await fr.json()) {
        const visible = invoice.itens.filter(item=>byId.has(item.compromissoId));
        if (!visible.length) continue;
        visible.forEach(item=>parcelaIds.add(item.compromissoId));
        const first = byId.get(visible[0].compromissoId);
        const total = visible.reduce((sum,item)=>sum+Number(item.valor),0);
        invoices.push({id:`fatura-${card.id}-${invoice.competencia}`,cartaoId:card.id,competencia:invoice.competencia,
          descricao:`Fatura ${card.nome} · ${invoice.competencia.slice(0,7).split('-').reverse().join('/')}`,
          categoria:"Cartões de crédito",tipo:"DESPESA",contaId:invoice.paga ? (invoice.contaPagamentoId ?? first.contaId) : (card.contaPagamentoId ?? first.contaId),
          contaNome:invoice.paga ? (contas.find(c=>c.id===invoice.contaPagamentoId)?.nome || first.contaNome) : first.contaNome,
          vencimento:first.vencimento,valor:total,status:invoice.paga?"PAGO":"PENDENTE",dataPagamento:invoice.dataPagamento,valorEfetivo:invoice.paga?total:null});
      }
    }
    return [...items.filter(item=>!parcelaIds.has(item.id)),...invoices];
}

// Análise de despesas: parcelas por competência, despesas diretas por realização.
let luviExpenseBase=[], luviExpenseCards=[], luviExpenseCategorySelected="", luviExpenseLoaded=false, luviExpenseDirectMonth='';
function luviExpenseToggle(mode){
 const expenses=mode==='expenses';
 $('luviExpensePanel').classList.toggle('hidden',!expenses);
 $('luviCommitmentsPanel').classList.toggle('hidden',expenses);
 $('luviReportExpensesTab').className=expenses?'primary-button':'secondary-button';
 $('luviReportCommitmentsTab').className=expenses?'secondary-button':'primary-button';
 $('luviReportExpensesTab').setAttribute('aria-pressed',String(expenses));
 $('luviReportCommitmentsTab').setAttribute('aria-pressed',String(!expenses));
 $('reportRefresh').textContent=expenses?'Atualizar análise':'Atualizar';
 $('reportPrint').classList.toggle('hidden',expenses);
 $('reportsTitle').textContent=expenses?'Relatórios · Análise de despesas':'Relatórios · Compromissos';
 if(expenses&&!luviExpenseLoaded)luviLoadExpenses();
}
$('luviReportCommitmentsTab')?.addEventListener('click',()=>luviExpenseToggle('commitments'));
$('luviReportExpensesTab')?.addEventListener('click',()=>luviExpenseToggle('expenses'));
$('reportRefresh')?.addEventListener('click',()=>{if(!$('luviExpensePanel').classList.contains('hidden'))luviLoadExpenses();});
async function luviLoadExpenses(){
 const message=$('luviExpenseMessage');message.textContent='Carregando despesas...';
 try{
  const [r,cr]=await Promise.all([fetch('/api/planejamento/relatorio'),fetch('/api/cartoes')]);
  if(!r.ok)throw new Error(await erro(r));if(!cr.ok)throw new Error(await erro(cr));
  const commitments=await r.json(),cards=await cr.json();
  const invoices=await Promise.all(cards.map(async c=>{const res=await fetch(`/api/cartoes/${c.id}/faturas`);if(!res.ok)throw new Error(await erro(res));return {card:c,invoices:await res.json()};}));
  const cardCommitmentIds=new Set();const cardExpenses=[];
  invoices.forEach(({card,invoices})=>invoices.forEach(invoice=>(invoice.itens||[]).forEach(item=>{
   cardCommitmentIds.add(String(item.compromissoId));
   cardExpenses.push({id:`cartao-${card.id}-${item.compromissoId}`,origem:'CARTOES',cartaoId:String(card.id),cartaoNome:card.nome,
    descricao:`${item.descricao}${item.quantidade>1?` (${item.numero}/${item.quantidade})`:''}`,
    categoria:item.categoria||'Sem categoria',valor:Number(item.valor),mes:String(invoice.competencia).slice(0,7),data:item.vencimento});
  })));
  // Não somar os compromissos das parcelas novamente como despesas diretas.
  // As despesas diretas vêm do extrato efetivo, não dos compromissos (evita duplicar pagamentos).
  luviExpenseBase=cardExpenses;luviExpenseDirectMonth='';luviExpenseCards=cards;luviExpenseLoaded=true;
  const cardSel=$('luviExpenseCard'),prior=cardSel.value;
  cardSel.innerHTML='<option value="">Todos os cartões</option>'+cards.map(c=>`<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');
  cardSel.value=cards.some(c=>String(c.id)===prior)?prior:'';
  if(!$('luviExpenseMonth').value)$('luviExpenseMonth').value=hojeISO().slice(0,7);
  await luviFetchDirectExpenses();
 }catch(e){message.textContent=`Não foi possível carregar a análise: ${e.message}`;}
}
async function luviFetchDirectExpenses(){
 const month=$('luviExpenseMonth').value;
 if(!month)return luviRenderExpenses();
 if(luviExpenseDirectMonth===month)return luviRenderExpenses();
 const [year,number]=month.split('-');
 const r=await fetch(`/api/lancamentos?ano=${encodeURIComponent(year)}&mes=${encodeURIComponent(Number(number))}`);
 if(!r.ok)throw new Error(await erro(r));
 const rows=await r.json();
 const direct=rows.filter(x=>x.tipo==='DESPESA'&&
   !/^pagamento fatura /i.test(String(x.descricao||''))&&
   !/pagamento de fatura/i.test(String(x.categoria||'')))
   .map(x=>({id:`direta-${x.id}`,origem:'DIRETAS',cartaoId:'',cartaoNome:x.contaNome||'Conta financeira',
    descricao:x.descricao,categoria:x.categoria||'Sem categoria',valor:Number(x.valor),mes:month,data:x.data}));
 luviExpenseBase=[...luviExpenseBase.filter(x=>x.origem==='CARTOES'),...direct];
 luviExpenseDirectMonth=month;luviRenderExpenses();
}
function luviRenderExpenses(){
 const month=$('luviExpenseMonth').value,view=$('luviExpenseView').value,card=$('luviExpenseCard').value;
 $('luviExpenseCard').disabled=view==='DIRETAS';
 const base=luviExpenseBase.filter(x=>x.mes===month&&(view==='CONSOLIDADO'||x.origem===view)&&(x.origem!=='CARTOES'||!card||x.cartaoId===card));
 const category=$('luviExpenseCategory'),old=category.value;
 const names=[...new Set(base.map(x=>x.categoria))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 category.innerHTML='<option value="">Todas as categorias</option>'+names.map(n=>`<option value="${escaparHtml(n)}">${escaparHtml(n)}</option>`).join('');
 category.value=names.includes(old)?old:'';
 const filtered=base.filter(x=>!category.value||x.categoria===category.value);
 const total=filtered.reduce((v,x)=>v+x.valor,0),direct=filtered.filter(x=>x.origem==='DIRETAS').reduce((v,x)=>v+x.valor,0),credit=total-direct;
 $('luviExpenseSummary').innerHTML=`<div><small>Total de despesas</small><strong>${formatarMoeda(total)}</strong></div><div><small>Despesas diretas</small><strong>${formatarMoeda(direct)}</strong></div><div><small>Cartões</small><strong>${formatarMoeda(credit)}</strong></div>`;
 const groups=[...filtered.reduce((m,x)=>(m.set(x.categoria,(m.get(x.categoria)||0)+x.valor),m),new Map())].sort((a,b)=>b[1]-a[1]);
 $('luviExpenseBars').innerHTML=groups.length?groups.map(([name,value])=>`<button type="button" class="luvi-expense-bar" data-luvi-expense-category="${escaparHtml(name)}"><span>${escaparHtml(name)}</span><strong>${formatarMoeda(value)}</strong><span class="luvi-expense-track"><span style="width:${total>0?Math.min(100,100*value/total):0}%"></span></span></button>`).join(''):'<p class="luvi-report-note">Nenhuma despesa encontrada neste período.</p>';
 $('luviExpenseDetailsTitle').textContent=category.value?`Lançamentos · ${category.value}`:'Lançamentos do período';
 $('luviExpenseRows').innerHTML=filtered.sort((a,b)=>String(a.data).localeCompare(String(b.data))).map(x=>`<article class="luvi-report-row"><div><strong>${escaparHtml(x.descricao)}</strong><small>${escaparHtml(x.categoria)} · ${escaparHtml(x.cartaoNome)}</small></div><span>${formatarData(x.data)}</span><strong class="valor-despesa">${formatarMoeda(x.valor)}</strong><span>${x.origem==='CARTOES'?'Parcela do cartão':'Despesa realizada'}</span></article>`).join('');
 $('luviExpenseMessage').textContent=`${filtered.length} lançamentos · ${month?month.split('-').reverse().join('/'):''}. Clique numa categoria para detalhar.`;
 $('luviExpenseBars').querySelectorAll('[data-luvi-expense-category]').forEach(b=>b.addEventListener('click',()=>{category.value=b.dataset.luviExpenseCategory;luviRenderExpenses();}));
}
$('luviExpenseMonth')?.addEventListener('change',()=>luviFetchDirectExpenses().catch(e=>{$('luviExpenseMessage').textContent=e.message;}));
for(const id of ['luviExpenseView','luviExpenseCard','luviExpenseCategory'])$(id)?.addEventListener('change',luviRenderExpenses);

// Avisos pessoais de despesas a vencer; exibidos dentro do aplicativo.
let luviPreferencias=null, luviAvisos=[], luviAvisosRequest=0, luviAvisosErro="";
async function iniciarAvisosLuvi(){
 try{const r=await fetch('/api/preferencias');if(!r.ok)throw new Error(await erro(r));luviPreferencias=await r.json();await atualizarAvisosLuvi();}
 catch(e){console.warn('Avisos indisponíveis',e);}
}
function selecionarAvisosLuvi(items,dias,today=hojeISO()){
 const date=new Date(`${today}T12:00:00`);date.setDate(date.getDate()+dias);
 const limite=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 return items.filter(x=>x.tipo==='DESPESA'&&x.status==='PENDENTE'&&x.vencimento<=limite).sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
}
async function atualizarAvisosLuvi(){
 const request=++luviAvisosRequest;
 if(!luviPreferencias?.avisosAtivos){luviAvisos=[];luviAvisosErro='';renderizarAvisosLuvi();return;}
 try{
  const items=await buscarCompromissosConsolidadosLuvi();if(request!==luviAvisosRequest)return;
  luviAvisos=selecionarAvisosLuvi(items,luviPreferencias.avisosDias);luviAvisosErro='';
 }catch(e){if(request!==luviAvisosRequest)return;luviAvisos=[];luviAvisosErro='Não foi possível atualizar os avisos. Tente abrir novamente.';console.warn(e);}
 renderizarAvisosLuvi();
}
function renderizarAvisosLuvi(){
 $('notificationsCount').textContent=String(luviAvisos.length);
 $('notificationsBadge').classList.toggle('hidden',!luviAvisos.length);
 $('notificationsBadge').setAttribute('aria-label',`${luviAvisos.length} contas pendentes ou vencidas`);
 $('notificationsMessage').textContent=luviAvisosErro||(luviAvisos.length?`${luviAvisos.filter(x=>x.vencimento<hojeISO()).length} vencida(s) · ${luviAvisos.length} aviso(s) no total`:'Nenhuma conta a vencer neste prazo.');
 $('notificationsRows').innerHTML=luviAvisos.map(x=>`<div class="luvi-notification-row ${x.vencimento<hojeISO()?'luvi-notification-overdue':''}"><div><strong>${escaparHtml(x.descricao)}</strong><small>${formatarData(x.vencimento)} · ${escaparHtml(x.contaNome)} ${x.vencimento<hojeISO()?'· Vencida':''}</small></div><strong>${formatarMoeda(Number(x.valor))}</strong><button type="button" class="primary-button" data-notification-pay="${escaparHtml(String(x.id))}">Pagar</button></div>`).join('');
 $('notificationsRows').querySelectorAll('[data-notification-pay]').forEach(button=>button.onclick=async()=>{
  const item=luviAvisos.find(x=>String(x.id)===button.dataset.notificationPay);if(!item)return;
  button.disabled=true;
  try{if(item.cartaoId){await luviOpenCards();await luviOpenInvoice(`${item.cartaoId}|${item.competencia}`);}else pagarCompromissoLuvi(item.id,item);}
  catch(e){await mensagem(e.message);}finally{button.disabled=false;}
 });
}
async function abrirConfiguracoesLuvi(){
 if(window.luviPasskeySettings)window.luviPasskeySettings();
 toggleMenu(false);fecharSubtelasPrincipais('settingsModal');abrirCamada('settingsModal');$('settingsMessage').textContent='Carregando...';$('settingsSave').disabled=true;
 try{const r=await fetch('/api/preferencias');if(!r.ok)throw new Error(await erro(r));luviPreferencias=await r.json();$('settingsNotifications').checked=luviPreferencias.avisosAtivos;$('settingsDays').value=luviPreferencias.avisosDias;$('settingsDays').disabled=!luviPreferencias.avisosAtivos;$('settingsMessage').textContent='';$('settingsSave').disabled=false;}
 catch(e){$('settingsMessage').textContent=e.message;}
}
$('settingsMenu')?.addEventListener('click',abrirConfiguracoesLuvi);
$('settingsNotifications')?.addEventListener('change',()=>{$('settingsDays').disabled=!$('settingsNotifications').checked;});
$('settingsForm')?.addEventListener('submit',async event=>{
 event.preventDefault();const dias=Number($('settingsDays').value);
 if(!Number.isInteger(dias)||dias<1||dias>365){$('settingsMessage').textContent='Informe de 1 a 365 dias.';return;}
 $('settingsSave').disabled=true;
 try{const r=await fetch('/api/preferencias',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({avisosAtivos:$('settingsNotifications').checked,avisosDias:dias})});if(!r.ok)throw new Error(await erro(r));luviPreferencias=await r.json();$('settingsMessage').textContent='Configurações salvas.';await atualizarAvisosLuvi();}
 catch(e){$('settingsMessage').textContent=e.message;}finally{$('settingsSave').disabled=false;}
});
$('notificationsBadge')?.addEventListener('click',async()=>{abrirCamada('notificationsModal');$('notificationsMessage').textContent='Atualizando...';$('notificationsRows').innerHTML='';await atualizarAvisosLuvi();});
window.addEventListener('focus',()=>{if(luviPreferencias?.avisosAtivos)atualizarAvisosLuvi();});
