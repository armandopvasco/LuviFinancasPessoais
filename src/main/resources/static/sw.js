/* LUVI PWA v6.2.3: instalação e atualização sem cache de dados financeiros. */
const CACHE='luvi-static-v6.2.3';
const ASSETS=['/css/style.css?v=6.2.3','/css/login.css?v=6.2.3','/js/script.js?v=6.0.8','/img/luvi-logo-novo.png','/img/luvi-simbolo-novo.png','/img/luvi-i-transparente.png','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('luvi-static-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
/* Sem interceptação: todas as solicitações seguem para a rede, inclusive login, logout, OAuth e APIs. */
