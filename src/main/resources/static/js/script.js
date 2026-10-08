// LUVI Finanças v6.0.2 - correções mobile
let dataAtual=new Date(),lancamentos=[],transferencias=[],contas=[],grupos=[],categorias=[],categoriasGerencia=[],graficos=[],contaSelecionada=null,grupoSelecionado=null,ordenacao={campo:"data",direcao:"desc"},grupoGerenciado=null,conviteAtual=null,retornarAoGrupoAposConvite=false,contaCompartilhamento=null;
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
const modais=()=>["shareAccountModal","membersModal","groupsModal","viewModal","categoryEditModal","categoriesModal","dashboardModal","accountEditModal","accountsModal","inviteGeneratedModal","inviteCodeModal","groupModal","transferModal","modal","messageModal"].map($).filter(x=>x&&!x.classList.contains("hidden"));

document.addEventListener("DOMContentLoaded",async()=>{
  // v5.11.1: delegação central. Continua funcionando mesmo para conteúdo criado dinamicamente.
  document.addEventListener("click",async e=>{
    const close=e.target.closest("[data-close-modal]");
    if(close){e.preventDefault();e.stopPropagation();const id=close.dataset.closeModal;if(id==="membersModal"){fecharCamada(id);if(grupoGerenciado)await abrirGrupo(grupoGerenciado)}else if(id==="shareAccountModal"){fecharCamada(id);abrirContas()}else if(id==="accountEditModal"){fecharCamada(id,false);abrirContas()}else if(id==="categoryEditModal"){fecharCamada(id,false);await abrirCategorias()}else if(id==="inviteGeneratedModal"){await fecharConviteGerado()}else fecharCamada(id);return}
    const group=e.target.closest("[data-open-group]");
    if(group){e.preventDefault();e.stopPropagation();await abrirGrupo(+group.dataset.openGroup);return}
    const members=e.target.closest('[data-action="open-members"]');
    if(members){e.preventDefault();e.stopPropagation();await abrirMembros();return}
    const action=e.target.closest("[data-ui-action]");
    if(action){e.preventDefault();e.stopPropagation();const a=action.dataset.uiAction;if(a==="new-account")abrirEdicaoConta();else if(a==="new-category")abrirEdicaoCategoria();else if(a==="members")await abrirMembros();return}
  });
  document.addEventListener("change",async e=>{
    if(e.target?.id==="categoryScope"){await carregarCategoriasGerencia()}
  });

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
  $("fecharGroups").onclick=$("cancelarGroups").onclick=()=>fecharCamada("groupsModal");
  $("novoGrupoButton").onclick=criarGrupo;
  await carregarContexto(); await carregarCategorias(); await carregarDadosMes();
  $("mesAnterior").onclick=async()=>{dataAtual.setMonth(dataAtual.getMonth()-1);await carregarDadosMes()};
  $("mesProximo").onclick=async()=>{dataAtual.setMonth(dataAtual.getMonth()+1);await carregarDadosMes()};
  $("novoLancamento").onclick=abrirNovo; $("novaTransferencia").onclick=abrirTransferencia;
  $("mobileNew").onclick=abrirNovo; $("mobileTransfer").onclick=abrirTransferencia;
  $("mobileNavDashboard").onclick=()=>{abrirDashboard();marcarNavMobile("dashboard")};
  $("mobileNavHome").onclick=()=>{fecharSubtelasPrincipais();window.scrollTo({top:0,behavior:"smooth"});marcarNavMobile("home")};

  $("mobileNavMore").onclick=()=>{toggleMenu(true);marcarNavMobile("more")};

  $("fecharModal").onclick=$("cancelarModal").onclick=()=>fecharCamada("modal");
  $("fecharTransfer").onclick=$("cancelarTransfer").onclick=()=>fecharCamada("transferModal");
  form.onsubmit=salvarLancamento; $("tipo").onchange=atualizarSelectCategorias; $("conta").onchange=carregarCategorias; $("transferForm").onsubmit=salvarTransferencia;
  document.querySelectorAll("th.sortable").forEach(th=>th.onclick=()=>alterarOrdenacao(th.dataset.sort));
  $("menuButton").onclick=()=>toggleMenu(); $("overlay").onclick=()=>toggleMenu(false);
  $("dashboardMenu").onclick=abrirDashboard; $("contasMenu").onclick=abrirContas; $("categoriasMenu").onclick=abrirCategorias; $("gruposMenu").onclick=abrirGrupos; $("visaoHeaderButton").onclick=abrirVisao;
  $("entrarGrupoMenu").onclick=abrirEntradaConvite;
  $("fecharView").onclick=$("cancelarView").onclick=()=>fecharCamada("viewModal");
  $("fecharGroups").onclick=$("cancelarGroups").onclick=()=>fecharCamada("groupsModal"); $("novoGrupoButton").onclick=criarGrupo;
  $("fecharMembers").onclick=$("cancelarMembers").onclick=async()=>{fecharCamada("membersModal");if(grupoGerenciado)await abrirGrupo(grupoGerenciado)}; $("membersInviteButton").onclick=()=>{if(grupoGerenciado)gerarConvite(grupoGerenciado)};
  $("fecharShareAccount").onclick=$("cancelarShareAccount").onclick=()=>{fecharCamada("shareAccountModal");abrirContas()};
  $("usuarioMenuButton").onclick=e=>{e.stopPropagation();const aberto=$("usuarioDropdown").classList.toggle("hidden")===false;$("usuarioMenuButton").setAttribute("aria-expanded",String(aberto))}; document.addEventListener("click",e=>{if(!e.target.closest(".user-menu-wrap")){ $("usuarioDropdown").classList.add("hidden"); $("usuarioMenuButton").setAttribute("aria-expanded","false") }});
  $("fecharInviteCode").onclick=$("cancelarInviteCode").onclick=()=>fecharCamada("inviteCodeModal");
  $("abrirInviteCode").onclick=usarCodigoConvite; $("pasteInviteButton").onclick=colarConvite;
  $("fecharGroup").onclick=$("cancelarGroup").onclick=()=>fecharCamada("groupModal");
  $("groupMembersButton").onclick=abrirMembros;
  $("fecharAccounts").onclick=$("cancelarAccounts").onclick=()=>fecharCamada("accountsModal"); $("fecharCategories").onclick=$("cancelarCategories").onclick=()=>fecharCamada("categoriesModal"); $("novaCategoriaButton").onclick=()=>abrirEdicaoCategoria(); $("categoryForm").onsubmit=salvarCategoria; $("fecharCategoryEdit").onclick=$("cancelarCategoryEdit").onclick=async()=>{fecharCamada("categoryEditModal",false);await abrirCategorias()}; $("fecharDashboard").onclick=$("cancelarDashboard").onclick=()=>fecharCamada("dashboardModal");
  $("novaContaButton").onclick=()=>abrirEdicaoConta(); $("accountForm").onsubmit=salvarConta;
  $("fecharAccountEdit").onclick=$("cancelarAccountEdit").onclick=()=>{fecharCamada("accountEditModal",false);abrirContas()};
  $("copyInviteButton").onclick=()=>copiarConvite(false);
  $("fecharMessage").onclick=$("messageCancel").onclick=()=>resolverMensagem(false); $("messageOk").onclick=()=>resolverMensagem(true);
  window.luviLayerOrder=window.luviLayerOrder||0;
});

