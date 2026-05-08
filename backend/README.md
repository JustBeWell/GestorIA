# Backend GestorIA

API de GestorIA construida con FastAPI y PostgreSQL. El backend empezo como una API modular y actualmente se ejecuta en Docker como varios microservicios FastAPI detras de un gateway nginx.

## Stack

- FastAPI
- Pydantic
- PostgreSQL
- psycopg2
- JWT Bearer Token
- slowapi para rate limiting
- Twilio para OTP por SMS
- fpdf2 para generacion de PDFs
- pytest para pruebas

## Arquitectura actual

Todos los microservicios comparten el mismo codigo base y la misma base de datos. La separacion se hace por entry-point:

| Servicio Docker | Entry-point | Responsabilidad |
|---|---|---|
| `backend-auth` | `main_auth:app` | Auth, OTP, logout y usuarios. |
| `backend-home` | `main_home:app` | Home y series trimestrales. |
| `backend-fichaje` | `main_fichaje:app` | Fichaje y exportaciones de jornada. |
| `backend-clientes` | `main_clientes:app` | Clientes. |
| `backend-trabajos` | `main_trabajos:app` | Trabajos, asignaciones y comentarios. |
| `backend-pagos` | `main_pagos:app` | Pagos, facturas y deuda viva. |
| `backend-calendario` | `main_calendario:app` | Calendario fiscal. |
| `backend-admin` | `main_admin:app` | Panel admin, auditoria y cierre mensual. |
| `backend-ai` | `main_ai:app` | Chat IA y portal GIA con conversaciones/archivos. |

La factoria comun `app_factory.py` centraliza CORS, rate limiting, middleware de autenticacion y health checks.

## API Gateway

El gateway nginx escucha en `http://localhost:8008` y enruta por prefijo:

| Prefijo | Servicio |
|---|---|
| `/auth`, `/users` | `backend-auth` |
| `/intranet/home`, `/intranet/series` | `backend-home` |
| `/intranet/fichaje` | `backend-fichaje` |
| `/intranet/clientes` | `backend-clientes` |
| `/intranet/trabajos` | `backend-trabajos` |
| `/intranet/pagos`, `/intranet/deuda`, `/intranet/facturas` | `backend-pagos` |
| `/intranet/calendario-fiscal` | `backend-calendario` |
| `/intranet/admin` | `backend-admin` |
| `/ai` | `backend-ai` |

El gateway tambien responde preflight `OPTIONS` y evita cabeceras CORS duplicadas ocultando las del upstream.

## Estructura

| Ruta | Responsabilidad |
|---|---|
| `app_factory.py` | Creacion comun de apps FastAPI. |
| `main_*.py` | Entry-points por microservicio. |
| `database.py` | Conexion y health de PostgreSQL. |
| `service_config.py` | Configuracion por variables de entorno. |
| `models.py` | Schemas Pydantic. |
| `routes/auth.py` | Auth, OTP y logout. |
| `routes/users.py` | Usuarios y empleados. |
| `routes/intranet/*.py` | Rutas de dominio de intranet. |
| `services/*.py` | Logica de negocio por dominio. |
| `tests/*.py` | Pruebas automatizadas existentes. |

## Variables de entorno

Definidas en `service_config.py`:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_SSLMODE`
- `DATABASE_URL` opcional
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_EXPIRATION_HOURS`
- `FRONTEND_URL`
- `OPENAI_API_KEY`
- `OPENAI_GIA_MODEL`
- `OPENAI_IMAGE_MODEL`
- `GIA_STORAGE_DIR`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## Ejecucion

### Via Docker Compose

Desde la raiz del repositorio:

```bash
docker-compose up --build
```

La API queda disponible en:

- Gateway: `http://localhost:8008`
- Health gateway: `http://localhost:8008/gateway/health`
- Health servicio: `http://localhost:8008/health`

### Ejecucion local de un servicio

Desde `backend/`, arrancar un entry-point concreto:

```bash
python -m uvicorn main_auth:app --reload --port 8008
python -m uvicorn main_pagos:app --reload --port 8008
```

El antiguo `main.py` se conserva como app integrada de compatibilidad, pero el flujo principal del proyecto es Docker + gateway + `main_*.py`.

## Autenticacion y seguridad

