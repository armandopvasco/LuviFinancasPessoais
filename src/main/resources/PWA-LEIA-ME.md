LUVI Finanças PWA v6.1.1 (base v6.0.8)
- Corrige ação de Sair: POST nativo com token CSRF, sem depender de listeners JS.
- Ajusta empilhamento do menu do usuário no celular.
- Service worker sem interceptar requests, sem cache de HTML, APIs ou dados financeiros.
- ATENÇÃO: acessar via IP HTTP de outro aparelho não atende ao requisito de contexto seguro para instalação PWA.
- Para testar instalação: usar HTTPS válido em financas.luvi.net.br (ou túnel HTTPS de teste).
- Testar Sair, login tradicional, login Google e fluxos de grupos antes de publicar.