function marcarNavMobile(alvo){const mapa={home:"mobileNavHome",dashboard:"mobileNavDashboard",more:"mobileNavMore"};Object.values(mapa).forEach(id=>$(id)?.classList.remove("active"));$(mapa[alvo])?.classList.add("active")}
async function carregarContexto(){const r=await fetch("/api/app/contexto");if(!r.ok)return;const c=await r.json();contas=c.contas;grupos=c.grupos;window.usuarioAtual=c.usuario;$("usuarioNome").textContent=c.usuario.nome;$("usuarioAvatar").textContent=(c.usuario.nome||"U").trim().charAt(0).toUpperCase();if($("mobileGreeting"))$("mobileGreeting").textContent=`Olá, ${(c.usuario.nome||"").trim().split(/\\s+/)[0]||""}!`;const opts=contas.map(x=>`<option value="${x.id}">${escaparHtml(x.nome)}</option>`).join("");$("conta").innerHTML=opts;$("transferOrigem").innerHTML=opts;$("transferDestino").innerHTML=opts}

function abrirContas(){fecharSubtelasPrincipais("accountsModal");toggleMenu(false);renderContas();abrirCamada("accountsModal")}
function renderContas(){
  const proprias=contas.filter(c=>c.propria);
  const acoes=c=>`${botaoIcone("editar",`abrirEdicaoConta(${c.id})`,"Editar conta")}${botaoIcone("excluir",`excluirConta(${c.id})`,"Excluir conta")}<button type="button" class="icon-action share-action" onclick="abrirCompartilhamentoConta(${c.id})" title="Compartilhar conta" aria-label="Compartilhar conta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2"/></svg></button>`;
  const desktop=`<div class="account-table account-desktop"><div class="account-row account-head"><span>Nome</span><span>Tipo</span><span>Compartilhamento</span><span>Ações</span></div>${proprias.map(c=>`<div class="account-row"><span><strong>${escaparHtml(c.nome)}</strong></span><span>${rotuloTipoConta(c.tipo)}</span><span>${c.grupos.length?`${c.grupos.length} grupo(s)`:'Privada'}</span><span>${acoes(c)}</span></div>`).join('')}</div>`;
  const mobile=`<div class="account-mobile">${proprias.map(c=>`<details class="account-mobile-item"><summary><span class="account-mobile-name">${escaparHtml(c.nome)}</span><span class="account-mobile-type">${rotuloTipoConta(c.tipo)}</span><span class="account-mobile-chevron" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></summary><div class="account-mobile-detail"><span>${c.grupos.length?`${c.grupos.length} grupo(s)`:'Privada'}</span><div class="account-mobile-actions">${acoes(c)}</div></div></details>`).join('')}</div>`;
  $("accountsContent").innerHTML=proprias.length?desktop+mobile:'<div class="empty-state">Você ainda não possui contas próprias.</div>';
}
function abrirEdicaoConta(id=null){fecharCamada("accountsModal",false);const c=id?contas.find(x=>x.id===id):null;$("accountId").value=c?.id||"";$("accountName").value=c?.nome||"";$("accountType").value=c?.tipo||"BANCO";$("accountEditTitle").textContent=c?"Editar conta":"Nova conta";$("accountError").textContent="";abrirCamada("accountEditModal");setTimeout(()=>$("accountName").focus(),30)}
async function salvarConta(e){e.preventDefault();const id=$("accountId").value,d={nome:$("accountName").value.trim(),tipo:$("accountType").value};const r=await fetch(id?`/api/app/contas/${id}`:"/api/app/contas",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("accountError").textContent=await erro(r);return}fecharCamada("accountEditModal",false);await carregarContexto();abrirContas();toast(id?"Conta alterada com sucesso.":"Conta criada. Por padrão, ela é privada.")}
async function excluirConta(id){const c=contas.find(x=>x.id===id);if(!await confirmar(`Deseja excluir a conta “${c?.nome||''}”?\n\nA exclusão só será permitida se ela não possuir movimentações.`))return;const r=await fetch(`/api/app/contas/${id}`,{method:"DELETE"});if(!r.ok){mensagem(await erro(r),"Não foi possível excluir");return}if(contaSelecionada===id)selecionarVisaoGeral();await carregarContexto();renderContas();toast("Conta excluída.")}

