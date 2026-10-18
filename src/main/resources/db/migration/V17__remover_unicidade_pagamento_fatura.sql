DO $$
DECLARE
r RECORD;
BEGIN
FOR r IN
SELECT DISTINCT con.conname
FROM pg_constraint con
         JOIN pg_class tab
              ON tab.oid = con.conrelid
         JOIN pg_namespace ns
              ON ns.oid = tab.relnamespace
WHERE ns.nspname = current_schema()
  AND tab.relname = 'pagamentos_fatura'
  AND con.contype = 'u'
  AND (
          SELECT array_agg(att.attname::text ORDER BY k.ord)
          FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
                   JOIN pg_attribute att
                        ON att.attrelid = con.conrelid
                            AND att.attnum = k.attnum
      ) = ARRAY['cartao_id', 'competencia']::text[]
    LOOP
    EXECUTE format(
    'ALTER TABLE %I.%I DROP CONSTRAINT %I',
    current_schema(),
    'pagamentos_fatura',
    r.conname
    );
END LOOP;
END $$;