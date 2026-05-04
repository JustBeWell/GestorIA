-- ============================================================================
-- 2FA: columna mfa_habilitado en usuarios + tabla otp_codes
-- ============================================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS mfa_habilitado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    code_hash   VARCHAR(64) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user    ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);
