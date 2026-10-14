(() => {
  'use strict';
  const key='luvi.passkey.device.v1', $=id=>document.getElementById(id);
  let pending=null, busy=false, supported=false;
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  const write=value=>{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);};
  function mobile(){return matchMedia('(max-width: 1024px)').matches && (navigator.userAgentData?.mobile===true || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));}
  const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'=')),c=>c.charCodeAt(0));
  const encode=value=>btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function serialize(credential){
    const response=credential.response, out={id:credential.id,rawId:encode(credential.rawId),type:credential.type,
      authenticatorAttachment:credential.authenticatorAttachment,clientExtensionResults:credential.getClientExtensionResults(),response:{clientDataJSON:encode(response.clientDataJSON)}};
    for(const field of ['attestationObject','authenticatorData','signature'])if(response[field])out.response[field]=encode(response[field]);
    if('userHandle' in response)out.response.userHandle=response.userHandle?encode(response.userHandle):null;
    if(response.getTransports)out.response.transports=response.getTransports();
    return out;
  }
  async function request(url,method='GET',data){
    const headers={'Content-Type':'application/json'};
    if(method!=='GET'){
      const token=document.querySelector('meta[name="_csrf"]')?.content, name=document.querySelector('meta[name="_csrf_header"]')?.content;
      if(!token||!name)throw new Error('Atualize a página para renovar a sessão.');headers[name]=token;
    }
    const response=await fetch(url,{method,headers,credentials:'same-origin',body:data===undefined?undefined:JSON.stringify(data)});
    if(!response.ok||response.redirected)throw new Error('Não foi possível confirmar o acesso. Entre normalmente e tente novamente.');
    const text=await response.text();return text?JSON.parse(text):null;
  }
  function errorText(error){return ['NotAllowedError','AbortError'].includes(error.name)?'Confirmação cancelada ou tempo esgotado. Você pode entrar por e-mail ou Google.':error.name==='InvalidStateError'?'Já existe uma chave neste aparelho. Use a chave cadastrada ou remova-a no gerenciador do celular antes de cadastrar novamente.':error.message||'Este navegador não permitiu usar a chave. Entre normalmente.';}
  async function capability(){
    if(!mobile()||!window.isSecureContext||!window.PublicKeyCredential||!navigator.credentials)return false;
    const server=await request('/passkeys/support');
    return server.enabled&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }
  function cancel(){if(pending)pending.abort();pending=null;}
  async function login(){
    if(busy||!supported)return;
    const device=read();if(!device?.credentialId)return;
    busy=true;pending=new AbortController();const signal=pending.signal;
    $('passkeyLoginButton').disabled=true;$('passkeyLoginMessage').textContent='Confirme sua identidade no celular.';
    try{
      const options=await request('/webauthn/authenticate/options','POST');
      if(signal.aborted)return;
      options.challenge=decode(options.challenge);
      options.allowCredentials=[{type:'public-key',id:decode(device.credentialId),transports:['internal']}];
      options.userVerification='required';
      const credential=await navigator.credentials.get({publicKey:options,signal});
      if(signal.aborted||!credential)return;
      await request('/login/webauthn','POST',serialize(credential));
      if(!signal.aborted)location.assign('/');
    }catch(error){$('passkeyLoginMessage').textContent=errorText(error);}
    finally{busy=false;pending=null;$('passkeyLoginButton').disabled=false;}
  }
  async function settings(){
    const section=$('passkeySettings');if(!section)return;
    $('passkeyEnabled').disabled=true;
    try{
      supported=await capability();section.classList.toggle('hidden',!supported);if(!supported)return;
      const profile=await request('/passkeys/profile'), device=read();
      const ours=device?.username===profile.username&&profile.credentials.includes(device.credentialId);
      $('passkeyEnabled').checked=Boolean(ours);$('passkeyEnabled').disabled=false;
      $('passkeySettingsMessage').textContent=ours?'Ativo neste navegador. E-mail e Google continuam disponíveis.':'';
    }catch(error){section.classList.remove('hidden');$('passkeySettingsMessage').textContent=errorText(error);}
  }
  async function toggle(){
    const input=$('passkeyEnabled'), enabling=input.checked;input.disabled=true;
    try{
      const profile=await request('/passkeys/profile'), device=read();
      if(!enabling){
        if(device?.username===profile.username){await request(`/passkeys/credential?id=${encodeURIComponent(device.credentialId)}`,'DELETE');write(null);}
        $('passkeySettingsMessage').textContent='Desativado neste navegador.';return;
      }
      const options=await request('/webauthn/register/options','POST');
      options.challenge=decode(options.challenge);options.user.id=decode(options.user.id);
      options.excludeCredentials=(options.excludeCredentials||[]).map(c=>({...c,id:decode(c.id)}));
      const credential=await navigator.credentials.create({publicKey:options});
      if(!credential)throw new Error('Cadastro cancelado.');
      const result=await request('/webauthn/register','POST',{publicKey:{credential:serialize(credential),label:'LUVI · celular'}});
      if(!result?.success)throw new Error('A chave não foi cadastrada.');
      try{write({credentialId:credential.id,username:profile.username});}
      catch(error){await request(`/passkeys/credential?id=${encodeURIComponent(credential.id)}`,'DELETE');throw new Error('Este navegador não permitiu salvar a preferência. A chave foi removida.');}
      $('passkeySettingsMessage').textContent='Ativado. No próximo login, confirme no celular para entrar.';
    }catch(error){input.checked=!enabling;$('passkeySettingsMessage').textContent=errorText(error);}
    finally{input.disabled=false;}
  }
  window.luviPasskeySettings=settings;
  $('passkeyEnabled')?.addEventListener('change',toggle);
  if($('passkeyLogin')){
    $('passkeyLoginButton').addEventListener('click',login);
    $('passkeyCancelButton').addEventListener('click',()=>{cancel();$('passkeyLoginMessage').textContent='Entre com seu e-mail ou Google.';$('username').focus();});
    document.querySelector('form[action="/login"]')?.addEventListener('submit',cancel);
    document.querySelector('.google-button')?.addEventListener('click',cancel);
    window.addEventListener('pagehide',cancel);
    (async()=>{
      try{supported=await capability();if(!supported||!read()?.credentialId)return;
        $('passkeyLogin').classList.remove('hidden');
        const params=new URLSearchParams(location.search);
        if(!params.has('logout')&&!params.has('error')&&!params.has('googleError'))await login();
      }catch(error){console.info('Entrada tradicional disponível.',error);}
    })();
  }
})();
