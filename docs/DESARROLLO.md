# Desarrollo

Documento de seguimiento tecnico del MVP de GestorIA.

**Ultima revision:** 2026-05-08  
**Estado global:** MVP operativo avanzado. Sprints 1-4 completados; Sprint 5 en curso para herramientas, calidad y cierre de deuda tecnica.

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
| M10 Herramientas | En curso | Calendario fiscal ya esta conectado a microservicio y BD; GIA sustituye a Documentos con conversaciones/archivos reales; ajustes tiene UI alineada con prototipo y sigue pendiente de persistencia. |

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

- [x] Calendario fiscal: UI rediseñada segun prototipo visual de herramientas.
- [x] Calendario fiscal: microservicio `backend-calendario`, tabla `calendario_fiscal_vencimientos`, consulta mensual y exportacion ICS.
- [x] Calendario fiscal: datos reales servidos desde backend, con semillas AEAT 2026 en BD.
- [ ] Calendario fiscal: CRUD administrativo de vencimientos.
- [x] GIA: sustituye al antiguo modulo Documentos.
- [x] GIA: conversaciones persistidas, mensajes, adjuntos, descargas y generacion de PDF/imagenes.
- [x] GIA: frontend conectado al microservicio `backend-ai`.
- [x] Ajustes: UI rediseñada segun prototipos de seguridad y apariencia.
- [ ] Ajustes: sin persistencia.

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

---

## Proximos pasos recomendados

1. Completar persistencia real de Ajustes.
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
