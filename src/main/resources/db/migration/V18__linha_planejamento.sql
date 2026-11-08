ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS linha_planejamento VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_compromissos_linha_planejamento ON compromissos_financeiros(linha_planejamento);
