-- Permite vários pagamentos para a mesma competência, inclusive pagamentos a maior.
ALTER TABLE pagamentos_fatura DROP CONSTRAINT IF EXISTS pagamentos_fatura_cartao_id_competencia_key;
-- Parcelas marcadas como pagas pelo processo antigo de fatura voltam a ser previsões.
-- O pagamento bancário continua preservado em pagamentos_fatura/lancamentos.
UPDATE compromissos_financeiros cf
SET status = 'PENDENTE', data_pagamento = NULL, valor_efetivo = NULL
FROM parcelas_cartao pc
JOIN compras_cartao cc ON cc.id = pc.compra_id
JOIN pagamentos_fatura pf ON pf.cartao_id = cc.cartao_id
WHERE pc.compromisso_id = cf.id
  AND date_trunc('month', cf.vencimento)::date = pf.competencia
  AND cf.status = 'PAGO';
