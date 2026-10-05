BEGIN;

-- 1. Transferir a propriedade da Conta principal para Armando
UPDATE contas_financeiras
SET proprietario_id = 2
WHERE id = 1
  AND proprietario_id = 1;


-- 2. Transferir a criação do grupo Família para Armando
UPDATE grupos
SET criado_por_id = 2
WHERE criado_por_id = 1;


-- 3. Remover o usuário legado "familia" como membro dos grupos
DELETE FROM grupo_membros
WHERE usuario_id = 1;


-- 4. Garantir que Armando seja ADMIN do grupo Família
INSERT INTO grupo_membros (
    grupo_id,
    usuario_id,
    perfil
)
SELECT
    g.id,
    2,
    'ADMIN'
FROM grupos g
WHERE g.nome = 'Família'
  AND g.criado_por_id = 2
  AND NOT EXISTS (
      SELECT 1
      FROM grupo_membros gm
      WHERE gm.grupo_id = g.id
        AND gm.usuario_id = 2
  );


-- 5. Associar os lançamentos antigos à Conta principal
-- e registrar Armando como responsável pela migração
UPDATE lancamentos
SET
    conta_id = 1,
    usuario_criacao_id = 2
WHERE conta_id IS NULL;


-- 6. Desativar o usuário legado
UPDATE usuarios
SET ativo = FALSE
WHERE id = 1
  AND login = 'familia';