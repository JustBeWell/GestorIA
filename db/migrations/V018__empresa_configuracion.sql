-- ============================================================================
-- V018 - Configuracion persistente de empresa
-- ============================================================================

CREATE TABLE IF NOT EXISTS empresa_configuracion (
    id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nombre_fiscal VARCHAR(255) NOT NULL DEFAULT 'GestorIA',
    cif_nif       VARCHAR(20)  NOT NULL DEFAULT 'B00000000',
    email         VARCHAR(255),
    telefono      VARCHAR(20),
    direccion     VARCHAR(255),
    codigo_postal VARCHAR(10),
    ciudad        VARCHAR(100),
    provincia     VARCHAR(100),
    web           VARCHAR(255),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO empresa_configuracion (id, nombre_fiscal, cif_nif)
VALUES (1, 'GestorIA', 'B00000000')
ON CONFLICT (id) DO NOTHING;
