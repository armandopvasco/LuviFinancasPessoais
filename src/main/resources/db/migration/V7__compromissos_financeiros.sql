CREATE TABLE IF NOT EXISTS compromissos_financeiros (
 id BIGSERIAL PRIMARY KEY,
 conta_id BIGINT NOT NULL REFERENCES contas_financeiras(id),
 categoria_id BIGINT NOT NULL REFERENCES categorias(id),
 tipo VARCHAR(20) NOT NULL,
 descricao VARCHAR(200) NOT NULL,
 valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
 vencimento DATE NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
 lancamento_id BIGINT UNIQUE REFERENCES lancamentos(id),
 CONSTRAINT ck_compromisso_status CHECK(status IN ('PENDENTE','PAGO'))
);
CREATE INDEX IF NOT EXISTS idx_compromissos_conta_vencimento ON compromissos_financeiros(conta_id,vencimento);
