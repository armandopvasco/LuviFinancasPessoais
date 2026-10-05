# Luvi Finanças - versão multiusuário

Esta versão introduz usuários persistidos no PostgreSQL, cadastro público, contas financeiras, grupos e convites.

## Migração da versão atual
Na primeira inicialização contra o banco existente, mantenha LUVI_APP_USERNAME e LUVI_APP_PASSWORD no ambiente. Se existirem lançamentos antigos sem conta, o sistema cria automaticamente:
- usuário legado com o login atual;
- grupo `Família`;
- conta `Conta principal`;
- vínculo dos lançamentos antigos à `Conta principal`.

Depois da migração, o login passa a ser carregado da tabela `usuarios`.

## Teste local
Use o mesmo banco de desenvolvimento/uma cópia do banco antes da produção.

mvn -s .\\settings-public.xml clean package

## Fluxos para testar
1. Login legado e lançamentos antigos.
2. Cadastro público por e-mail.
3. Criação de conta financeira no menu lateral.
4. Novo lançamento escolhendo a conta.
5. Visão geral e filtro por conta.
6. Criação de grupo e geração de convite.
7. Cadastro de um segundo usuário e aceitação do convite.
8. Logout e novo login.

## Observação
Esta entrega cria a fundação multiusuário e familiar. Transferências entre contas, dependentes e tela completa de administração/compartilhamento de contas devem ser validados/implementados como evolução antes de serem considerados finalizados para produção.
