-- Tabla para invalidar tokens JWT antes de su expiración natural
CREATE TABLE IF NOT EXISTS token_blacklist (
    token_hash  VARCHAR(64)  PRIMARY KEY,
    user_id     UUID         NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_blacklist_usuario FOREIGN KEY (user_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at);

COMMENT ON TABLE  token_blacklist IS 'Hashes SHA-256 de tokens JWT revocados antes de su expiración.';
COMMENT ON COLUMN token_blacklist.token_hash IS 'SHA-256 del token raw, para no almacenar el token completo.';
COMMENT ON COLUMN token_blacklist.expires_at IS 'Expiración original del token. Permite purgar registros caducados.';
