# Notifications — Módulo de Notificaciones PUSH

> **Documento de desarrollo y arquitectura**
> Proyecto: GestorIA — Intranet de gestoría fiscal y laboral
> Versión: 1.0 (draft de implementación)
> Fecha: 2026-05-15
> Autor / responsable técnico: Angel (arquitectura) — equipo backend + frontend

---

## 1. Contexto y objetivo

El gerente y los empleados necesitan estar informados **proactivamente** de eventos críticos del negocio sin tener que consultar manualmente la intranet. El módulo de notificaciones cubre dos grandes dominios funcionales:

1. **Cobros / impagos de facturas** (audiencia: gerente / administrador).
2. **Trabajos / tareas** (audiencia: empleados asignados + gerente).

Las notificaciones se entregan por tres canales complementarios:

| Canal | Tecnología | Funciona con la app cerrada | Comentario |
|------|------------|------------------------------|------------|
| **In-app** | WebSocket + endpoint REST `/notifications` | No (requiere intranet abierta) | Centro de notificaciones (campana). Siempre disponible. |
| **Web Push** | API Push del navegador + VAPID + Service Worker | Sí (PWA) | Funciona en Chrome, Edge, Firefox, Safari 16+. |
| **Desktop Push** | `Notification` API de Electron / `node-notifier` | Sí (Electron en segundo plano) | Usa el mismo backend; la app desktop se suscribe igual que un navegador. |

> **No se usa email/SMS en esta primera versión.** Twilio ya existe como dependencia para 2FA — queda reservado como canal de **escalado** futuro (impago > 30 días, por ejemplo).

### 1.1 Reglas funcionales acordadas

**Bloque A — Impagos de facturas (destino: gerente)**

| Código | Disparador | Cuándo | Frecuencia |
|-------|------------|--------|------------|
| `INV_DUE_SOON` | `factura.estado IN ('emitida','pagada_parcial')` y `fecha_vencimiento = HOY + 7d` | 7 días antes del vencimiento | Una sola vez por factura |
| `INV_DUE_TODAY` | `factura.fecha_vencimiento = HOY` y sigue impagada | El propio día del vencimiento | Una sola vez por factura |
| `INV_OVERDUE_WEEKLY` | Factura impagada con `fecha_vencimiento < HOY` | Cada lunes a las 09:00 (Europe/Madrid) | Recurrente, hasta cobro o anulación |

**Bloque B — Trabajos / tareas (destino: empleados asignados + gerente)**

| Código | Disparador | Audiencia |
|-------|------------|-----------|
| `TASK_DEADLINE_SOON` | `trabajo.fecha_objetivo` se encuentra a *N* días (configurable: 3 y 1 por defecto) | Empleados asignados + gerente |
| `TASK_DEADLINE_TODAY` | `trabajo.fecha_objetivo = HOY` y trabajo abierto | Empleados asignados + gerente |
| `TASK_ASSIGNED` | Inserción en `trabajo_empleado` | Empleado recién asignado |
| `TASK_UNASSIGNED` | Update de `trabajo_empleado.desasignado_en` | Empleado retirado |
| `TASK_STATE_CHANGED` | `UPDATE trabajos SET estado = …` (de cualquier valor a otro) | Empleados asignados + gerente |
| `TASK_CANCELLED` | `estado = 'cancelado'` (subtipo de `TASK_STATE_CHANGED` con prioridad alta) | Empleados asignados + gerente |
| `TASK_COMMENT_NEW` | INSERT en `trabajo_comentarios` | Empleados asignados (excluido autor) + gerente |
| `TASK_PRIORITY_CHANGED` | Cambio de `trabajo.prioridad` | Empleados asignados + gerente |

---

## 2. Decisión de arquitectura

### 2.1 Forma de ejecución: **microservicio dedicado** `backend-notifications`

Coherente con el patrón vigente del proyecto (un microservicio por dominio: `auth`, `pagos`, `trabajos`, etc.), las notificaciones se aíslan en un servicio propio. Razones:

- **Aislamiento de fallos.** Si el servicio de push está caído, ni pagos ni trabajos se ven afectados. La intranet sigue funcionando; las notificaciones quedan en el *outbox* hasta que el servicio vuelva.
- **Escalado independiente.** El scheduler (cron interno) y el dispatcher tienen perfil de carga distinto del CRUD de trabajos.
- **Responsabilidad única.** Centraliza preferencias, suscripciones, plantillas y entrega.
- **Coherencia con el gateway.** Se añade una sola entrada de routing en nginx (`/intranet/notifications`).

### 2.2 Modelo de comunicación: **outbox + eventos internos**

```
┌──────────────────┐                                ┌──────────────────────────┐
│ backend-pagos    │   POST /internal/events  ───▶  │ backend-notifications    │
│ backend-trabajos │       (HTTP firmado)            │  ├─ event_dispatcher    │
│ backend-clientes │                                 │  ├─ scheduler (APS)     │
└──────────────────┘                                 │  ├─ outbox worker       │
                                                     │  └─ push_sender (VAPID) │
                                                     └────────────┬────────────┘
                                                                  │
                                          ┌───────────────────────┴────────────┐
                                          ▼                                    ▼
                            in-app (WebSocket /ws)                Web Push (Service Worker)
```

- Los demás microservicios **no implementan lógica de notificación**. Únicamente *emiten un evento de dominio* al servicio de notificaciones por HTTP interno (puerto cerrado al exterior, autenticado con HMAC de un secreto compartido).
- El propio servicio decide a quién y por qué canales notificar leyendo `notification_preferences` y `push_subscriptions`.
- Antes de despachar a Web Push, escribe la notificación en la tabla `notifications` (siempre queda registro). Web Push y WebSocket son canales *adicionales*.

