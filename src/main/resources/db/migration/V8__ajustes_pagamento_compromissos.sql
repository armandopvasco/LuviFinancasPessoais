ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS data_pagamento DATE;
ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS valor_efetivo NUMERIC(12,2);
ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS desconto NUMERIC(12,2);
ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS acrescimo NUMERIC(12,2);
ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS natureza_acrescimo VARCHAR(20);
ALTER TABLE compromissos_financeiros ADD COLUMN IF NOT EXISTS observacao_pagamento VARCHAR(250);
