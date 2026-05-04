-- ============================================================================
-- Add pause event types for fichaje
-- ============================================================================

ALTER TYPE tipo_evento_fichaje ADD VALUE IF NOT EXISTS 'pausa_inicio';
ALTER TYPE tipo_evento_fichaje ADD VALUE IF NOT EXISTS 'pausa_fin';
