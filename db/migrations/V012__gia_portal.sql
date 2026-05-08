-- ============================================================================
-- V012 — GIA portal IA
-- ============================================================================
-- Conversaciones, mensajes y archivos del portal GIA.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS gia_conversaciones (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo      VARCHAR(180) NOT NULL DEFAULT 'Nueva conversación',
    archivada   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gia_mensajes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id  UUID NOT NULL REFERENCES gia_conversaciones(id) ON DELETE CASCADE,
    role             VARCHAR(20) NOT NULL,
    content          TEXT NOT NULL,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_gia_mensaje_role CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE TABLE IF NOT EXISTS gia_archivos (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id  UUID NOT NULL REFERENCES gia_conversaciones(id) ON DELETE CASCADE,
    mensaje_id       UUID REFERENCES gia_mensajes(id) ON DELETE SET NULL,
    created_by       UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_original  VARCHAR(255) NOT NULL,
    nombre_guardado  VARCHAR(255) NOT NULL,
    mime_type        VARCHAR(120) NOT NULL,
    tamano_bytes     BIGINT NOT NULL DEFAULT 0,
    ruta_archivo     TEXT NOT NULL,
    tipo             VARCHAR(20) NOT NULL DEFAULT 'upload',
    extracted_text   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_gia_archivo_tipo CHECK (tipo IN ('upload', 'pdf', 'image', 'text'))
);

CREATE INDEX IF NOT EXISTS idx_gia_conversaciones_user
    ON gia_conversaciones (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_gia_mensajes_conversacion
    ON gia_mensajes (conversacion_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_gia_archivos_conversacion
    ON gia_archivos (conversacion_id, created_at DESC);
