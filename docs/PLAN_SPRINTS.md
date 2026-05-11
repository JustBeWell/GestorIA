# Plan de Sprints - GestorIA MVP

**Generado:** 2026-05-04  
**Ultima revision:** 2026-05-08  
**Estado global:** Sprints 1-4 completados. Sprint 5 en curso para herramientas, calidad y deuda tecnica.

---

## Contexto

El plan original se organizo alrededor de las dependencias del dominio:

```text
M4 Clientes -> M5 Trabajos -> M6 Facturacion -> M9 Auditoria + M8 Exportaciones -> M10 Herramientas + Calidad
```

Antes de este plan ya estaban completados M1 Auth, M2 Empleados, M3 Fichaje y M7 Home. Durante el desarrollo se completo la operativa principal del MVP y despues se refactorizo el backend a microservicios FastAPI con nginx como gateway.

---

## Resumen visual

| Sprint | Modulos | Estado | Resultado |
|---|---|---|---|
| S1 | M4 Clientes | Completo | CRUD, busqueda, detalle, validaciones y exportaciones. |
| S2 | M5 Trabajos | Completo | Kanban, CRUD, asignaciones, comentarios y exportaciones. |
| S3 | M6 Facturacion y pagos | Completo | Facturas, pagos, deuda viva, tabs, KPIs y exportaciones. |
| S4 | M9 Auditoria + M8 Exportaciones | Completo | Auditoria transversal, CSV facturas y PDF cierre mensual. |
| S5 | M10 + Calidad | En curso | Rediseño visual de herramientas, tests y limpieza de deuda tecnica. |

---

## Sprint 1 - Gestion de clientes (M4)

**Objetivo:** dejar clientes 100% operativo en backend y frontend.

**Estado:** completado el 2026-05-04.

### Historias completadas

- [x] HU-M4-01 - Endpoints de escritura: `POST`, `PUT`, `DELETE /intranet/clientes`.
- [x] HU-M4-02 - Pantalla de listado de clientes.
- [x] HU-M4-03 - Buscador por nombre fiscal, CIF/NIF o email.
- [x] HU-M4-04 - Formulario de alta.
- [x] HU-M4-05 - Formulario de edicion.
- [x] HU-M4-06 - Baja/eliminacion con confirmacion.
- [x] HU-M4-07 - Vista de detalle con trabajos y facturas asociadas.

### Evoluciones posteriores

- [x] Exportacion CSV/PDF.
- [x] Validacion CIF/NIF en frontend y backend.
- [x] Scope por rol.
- [x] Borrado fisico en cascada de trabajos, facturas y pagos asociados mediante `V009__cascade_delete_cliente.sql`.

---

## Sprint 2 - Gestion de trabajos (M5)

**Objetivo:** modulo de trabajos full stack con asignaciones, estados y comentarios.

**Estado:** completado el 2026-05-04.

### Historias completadas

- [x] HU-M5-01 - CRUD de trabajos.
- [x] HU-M5-02 - Asignacion/desasignacion de empleados.
- [x] HU-M5-03 - Comentarios internos.
- [x] HU-M5-04 - Pantalla de trabajos.
- [x] HU-M5-05 - Filtros por estado, prioridad y cliente.
- [x] HU-M5-06 - Formulario de alta/edicion.
- [x] HU-M5-07 - Cambio de estado y asignaciones desde UI.
- [x] HU-M5-08 - Comentarios en detalle de trabajo.

### Evoluciones posteriores

- [x] Kanban con cuatro estados principales.
- [x] `nro_trabajo` autoincremental y comentarios mediante `V008__trabajos_nro_comentarios.sql`.
- [x] Exportacion CSV/PDF.
- [x] Correccion del refresco del Kanban.
- [x] Creacion de trabajos abierta a empleados segun ajuste de producto.

---

## Sprint 3 - Facturacion y pagos (M6)

**Objetivo:** gestionar facturas, cobros, deuda viva y vencimientos.

**Estado:** completado entre 2026-05-06 y 2026-05-07.

### Historias completadas

- [x] HU-M6-01 - Endpoints de escritura de facturas.
- [x] HU-M6-02 - Registro de pagos sobre factura.
- [x] HU-M6-03 - Pantalla de listado de facturas.
- [x] HU-M6-04 - Formulario de alta/edicion de factura.
- [x] HU-M6-05 - Modal de registro de pago.
- [x] HU-M6-06 - Vista de deuda viva por cliente.
- [x] HU-M6-07 - Exportacion CSV/PDF de facturas desde UI y endpoint CSV backend.

### Endpoints resultantes

- `GET /intranet/pagos`
- `GET /intranet/deuda`
- `GET /intranet/facturas/export/csv`
- `POST /intranet/facturas`
- `GET /intranet/facturas/{factura_id}`
- `PUT /intranet/facturas/{factura_id}`
- `DELETE /intranet/facturas/{factura_id}`
- `POST /intranet/facturas/{factura_id}/pagos`

### Correcciones relevantes

- [x] `page_size_facturas` acepta hasta 500.
- [x] Navegacion post-carga corregida con `withInMemoryScrolling`, `withFetch()` y `takeUntil`.
- [x] Locale `es` registrado globalmente.
- [x] Admin puede operar sobre todas las facturas; empleado queda acotado por scope.

---

## Sprint 4 - Auditoria (M9) + exportaciones restantes (M8)

**Objetivo:** trazabilidad transversal y cierre mensual exportable.

**Estado:** completado el 2026-05-07.

### Historias completadas