### 2.3 Patrón de entrega: **Transactional Outbox**

Para evitar "evento emitido pero no enviado" cuando un proceso falla a mitad:

1. Insertar la notificación en `notifications` *en la misma transacción* que escribe en `notification_outbox` (estado `pending`).
2. Un worker (en el mismo microservicio, hilo aparte o proceso `notifications-worker`) lee el outbox, intenta entregar por Web Push, marca `delivered` / `failed` y aplica *exponential backoff* hasta 5 reintentos.
3. Si todos los reintentos fallan → log de auditoría + `delivered_at = NULL` + flag `dropped = true`. La notificación in-app sigue visible al usuario al entrar.

### 2.4 Scheduler

`APScheduler` (ya compatible con el ecosistema Python y sin requerir Celery ni Redis en esta fase). Tres jobs:

| Job | Cron | Función |
|-----|------|---------|
| `scan_invoices_due_soon` | `0 8 * * *` (Europe/Madrid) | Marca facturas a 7 días → emite `INV_DUE_SOON` |
| `scan_invoices_due_today` | `0 9 * * *` | Facturas que vencen hoy → `INV_DUE_TODAY` |
| `scan_invoices_overdue_weekly` | `0 9 * * 1` | Cada lunes → `INV_OVERDUE_WEEKLY` |
| `scan_tasks_deadline` | `0 8 * * *` | Trabajos cuyo `fecha_objetivo - HOY ∈ {3, 1, 0}` |

Los jobs son **idempotentes**: usan la tabla `notification_dedupe` (clave: `(tipo, entidad_id, fecha_logica)`) para no notificar dos veces el mismo hecho.

### 2.5 Almacenamiento

- **PostgreSQL** (mismo cluster del resto del sistema) para `notifications`, `notification_preferences`, `push_subscriptions`, `notification_outbox`, `notification_dedupe`.
- No requiere Redis ni broker externo en V1. Si el volumen crece (> 200 notif/min) se puede migrar el outbox a Redis Streams o RabbitMQ sin tocar la API.

### 2.6 Seguridad de Web Push (VAPID)

- Generar un par de claves VAPID (`PUSH_VAPID_PUBLIC_KEY`, `PUSH_VAPID_PRIVATE_KEY`, `PUSH_VAPID_SUBJECT=mailto:gestor@gestoria.es`) y almacenar la **privada** únicamente en variables de entorno del servicio de notificaciones.
- El frontend recibe sólo la pública.
- Librería sugerida: `pywebpush==2.0.0` (añadir a `backend/requirements.txt`).

---

## 3. Modelo de datos

### 3.1 Nueva migración: `V015__notifications.sql`

```sql
-- ============================================================================
-- V015 — Módulo de Notificaciones
-- ============================================================================

-- 1. Tipos enumerados ---------------------------------------------------------

CREATE TYPE notif_canal AS ENUM ('in_app', 'web_push', 'email', 'sms');

CREATE TYPE notif_estado AS ENUM ('pending', 'delivered', 'failed', 'dropped');

CREATE TYPE notif_tipo AS ENUM (
    -- Facturas (audiencia: gerente)
    'INV_DUE_SOON',
    'INV_DUE_TODAY',
    'INV_OVERDUE_WEEKLY',
    -- Trabajos
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

-- 2. Notificaciones (registro maestro) ---------------------------------------

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinatario_id UUID            NOT NULL,          -- usuarios.id
    tipo            notif_tipo      NOT NULL,
    prioridad       notif_prioridad NOT NULL DEFAULT 'media',
    titulo          VARCHAR(160)    NOT NULL,
    mensaje         TEXT            NOT NULL,
    entidad         VARCHAR(40)     NOT NULL,          -- 'factura' | 'trabajo' | 'comentario'
    entidad_id      UUID            NOT NULL,
    deep_link       VARCHAR(500),                      -- p.ej. /intranet/trabajos/<id>
    metadata        JSONB           NOT NULL DEFAULT '{}'::jsonb,
    leida_at        TIMESTAMPTZ,
    archivada_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

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

-- 3. Suscripciones Push ------------------------------------------------------

CREATE TABLE push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID         NOT NULL,
    endpoint        TEXT         NOT NULL,
    p256dh          TEXT         NOT NULL,
    auth            TEXT         NOT NULL,
    user_agent      VARCHAR(255),
    plataforma      VARCHAR(40)  NOT NULL DEFAULT 'web',  -- 'web' | 'electron'
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_push_subs_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_push_subs_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subs_usuario_activo
    ON push_subscriptions (usuario_id) WHERE activo = TRUE;

-- 4. Preferencias por usuario y tipo -----------------------------------------

CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID         NOT NULL,
    tipo            notif_tipo   NOT NULL,
    canal_in_app    BOOLEAN      NOT NULL DEFAULT TRUE,
    canal_web_push  BOOLEAN      NOT NULL DEFAULT TRUE,
    canal_email     BOOLEAN      NOT NULL DEFAULT FALSE,
    silencio_desde  TIME,                              -- "no molestar" horario inicio
    silencio_hasta  TIME,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pref_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_pref_usuario_tipo UNIQUE (usuario_id, tipo)
);

-- 5. Outbox de entrega -------------------------------------------------------

CREATE TABLE notification_outbox (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID         NOT NULL,
    canal           notif_canal  NOT NULL,
    estado          notif_estado NOT NULL DEFAULT 'pending',
    intentos        SMALLINT     NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    delivered_at    TIMESTAMPTZ,
    error_detalle   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_outbox_notif FOREIGN KEY (notification_id)
        REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE INDEX idx_outbox_pending
    ON notification_outbox (next_attempt_at)
    WHERE estado = 'pending';

-- 6. Deduplicación de jobs idempotentes --------------------------------------

CREATE TABLE notification_dedupe (
    tipo            notif_tipo   NOT NULL,
    entidad_id      UUID         NOT NULL,
    fecha_logica    DATE         NOT NULL,
    notification_id UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tipo, entidad_id, fecha_logica)
);

-- 7. Triggers para emisión automática -----------------------------------------
-- (Alternativa: emitir desde el código de cada servicio. Triggers en BD
--  garantizan que no se "olvide" ningún punto de inserción.)

-- 7.1 Asignación a trabajo
CREATE OR REPLACE FUNCTION notify_task_assigned() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_outbox (notification_id, canal)
    SELECT n.id, c.canal
    FROM (
        INSERT INTO notifications (destinatario_id, tipo, titulo, mensaje,
                                   entidad, entidad_id, deep_link, metadata)
        SELECT e.usuario_id, 'TASK_ASSIGNED',
               'Te han asignado un trabajo',
               'Has sido añadido al trabajo "' || t.titulo || '".',
               'trabajo', NEW.trabajo_id,
               '/intranet/trabajos/' || NEW.trabajo_id::text,
               jsonb_build_object('trabajo_id', NEW.trabajo_id,
                                   'asignado_en', NEW.asignado_en)
        FROM empleados e
        JOIN trabajos  t ON t.id = NEW.trabajo_id
        WHERE e.id = NEW.empleado_id
        RETURNING id
    ) n
    CROSS JOIN (VALUES ('in_app'::notif_canal), ('web_push'::notif_canal)) AS c(canal);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_task_assigned
    AFTER INSERT ON trabajo_empleado
    FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- Análogos: trg_notify_task_state_changed, trg_notify_task_comment_new, etc.
-- (Se desarrollan en V015b para no inflar V015.)
```

