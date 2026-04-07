# Backend API (User Service)

Este backend expone la API de autenticación, gestión de usuarios y portada de intranet para GestorIA.

## Estado actual

- Framework: FastAPI
- Base de datos: PostgreSQL
- Autenticación: JWT Bearer Token
- Suite de tests: `27 passed`

## Estructura

- `main.py`: inicialización de app, CORS, middleware global de auth y health checks.
- `routes/`: endpoints HTTP (`auth.py`, `users.py`, `intranet.py`).
- `services/`: lógica de negocio (`auth_service.py`, `user_service.py`, `intranet_service.py`).
- `models.py`: contratos Pydantic de request/response.
- `database.py`: conexión y health de PostgreSQL.
- `pytest.ini`: configuración de pruebas.

## Variables de entorno requeridas

Definidas en `service_config.py`:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_SSLMODE`
- `DATABASE_URL` (opcional, si se define reemplaza la construcción manual)
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_EXPIRATION_HOURS`
- `FRONTEND_URL`

Para desarrollo local, existe una plantilla en `backend/.env.example`.

## Ejecución local

Desde `backend/`:

```bash
python -m uvicorn main:app --reload --port 8008
```

OpenAPI:

- Swagger: `http://localhost:8008/docs`
- ReDoc: `http://localhost:8008/redoc`

## Modelo de autenticación

La app aplica middleware global de token en `main.py`:

- Toda ruta requiere `Authorization: Bearer <token>` salvo rutas públicas.
- Validación por `services.auth_service.get_current_user`.

### Rutas públicas

- `GET /`
- `POST /auth/login`
- `GET /auth/google/login`
- `GET /auth/google/callback`
- `POST /auth/google/token`
- `GET /health`
- `GET /health/db`

### Rutas protegidas

Todo lo demás (`/auth/token`, `/auth/logout`, `/users/*`, `/intranet/*`).

## Endpoints principales

### Auth

- `POST /auth/login`
  - body: `{ dni, password }`
  - devuelve token JWT y datos básicos de usuario.
- `GET /auth/token`
  - renueva token para usuario autenticado.
- `POST /auth/logout`
- `POST /auth/logout/all`

### Users

- `GET /users/`
- `POST /users/` (solo `administrador`)
- `GET /users/me`
- `PUT /users/me`
- `DELETE /users/me`
- `GET /users/{user_id}`
- `GET /users/{user_id}/exists`
- `PUT /users/{user_id}/admin` (solo `administrador`)
- `DELETE /users/{user_id}` (solo `administrador`)

### Intranet

- `GET /intranet/home`
- `GET /intranet/fichaje`
- `GET /intranet/clientes`
- `GET /intranet/trabajos`
- `GET /intranet/pagos`

## Filtros y paginación

### `GET /intranet/fichaje`

Query params:

- `page` (default: 1)
- `page_size` (default: 20, max: 100)
- `tipo_evento` (`entrada` | `salida`)
- `fecha_desde` (YYYY-MM-DD)
- `fecha_hasta` (YYYY-MM-DD)

Response incluye:

- `resumen`
- `eventos_recientes`
- `paginacion { page, page_size, total, total_pages }`

### `GET /intranet/trabajos`

Query params:

- `page`, `page_size`
- `estado`
- `prioridad`
- `cliente_id`
- `fecha_desde`, `fecha_hasta`

Response incluye:

- `resumen`
- `trabajos`
- `paginacion`

### `GET /intranet/pagos`

Query params:

- Facturas: `page_facturas`, `page_size_facturas`
- Pagos: `page_pagos`, `page_size_pagos`
- `estado_factura`
- `cliente_id`
- `vencidas_solo` (bool)
- `fecha_pago_desde`, `fecha_pago_hasta`

Response incluye:

- `resumen`
- `facturas`
- `pagos_recientes`
- `paginacion_facturas`
- `paginacion_pagos`

## Alcance de datos por empleado

Los endpoints de intranet están acotados al usuario autenticado:

- Se resuelve `user_id -> empleado_id`.
- Todos los datos de fichaje, trabajos, clientes y pagos se consultan dentro de ese scope.

## Pruebas

Desde `backend/`:

```bash
python -m pytest -q
```

Configuración en `pytest.ini` sin warnings de terceros para mantener salida limpia en CI.
