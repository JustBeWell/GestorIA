# Desarrollo

Documento de seguimiento tecnico del MVP de GestorIA.

**Ultima revision:** 2026-05-15  
**Estado global:** MVP operativo avanzado. Sprint de notificaciones completado (S-N1 a S-N5). Microservicio `backend-notifications` operativo con in-app, WebSocket y Web Push.

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
| M10 Herramientas | En curso | Calendario fiscal/laboral ya esta conectado a microservicio y BD; GIA sustituye a Documentos con conversaciones/archivos reales; ajustes tiene UI alineada con prototipo y sigue pendiente de persistencia. |
| M11 Notificaciones | Completo | Microservicio `backend-notifications` con in-app (WebSocket), Web Push (VAPID/Service Worker) y notificaciones Electron nativas. Scheduler APScheduler con 4 jobs cron. Transactional outbox con exponential backoff. Preferencias por usuario y tipo. Centro de notificaciones Angular con tabs, filtros y agrupacion por dia. |

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
| `main_calendario.py` | Calendario fiscal. |
| `main_admin.py` | Admin, auditoria y cierre. |
| `main_ai.py` | Chat IA y portal GIA. |
| `main_notifications.py` | Notificaciones, push y scheduler de vencimientos. |

### Gateway

`nginx/nginx.conf` expone un unico puerto (`8008`) y enruta:

- `/auth`, `/users` -> `backend-auth`
- `/intranet/home`, `/intranet/series` -> `backend-home`
- `/intranet/fichaje` -> `backend-fichaje`
- `/intranet/clientes` -> `backend-clientes`
- `/intranet/trabajos` -> `backend-trabajos`
- `/intranet/pagos`, `/intranet/deuda`, `/intranet/facturas` -> `backend-pagos`
- `/intranet/calendario-fiscal` -> `backend-calendario`
- `/intranet/admin` -> `backend-admin`
- `/ai` -> `backend-ai`
- `/intranet/notifications` -> `backend-notifications`
- `/internal/events` -> bloqueado 403 en gateway (acceso solo inter-servicio)

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
- [x] `v_resumen_mensual` integrada como fuente unica de KPIs del Home mediante `GET /intranet/resumen/mensual?year=&month=`.

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

- [x] Calendario fiscal: UI rediseñada segun prototipo visual de herramientas.
- [x] Calendario fiscal: microservicio `backend-calendario`, tabla `calendario_fiscal_vencimientos`, consulta mensual y exportacion ICS.
- [x] Calendario fiscal/laboral: datos reales servidos desde backend, con semillas 2026 para AEAT y TGSS.
- [x] Calendario fiscal: alta manual de vencimientos extra y cambio de estado pendiente/realizado.
- [x] Calendario fiscal: edicion y borrado administrativo de vencimientos con baja logica.
- [x] GIA: sustituye al antiguo modulo Documentos.
- [x] GIA: conversaciones persistidas, mensajes, adjuntos, descargas y generacion de PDF/imagenes.
- [x] GIA: frontend conectado al microservicio `backend-ai`.
- [x] Ajustes: UI funcional con perfil editable (nombre, apellidos, telefono) via `PUT /users/me`.
- [x] Ajustes: cambio de contrasena real via `POST /users/me/password` con verificacion bcrypt.
- [x] Ajustes: boton de cierre de sesion activo.
- [x] Ajustes: eliminados todos los ajustes sin backend (tema, acento, idioma, densidad, 2FA app, codigos de recuperacion, lista de sesiones, indicador de fortaleza de contrasena).
- [ ] Ajustes: toggle de 2FA (`mfa_habilitado`) pendiente en frontend.
- [ ] Ajustes: configuracion de empresa (nombre, logo, jornada, IVA) sin modelo ni endpoints.

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
- [x] Calendario fiscal con `calendario_fiscal_vencimientos`.
- [ ] Revisar duplicidad de numeracion de migraciones `V003`.

### Repositorio

- [x] `landing/.next` y `landing/out` salen del indice y quedan ignorados.
- [ ] Mantener README y documentacion sincronizados con Docker Compose y nginx.

---

## Iteraciones Sprint 5

### 2026-05-08 · HU-M10-01 Calendario fiscal end-to-end

