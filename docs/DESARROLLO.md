# Desarrollo

Documento de seguimiento tecnico del MVP de GestorIA.

**Ultima revision:** 2026-05-07  
**Estado global:** MVP operativo avanzado. Sprints 1-4 completados; Sprint 5 pendiente para herramientas, calidad y cierre de deuda tecnica.

---

## Estado actual por modulo

| Modulo | Estado | Resumen |
|---|---|---|
| M1 Autenticacion y autorizacion | Completo | JWT, RBAC, bloqueo de login, logout server-side, OTP por SMS, rate limiting y CORS para Electron/gateway. |
| M2 Gestion de empleados | Completo | Alta, edicion, baja logica, roles, activacion, MFA y gestion desde panel admin. |
| M3 Fichaje | Completo | Entrada, salida, pausas, validaciones, correccion admin, CSV y PDF mensual. |
| M4 Clientes | Completo | CRUD, busqueda, validacion CIF/NIF, detalle, exportaciones y borrado en cascada. |
| M5 Trabajos | Completo | Kanban, CRUD, asignaciones, comentarios, estados, prioridades y exportaciones. |
| M6 Facturacion y pagos | Completo | Facturas, pagos, deuda viva, vencidos, tabs, KPIs y export CSV/PDF. |
| M7 Home | Completo | Resumen operativo, graficas, calendario y panel admin historico. |
| M8 Exportaciones | Avanzado | Fichaje CSV/PDF, facturas CSV/PDF, trabajos CSV/PDF y PDF de cierre mensual. |
| M9 Auditoria | Completo | Eventos en backend y UI de consulta para administradores. |
| M10 Herramientas | Placeholder | Calendario fiscal, documentos y ajustes siguen sin backend/persistencia completa. |

---

## Arquitectura actual

GestorIA se ejecuta como aplicacion Angular + Electron, con backend FastAPI separado por dominios y un gateway nginx.

### Frontend

- Angular 21 con componentes standalone y rutas lazy mediante `loadComponent`.
- Electron sirve el build compilado con protocolo `app://localhost`.
- `AuthStateService` mantiene estado global de usuario con signals.
- `authInterceptor` adjunta token Bearer y gestiona errores 401/403.
- `IntranetService` concentra las llamadas HTTP a la API.
- Estilos compartidos en `shared/styles`.

### Backend

El backend usa una factoria comun (`backend/app_factory.py`) y varios entry-points:

| Entry-point | Dominio |
|---|---|
| `main_auth.py` | Auth y users. |
| `main_home.py` | Home y series. |
| `main_fichaje.py` | Fichaje. |
| `main_clientes.py` | Clientes. |
| `main_trabajos.py` | Trabajos. |
| `main_pagos.py` | Pagos, deuda y facturas. |
| `main_admin.py` | Admin, auditoria y cierre. |
| `main_ai.py` | Chat IA. |

### Gateway

`nginx/nginx.conf` expone un unico puerto (`8008`) y enruta:

- `/auth`, `/users` -> `backend-auth`
- `/intranet/home`, `/intranet/series` -> `backend-home`
- `/intranet/fichaje` -> `backend-fichaje`
- `/intranet/clientes` -> `backend-clientes`
- `/intranet/trabajos` -> `backend-trabajos`
- `/intranet/pagos`, `/intranet/deuda`, `/intranet/facturas` -> `backend-pagos`
- `/intranet/admin` -> `backend-admin`
- `/ai` -> `backend-ai`

---

## Detalle funcional

### M1 - Autenticacion y autorizacion

- [x] Login por NIF/password con JWT.
- [x] Roles `administrador` y `empleado`.
- [x] Guards de ruta en frontend.
- [x] Interceptor de token.
- [x] Bloqueo temporal por intentos fallidos.
- [x] Logout server-side con blacklist de tokens.
- [x] Limpieza de estado en logout/login.
- [x] 2FA por SMS via Twilio.
- [x] Rate limiting en `/auth/login` y `/auth/otp/verify`.
- [x] CORS compatible con `app://localhost`, navegador local y gateway nginx.

### M2 - Gestion de empleados

- [x] Modelo `empleados` vinculado 1:1 a `usuarios`.
- [x] `GET /users/me` y `PUT /users/me`.
- [x] `POST /users/`, `PUT /users/{id}/admin`, `DELETE /users/{id}`.
- [x] Alta, edicion, activacion/desactivacion y cambio de rol desde UI.
- [x] Vista admin de empleados y resumen de fichajes.

### M3 - Fichaje

- [x] Registro de entrada/salida y pausas.
- [x] Validacion de secuencias.
- [x] Calculo de horas.
- [x] Deshacer ultimo fichaje.
- [x] Exportacion CSV por rango.
- [x] Exportacion PDF mensual con fpdf2.
- [x] Correccion manual desde admin.
- [x] Vista global de fichajes para administradores.

### M4 - Clientes

- [x] `GET /intranet/clientes`.
- [x] `GET /intranet/clientes/{id}`.
- [x] `POST /intranet/clientes`.
- [x] `PUT /intranet/clientes/{id}`.
- [x] `DELETE /intranet/clientes/{id}`.
- [x] Busqueda por nombre fiscal, CIF/NIF o email.
- [x] Validacion CIF/NIF en frontend y backend.
- [x] Control de duplicados.
- [x] Vista de detalle con resumen operativo.
- [x] Exportacion CSV/PDF.
- [x] Borrado fisico en cascada de trabajos, facturas y pagos asociados.

