# Security Policy — GestorIA

> Este documento describe la arquitectura de seguridad implementada en GestorIA y las instrucciones para reportar vulnerabilidades.

---

## Versiones con soporte de seguridad

| Rama   | Estado                     |
|--------|----------------------------|
| `main` | ✅ Activamente mantenida   |

---

## Arquitectura de seguridad

### 1. Autenticación — JWT Bearer

Todos los servicios del backend comparten el mismo middleware de autenticación definido en `app_factory.py`. Cada request (excepto rutas públicas declaradas explícitamente) debe incluir un token JWT válido en la cabecera `Authorization: Bearer <token>`.

- **Algoritmo:** configurable por variable de entorno `JWT_ALGORITHM` (por defecto HS256)  
- **Expiración:** configurable con `JWT_EXPIRATION_HOURS`  
- **Verificación adicional:** en cada request se consulta la base de datos para confirmar que el usuario (`usuarios.activo = TRUE`) sigue activo; si ha sido desactivado, el token válido es rechazado igualmente

#### Token Blacklist

Los tokens revocados (logout, cambio de contraseña, revocación por admin) se registran en la tabla `token_blacklist` como su hash SHA-256. En cada autenticación se consulta esta tabla antes de aceptar el token.

```
token_blacklist
├─ token_hash   VARCHAR(64)  — SHA-256 del token raw (nunca el token completo)
├─ user_id      UUID
├─ expires_at   TIMESTAMPTZ  — permite purgar registros caducados
└─ revoked_at   TIMESTAMPTZ
```

La purga automática de entradas expiradas evita el crecimiento indefinido de la tabla.

---

### 2. Protección contra fuerza bruta

#### Rate limiting por IP

El endpoint `/auth/login` y `/auth/otp/verify` tienen un límite de **10 peticiones/minuto por IP** mediante `slowapi`. Superar el límite devuelve `HTTP 429`.

#### Bloqueo de cuenta

Tras **5 intentos fallidos** consecutivos la cuenta queda bloqueada durante **15 minutos** (`MAX_INTENTOS = 5`, `BLOQUEO_MINUTOS = 15` en `auth_service.py`). El contador se almacena en `usuarios.intentos_fallidos` y se resetea a 0 en cada login correcto.

```
usuarios
├─ intentos_fallidos  SMALLINT     — contador de contraseñas incorrectas consecutivas
└─ bloqueado_hasta    TIMESTAMPTZ  — si > NOW(), login bloqueado
```

---

### 3. Autenticación de dos factores (2FA/MFA)

La 2FA vía SMS es opcional por usuario (`usuarios.mfa_habilitado`). Si está activa, el login completo requiere dos pasos:

1. **Primer factor:** credenciales (DNI + contraseña)
2. **Segundo factor:** código OTP de 6 dígitos enviado por SMS via Twilio

Características del OTP:

- Código generado con `secrets.choice` (CSPRNG)
- Almacenado en `otp_codes` como **hash SHA-256**, nunca en texto plano
- Expiración: **10 minutos** (`OTP_EXPIRE_MINUTES = 10`)
- Códigos de un solo uso: campo `otp_codes.used`
- Números de teléfono normalizados al formato E.164 antes del envío

