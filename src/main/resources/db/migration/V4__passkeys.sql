-- Spring Security 6.5 WebAuthn JDBC persistence. PostgreSQL adaptation of official schemas.
CREATE TABLE IF NOT EXISTS user_entities (
 id varchar(1000) NOT NULL PRIMARY KEY,
 name varchar(100) NOT NULL,
 display_name varchar(200)
);
CREATE TABLE IF NOT EXISTS user_credentials (
 credential_id varchar(1000) NOT NULL PRIMARY KEY,
 user_entity_user_id varchar(1000) NOT NULL,
 public_key bytea NOT NULL,
 signature_count bigint,
 uv_initialized boolean,
 backup_eligible boolean NOT NULL,
 authenticator_transports varchar(1000),
 public_key_credential_type varchar(100),
 backup_state boolean NOT NULL,
 attestation_object bytea,
 attestation_client_data_json bytea,
 created timestamp,
 last_used timestamp,
 label varchar(1000) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_credentials_user ON user_credentials(user_entity_user_id);
