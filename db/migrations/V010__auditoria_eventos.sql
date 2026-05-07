-- ============================================================================
-- V010 · Tabla de auditoría de eventos
-- Registra toda acción crítica del sistema: altas, bajas, ediciones y
-- correcciones, con actor, entidad afectada y snapshot JSON opcional.
-- ============================================================================

CREATE TABLE auditoria_eventos (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id      UUID         NOT NULL,
    actor_nombre  VARCHAR(255) NOT NULL DEFAULT '',
    entidad       VARCHAR(50)  NOT NULL,          -- 'cliente','trabajo','factura','pago','empleado','fichaje'
    entidad_id    VARCHAR(36)  NOT NULL,
    accion        accion_auditoria NOT NULL,
    detalle_json  JSONB,
    ip            VARCHAR(45),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_actor    ON auditoria_eventos(actor_id);
CREATE INDEX idx_auditoria_entidad  ON auditoria_eventos(entidad, entidad_id);
CREATE INDEX idx_auditoria_created  ON auditoria_eventos(created_at DESC);

COMMENT ON TABLE auditoria_eventos IS
    'Log de auditoría: cada fila es una acción crítica realizada por un usuario sobre una entidad del sistema.';