Las credenciales de Twilio se configuran exclusivamente mediante variables de entorno (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`).

---

### 4. Autorización basada en roles (RBAC)

Los usuarios tienen asignado un rol (`administrador` / `empleado`). El rol se lee de la base de datos en cada petición autenticada y se adjunta al objeto `TokenData`. Los endpoints que requieren privilegios elevados comprueban el rol directamente y devuelven `HTTP 403` si no se cumple. Ejemplos de operaciones exclusivas de administrador:

- Panel de administración completo (`/admin`)
- Eliminación de clientes
- Métricas y reintento de notificaciones
- Gestión de fichajes de otros empleados

---

### 5. Comunicación interna entre servicios (HMAC)

El endpoint `/internal/events`, utilizado para propagar eventos entre microservicios, está protegido por firma **HMAC-SHA256**:

- El emisor firma el body con la clave `INTERNAL_EVENTS_HMAC_SECRET`
- La firma viaja en la cabecera `X-Signature: sha256=<digest>`
- La validación usa `hmac.compare_digest` para evitar ataques de timing

---

### 6. CORS

Cada servicio FastAPI define una allowlist explícita de orígenes:

| Origen permitido          | Propósito                        |
|---------------------------|----------------------------------|
| Valor de `FRONTEND_URL`   | URL de producción configurada    |
| `http://localhost:4200`   | Desarrollo local (Angular CLI)   |
| `http://127.0.0.1:4200`   | Desarrollo local (alternativo)   |
| `app://localhost`         | Aplicación Electron (desktop)    |

Las credenciales (`allow_credentials=True`) solo se aceptan desde orígenes en la allowlist.

---

### 7. Seguridad de datos sensibles

| Dato              | Almacenamiento                                     |
|-------------------|----------------------------------------------------|
| Contraseñas       | Hash bcrypt (`passlib[bcrypt]`)                    |
| Códigos OTP       | Hash SHA-256 (nunca texto plano)                   |
| Tokens JWT        | Hash SHA-256 en blacklist (nunca el token completo)|
| Credenciales API  | Variables de entorno (`.env` excluido del repo)    |
| Claves VAPID      | Variables de entorno (`PUSH_VAPID_*`)              |

---

### 8. Registro de auditoría

Todas las acciones significativas (creación, modificación, eliminación de entidades, cambios de estado, asignaciones) quedan registradas en la tabla `auditoria_eventos`:

```
auditoria_eventos
├─ actor_id       UUID         — usuario que realizó la acción
├─ actor_nombre   TEXT
├─ entidad        TEXT         — tipo de entidad afectada
├─ entidad_id     TEXT
├─ accion         accion_auditoria (enum)
├─ detalle_json   JSONB        — contexto adicional
├─ ip             INET
└─ created_at     TIMESTAMPTZ
```

---

### 9. Seguridad del asistente de IA (GIA)

El system prompt de GIA incluye cinco reglas de seguridad de obligado cumplimiento:

1. **Inmunidad ante prompt injection** — instrucciones para ignorar el system prompt, cambiar de rol o revelar configuración interna son rechazadas
2. **No suplantación** — GIA no actúa como otro sistema ni persona
3. **Resistencia a ingeniería social** — no revela datos a usuarios que se presenten con identidades falsas
4. **No exfiltración de datos** — no extrae ni comparte datos masivos de la base de datos fuera de consultas legítimas
5. **Confidencialidad del system prompt** — no confirma ni revela el contenido del prompt de sistema

---

### 10. Variables de entorno requeridas

Todas las credenciales y secretos se gestionan mediante variables de entorno. El repositorio no debe contener archivos `.env` con valores reales.

| Variable                       | Descripción                                    |
|--------------------------------|------------------------------------------------|
| `JWT_SECRET_KEY`               | Clave de firma de tokens JWT                   |
| `JWT_ALGORITHM`                | Algoritmo JWT (e.g. `HS256`)                   |
| `JWT_EXPIRATION_HOURS`         | Vida útil del token en horas                   |
| `POSTGRES_PASSWORD`            | Contraseña de la base de datos                 |
| `POSTGRES_SSLMODE`             | Modo SSL de la conexión (`require`, `verify-full`, etc.) |
| `INTERNAL_EVENTS_HMAC_SECRET`  | Secreto para firma HMAC entre servicios        |
| `TWILIO_ACCOUNT_SID`           | Credencial Twilio (2FA SMS)                    |
| `TWILIO_AUTH_TOKEN`            | Credencial Twilio (2FA SMS)                    |
| `TWILIO_FROM_NUMBER`           | Número de origen SMS                           |
| `OPENAI_API_KEY`               | Clave de la API de OpenAI (GIA)                |
| `PUSH_VAPID_PRIVATE_KEY`       | Clave privada VAPID para web push              |

---

## Reportar una vulnerabilidad

Si descubres una vulnerabilidad de seguridad:

1. **No abras un issue público.** Los issues públicos exponen la vulnerabilidad antes de que esté parcheada.
2. Envía un correo a **security@gestoria.app** con:
   - Descripción detallada del problema
   - Pasos para reproducirlo
   - Impacto estimado
   - Si es posible, una propuesta de solución
3. Recibirás acuse de recibo en un plazo máximo de **48 horas** y una actualización sobre el estado en un plazo de **7 días**.
4. Una vez publicado el parche, se reconocerá públicamente tu contribución (salvo que prefieras permanecer anónimo).

Las vulnerabilidades confirmadas se parchean en la rama `main` con prioridad máxima.