async function criarGrupo(){
  toggleMenu(false);
  // Diálogo nativo isolado da pilha de modais do LUVI: evita travamentos
  // de foco/camadas e permite Cancelar/Voltar do navegador.
  const resposta=window.prompt("Nome do novo grupo:", "");
  if(resposta===null)return;
  const nome=resposta.trim();
  if(!nome){mensagem("Informe um nome para o grupo.");return}
  try{
    const r=await fetch("/api/app/grupos",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({nome})
    });
    if(!r.ok){mensagem(await erro(r),"Não foi possível criar o grupo");return}
    await carregarContexto();
    renderGrupos();
    toast("Grupo criado.");
  }catch(e){
    console.error("Erro ao criar grupo",e);
    mensagem("Não foi possível criar o grupo. Tente novamente.");
  }
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
function selecionarConta(id,nome){fecharSubtelasPrincipais();contaSelecionada=id;grupoSelecionado=null;$("contextoTitulo").textContent=nome;localStorage.setItem("luvi.ultimaConta",String(id));toggleMenu(false);carregarDadosMes()}
function selecionarGrupo(id,nome){fecharSubtelasPrincipais();grupoSelecionado=id;contaSelecionada=null;$("contextoTitulo").textContent="Grupo: "+nome;toggleMenu(false);carregarDadosMes()}
function toggleMenu(force){const s=$("sidebar"),open=force===undefined?!s.classList.contains("open"):force;s.classList.toggle("open",open);$("overlay").classList.toggle("hidden",!open);if(open)registrarCamada()}
function abrirVisao(){fecharSubtelasPrincipais("viewModal");toggleMenu(false);$("viewContent").innerHTML=`<button class="selection-item" onclick="selecionarVisaoGeral();fecharCamada('viewModal',false)"><strong>Visão geral</strong><span>Todas as contas que você pode visualizar</span></button>`+contas.map(c=>`<button class="selection-item" onclick="selecionarConta(${c.id},'${js(c.nome)}');fecharCamada('viewModal',false)"><strong>${escaparHtml(c.nome)}</strong><span>${c.propria?(c.grupos.length?'Compartilhada':'Privada'):'Compartilhada comigo'}</span></button>`).join("");abrirCamada("viewModal")}
function abrirGrupos(){fecharSubtelasPrincipais("groupsModal");toggleMenu(false);renderGrupos();abrirCamada("groupsModal")}
function renderGrupos(){$("groupsContent").innerHTML=grupos.length?grupos.map(g=>`<button type="button" class="selection-item luvi-mobile-list-item" data-open-group="${g.id}"><span class="luvi-list-main"><strong>${escaparHtml(g.nome)}</strong><small>${g.perfil==='ADMIN'?'Administrador':'Membro'}</small></span><svg class="luvi-list-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>`).join(""):'<div class="empty-state">Você ainda não participa de grupos.</div>'}
async function alterarCompartilhamento(cid,gid,marcar,el){el.disabled=true;const r=await fetch(`/api/app/contas/${cid}/grupos/${gid}`,{method:marcar?"POST":"DELETE"});if(!r.ok){el.checked=!marcar;await mensagem(await erro(r),"Não foi possível alterar o compartilhamento")}else await carregarContexto();el.disabled=false}
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
async function carregarDadosMes(){await Promise.all([carregarLancamentos(),carregarTransferencias(),carregarResumo()]);renderizar()}
function qs(){const m=dataAtual.getMonth()+1,a=dataAtual.getFullYear();return`mes=${m}&ano=${a}${contaSelecionada?`&contaId=${contaSelecionada}`:""}${grupoSelecionado?`&grupoId=${grupoSelecionado}`:""}`}
async function carregarLancamentos(){const m=dataAtual.getMonth()+1,a=dataAtual.getFullYear();$("mesAtual").textContent=`${nomesMeses[m-1]} de ${a}`;const r=await fetch(`/api/lancamentos?${qs()}`);if(!r.ok){mensagem(await erro(r));return}lancamentos=await r.json()}
async function carregarTransferencias(){const r=await fetch(`/api/transferencias?${qs()}`);transferencias=r.ok?await r.json():[]}
async function carregarResumo(){const r=await fetch(`/api/lancamentos/resumo?${qs()}`);if(!r.ok)return;const x=await r.json();$("saldoInicial").textContent=formatarMoeda(+x.saldoInicial);$("totalReceitas").textContent=formatarMoeda(+x.receitas);$("totalDespesas").textContent=formatarMoeda(+x.despesas);$("saldoFinal").textContent=formatarMoeda(+x.saldoFinal);$("movimentacaoPeriodo").textContent=`Movimentação do período: ${formatarMoeda(+x.movimentacao)}`}
function alterarOrdenacao(c){if(ordenacao.campo===c)ordenacao.direcao=ordenacao.direcao==="asc"?"desc":"asc";else{ordenacao.campo=c;ordenacao.direcao="asc"}renderizar()}
function movimentos(){const ls=lancamentos.map(x=>({...x,natureza:"LANCAMENTO"}));const ts=transferencias.map(t=>({id:t.id,data:t.data,dataHoraCadastro:t.dataHoraCadastro,valor:t.valor,descricao:t.descricao||"Transferência",categoria:"TRANSFERENCIA",natureza:"TRANSFERENCIA",origemId:t.origemId,origemNome:t.origemNome,destinoId:t.destinoId,destinoNome:t.destinoNome}));return[...ls,...ts]}
function ordenados(){return movimentos().sort((a,b)=>{let av,bv;if(ordenacao.campo==="valor"){av=+a.valor;bv=+b.valor}else if(ordenacao.campo==="descricao"){av=a.descricao.toLowerCase();bv=b.descricao.toLowerCase()}else if(ordenacao.campo==="categoria"){av=formatarCategoria(a.categoria);bv=formatarCategoria(b.categoria)}else{av=`${a.data}|${a.dataHoraCadastro||""}|${a.id}`;bv=`${b.data}|${b.dataHoraCadastro||""}|${b.id}`}let c=typeof av==="number"?av-bv:av.localeCompare(bv,"pt-BR");return ordenacao.direcao==="asc"?c:-c})}
function renderizar(){const body=$("lancamentosBody");body.innerHTML="";$("semLancamentos").style.display=movimentos().length?"none":"block";ordenados().forEach(l=>{const tr=document.createElement("tr");if(l.natureza==="TRANSFERENCIA"){let sinal="⇄",classe="",rotulo="Transferência";if(contaSelecionada){if(l.origemId===contaSelecionada){sinal="-";classe="valor-despesa";rotulo="Transferência enviada"}else if(l.destinoId===contaSelecionada){sinal="+";classe="valor-receita";rotulo="Transferência recebida"}}tr.innerHTML=`<td>${formatarData(l.data)}</td><td class="valor-lancamento ${classe}">${sinal} ${formatarMoeda(+l.valor)}</td><td>${escaparHtml(l.descricao)}</td><td>${rotulo}</td><td>${escaparHtml(l.origemNome)} → ${escaparHtml(l.destinoNome)}</td><td>${botaoIcone("excluir",`excluirTransferencia(${l.id})`,"Excluir transferência")}</td>`}else{const rec=l.tipo==="RECEITA";tr.innerHTML=`<td>${formatarData(l.data)}</td><td class="valor-lancamento ${rec?"valor-receita":"valor-despesa"}">${rec?"+":"-"} ${formatarMoeda(+l.valor)}</td><td>${escaparHtml(l.descricao)}</td><td>${l.categoria}</td><td>${escaparHtml(l.contaNome)}</td><td>${botaoIcone("editar",`editarLancamento(${l.id})`,"Editar lançamento")}${botaoIcone("excluir",`excluirLancamento(${l.id})`,"Excluir lançamento")}</td>`}body.appendChild(tr)});document.querySelectorAll("th.sortable").forEach(th=>th.querySelector(".sort-indicator").textContent=th.dataset.sort===ordenacao.campo?(ordenacao.direcao==="asc"?"▲":"▼"):"")}
function contaPadrao(){const id=Number(localStorage.getItem("luvi.ultimaConta"));return contas.some(c=>c.id===id)?id:(contaSelecionada&&contas.some(c=>c.id===contaSelecionada)?contaSelecionada:contas[0]?.id)}
async function abrirNovo(){if(!contas.length){mensagem("Crie uma conta financeira primeiro no menu ☰.");return}$("modalTitulo").textContent="Novo lançamento";$("lancamentoId").value="";$("conta").value=contaPadrao();$("tipo").value="DESPESA";await carregarCategorias();$("descricao").value="";$("valor").value="";$("data").value=hojeISO();$("formError").textContent="";abrirCamada("modal")}
async function editarLancamento(id){const l=lancamentos.find(x=>x.id===id);if(!l)return;$("modalTitulo").textContent="Editar lançamento";$("lancamentoId").value=l.id;$("conta").value=l.contaId;$("tipo").value=l.tipo;await carregarCategorias();$("descricao").value=l.descricao;$("categoria").value=l.categoriaId;$("valor").value=l.valor;$("data").value=l.data;$("formError").textContent="";abrirCamada("modal")}
async function salvarLancamento(e){e.preventDefault();const id=$("lancamentoId").value,d={contaId:+$("conta").value,tipo:$("tipo").value,descricao:$("descricao").value,categoriaId:+$("categoria").value,valor:+$("valor").value,data:$("data").value};const r=await fetch(id?`/api/lancamentos/${id}`:"/api/lancamentos",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("formError").textContent=await erro(r);return}localStorage.setItem("luvi.ultimaConta",String(d.contaId));fecharCamada("modal",false);
  const dataSalva=new Date(`${d.data}T12:00:00`);
  if(!Number.isNaN(dataSalva.getTime())&&(dataSalva.getMonth()!==dataAtual.getMonth()||dataSalva.getFullYear()!==dataAtual.getFullYear()))dataAtual=dataSalva;
  await carregarDadosMes();
  if(!id){requestAnimationFrame(()=>document.querySelector(".table-card")?.scrollIntoView({behavior:"smooth",block:"start"}));}}
