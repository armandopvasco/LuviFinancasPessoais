ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS serie_recorrencia VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_compromissos_serie_recorrencia ON compromissos_financeiros(serie_recorrencia);