- [x] HU-M9-01 - Servicio de auditoria (`services/auditoria_service.py`).
- [x] HU-M9-02 - Eventos en clientes y trabajos.
- [x] HU-M9-03 - Eventos en facturas, pagos, empleados y fichajes.
- [x] HU-M9-04 - Consulta de auditoria para admin.
- [x] HU-M9-05 - UI de auditoria en panel admin.
- [x] HU-M8-01 - PDF mensual de cierre.
- [ ] HU-M8-02 - Conectar `v_resumen_mensual` como fuente unica del Home.

### Endpoints resultantes

- `GET /intranet/admin/auditoria`
- `GET /intranet/admin/cierre/pdf?year=&month=`
- exportaciones CSV/PDF en pantallas generales y tabs admin de fichaje/trabajos

### Observacion

La vista `v_resumen_mensual` existe en base de datos, pero el Home aun no depende de ella como unica fuente de verdad.

---

## Refactor posterior - Microservicios y gateway

Tras completar los sprints funcionales se realizo un refactor arquitectonico:

- [x] Division de rutas de intranet en `backend/routes/intranet/*.py`.
- [x] Separacion de entry-points `main_*.py`.
- [x] Docker Compose con servicios `backend-auth`, `backend-home`, `backend-fichaje`, `backend-clientes`, `backend-trabajos`, `backend-pagos`, `backend-admin` y `backend-ai`.
- [x] nginx como API gateway en `8008`.
- [x] Adaptacion del launcher Electron al arranque de microservicios.
- [x] Correccion de CORS en gateway.
- [x] Splash screen con barra dinamica RAF y mensajes por pasos.

---

## Sprint 5 - Herramientas, calidad y deuda tecnica

**Objetivo:** cerrar lo pendiente para una version mas madura y mantenible.

**Estado:** en curso.

### HU-M10-01 - Calendario fiscal

- [x] Modelo de datos para calendario fiscal/laboral.
- [x] Microservicio `backend-calendario` y ruta de gateway.
- [x] Endpoint de consulta por ano/mes.
- [x] Exportacion ICS desde backend.
- [x] UI rediseñada segun prototipo visual y conectada a datos reales AEAT/TGSS.
- [x] Navegacion por mes/ano, alta manual de vencimientos extra y seguimiento pendiente/realizado.
- [ ] Edicion y borrado administrativo de vencimientos fiscales.

### HU-M10-02 - GIA

- [x] Sustituir el modulo Documentos por el portal GIA.
- [x] Modelo de conversaciones, mensajes y archivos `gia_*`.
- [x] Endpoints de conversaciones, mensajes, adjuntos y descargas.
- [x] Lectura de archivos de texto/PDF e imagenes adjuntas para contexto de IA.
- [x] Generacion de PDF e imagenes mediante OpenAI.
- [x] UI de portal IA con historial y adjuntos.

### HU-M10-03 - Ajustes

- [x] UI rediseñada segun prototipos de seguridad y apariencia.
- [ ] Modelo de configuracion.
- [ ] Endpoints de lectura/escritura para admin.
- [ ] Persistencia de nombre de empresa, logo, jornada estandar, IVA por defecto u otros parametros.

### HU-DT-01 - Tests de integracion

- [ ] Clientes: create/update/delete.
- [ ] Trabajos: CRUD, asignaciones y comentarios.
- [ ] Facturas/pagos: sobrepago, anulacion y estados.
- [ ] Auditoria: insercion de eventos.

### HU-DT-02 - Limpieza de repositorio

- [x] Revisar `landing/.next`.
- [ ] Revisar `__pycache__`, caches y artefactos generados.
- [x] Ajustar `.gitignore` si procede.

### HU-DT-03 - Documentacion y despliegue

- [x] Actualizar README principal a presentacion de producto.
- [x] Actualizar README frontend/backend a arquitectura actual.
- [ ] Documentar una guia de despliegue productivo con secretos, backups y logs.

---

## Criterio de aceptacion global del MVP

- [x] Autenticacion y roles.
- [x] Empleados.
- [x] Fichaje con CSV/PDF.
- [x] Clientes full stack.
- [x] Trabajos full stack.
- [x] Facturacion y pagos full stack.
- [x] Deuda viva.
- [x] Home operativo.
- [x] Auditoria.
- [x] Exportaciones principales.
- [x] App de escritorio macOS.
- [x] Backend modularizado en microservicios locales con gateway.
- [ ] Herramientas M10 completas.
- [ ] Cobertura de tests suficiente para escritura y reglas criticas.
- [x] Limpieza de artefactos generados de landing/build.

---

## Registro de aprobaciones

| Hito | Fecha | Estado | Observaciones |
|---|---|---|---|
| Plan completo | 2026-05-04 | Aprobado | Arrancado inmediatamente. |
| Sprint 1 | 2026-05-04 | Completado | Gestion de clientes. |
| Sprint 2 | 2026-05-04 | Completado | Gestion de trabajos. |
| Sprint 3 | 2026-05-06/07 | Completado | Facturacion, pagos y deuda viva. |
| Sprint 4 | 2026-05-07 | Completado | Auditoria y exportaciones. |
| Refactor microservicios | 2026-05-07 | Completado | Docker + nginx gateway + launcher adaptado. |
| Sprint 5 · limpieza repo | 2026-05-08 | Completado | `.gitignore` ampliado y outputs `landing/.next`/`landing/out` fuera del indice. |
| Sprint 5 · calendario fiscal end-to-end | 2026-05-08 | Completado | Microservicio, migraciones `V011`/`V013`, gateway, endpoint mensual, exportacion ICS y UI conectada a backend. Pendiente CRUD administrativo. |
| Sprint 5 | 2026-05-08 | En curso | M10, tests y despliegue productivo. |