La API aplica middleware global de token:

- toda ruta privada requiere `Authorization: Bearer <token>`;
- la validacion se realiza con `services.auth_service.get_current_user`;
- las rutas publicas se declaran por servicio en `create_app`;
- login y verificacion OTP tienen rate limiting;
- logout server-side invalida tokens mediante blacklist.

Rutas publicas principales:

- `GET /`
- `GET /health`
- `GET /health/db`
- `POST /auth/login`
- `POST /auth/otp/verify`
- `GET /docs`
- `GET /redoc`
- `GET /openapi.json`

## Endpoints principales

### Auth y users

- `POST /auth/login`
- `POST /auth/otp/verify`
- `GET /auth/token`
- `POST /auth/logout`
- `POST /auth/logout/all`
- `GET /users/`
- `POST /users/`
- `GET /users/me`
- `PUT /users/me`
- `DELETE /users/me`
- `GET /users/{user_id}`
- `GET /users/{user_id}/exists`
- `PUT /users/{user_id}/admin`
- `DELETE /users/{user_id}`

### Home

- `GET /intranet/home`
- `GET /intranet/series/fichaje`
- `GET /intranet/series/clientes`
- `GET /intranet/series/trabajos`
- `GET /intranet/series/pagos`

### Fichaje

- `GET /intranet/fichaje`
- `POST /intranet/fichaje/registrar`
- `POST /intranet/fichaje/ultimo/eliminar`
- `GET /intranet/fichaje/export`
- `GET /intranet/fichaje/export/pdf`

### Clientes

- `GET /intranet/clientes`
- `GET /intranet/clientes/{cliente_id}`
- `POST /intranet/clientes`
- `PUT /intranet/clientes/{cliente_id}`
- `DELETE /intranet/clientes/{cliente_id}`

### Trabajos

- `GET /intranet/trabajos`
- `POST /intranet/trabajos`
- `GET /intranet/trabajos/{trabajo_id}`
- `PUT /intranet/trabajos/{trabajo_id}`
- `DELETE /intranet/trabajos/{trabajo_id}`
- `GET /intranet/trabajos/{trabajo_id}/empleados`
- `POST /intranet/trabajos/{trabajo_id}/empleados`
- `DELETE /intranet/trabajos/{trabajo_id}/empleados/{empleado_id}`
- `GET /intranet/trabajos/{trabajo_id}/comentarios`
- `POST /intranet/trabajos/{trabajo_id}/comentarios`

### Pagos, deuda y facturas

- `GET /intranet/pagos`
- `GET /intranet/deuda`
- `GET /intranet/facturas/export/csv`
- `POST /intranet/facturas`
- `GET /intranet/facturas/{factura_id}`
- `PUT /intranet/facturas/{factura_id}`
- `DELETE /intranet/facturas/{factura_id}`
- `POST /intranet/facturas/{factura_id}/pagos`

### Calendario fiscal

- `GET /intranet/calendario-fiscal?year=&month=`
- `GET /intranet/calendario-fiscal/export/ics?year=&month=`

### Admin

- `GET /intranet/admin/resumen`
- `GET /intranet/admin/charts`
- `GET /intranet/admin/fichajes`
- `POST /intranet/admin/fichajes/correccion`
- `GET /intranet/admin/auditoria`
- `GET /intranet/admin/cierre/pdf`

### IA

- `POST /ai/chat`
- `GET /ai/gia/conversations`
- `POST /ai/gia/conversations`
- `GET /ai/gia/conversations/{conversation_id}`
- `POST /ai/gia/conversations/{conversation_id}/messages`
- `GET /ai/gia/files/{file_id}/download`

## Scope por rol

- El administrador puede consultar y operar sobre todos los datos de la intranet.
- El empleado queda acotado al scope asociado a su usuario/empleado, salvo acciones que el producto haya abierto expresamente.
- La UI aplica visibilidad por rol, pero la autorizacion real debe mantenerse en backend.

## Pruebas

Desde `backend/`:

```bash
python -m pytest -q
```

Tests existentes:

- `tests/test_intranet_home.py`
- `tests/test_intranet_tabs.py`
- `tests/test_user_service.py`

La cobertura debe ampliarse especialmente en endpoints de escritura, auditoria, clientes, trabajos, facturas y pagos.