- Rediseñada la pantalla `calendario-fiscal` para seguir la estructura del prototipo: KPIs superiores, calendario mensual, vencimientos laterales y leyenda de prioridad.
- Creado el microservicio `backend-calendario` con endpoint `GET /intranet/calendario-fiscal`, exportacion `GET /intranet/calendario-fiscal/export/ics`, ruta nginx y servicio Docker Compose.
- Anadida la migracion `V011__calendario_fiscal.sql` y un arranque defensivo de tabla/semillas para instalaciones locales sin migrador automatico.
- Conectada la UI Angular a `IntranetService`, eliminando datos hardcodeados de la pantalla.
- Pendiente: CRUD administrativo para mantener vencimientos desde la aplicacion.
- Verificacion: `npm run build` en `app/` correcto y tests backend del endpoint en `tests/test_intranet_tabs.py`. Se mantiene warning previo de presupuesto en `shared/styles/intranet-module-base.css`.

### 2026-05-08 · HU-M10-02 Documentos UI

- Rediseñada la pantalla `documentos` para seguir el prototipo: acciones superiores, carpetas fijadas, panel de almacenamiento, archivos recientes y tabla de carpetas.
- Se mantiene dentro de los patrones existentes de intranet con sidebar/topbar compartidos.
- Nota: iteracion supersedida por el portal GIA; el modulo Documentos ya no forma parte de la app.
- Verificacion: `npm run build` en `app/` correcto. Se mantiene warning previo de presupuesto en `shared/styles/intranet-module-base.css`.

### 2026-05-08 · HU-M10-02 GIA portal IA

- Sustituido el modulo `documentos` por `gia`; `/documentos` queda como redireccion legacy.
- Ampliado `backend-ai` con endpoints `/ai/gia/*` para conversaciones, mensajes, adjuntos y descargas.
- Anadida migracion `V012__gia_portal.sql` con `gia_conversaciones`, `gia_mensajes` y `gia_archivos`.
- GIA puede usar texto/PDF/imagenes adjuntas como contexto, generar PDFs con `fpdf2` y generar imagenes mediante OpenAI.
- Verificacion: `pytest -q` en `backend/` correcto y `npm run build` en `app/` correcto. Se mantiene warning previo de presupuesto en `shared/styles/intranet-module-base.css`.

### 2026-05-08 · HU-M10-03 Ajustes UI

- Rediseñada la pantalla `ajustes` como vista con navegacion interna `Seguridad`/`Apariencia`, reflejando ambos prototipos.
- Seguridad incluye contraseña, 2FA y sesiones activas; Apariencia incluye tema, color de acento, idioma y densidad.
- Pendiente: modelo de configuracion y endpoints de lectura/escritura para persistir estos ajustes.
- Verificacion: `npm run build` en `app/` correcto. Se mantiene warning previo de presupuesto en `shared/styles/intranet-module-base.css`.

### 2026-05-11 · Hotfix calendario fiscal gateway

- Corregido el 404 de `/intranet/calendario-fiscal` anadiendo una ruta explicita en nginx hacia `backend-calendario` con resolucion dinamica del DNS de Docker.
- Diagnostico por logs Docker: el 404 se producia en `gestoria-gateway` y no llegaba a `gestoria-backend-calendario`.
- Verificacion: `nginx -t` correcto, reload del gateway y `GET /intranet/calendario-fiscal?year=2026&month=5` con token local devuelve `200 OK`.

### 2026-05-11 · Calendario fiscal/laboral de asesoria

- Ampliadas las semillas del calendario 2026 con obligaciones habituales de asesoria: modelos 100/102, 111, 115, 130/131, 180/190, 200/202, 303/322/349/353/390, 347 y vencimientos TGSS/RETA.
- Anadida migracion `V013__calendario_asesoria_fiscal_laboral.sql` para nuevas instalaciones.
- El microservicio `backend-calendario` reinyecta estas semillas de forma idempotente en instalaciones existentes.

### 2026-05-11 · Calendario fiscal operativo

- Anadida navegacion por mes y ano anterior/siguiente en la pantalla de calendario fiscal.
- Separados los trabajos del mes en pendientes y realizados, con acciones para marcar como presentado o reabrir.
- Anadido alta manual de vencimientos extra desde la pantalla, persistida en `calendario_fiscal_vencimientos` mediante el microservicio `backend-calendario`.
- Actualizado el boton ICS para usar el patron visual de exportacion del resto de modulos.
- Verificacion: `pytest tests/test_intranet_tabs.py -q` en `backend/` correcto y `npm run build` en `app/` correcto. Se mantiene warning previo de presupuesto en `shared/styles/intranet-module-base.css`.

