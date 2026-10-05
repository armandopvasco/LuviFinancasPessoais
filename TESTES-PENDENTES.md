# Luvi Finanças - roteiro de testes

1. Menu lateral: abrir com ☰ e fechar clicando novamente em ☰, sem selecionar opção.
2. Contas: criar uma conta e confirmar que nasce privada.
3. Gerenciar contas: marcar/desmarcar o grupo Família e confirmar compartilhamento.
4. Grupo: abrir ⋯ ao lado do grupo e conferir membros e contas compartilhadas.
5. Convite sem login: abrir link em janela anônima, fazer login/cadastro e confirmar retorno automático ao convite.
6. Convite por código: Menu > Entrar com convite, colar o código ou o link completo.
7. Segundo usuário: depois de aceitar Família, confirmar que enxerga apenas contas compartilhadas; contas privadas não podem aparecer nem ser acessadas por URL/API.
8. Transferência: em Visão geral deve aparecer ⇄ e não alterar Receita/Despesa; numa conta de origem deve aparecer como saída/despesa e numa conta de destino como entrada/receita, inclusive nos cards do mês.
9. Grupo: transferência entre duas contas do mesmo grupo não deve alterar Receita/Despesa agregadas nem o saldo agregado.
10. Dependentes: criar dependente como ADMIN e criar conta vinculada; confirmar compartilhamento automático com o grupo do dependente.