function abrirTransferencia(){if(contas.length<2){mensagem("Você precisa ter acesso a pelo menos duas contas.");return}const padrao=contaPadrao();if(padrao)$("transferOrigem").value=padrao;$("transferValor").value="";$("transferData").value=hojeISO();$("transferDescricao").value="Transferência";$("transferError").textContent="";abrirCamada("transferModal")}
async function salvarTransferencia(e){e.preventDefault();const d={origemId:+$("transferOrigem").value,destinoId:+$("transferDestino").value,valor:+$("transferValor").value,data:$("transferData").value,descricao:$("transferDescricao").value};const r=await fetch("/api/transferencias",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("transferError").textContent=await erro(r);return}localStorage.setItem("luvi.ultimaConta",String(d.origemId));fecharCamada("transferModal",false);await carregarDadosMes();toast("Transferência realizada.")}
async function excluirLancamento(id){if(!await confirmar("Deseja realmente excluir este lançamento?"))return;const r=await fetch(`/api/lancamentos/${id}`,{method:"DELETE"});if(r.ok){await carregarDadosMes();toast("Lançamento excluído.")}else mensagem(await erro(r))}
async function excluirTransferencia(id){if(!await confirmar("Deseja realmente excluir esta transferência?"))return;const r=await fetch(`/api/transferencias/${id}`,{method:"DELETE"});if(r.ok){await carregarDadosMes();toast("Transferência excluída.")}else mensagem(await erro(r))}