### 2026-05-13 · HU-M10-03 Ajustes funcionales

- Remodelada la pantalla `ajustes` para eliminar todos los ajustes sin backend real: se eliminan la pestana Apariencia (tema, color de acento, idioma, densidad), la seccion de 2FA con Google Authenticator y SMS de respaldo, los codigos de recuperacion, la lista de sesiones activas con dispositivos hardcodeados y el indicador de fortaleza de contrasena.
- Nueva estructura con dos secciones reales: "Mi perfil" y "Seguridad".
- Mi perfil: carga datos reales desde `GET /users/me` y permite edicion inline de nombre, apellidos y telefono mediante formulario reactivo que llama `PUT /users/me`. Muestra feedback de exito/error con auto-cierre.
- Seguridad: formulario de cambio de contrasena (contrasena actual + nueva + confirmacion) conectado al nuevo endpoint `POST /users/me/password`. Boton de cierre de sesion que delega en `AuthApiService.logout()`.
- Backend: anadido `ChangePasswordRequest` en `models.py`, metodo `UserService.change_password()` en `user_service.py` (verifica hash bcrypt, actualiza si correcto, lanza `ValueError` si incorrecta) y endpoint `POST /users/me/password` en `routes/users.py` (204 No Content en exito, 400 si contrasena actual erronea).
- CSS reducido de 529 a 279 lineas eliminando todos los estilos de componentes eliminados.
- Verificacion: sin errores de compilacion Angular ni Python.

### 2026-05-15 · Sprint notificaciones push in-app

- Anadida migracion `V015__notifications.sql` con `notifications`, `notification_preferences`, `push_subscriptions`, `notification_outbox` y `notification_dedupe`.
- Nuevo microservicio `backend-notifications` con endpoints `/intranet/notifications/*`, `/internal/events` firmado con HMAC, scheduler APScheduler y worker de outbox para Web Push VAPID.
- Integrados eventos de trabajos desde `TrabajosService`: asignacion, desasignacion, comentario nuevo, cambio de estado, cancelacion y cambio de prioridad.
- Frontend: servicio `NotificationsService`, registro de service worker, campana en la shell, centro `/notificaciones` y preferencias `/notificaciones/preferencias`.
- Gateway y Docker actualizados para enrutar `/intranet/notifications` y bloquear `/internal/events` desde el exterior.

### 2026-05-11 · Calendario fiscal listado por empleado

- Reordenada la pantalla para que el calendario ocupe todo el ancho y el listado de trabajos quede debajo como seccion plegable.
- Anadido `trabajos_por_empleado` al endpoint mensual, leyendo trabajos reales con `fecha_objetivo` desde `trabajos` y `trabajo_empleado`.
- El listado inferior separa vencimientos fiscales y trabajos por empleado, respetando permisos de administrador/empleado.
- Verificacion: `pytest tests/test_intranet_tabs.py -q` en `backend/` correcto y `npm run build` en `app/` correcto. Se mantiene warning previo de presupuesto en `shared/styles/intranet-module-base.css`.

### 2026-05-18 · HU-M10-01 CRUD administrativo de vencimientos

- Anadidos `PUT /intranet/calendario-fiscal/{vencimiento_id}` y `DELETE /intranet/calendario-fiscal/{vencimiento_id}`.
- El borrado es logico mediante `deleted_at` para evitar que el seed idempotente reactive vencimientos eliminados.
- La UI permite editar y eliminar vencimientos desde el listado mensual.

---

## Proximos pasos recomendados

1. Generar claves VAPID reales para produccion (`python -m pywebpush --gen-vapid`) y guardarlas en gestor de secretos.
2. Toggle de 2FA en ajustes (mfa_habilitado en frontend).
3. Job nocturno de limpieza de notificaciones antiguas (retention configurado en `NOTIFICATIONS_RETENTION_DAYS`, falta el job cron).
4. Ampliar tests de integracion de escritura, especialmente endpoints de notificaciones con BD real.
5. Revisar politica exacta de permisos de empleados en clientes, trabajos y facturas.
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
