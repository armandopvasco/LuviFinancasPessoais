/* LUVI PWA v6.1.1: instalação e atualização sem cache de dados financeiros. */
const CACHE='luvi-static-v6.1.1';
const ASSETS=['/css/style.css?v=6.0.8','/css/login.css','/js/script.js?v=6.0.8','/img/luvi-mark.svg','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('luvi-static-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
/* Sem interceptação: todas as solicitações seguem para a rede, inclusive login, logout, OAuth e APIs. */