> **Decisión de diseño.** Mezcla pragmática: triggers para los eventos *inmediatos* (asignación, comentario, cambio de estado) — garantizan consistencia con la BD — y el scheduler de Python para los eventos *temporales* (vencimientos), donde un trigger no encaja.

### 3.2 Modelos Pydantic — `backend/models.py` (apartado nuevo)

```python
# ── Notificaciones ────────────────────────────────────────────────────────────

class NotificationItem(BaseModel):
    id: str
    tipo: Literal[
        'INV_DUE_SOON', 'INV_DUE_TODAY', 'INV_OVERDUE_WEEKLY',
        'TASK_DEADLINE_SOON', 'TASK_DEADLINE_TODAY',
        'TASK_ASSIGNED', 'TASK_UNASSIGNED',
        'TASK_STATE_CHANGED', 'TASK_CANCELLED',
        'TASK_COMMENT_NEW', 'TASK_PRIORITY_CHANGED',
    ]
    prioridad: Literal['baja', 'media', 'alta', 'critica']
    titulo: str
    mensaje: str
    entidad: str
    entidad_id: str
    deep_link: str | None = None
    metadata: dict = Field(default_factory=dict)
    leida: bool = False
    archivada: bool = False
    created_at: datetime


class NotificationsListResponse(BaseModel):
    notificaciones: list[NotificationItem]
    no_leidas: int
    paginacion: PaginacionMeta


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=20, max_length=2000)
    keys: dict = Field(..., description="{'p256dh': str, 'auth': str}")
    user_agent: str | None = Field(default=None, max_length=255)
    plataforma: Literal['web', 'electron'] = 'web'


class NotificationPreferenceItem(BaseModel):
    tipo: str
    canal_in_app: bool
    canal_web_push: bool
    canal_email: bool = False
    silencio_desde: str | None = None  # "HH:MM"
    silencio_hasta: str | None = None


class NotificationPreferencesResponse(BaseModel):
    preferencias: list[NotificationPreferenceItem]


class NotificationPreferenceUpdate(BaseModel):
    canal_in_app: bool | None = None
    canal_web_push: bool | None = None
    canal_email: bool | None = None
    silencio_desde: str | None = Field(default=None, pattern=r'^\d{2}:\d{2}$')
    silencio_hasta: str | None = Field(default=None, pattern=r'^\d{2}:\d{2}$')


class InternalEventRequest(BaseModel):
    """Petición HTTP interna emitida por otros microservicios."""
    tipo: str
    entidad: str
    entidad_id: str
    actor_id: str | None = None
    payload: dict = Field(default_factory=dict)
```

---

## 4. Microservicio `backend-notifications`

### 4.1 Estructura de carpetas

```
backend/
├── main_notifications.py                # entry point uvicorn
├── routes/
│   └── intranet/
│       └── notifications.py             # endpoints REST (intranet)
│   └── internal/
│       └── events.py                    # endpoint interno (HMAC)
├── services/
│   ├── notifications_service.py         # API pública
│   ├── push_dispatcher_service.py       # envío VAPID
│   ├── notifications_scheduler.py       # APScheduler jobs
│   └── notifications_outbox.py          # worker outbox
└── tests/
    ├── test_notifications_endpoints.py
    ├── test_push_dispatcher.py
    └── test_scheduler_invoices.py
```

### 4.2 `main_notifications.py` (ejemplo)

