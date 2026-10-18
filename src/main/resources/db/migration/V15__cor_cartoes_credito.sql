ALTER TABLE cartoes_credito ADD COLUMN IF NOT EXISTS cor VARCHAR(7);
UPDATE cartoes_credito SET cor = CASE
 WHEN LOWER(nome) LIKE '%inter%' THEN '#F47721'
 WHEN LOWER(nome) LIKE '%ifood%' THEN '#D92332'
 WHEN LOWER(nome) LIKE '%nubank%' THEN '#8036A6'
 WHEN LOWER(nome) LIKE '%bradesco%' THEN '#C92134'
 WHEN LOWER(nome) LIKE '%itaú%' OR LOWER(nome) LIKE '%itau%' THEN '#F28C28'
 WHEN LOWER(nome) LIKE '%santander%' THEN '#E53945'
 WHEN LOWER(nome) LIKE '%bb%' OR LOWER(nome) LIKE '%brasil%' THEN '#E4BC00'
 ELSE '#64748B' END WHERE cor IS NULL;
