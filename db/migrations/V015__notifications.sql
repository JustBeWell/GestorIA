-- ============================================================================
-- V015 — Módulo de Notificaciones
-- ============================================================================

CREATE TYPE notif_canal AS ENUM ('in_app', 'web_push', 'email', 'sms');
CREATE TYPE notif_estado AS ENUM ('pending', 'delivered', 'failed', 'dropped');
CREATE TYPE notif_tipo AS ENUM (
    'INV_DUE_SOON',
    'INV_DUE_TODAY',
    'INV_OVERDUE_WEEKLY',
    'TASK_DEADLINE_SOON',
    'TASK_DEADLINE_TODAY',
    'TASK_ASSIGNED',
    'TASK_UNASSIGNED',
    'TASK_STATE_CHANGED',
    'TASK_CANCELLED',
    'TASK_COMMENT_NEW',
    'TASK_PRIORITY_CHANGED'
);
CREATE TYPE notif_prioridad AS ENUM ('baja', 'media', 'alta', 'critica');

CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinatario_id  UUID            NOT NULL,
    tipo             notif_tipo      NOT NULL,
    prioridad        notif_prioridad NOT NULL DEFAULT 'media',
    titulo           VARCHAR(160)    NOT NULL,
    mensaje          TEXT            NOT NULL,
    entidad          VARCHAR(40)     NOT NULL,
    entidad_id       UUID            NOT NULL,
    deep_link        VARCHAR(500),
    metadata         JSONB           NOT NULL DEFAULT '{}'::jsonb,
    leida_at         TIMESTAMPTZ,
    archivada_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notif_destinatario FOREIGN KEY (destinatario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_destinatario_fecha
    ON notifications (destinatario_id, created_at DESC);

CREATE INDEX idx_notif_no_leidas
    ON notifications (destinatario_id)
    WHERE leida_at IS NULL AND archivada_at IS NULL;

CREATE INDEX idx_notif_entidad
    ON notifications (entidad, entidad_id);

CREATE TABLE push_subscriptions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id       UUID         NOT NULL,
    endpoint         TEXT         NOT NULL,
    p256dh           TEXT         NOT NULL,
    auth             TEXT         NOT NULL,
    user_agent       VARCHAR(255),
    plataforma       VARCHAR(40)  NOT NULL DEFAULT 'web',
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_push_subs_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_push_subs_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subs_usuario_activo
    ON push_subscriptions (usuario_id) WHERE activo = TRUE;

CREATE TABLE notification_preferences (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id       UUID         NOT NULL,
    tipo             notif_tipo   NOT NULL,
    canal_in_app     BOOLEAN      NOT NULL DEFAULT TRUE,
    canal_web_push   BOOLEAN      NOT NULL DEFAULT TRUE,
    canal_email      BOOLEAN      NOT NULL DEFAULT FALSE,
    silencio_desde   TIME,
    silencio_hasta   TIME,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pref_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_pref_usuario_tipo UNIQUE (usuario_id, tipo)
);

CREATE TRIGGER trg_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TABLE notification_outbox (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id  UUID         NOT NULL,
    canal            notif_canal  NOT NULL,
    estado           notif_estado NOT NULL DEFAULT 'pending',
    intentos         SMALLINT     NOT NULL DEFAULT 0,
    next_attempt_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    delivered_at     TIMESTAMPTZ,
    error_detalle    TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_outbox_notif FOREIGN KEY (notification_id)
        REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE INDEX idx_outbox_pending
    ON notification_outbox (next_attempt_at)
    WHERE estado = 'pending';

CREATE TABLE notification_dedupe (
    tipo             notif_tipo   NOT NULL,
    entidad_id       UUID         NOT NULL,
    fecha_logica     DATE         NOT NULL,
    notification_id  UUID,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tipo, entidad_id, fecha_logica),
    CONSTRAINT fk_dedupe_notif FOREIGN KEY (notification_id)
        REFERENCES notifications(id) ON DELETE SET NULL
);