```python
from contextlib import asynccontextmanager
from fastapi import APIRouter
from apscheduler.schedulers.background import BackgroundScheduler

from app_factory import create_app
from routes.intranet.notifications import router as notifications_router
from routes.internal.events import router as internal_events_router
from services.notifications_scheduler import register_jobs
from services.notifications_outbox import OutboxWorker

@asynccontextmanager
async def lifespan(app):
    scheduler = BackgroundScheduler(timezone="Europe/Madrid")
    register_jobs(scheduler)
    scheduler.start()
    worker = OutboxWorker()
    worker.start()
    yield
    scheduler.shutdown(wait=False)
    worker.stop()

_intranet = APIRouter(prefix="/intranet")
_intranet.include_router(notifications_router)

app = create_app("intranet-notifications-service",
                 extra_public_paths={"/internal/events"})
app.router.lifespan_context = lifespan
app.include_router(_intranet)
app.include_router(internal_events_router)
```

### 4.3 Integración en `docker-compose.yml`

```yaml
  backend-notifications:
    <<: *backend-common
    container_name: gestoria-backend-notifications
    environment:
      PUSH_VAPID_PUBLIC_KEY:  ${PUSH_VAPID_PUBLIC_KEY}
      PUSH_VAPID_PRIVATE_KEY: ${PUSH_VAPID_PRIVATE_KEY}
      PUSH_VAPID_SUBJECT:     "mailto:gestor@gestoria.es"
      INTERNAL_EVENTS_HMAC_SECRET: ${INTERNAL_EVENTS_HMAC_SECRET}
    command: ["uvicorn", "main_notifications:app",
              "--host", "0.0.0.0", "--port", "8008"]
```

### 4.4 Routing nginx (`nginx/nginx.conf`)

```nginx
map $uri $svc {
    ...
    ~^/intranet/notifications   http://backend-notifications:8008;
    ~^/internal/events          http://backend-notifications:8008;  # bloqueado externamente
    default                     "";
}
```

### 4.5 Dependencias adicionales (`backend/requirements.txt`)

```
APScheduler==3.10.4
pywebpush==2.0.0
cryptography>=42.0  # ya presente para VAPID
```

---

## 5. Endpoints REST

> Todas las rutas exigen `Authorization: Bearer <JWT>` salvo `/internal/events` (HMAC). Rate-limit por defecto: `60/min` por usuario (SlowAPI).

### 5.1 Endpoints públicos (intranet)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| `GET`    | `/intranet/notifications` | Listado paginado del usuario. Query: `page`, `page_size`, `solo_no_leidas`, `tipo`, `desde`, `hasta`. | empleado, administrador |
| `GET`    | `/intranet/notifications/{id}` | Detalle de una notificación. | propietario |
| `POST`   | `/intranet/notifications/{id}/leer` | Marcar como leída. | propietario |
| `POST`   | `/intranet/notifications/leer-todas` | Marcar todas las del usuario como leídas. | propietario |
| `POST`   | `/intranet/notifications/{id}/archivar` | Archivar. | propietario |
| `DELETE` | `/intranet/notifications/{id}` | Eliminar (borrado lógico, equivale a archivar). | propietario |
| `GET`    | `/intranet/notifications/contador` | Contador in-app (badge): `{ no_leidas: 12, criticas: 2 }`. Cache 5 s. | propietario |
| `GET`    | `/intranet/notifications/preferencias` | Devuelve preferencias actuales por tipo. | propietario |
| `PATCH`  | `/intranet/notifications/preferencias/{tipo}` | Actualiza preferencias de un tipo. | propietario |
| `GET`    | `/intranet/notifications/vapid-public-key` | Clave pública VAPID en base64url. | propietario |
| `POST`   | `/intranet/notifications/push-subscriptions` | Registra una suscripción del navegador / Electron. Body = `PushSubscriptionCreate`. | propietario |
| `DELETE` | `/intranet/notifications/push-subscriptions/{id}` | Borra una suscripción. | propietario |
| `GET`    | `/intranet/notifications/push-subscriptions` | Lista de dispositivos suscritos. | propietario |
| `POST`   | `/intranet/notifications/test` | Envía a sí mismo una notificación de prueba. Útil en QA. | propietario |
| `WS`     | `/intranet/notifications/ws` | WebSocket para *push* en vivo en la campana. JWT como query `?token=…`. | propietario |

### 5.2 Endpoints internos (sólo desde otros microservicios)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/internal/events` | Recibe `InternalEventRequest`. Verifica HMAC del header `X-Signature: sha256=<hex>` con `INTERNAL_EVENTS_HMAC_SECRET`. El gateway nginx **bloquea** esta ruta desde fuera (`return 403`). |

### 5.3 Endpoints de administración (sólo gerente)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/intranet/notifications/admin/metricas` | Métricas globales: enviadas/24h, % delivered, % failed, por tipo. |
| `POST` | `/intranet/notifications/admin/reenviar/{outbox_id}` | Forzar reintento manual. |

### 5.4 Ejemplos cURL

```bash
# Listado de no leídas del gerente
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:8008/intranet/notifications?solo_no_leidas=true&page=1&page_size=20"

# Suscribir el navegador
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"endpoint":"https://fcm.googleapis.com/fcm/send/...",
          "keys":{"p256dh":"BNc...","auth":"r1k..."},
          "user_agent":"Chrome/130.0",
          "plataforma":"web"}' \
     http://localhost:8008/intranet/notifications/push-subscriptions
```

### 5.5 Códigos de error estandarizados

| HTTP | Caso |
|------|------|
| 400 | `endpoint` o `keys` mal formateados |
| 401 | Token JWT ausente o caducado |
| 403 | Intento de leer una notificación que no es del usuario; intento externo a `/internal/events` |
| 404 | `notification_id` inexistente |
| 410 | Suscripción push obsoleta (el navegador la revocó). El backend la marca `activo=false` automáticamente |
| 429 | Rate-limit superado |

