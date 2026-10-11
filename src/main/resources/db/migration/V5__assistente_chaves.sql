CREATE TABLE IF NOT EXISTS assistente_chaves (usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE, chave_criptografada VARCHAR(2048) NOT NULL);
