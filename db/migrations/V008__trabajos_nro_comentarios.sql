-- ============================================================================
-- V008 — Trabajos: nro_trabajo secuencial + tabla comentarios_trabajo
-- ============================================================================
-- Añade:
--   · nro_trabajo       — número secuencial (genera la referencia T-XXXX en la app)
--   · comentarios_trabajo — tabla de comentarios internos por trabajo
-- ============================================================================

-- Secuencia para número de trabajo (arranca en 2000 para diferenciarse de clientes)
CREATE SEQUENCE IF NOT EXISTS trabajos_nro_seq
    START WITH 2000
    INCREMENT BY 1
    NO CYCLE;

-- Añadir columna nro_trabajo a la tabla trabajos (idempotente)
ALTER TABLE trabajos
    ADD COLUMN IF NOT EXISTS nro_trabajo INTEGER UNIQUE DEFAULT nextval('trabajos_nro_seq');

COMMENT ON COLUMN trabajos.nro_trabajo IS 'Número secuencial de trabajo; la app lo presenta como T-XXXX';

-- ----------------------------------------------------------------------------
-- Tabla de comentarios internos por trabajo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentarios_trabajo (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trabajo_id  UUID        NOT NULL,
    autor_id    UUID        NOT NULL,
    texto       TEXT        NOT NULL CHECK (char_length(texto) <= 1000),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ct_trabajo FOREIGN KEY (trabajo_id)
        REFERENCES trabajos(id) ON DELETE CASCADE,
    CONSTRAINT fk_ct_autor FOREIGN KEY (autor_id)
        REFERENCES usuarios(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ct_trabajo_created
    ON comentarios_trabajo(trabajo_id, created_at);

COMMENT ON TABLE  comentarios_trabajo IS 'Comentarios internos de seguimiento asociados a un trabajo.';
COMMENT ON COLUMN comentarios_trabajo.texto IS 'Texto del comentario, máximo 1000 caracteres.';
COMMENT ON COLUMN comentarios_trabajo.autor_id IS 'Usuario que escribió el comentario.';
