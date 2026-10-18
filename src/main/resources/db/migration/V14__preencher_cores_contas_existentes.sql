-- Aplica uma única vez as mesmas cores de referência do seletor visual.
-- Cores já personalizadas são preservadas. Não há recálculo ao renomear contas.
UPDATE contas_financeiras
SET cor = CASE
    WHEN tipo = 'CARTEIRA' OR nome ~* 'carteira|dinheiro em esp[eé]cie|esp[eé]cie' THEN '#795239'
    WHEN nome ~* 'ifood' THEN '#d92332'
    WHEN nome ~* 'inter' THEN '#f47721'
    WHEN nome ~* 'nubank|nu pagamento' THEN '#7831a5'
    WHEN nome ~* 'bradesco' THEN '#bd172b'
    WHEN nome ~* 'ita[uú]' THEN '#ef6b16'
    WHEN nome ~* 'santander' THEN '#d71920'
    WHEN nome ~* 'caixa' THEN '#1767ae'
    WHEN nome ~* 'banco do brasil|(^|[^[:alnum:]])bb([^[:alnum:]]|$)' THEN '#e4bc00'
    WHEN nome ~* 'picpay' THEN '#188c57'
    WHEN nome ~* 'mercado pago' THEN '#1889d4'
    WHEN nome ~* 'c6' THEN '#303944'
    WHEN nome ~* 'neon' THEN '#087e92'
    WHEN nome ~* 'pagbank|pagseguro' THEN '#2373bf'
    WHEN nome ~* 'sicredi' THEN '#237b39'
    WHEN nome ~* 'sicoob' THEN '#155c55'
    ELSE '#285681'
END
WHERE cor IS NULL OR btrim(cor) = '';