---

## 6. Lógica de emisión por evento

| Evento dominio | Punto de emisión | Implementación |
|---------------|------------------|----------------|
| Asignación empleado a trabajo | Trigger SQL `trg_notify_task_assigned` (preferente) **o** `TrabajosService.assign_empleado` | Cuando el código ya emite el evento al servicio de notificaciones, se desactiva el trigger. |
| Cambio de estado del trabajo | `TrabajosService.update_trabajo` → `POST /internal/events tipo=TASK_STATE_CHANGED` | Audiencia derivada: `empleados_asignados ∪ {gerente}`. |
| Nuevo comentario | `TrabajosService.add_comentario` → emite `TASK_COMMENT_NEW` con `metadata.autor_id` | Se excluye al autor. |
| Cambio de prioridad | `TrabajosService.update_trabajo` (campo `prioridad`) | — |
| Vencimiento factura próximo | `scan_invoices_due_soon` (cron) | Lee `facturas WHERE fecha_vencimiento = CURRENT_DATE + 7 AND estado IN ('emitida','pagada_parcial')`. |
| Vencimiento factura hoy | `scan_invoices_due_today` | — |
| Recordatorio semanal impago | `scan_invoices_overdue_weekly` (cron lunes 09:00 ETZ) | Una notificación **agregada** por gerente: "Tienes 8 facturas vencidas por importe total 12.430 €". Detalle en deep-link a `/intranet/pagos?filtro=vencidas`. |
| Trabajo próximo a vencer | `scan_tasks_deadline` | Configurable: `TASK_DEADLINE_DAYS_AHEAD=3,1` |

### 6.1 Pseudocódigo `scan_invoices_due_soon`

```python
def scan_invoices_due_soon():
    target_date = date.today() + timedelta(days=7)
    facturas = db.fetch("""
        SELECT f.id, f.numero, f.total, f.fecha_vencimiento,
               c.nombre_fiscal
        FROM facturas f
        JOIN clientes c ON c.id = f.cliente_id
        WHERE f.fecha_vencimiento = %s
          AND f.estado IN ('emitida','pagada_parcial')
    """, (target_date,))
    gerentes = UsersRepository.find_admins()
    for f in facturas:
        for g in gerentes:
            NotificationsService.emit(
                destinatario_id=g.id,
                tipo="INV_DUE_SOON",
                titulo=f"Factura {f.numero} vence en 7 días",
                mensaje=(f"{c.nombre_fiscal} — {f.total:.2f} € "
                         f"vence el {f.fecha_vencimiento}"),
                entidad="factura",
                entidad_id=f.id,
                deep_link=f"/intranet/pagos/{f.id}",
                metadata={"numero": f.numero, "total": float(f.total)},
                dedupe_key=("INV_DUE_SOON", f.id, target_date),
            )
```

### 6.2 Pseudocódigo `push_dispatcher`

```python
def deliver_pending():
    rows = db.fetch("""
        SELECT o.id, o.notification_id, o.intentos, n.destinatario_id,
               n.titulo, n.mensaje, n.deep_link, n.prioridad
        FROM notification_outbox o
        JOIN notifications n ON n.id = o.notification_id
        WHERE o.estado='pending' AND o.canal='web_push'
          AND o.next_attempt_at <= NOW()
        ORDER BY n.created_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    """)
    for r in rows:
        subs = PushSubscriptionsRepo.find_active(r.destinatario_id)
        for s in subs:
            try:
                pywebpush.webpush(
                    subscription_info={
                        "endpoint": s.endpoint,
                        "keys": {"p256dh": s.p256dh, "auth": s.auth},
                    },
                    data=json.dumps({
                        "title": r.titulo,
                        "body":  r.mensaje,
                        "url":   r.deep_link,
                        "priority": r.prioridad,
                        "tag":   r.notification_id,
                    }),
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": settings.vapid_subject},
                    ttl=86400,
                )
                mark_delivered(r.id)
            except WebPushException as exc:
                if exc.response.status_code in (404, 410):
                    PushSubscriptionsRepo.deactivate(s.id)
                    continue
                schedule_retry(r.id, intentos=r.intentos + 1)
```

---

## 7. Frontend (Angular 21)

### 7.1 Estructura

```
app/src/app/
├── core/
│   ├── services/
│   │   ├── notifications.service.ts     # API + estado (signals)
│   │   ├── push-subscription.service.ts # registra/elimina sub
│   │   └── notifications-ws.service.ts  # WebSocket en vivo
│   └── models/
│       └── notification.model.ts
├── features/
│   └── notifications/
│       ├── notifications.routes.ts
│       ├── pages/
│       │   ├── notifications-center/
│       │   │   ├── notifications-center.component.ts
│       │   │   ├── notifications-center.component.html
│       │   │   └── notifications-center.component.css
│       │   └── notifications-preferences/
│       │       └── ...
│       └── components/
│           ├── notification-item/
│           └── notification-empty/
└── shared/
    └── components/
        └── notifications-bell/          # campana en el header
            ├── notifications-bell.component.ts
            ├── notifications-bell.component.html
            └── notifications-bell.component.css

app/public/
└── service-worker.js                    # gestión del push
```

### 7.2 Service Worker (`app/public/service-worker.js`)

```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const priority = data.priority ?? 'media';
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: data.url || '/' },
    requireInteraction: priority === 'critica',
    tag: data.tag,            // sustituye duplicados
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((wins) => {
      const existing = wins.find(w => w.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
```

Registro en `main.ts`:

```ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

### 7.3 `notifications.service.ts` (resumen)

```ts
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(HttpClient);
  private readonly base = '/intranet/notifications';

  readonly notifications = signal<NotificationItem[]>([]);
  readonly noLeidas      = signal(0);
  readonly cargando      = signal(false);

  list(params: NotificationsQuery): Observable<NotificationsListResponse> { … }
  marcarLeida(id: string)       { … }
  marcarTodasLeidas()           { … }
  archivar(id: string)          { … }
  contador()                    { … }
  obtenerPreferencias()         { … }
  actualizarPreferencia(tipo, partial)  { … }
  subscribePush(sub: PushSubscriptionJSON, plataforma: 'web'|'electron') { … }
}
```

### 7.4 `notifications-bell.component` (campana en header)

Responsabilidades:

1. Mostrar **badge** con `noLeidas`.
2. Al hacer click, abrir un **dropdown** con las 10 últimas notificaciones (loading skeleton).
3. Al hacer click en una notificación: marcar como leída + navegar al `deep_link`.
4. Botón "Ver todas" → `/intranet/notificaciones`.
5. Botón "Marcar todas como leídas".
6. Banner contextual la **primera vez** que el usuario entre y los permisos del navegador estén `default`: "Activa las notificaciones para no perderte impagos ni vencimientos" → CTA llama a `Notification.requestPermission()` y suscribe push.

Esquema visual:

```
┌──────────────────────────────────────────┐
│ Logo  Inicio Fichaje Clientes Trabajos … │
│                              🔔 [3]   👤 │
└──────────────────────────────────────────┘
                                ▼
                ┌──────────────────────────────────┐
                │ Notificaciones      Marcar todas │
                ├──────────────────────────────────┤
                │ 🔴 Factura F-2026/0142 vencida   │
                │    Aceros SL · 1.430 €    hace 2h│
                ├──────────────────────────────────┤
                │ 🟠 Te han asignado el trabajo   │
                │    "Modelo 303 Q1"        hace 5h│
                ├──────────────────────────────────┤
                │ 💬 Nuevo comentario en           │
                │    "IRPF Pérez"          ayer    │
                ├──────────────────────────────────┤
                │              Ver todas (47)      │
                └──────────────────────────────────┘
```

Color por `prioridad`:

| Prioridad | Color marcador | Uso |
|-----------|----------------|-----|
| `critica` | rojo `#dc2626` | Factura vencida, trabajo cancelado |
| `alta`    | naranja `#ea580c` | Vencimiento mañana/hoy |
| `media`   | azul `#2563eb` | Asignaciones, cambios estado |
| `baja`    | gris `#6b7280` | Cambios cosméticos |

### 7.5 Página `/intranet/notificaciones` (centro completo)

Layout:

- **Cabecera**: título "Notificaciones" + contador + acciones (Marcar todas, Limpiar archivadas).
- **Tabs**: `Todas` · `No leídas` · `Facturas` · `Trabajos` · `Archivadas`.
- **Filtros laterales**: rango de fechas, tipo, prioridad, entidad (cliente / trabajo).
- **Listado** virtual scroll (Angular CDK) — agrupado por día.
- Cada ítem expandible: muestra metadata, deep link y botones "Marcar leída" / "Archivar".

### 7.6 Página `/intranet/notificaciones/preferencias`

Tabla con una fila por `tipo`:

```
Tipo                       | In-app | Web push | Email | Horario silencio
INV_DUE_SOON               |  [✓]   |   [✓]    |  [ ]  |  22:00 – 08:00
INV_DUE_TODAY              |  [✓]   |   [✓]    |  [ ]  |
INV_OVERDUE_WEEKLY         |  [✓]   |   [✓]    |  [ ]  |
TASK_ASSIGNED              |  [✓]   |   [✓]    |  [ ]  |
TASK_STATE_CHANGED         |  [✓]   |   [ ]    |  [ ]  |
…
```

- Cada checkbox dispara `PATCH /intranet/notifications/preferencias/{tipo}` con *optimistic update*.
- Sección extra: **Dispositivos suscritos** (lista de `push_subscriptions`) con botón "Desuscribir este dispositivo" / "Desuscribir todos".

### 7.7 Permiso del navegador y flujo de suscripción

1. Componente `NotificationsBell` lee `Notification.permission`.
2. Si `'default'`, muestra banner amable (no popup forzado al login).
3. Al hacer click: `Notification.requestPermission()`. Si `'granted'`:
   1. `const sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey });`
   2. `notifications.subscribePush(sub.toJSON(), 'web')`.
4. Si `'denied'`: mensaje de ayuda con instrucciones para reactivar.

### 7.8 Electron

En `electron/main.cjs` se pueden mostrar notificaciones **nativas** además del Service Worker:

```js
const { Notification } = require('electron');
ipcMain.on('notify', (_, { title, body, url }) => {
  const n = new Notification({ title, body });
  n.on('click', () => mainWindow.webContents.send('navigate', url));
  n.show();
});
```

El renderer escucha el WebSocket `/notifications/ws` y reenvía cada mensaje vía `ipcRenderer.send('notify', payload)`.

### 7.9 Routing

`app.routes.ts`:

```ts
{
  path: 'intranet/notificaciones',
  loadChildren: () => import('./features/notifications/notifications.routes')
                       .then(m => m.NOTIFICATIONS_ROUTES),
  canActivate: [authGuard],
}
```

---

## 8. Seguridad