let messageResolver=null;function mensagem(texto,titulo="LUVI Finanças"){return new Promise(resolve=>{$("messageTitle").textContent=titulo;$("messageText").textContent=texto;$("messageCancel").classList.add("hidden");$("messageOk").textContent="OK";messageResolver=resolve;abrirCamada("messageModal")})}function confirmar(texto){return new Promise(resolve=>{$("messageTitle").textContent="LUVI Finanças";$("messageText").textContent=texto;$("messageCancel").classList.remove("hidden");$("messageOk").textContent="Confirmar";messageResolver=resolve;abrirCamada("messageModal")})}function resolverMensagem(v){const r=messageResolver;messageResolver=null;if(r)r(v);fecharCamada("messageModal",false)}
function solicitarTexto(titulo,label,placeholder){return new Promise(resolve=>{const antigo=$("messageText").innerHTML;$("messageTitle").textContent=titulo;$("messageText").innerHTML=`<label class="inline-label">${escaparHtml(label)}</label><input id="genericTextInput" class="generic-input" placeholder="${escaparHtml(placeholder)}">`;$("messageCancel").classList.remove("hidden");$("messageOk").textContent="Continuar";messageResolver=v=>{const valor=v?($("genericTextInput")?.value.trim()||""):null;$("messageText").innerHTML=antigo;resolve(valor)};abrirCamada("messageModal");setTimeout(()=>$("genericTextInput")?.focus(),30)})}
function toast(texto){mensagem(texto)}
function fecharSubtelasPrincipais(excecao=null){["categoriesModal","dashboardModal","accountsModal","groupModal","groupsModal","viewModal","membersModal","shareAccountModal"].forEach(id=>{if(id!==excecao){const el=$(id);if(el&&!el.classList.contains("hidden")){el.classList.add("hidden");delete el.dataset.openOrder;el.style.zIndex=""}}});sincronizarCamadas()}
function abrirCamada(id){const el=$(id);if(!el)return false;const ordem=++window.luviLayerOrder;if(el.classList.contains("hidden"))el.classList.remove("hidden");el.dataset.openOrder=String(ordem);el.style.zIndex=String(100+ordem);sincronizarCamadas();return true}
function fecharCamada(id){const el=$(id);if(!el||el.classList.contains("hidden"))return false;el.classList.add("hidden");delete el.dataset.openOrder;el.style.zIndex="";sincronizarCamadas();return true}
function registrarCamada(){}
function sincronizarCamadas(){const temModal=modais().length>0;document.body.classList.toggle("modal-open",temModal)}
function fecharTopo(){const abertos=modais().sort((a,b)=>(+(b.dataset.openOrder||0))-(+(a.dataset.openOrder||0)));if(abertos.length){const id=abertos[0].id;if(id==="membersModal"){fecharCamada(id);if(grupoGerenciado)abrirGrupo(grupoGerenciado);return true}if(id==="shareAccountModal"){fecharCamada(id);abrirContas();return true}if(id==="accountEditModal"){fecharCamada(id,false);abrirContas();return true}if(id==="categoryEditModal"){fecharCamada(id,false);abrirCategorias();return true}if(id==="inviteGeneratedModal"){fecharConviteGerado();return true}return fecharCamada(id);}if($("usuarioDropdown")&&!$("usuarioDropdown").classList.contains("hidden")){ $("usuarioDropdown").classList.add("hidden");$("usuarioMenuButton").setAttribute("aria-expanded","false");return true}if($("sidebar").classList.contains("open")){toggleMenu(false);return true}return false}
function rotuloTipoConta(t){return({BANCO:"Banco",CARTEIRA:"Carteira",OUTROS:"Outros"})[t]||t}
function formatarMoeda(v){return v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}function formatarData(d){const[a,m,x]=d.split("-");return`${x}/${m}/${a}`}function formatarCategoria(c){return({SALARIO:"Salário",RENDA_EXTRA:"Renda extra",ALIMENTACAO:"Alimentação",MORADIA:"Moradia",TRANSPORTE:"Transporte",SAUDE:"Saúde",EDUCACAO:"Educação",LAZER:"Lazer",CONTAS:"Contas",OUTROS:"Outros",TRANSFERENCIA:"Transferência"})[c]||c}function hojeISO(){const h=new Date(),d=new Date(h.getTime()-h.getTimezoneOffset()*60000);return d.toISOString().slice(0,10)}function escaparHtml(t){const d=document.createElement("div");d.textContent=t||"";return d.innerHTML}function js(t){return String(t||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'")}async function erro(r){try{const x=await r.json();return x.message||x.detail||"Operação não permitida."}catch(_){return"Não foi possível concluir a operação no LUVI Finanças."}}


async function abrirCategorias(){fecharSubtelasPrincipais("categoriesModal");toggleMenu(false);$("categoryScope").innerHTML=`<option value="">Pessoal</option>`+grupos.map(g=>`<option value="${g.id}">Grupo: ${escaparHtml(g.nome)}</option>`).join("");if(grupos.length){$("categoryScope").value=grupoSelecionado&&grupos.some(g=>String(g.id)===String(grupoSelecionado))?String(grupoSelecionado):String(grupos[0].id)}else{$("categoryScope").value=""}await carregarCategoriasGerencia();abrirCamada("categoriesModal")}
async function carregarCategoriasGerencia(){const gid=$("categoryScope").value;const r=await fetch(`/api/categorias${gid?`?grupoId=${gid}`:""}`);if(!r.ok){mensagem(await erro(r));return}categoriasGerencia=await r.json();renderCategoriasGerencia()}
function renderCategoriasGerencia(){$("categoriesContent").innerHTML=categoriasGerencia.length?`<div class="category-table"><div class="category-row category-head"><span>Nome</span><span>Tipo</span><span>Ativa</span><span>Ações</span></div>${categoriasGerencia.map(c=>`<details class="category-mobile-item"><summary><span class="category-mobile-name"><strong>${escaparHtml(c.nome)}</strong><small>${c.tipo==="RECEITA"?"Receita":"Despesa"}</small></span><span class="category-mobile-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span></summary><div class="category-mobile-detail"><label class="switch" title="${c.ativa?'Categoria ativa':'Categoria inativa'}"><input type="checkbox" ${c.ativa?'checked':''} onchange="alternarCategoria(${c.id},this)"><span class="switch-slider"></span><span class="sr-only">${c.ativa?'Ativa':'Inativa'}</span></label><span class="category-actions">${botaoIcone("editar",`abrirEdicaoCategoria(${c.id})`,"Editar categoria")}${botaoIcone("excluir",`excluirCategoria(${c.id})`,"Excluir categoria")}</span></div></details><div class="category-row category-desktop-row"><span class="category-name"><strong>${escaparHtml(c.nome)}</strong></span><span class="category-type">${c.tipo==="RECEITA"?"Receita":"Despesa"}</span><span class="category-active"><label class="switch" title="${c.ativa?'Categoria ativa':'Categoria inativa'}"><input type="checkbox" ${c.ativa?'checked':''} onchange="alternarCategoria(${c.id},this)"><span class="switch-slider"></span><span class="sr-only">${c.ativa?'Ativa':'Inativa'}</span></label></span><span class="category-actions">${botaoIcone("editar",`abrirEdicaoCategoria(${c.id})`,"Editar categoria")}${botaoIcone("excluir",`excluirCategoria(${c.id})`,"Excluir categoria")}</span></div>`).join('')}</div>`:'<div class="empty-state">Nenhuma categoria cadastrada.</div>'}
function abrirEdicaoCategoria(id=null){fecharCamada("categoriesModal",false);const c=id?categoriasGerencia.find(x=>x.id===id):null;$("categoryId").value=c?.id||"";$("categoryName").value=c?.nome||"";$("categoryType").value=c?.tipo||"DESPESA";$("categoryEditTitle").textContent=c?"Editar categoria":"Nova categoria";$("categoryError").textContent="";abrirCamada("categoryEditModal")}
async function salvarCategoria(e){e.preventDefault();const id=$("categoryId").value,gid=$("categoryScope").value,d={nome:$("categoryName").value.trim(),tipo:$("categoryType").value,grupoId:gid?+gid:null};const r=await fetch(id?`/api/categorias/${id}`:"/api/categorias",{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){$("categoryError").textContent=await erro(r);return}fecharCamada("categoryEditModal",false);await carregarCategoriasGerencia();await carregarCategorias();await abrirCategorias();toast(id?"Categoria alterada.":"Categoria criada.")}
async function alternarCategoria(id,el=null){if(el)el.disabled=true;const r=await fetch(`/api/categorias/${id}/ativa`,{method:"PATCH"});if(!r.ok){if(el){el.checked=!el.checked;el.disabled=false}mensagem(await erro(r));return}await carregarCategoriasGerencia();await carregarCategorias()}
async function excluirCategoria(id){if(!await confirmar("Deseja excluir esta categoria? Se ela já tiver lançamentos, o LUVI pedirá que você a desative."))return;const r=await fetch(`/api/categorias/${id}`,{method:"DELETE"});if(!r.ok){mensagem(await erro(r),"Não foi possível excluir");return}await carregarCategoriasGerencia();await carregarCategorias();toast("Categoria excluída.")}
async function abrirDashboard(){fecharSubtelasPrincipais("dashboardModal");toggleMenu(false);const r=await fetch(`/api/dashboard?${qs()}`);if(!r.ok){mensagem(await erro(r));return}const d=await r.json();$("dashboardContext").textContent=`${nomesMeses[dataAtual.getMonth()]} de ${dataAtual.getFullYear()} • ${$("contextoTitulo").textContent}`;$("dashReceitas").textContent=formatarMoeda(+d.receitas);$("dashDespesas").textContent=formatarMoeda(+d.despesas);$("dashResultado").textContent=formatarMoeda(+d.resultado);abrirCamada("dashboardModal");setTimeout(()=>renderGraficos(d),50)}
function renderGraficos(d){graficos.forEach(g=>g.destroy());graficos=[];if(typeof Chart==="undefined"){mensagem("Não foi possível carregar os gráficos. Verifique a conexão com a internet.");return}const moeda=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);graficos.push(new Chart($("chartReceitasDespesas"),{type:"bar",data:{labels:["Receitas","Despesas"],datasets:[{data:[+d.receitas,+d.despesas]}]},options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>moeda(c.raw)}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>moeda(v)}}}}}));const cats=Array.isArray(d.despesasPorCategoria)?d.despesasPorCategoria:[];const catCanvas=$("chartCategorias");if(cats.length){catCanvas.style.display="block";graficos.push(new Chart(catCanvas,{type:"doughnut",data:{labels:cats.map(x=>x.categoria),datasets:[{data:cats.map(x=>Number(x.valor)||0)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"},tooltip:{callbacks:{label:c=>`${c.label}: ${moeda(c.raw)}`}}}}}))}else{catCanvas.style.display="none";const box=catCanvas.parentElement;let empty=box.querySelector(".chart-empty");if(!empty){empty=document.createElement("div");empty.className="empty-state chart-empty";box.appendChild(empty)}empty.textContent="Nenhuma despesa por categoria neste período."}graficos.push(new Chart($("chartEvolucao"),{type:"line",data:{labels:d.evolucao.map(x=>x.mes),datasets:[{label:"Receitas",data:d.evolucao.map(x=>+x.receitas)},{label:"Despesas",data:d.evolucao.map(x=>+x.despesas)}]},options:{plugins:{tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${moeda(c.raw)}`}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>moeda(v)}}}}}))}
