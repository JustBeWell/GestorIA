-- ============================================================================
-- V017 - Borrado administrativo de vencimientos fiscales
-- ============================================================================
-- El calendario se rehidrata con semillas oficiales en el arranque del servicio.
-- El borrado se implementa como baja logica para que una fila eliminada no
-- reaparezca cuando se ejecute de nuevo el seed idempotente.

ALTER TABLE calendario_fiscal_vencimientos
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calendario_deleted_at
    ON calendario_fiscal_vencimientos (deleted_at);
