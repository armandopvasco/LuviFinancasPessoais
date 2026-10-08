// Falhas de registro não interferem nas funcionalidades financeiras.
if('serviceWorker' in navigator && window.isSecureContext){
 window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(e=>console.warn('LUVI PWA:',e)));
}
