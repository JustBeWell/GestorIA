-- ============================================================================
-- V014 - Uso IA persistente
-- ============================================================================
-- Separa la analitica de consumo IA de las conversaciones. Las conversaciones
-- pueden borrarse por privacidad/limpieza sin eliminar el historico de uso que
-- necesita el gerente.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS gia_uso_ia (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_usuario      VARCHAR(255) NOT NULL DEFAULT 'desconocido',
    conversacion_id     UUID REFERENCES gia_conversaciones(id) ON DELETE SET NULL,
    mensaje_id          UUID REFERENCES gia_mensajes(id) ON DELETE SET NULL,
    mode                VARCHAR(20) NOT NULL DEFAULT 'respuesta',
    requested_mode      VARCHAR(20) NOT NULL DEFAULT 'respuesta',
    model               VARCHAR(120),
    prompt_tokens       INTEGER NOT NULL DEFAULT 0,
    completion_tokens   INTEGER NOT NULL DEFAULT 0,
    total_tokens        INTEGER NOT NULL DEFAULT 0,
    image_generations   INTEGER NOT NULL DEFAULT 0,
    estimated_cost_eur  NUMERIC(12, 6) NOT NULL DEFAULT 0,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gia_uso_ia_mensaje
    ON gia_uso_ia (mensaje_id)
    WHERE mensaje_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gia_uso_ia_created_at
    ON gia_uso_ia (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gia_uso_ia_user_created_at
    ON gia_uso_ia (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gia_uso_ia_mode_created_at
    ON gia_uso_ia (mode, created_at DESC);

INSERT INTO gia_uso_ia (
    user_id,
    nombre_usuario,
    conversacion_id,
    mensaje_id,
    mode,
    requested_mode,
    model,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    image_generations,
    estimated_cost_eur,
    metadata,
    created_at
)
SELECT
    c.user_id,
    COALESCE(u.usuario::text, 'desconocido'),
    c.id,
    m.id,
    COALESCE(NULLIF(m.metadata->>'mode', ''), 'respuesta'),
    COALESCE(NULLIF(m.metadata->>'requested_mode', ''), NULLIF(m.metadata->>'mode', ''), 'respuesta'),
    NULLIF(m.metadata->'usage'->>'model', ''),
    COALESCE((m.metadata->'usage'->>'prompt_tokens')::int, 0),
    COALESCE((m.metadata->'usage'->>'completion_tokens')::int, 0),
    COALESCE((m.metadata->'usage'->>'total_tokens')::int, 0),
    COALESCE((m.metadata->'usage'->>'image_generations')::int, 0),
    COALESCE((m.metadata->'usage'->>'estimated_cost_eur')::numeric, 0),
    jsonb_build_object('source', 'backfill_from_gia_mensajes'),
    m.created_at
FROM gia_mensajes m
JOIN gia_conversaciones c ON c.id = m.conversacion_id
LEFT JOIN usuarios u ON u.id = c.user_id
WHERE m.role = 'assistant'
  AND m.metadata ? 'usage'
  AND NOT EXISTS (
      SELECT 1
      FROM gia_uso_ia usage
      WHERE usage.mensaje_id = m.id
  );