### M5 - Trabajos

- [x] `GET /intranet/trabajos` con filtros.
- [x] CRUD de trabajos.
- [x] Asignacion/desasignacion de empleados.
- [x] Comentarios internos.
- [x] Kanban por estado.
- [x] Prioridades, progreso y detalle lateral.
- [x] Exportacion CSV/PDF.
- [x] Creacion de trabajos abierta a todos los empleados segun ajuste de producto.

### M6 - Facturacion y pagos

- [x] `GET /intranet/pagos`.
- [x] `GET /intranet/deuda`.
- [x] `GET /intranet/facturas/export/csv`.
- [x] CRUD de facturas.
- [x] Registro de pagos sobre factura.
- [x] Deuda viva por cliente.
- [x] Tabs: Facturas / Deuda viva / Pagos recientes.
- [x] KPIs de facturado, cobrado, pendiente y vencido.
- [x] Resaltado de facturas vencidas.
- [x] Exportacion CSV/PDF.

### M7 - Home y panel operativo

- [x] KPIs de horas, clientes, trabajos y cobros.
- [x] Series trimestrales.
- [x] Calendario visual de fichajes.
- [x] Panel admin con KPIs y graficas historicas.
- [x] Grafica combinada con tooltip y toggles.
- [ ] `v_resumen_mensual` existe en BD, pero no esta integrada como fuente unica del Home.

### M8 - Exportaciones

- [x] CSV de fichaje.
- [x] PDF mensual de fichaje.
- [x] CSV/PDF de facturas.
- [x] CSV/PDF de trabajos.
- [x] CSV/PDF en tabs admin de fichajes y trabajos.
- [x] PDF mensual de cierre: `GET /intranet/admin/cierre/pdf?year=&month=`.

### M9 - Auditoria

- [x] Migracion `V010__auditoria_eventos.sql`.
- [x] Servicio `auditoria_service.py`.
- [x] Registro de eventos de clientes, trabajos, facturas, pagos, fichajes y empleados.
- [x] UI en panel admin.
- [x] Endpoint `GET /intranet/admin/auditoria`.

### M10 - Herramientas

- [ ] Calendario fiscal: UI estatica, sin modelo ni endpoints.
- [ ] Documentos: UI placeholder, sin almacenamiento ni endpoints.
- [ ] Ajustes: UI estatica, sin persistencia.

---

## Deuda tecnica

### Frontend

- [x] Estado global de usuario con `AuthStateService`.
- [x] Manejo centralizado de 401/403 en interceptor.
- [x] `withInMemoryScrolling` para restaurar scroll.
- [x] `OnDestroy` + `takeUntil(destroy$)` en pages principales.
- [x] `withFetch()` para evitar limites de conexiones XHR.
- [x] Locale `es` registrado globalmente.
- [x] Paleta visual unificada.
- [ ] Mejorar tests unitarios de componentes grandes.
- [ ] Completar estados de carga/skeleton en modulos auxiliares.

### Backend

- [x] Refactor de servicios por dominio.
- [x] Division de rutas en `routes/intranet/*.py`.
- [x] Separacion por microservicios Docker.
- [x] Gateway nginx.
- [x] Rate limiting en auth.
- [x] Validacion NIF/CIF.
- [ ] Ampliar tests de escritura en clientes, trabajos, facturas, pagos y auditoria.
- [ ] Revisar cobertura tras microservicios.

### Base de datos

- [x] Triggers de fichaje, pagos y estado de factura.
- [x] Vistas `v_deuda_por_cliente`, `v_horas_diarias`, `v_resumen_mensual`.
- [x] Blacklist de tokens.
- [x] OTP 2FA.
- [x] Cascada para eliminar datos dependientes de cliente.
- [x] Auditoria.
- [ ] Revisar duplicidad de numeracion de migraciones `V003`.

### Repositorio

- [ ] Decidir si `landing/.next`, caches y artefactos generados deben salir del versionado.
- [ ] Mantener README y documentacion sincronizados con Docker Compose y nginx.

---

## Proximos pasos recomendados

1. Completar M10: calendario fiscal, documentos y ajustes con backend real.
2. Ampliar tests de integracion de escritura.
3. Revisar politica exacta de permisos de empleados en clientes, trabajos y facturas.
4. Conectar `v_resumen_mensual` al Home o documentar por que no se usa.
5. Limpiar artefactos generados del repositorio.
6. Preparar configuracion productiva de secretos, backups y logs.

---

## Documentacion relacionada

- `README.md`: presentacion de producto.
- `MEMORIA.md`: memoria tecnica y flujo completo de trabajo.
- `app/README.md`: frontend Angular/Electron.
- `backend/README.md`: API, microservicios y endpoints.
- `docs/PLAN_SPRINTS.md`: plan de sprints y estado de HUs.
- `docs/modelo_datos.md`: modelo relacional y migraciones.
- `docs/estudio_caso_mvp_gestoria.md`: alcance funcional inicial del MVP.

