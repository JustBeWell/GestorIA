-- ============================================================================
-- V007 — Clientes: tipo_cliente + referencia secuencial
-- ============================================================================
-- Añade dos columnas a la tabla clientes:
--   · tipo_cliente  — tipo de entidad jurídica (Sociedad, Autónomo, SCP, CB)
--   · nro_cliente   — número secuencial (genera la referencia C-XXXX en la app)
-- ============================================================================

-- Secuencia para número de cliente (arranca en 1001 para dejar margen)
CREATE SEQUENCE IF NOT EXISTS clientes_nro_seq
    START WITH 1001
    INCREMENT BY 1
    NO CYCLE;

-- Añadir columnas (idempotente si ya existen)
ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'Sociedad',
    ADD COLUMN IF NOT EXISTS nro_cliente  INTEGER     UNIQUE   DEFAULT nextval('clientes_nro_seq');

-- Restricción de integridad sobre tipo_cliente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_clientes_tipo' AND conrelid = 'clientes'::regclass
    ) THEN
        ALTER TABLE clientes
            ADD CONSTRAINT chk_clientes_tipo
                CHECK (tipo_cliente IN ('Sociedad', 'Autónomo', 'SCP', 'CB'));
    END IF;
END
$$;

COMMENT ON COLUMN clientes.tipo_cliente IS 'Tipo de entidad jurídica: Sociedad, Autónomo, SCP, CB';
COMMENT ON COLUMN clientes.nro_cliente  IS 'Número secuencial de cliente; la app lo presenta como C-XXXX';