| Riesgo | Mitigación |
|--------|------------|
| Cualquiera podría llamar `/internal/events` y spamear notificaciones | El endpoint **no** está mapeado en nginx hacia fuera + HMAC `sha256` por petición con `INTERNAL_EVENTS_HMAC_SECRET`. |
| Endpoint push usado para fingerprinting | Tablas con `ON DELETE CASCADE`; el usuario puede borrar todos sus dispositivos desde preferencias. |
| Filtrado de notificaciones ajenas | Todos los `SELECT` filtran por `destinatario_id = current_user.user_id`. El servicio nunca expone listados cruzados. |
| Replay attack del push | Web Push lleva TTL=86400, *salt* y *padding* en `pywebpush`. |
| Exfiltración de información sensible (datos cliente/factura) en el cuerpo del push | El payload del push debe ir **cifrado** (Web Push lo hace nativo con `p256dh`+`auth`), pero además se evita poner CIF/importes en el `body` cuando la `prioridad < critica`. Ver §10. |
| Rate-limit | SlowAPI: `60/min` por usuario en `/notifications/*`; `5/min` en `/notifications/test`. |
| Privacidad GDPR | `notifications` se conserva 12 meses; job nocturno borra anteriores. Las preferencias incluyen *opt-out* completo por tipo. |
| Auditoría | Toda emisión / lectura / borrado registra evento en `auditoria_eventos` (servicio ya existente). |

---

## 9. Testing

### 9.1 Backend (pytest)

- **Unit** `services/notifications_service.py` — emisión, deduplicación, preferencias, silencio.
- **Unit** `push_dispatcher_service.py` — mock de `pywebpush`, escenarios 200/410/500.
- **Integración** con BD Postgres real (Docker) — trigger `trg_notify_task_assigned`.
- **Integración** scheduler — congelar reloj con `freezegun` y validar emisiones de cada job.
- **Endpoint** schemathesis (ya presente en `requirements.txt`) — fuzz de `/intranet/notifications/*`.
- **HMAC** `/internal/events` — firma válida / inválida / repudiada.

Cobertura objetivo: **≥ 85 %** en `services/notifications_*` (ratio actual del proyecto).

### 9.2 Frontend (vitest)

- `notifications.service.spec.ts` — list, marcar leída, optimistic update.
- `notifications-bell.component.spec.ts` — render badge, click → navega + marca leída.
- E2E manual en Electron y Chrome con notificación de prueba (`POST /test`).

### 9.3 Pruebas de carga

- Locust: 1.000 usuarios concurrentes suscritos, ráfaga de 500 notificaciones — latencia p95 < 800 ms desde emisión hasta `delivered`.

---

## 10. Plantillas de mensaje

| Tipo | Título | Cuerpo (ejemplo) |
|------|--------|------------------|
| `INV_DUE_SOON` | Factura {{numero}} vence en 7 días | {{cliente}} — {{total}} € · {{fecha_vencimiento}} |
| `INV_DUE_TODAY` | Factura {{numero}} vence hoy | {{cliente}} — {{total}} € pendiente |
| `INV_OVERDUE_WEEKLY` | Tienes {{n}} facturas vencidas | Importe total pendiente: {{total}} € |
| `TASK_ASSIGNED` | Te han asignado un trabajo | "{{titulo}}" para {{cliente}} |
| `TASK_DEADLINE_SOON` | Vencimiento próximo | "{{titulo}}" vence en {{dias}} días |
| `TASK_STATE_CHANGED` | Estado actualizado | "{{titulo}}" pasa a {{estado}} |
| `TASK_CANCELLED` | Trabajo cancelado | "{{titulo}}" ha sido cancelado por {{actor}} |
| `TASK_COMMENT_NEW` | Nuevo comentario | {{autor}} en "{{titulo}}": "{{preview_120c}}…" |

Las plantillas viven en `backend/services/notifications_templates.py` como un `dict[notif_tipo, callable[ctx -> tuple[titulo, mensaje]]]` para permitir i18n futuro.

---

## 11. Observabilidad

- **Logs estructurados JSON** (`logging` con `python-json-logger`) en formato `{ts, level, service, event, notification_id, tipo, canal, latency_ms}`.
- **Métricas** expuestas en `/metrics` (Prometheus) — opcional V1, dejado preparado:
  - `notif_emitidas_total{tipo}`
  - `notif_entregadas_total{canal,resultado}`
  - `notif_outbox_pending_gauge`
  - `notif_delivery_latency_seconds{canal}`
- **Alerta** sugerida: outbox `pending > 200` durante > 5 min.

---

## 12. Plan de implementación (sprints sugeridos)

| Sprint | Objetivo | Tareas clave |
|--------|----------|--------------|
| **S-N1** (1 semana) | Cimientos | Migración V015; modelos Pydantic; microservicio bootstrap; endpoints `GET/PATCH preferencias`, `GET /vapid-public-key`, `POST/DELETE push-subscriptions`. |
| **S-N2** (1 semana) | Emisión de eventos | `notifications_service.emit()`; outbox worker; integración `pywebpush`; endpoint `POST /test`; service worker frontend; componente `NotificationsBell` MVP. |
| **S-N3** (1 semana) | Reglas de negocio | Triggers SQL (asignación, comentario, cambio estado); endpoint `/internal/events`; emisiones desde `TrabajosService`. |
| **S-N4** (1 semana) | Scheduler | `APScheduler` con los 4 jobs de facturas y trabajos; idempotencia (`notification_dedupe`); página `/intranet/notificaciones` completa. |
| **S-N5** (3-4 días) | Preferencias UX y métricas admin | Página de preferencias; métricas admin; documentación; bug-bash. |

---

## 13. Variables de entorno nuevas

