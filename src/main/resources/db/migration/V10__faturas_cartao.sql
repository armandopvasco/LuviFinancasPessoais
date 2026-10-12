ALTER TABLE cartoes_credito ALTER COLUMN conta_pagamento_id DROP NOT NULL;
ALTER TABLE cartoes_credito ADD COLUMN proprietario_id BIGINT REFERENCES usuarios(id);
UPDATE cartoes_credito c SET proprietario_id=cf.proprietario_id FROM contas_financeiras cf WHERE c.conta_pagamento_id=cf.id AND c.proprietario_id IS NULL;
CREATE TABLE IF NOT EXISTS pagamentos_fatura (
 id BIGSERIAL PRIMARY KEY,cartao_id BIGINT NOT NULL REFERENCES cartoes_credito(id),
 competencia DATE NOT NULL,conta_id BIGINT NOT NULL REFERENCES contas_financeiras(id),
 data_pagamento DATE NOT NULL,valor NUMERIC(12,2) NOT NULL CHECK(valor>0),
 lancamento_id BIGINT NOT NULL UNIQUE REFERENCES lancamentos(id),
 UNIQUE(cartao_id,competencia)
);
CREATE INDEX IF NOT EXISTS idx_pagamentos_fatura_cartao ON pagamentos_fatura(cartao_id,competencia);
