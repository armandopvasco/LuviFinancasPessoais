ALTER TABLE usuarios ALTER COLUMN senha DROP NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS uk_usuario_google_subject ON usuarios (google_subject) WHERE google_subject IS NOT NULL;
UPDATE usuarios SET auth_provider='LOCAL' WHERE auth_provider IS NULL OR BTRIM(auth_provider)='';