```env
# .env (añadir)
PUSH_VAPID_PUBLIC_KEY=<base64url>
PUSH_VAPID_PRIVATE_KEY=<base64url>
PUSH_VAPID_SUBJECT=mailto:gestor@gestoria.es
INTERNAL_EVENTS_HMAC_SECRET=<32-byte random>
NOTIFICATIONS_RETENTION_DAYS=365
TASK_DEADLINE_DAYS_AHEAD=3,1
NOTIF_OUTBOX_BATCH_SIZE=100
NOTIF_OUTBOX_MAX_RETRIES=5
TIMEZONE=Europe/Madrid
```

Generación de las claves VAPID:

```bash
python -m pywebpush --gen-vapid
# Devuelve public/private en base64url, pegar en .env
```

---

## 14. Compatibilidad y consideraciones

- **Safari < 16**: no soporta Web Push. *Fallback* automático a in-app + email opcional.
- **Electron 35**: soporta Web Push igual que Chromium → funciona out-of-the-box.
- **Móvil**: si en el futuro se publica una PWA instalable o app nativa, basta con que el cliente envíe su `push subscription` al mismo endpoint.
- **Multidispositivo**: un mismo usuario puede tener `n` filas en `push_subscriptions` (móvil + escritorio + portátil); el dispatcher itera todas.
- **Idempotencia**: imprescindible en jobs cron — `notification_dedupe (tipo, entidad_id, fecha_logica)` evita duplicados aunque el job se reintente.

---

## 15. Checklist de aceptación (Definition of Done)

- [ ] Migración V015 aplicada en CI y staging.
- [ ] Microservicio `backend-notifications` arranca, `/health` y `/health/db` responden 200.
- [ ] Gateway nginx enruta `/intranet/notifications` y bloquea `/internal/events` externo.
- [ ] El gerente recibe `INV_DUE_SOON`, `INV_DUE_TODAY`, `INV_OVERDUE_WEEKLY` con datos reales en staging.
- [ ] Un empleado recibe `TASK_ASSIGNED` al asignarle un trabajo y `TASK_COMMENT_NEW` al comentar otro.
- [ ] El bell del header pinta el badge en < 1 s tras la emisión (vía WebSocket).
- [ ] El push web funciona con la pestaña cerrada en Chrome, Edge, Firefox, Safari 16+.
- [ ] La página de preferencias persiste cambios y los respeta el dispatcher (con tests).
- [ ] Tests backend ≥ 85 % cobertura en módulos nuevos; frontend con tests de servicio y bell.
- [ ] Documentación en `MEMORIA.md` y `DESARROLLO.md` actualizada con el módulo.
- [ ] Variables VAPID generadas y guardadas en gestor de secretos (no en repo).

---

## 16. Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Spam de notificaciones al gerente (100+ facturas vencidas) | Media | Alto | Job semanal agrupa en una sola notificación con totales + deep link al filtro. |
| Suscripciones obsoletas que consumen reintentos | Alta | Bajo | Marcar `activo=false` automáticamente ante 404/410 del provider. |
| Sobrecarga del servicio por triggers en BD | Baja | Medio | Triggers sólo crean la fila en `notifications`; el dispatch ocurre fuera de la transacción. |
| Mensajes con datos sensibles visibles en lockscreen del dispositivo | Media | Alto | Mensaje genérico cuando `prioridad < critica`; detalles tras autenticación. |
| Pérdida de eventos si el servicio cae | Baja | Alto | Outbox + reintentos + idempotencia. Los eventos no enviados se conservan en BD. |

---

## 17. Apéndice — Mapa rápido de archivos a crear / modificar

**Backend**
- `db/migrations/V015__notifications.sql` *(nuevo)*
- `backend/main_notifications.py` *(nuevo)*
- `backend/models.py` *(añadir bloque §3.2)*
- `backend/routes/intranet/notifications.py` *(nuevo)*
- `backend/routes/internal/__init__.py` + `events.py` *(nuevo)*
- `backend/services/notifications_service.py` *(nuevo)*
- `backend/services/push_dispatcher_service.py` *(nuevo)*
- `backend/services/notifications_scheduler.py` *(nuevo)*
- `backend/services/notifications_outbox.py` *(nuevo)*
- `backend/services/trabajos_service.py` *(emitir eventos desde update/assign/comentar)*
- `backend/services/pagos_service.py` *(emitir evento al marcar pagada → cancela dedupe semanal)*
- `backend/requirements.txt` *(añadir APScheduler, pywebpush)*
- `docker-compose.yml` *(servicio backend-notifications)*
- `nginx/nginx.conf` *(routing)*

**Frontend**
- `app/src/app/core/services/notifications.service.ts` *(nuevo)*
- `app/src/app/core/services/push-subscription.service.ts` *(nuevo)*
- `app/src/app/core/services/notifications-ws.service.ts` *(nuevo)*
- `app/src/app/core/models/notification.model.ts` *(nuevo)*
- `app/src/app/features/notifications/` *(árbol completo nuevo)*
- `app/src/app/shared/components/notifications-bell/` *(nuevo)*
- `app/src/app/shared/components/intranet-shell-header/intranet-shell-header.component.html` *(insertar campana)*
- `app/src/app/app.routes.ts` *(ruta /intranet/notificaciones)*
- `app/public/service-worker.js` *(nuevo)*
- `app/src/main.ts` *(registrar SW)*
- `app/electron/main.cjs` *(`ipcMain.on('notify', …)`)*

**Documentación**
- `docs/Notifications.md` *(este documento)*
- `docs/DESARROLLO.md` *(añadir sección "Módulo Notificaciones")*
- `MEMORIA.md` *(actualizar tras cierre del módulo con un breve resumen)*

---

*Fin del documento — listo para abrir tarea de sprint y reparto.*
