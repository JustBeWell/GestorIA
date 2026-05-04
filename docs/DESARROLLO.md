# Desarrollo

## Contexto
Este documento sigue el avance del MVP descrito en `docs/estudio_caso_mvp_gestoria.md` y sirve como guia de trabajo para no perder el hilo entre sesiones.

Ultima revision: 2026-05-04 (Sprint 2 — M5 Gestion de trabajos completo)

---

## Estado actual por modulo

### M1 · Autenticacion y autorizacion — COMPLETO
- [x] Login por NIF/password con JWT
- [x] Roles administrador/empleado (RBAC)
- [x] Guard de ruta en frontend (`auth.guard.ts`)
- [x] Interceptor de token en peticiones (`auth.interceptor.ts`)
- [x] Endpoint `/auth/login` y `/auth/me`
- [x] Bloqueo por intentos fallidos (columnas en BD + logica backend)
- [x] Logout con invalidacion de token en servidor (blacklist con TTL)
- [x] Logout con confirmacion modal en sidebar y en modulo-page
- [x] Limpieza de cache de empleado en logout y en nuevo login (evita datos obsoletos entre usuarios)
- [x] 2FA por SMS via Twilio (OTP 6 digitos, expiracion 10 min, hash SHA-256 en BD)
- [x] Normalizacion de telefono a formato E.164 (+34 para numeros espanoles)
- [x] CORS configurado para origen `app://localhost` (Electron) en `allow_origins` de Starlette

---

### M2 · Gestion de empleados — COMPLETO
- [x] Modelo `empleados` en BD con relacion 1:1 a `usuarios`
- [x] Endpoint `GET /users/me` — datos propios
- [x] Endpoint `PUT /users/me` — edicion de nombre/apellidos/telefono
- [x] Endpoint `POST /users/` — crear usuario+empleado (solo admin)
- [x] Endpoint `PUT /users/{id}/admin` — cambiar rol/activo/mfa (solo admin)
- [x] Endpoint `DELETE /users/{id}` — baja logica
- [x] UI: pantalla de gestion de empleados en panel admin
- [x] Vista de resumen de fichajes por empleado (solo admin)
- [x] Listado de empleados con filtros para el gerente
- [x] Activacion/desactivacion desde UI
- [x] Modal de alta de empleado desde UI
- [x] Modal de edicion de empleado desde UI (rol, activo, mfa)

---

### M3 · Fichaje — COMPLETO
- [x] Registro de entrada/salida con validaciones
- [x] Soporte de pausas inicio/fin (migracion V002 aplicada)
- [x] Regla: no dos entradas/salidas consecutivas
- [x] Calculo de duracion diaria y horas totales
- [x] Deshacer ultimo fichaje del dia
- [x] Exportacion CSV por rango de fechas
- [x] Exportacion PDF mensual con fpdf2 (cabecera corporativa, tabla de dias, resumen estadistico)
- [x] UI completa con calendario, detalle de dia y modal de error
- [x] Filtros por tipo evento y rango de fechas
- [x] Correccion manual por gerente desde UI
- [x] Vista de fichajes de todos los empleados (solo admin)

---

### M4 · Gestion de clientes — COMPLETO (Sprint 1 · 2026-05-04)
- [x] Endpoint `GET /intranet/clientes` — listado con resumen
- [x] Series trimestrales de clientes activos
- [x] Modelo `clientes` en BD con CIF/NIF unico y borrado logico
- [x] **UI: pantalla de clientes** — tabla completa con estado de carga y estado vacio
- [x] Formulario de alta de cliente con validacion CIF/NIF en frontend y backend
- [x] Formulario de edicion con precarga de datos (incluye campos de direccion)
- [x] Baja logica con confirmacion modal + toggle "Mostrar inactivos"
- [x] Busqueda reactiva por nombre fiscal, CIF/NIF o email
- [x] Vista de detalle de cliente con resumen operativo (trabajos y facturas)
- [x] Validacion de formato CIF/NIF en frontend (regex DNI/NIE/CIF) y backend (Pydantic)
- [x] Endpoints de escritura: `POST /clientes` (201), `PUT /clientes/{id}`, `DELETE /clientes/{id}` (204)
- [x] Endpoint `GET /clientes/{id}` — detalle completo con agregados
- [x] Control 409 para CIF/NIF duplicado, 403 para no-admin en escritura
- [x] Vista admin muestra TODOS los clientes (sin filtro por empleado); empleado ve solo sus asignados
- [x] RBAC en UI: botones de alta/edicion/baja solo visibles para rol administrador

---

### M5 · Gestion de trabajos — COMPLETO (Sprint 2 · 2026-05-04)
- [x] Endpoint `GET /intranet/trabajos` — listado filtrado por estado, prioridad, cliente, rango
- [x] Series trimestrales de trabajos finalizados
- [x] Modelo `trabajos` en BD con estados y prioridades
- [x] Tabla `trabajo_empleado` para asignaciones N:M
- [x] Tabla `comentarios_trabajo` para comentarios internos por trabajo (migracion V008)
- [x] Campo `nro_trabajo` autoincremental en tabla `trabajos` (migracion V008)
- [x] Endpoints de escritura: `POST /trabajos` (201), `PUT /trabajos/{id}`, `DELETE /trabajos/{id}` (204, baja logica)
- [x] Endpoint de detalle: `GET /trabajos/{id}` — informacion completa con empleados asignados
- [x] Endpoints de asignacion: `POST/DELETE /trabajos/{id}/empleados`
- [x] Endpoints de comentarios: `GET/POST /trabajos/{id}/comentarios`
- [x] **UI: Kanban board** — 4 columnas (Pendiente/En curso/Bloqueado/Finalizado) con tarjetas
- [x] Tarjetas con referencia T-XXXX, badge de prioridad, barra de progreso (en_curso), avatares de empleados
- [x] Panel lateral de detalle con cambio rapido de estado, asignacion/desasignacion de empleados, comentarios
- [x] Formulario de alta y edicion de trabajo con validacion
- [x] Baja logica con confirmacion modal (estado → cancelado)
- [x] Filtros por prioridad y cliente con toggle de cancelados
- [x] Vista admin muestra TODOS los trabajos; empleado ve solo los que tiene asignados
- [x] RBAC en UI: alta/edicion/baja/asignacion solo visibles para rol administrador

---

### M6 · Facturacion y pagos — PENDIENTE (backend parcial, UI placeholder)
- [x] Endpoint `GET /intranet/pagos` — listado facturas y pagos con filtros
- [x] Series trimestrales de pagos cobrados
- [x] Modelos `facturas` y `pagos` en BD con triggers de validacion
- [x] Vista `v_deuda_por_cliente` en BD
- [ ] **UI: pantalla de pagos** — actualmente muestra "Work in progress"
- [ ] Formulario de alta de factura
- [ ] Registro de pago parcial o total
- [ ] Vista de deuda viva por cliente
- [ ] Listado de facturas vencidas con alerta visual
- [ ] Endpoints de escritura: `POST`, `PUT` facturas y pagos (no existen en backend)
- [ ] Exportacion de listado de deuda/facturas a CSV

---

### M7 · Resumen operativo — COMPLETO (Home)
- [x] Panel Home con horas fichaje, clientes activos, trabajos en curso, cobrado mes
- [x] Graficas sparkline con serie mensual de horas por dia
- [x] Card de fichaje con horas del dia, total mensual y diferencial vs media
- [x] Series trimestrales para todas las metricas del dashboard
- [x] Calendario visual de fichajes del mes con detalle por dia
- [x] Panel de administracion con KPIs, graficas historicas 12 meses y gestion de empleados y fichajes
- [x] Graficas del panel admin reactivas con signals (cargan sin necesidad de refrescar)- [x] Gráfica combinada histórica: 6 series normalizadas, hover con tooltip, toggle de series y toggle Combinada/Individual- [ ] Vista `v_resumen_mensual` de BD no conectada al Home (disponible en BD, no usada)

---

### M8 · Exportaciones — PARCIAL
- [x] Exportacion CSV de fichaje por rango de fechas
- [x] Exportacion PDF de fichaje mensual (fpdf2, endpoint GET /intranet/fichaje/export/pdf)
- [ ] Exportacion de listado de facturas/deuda a CSV
- [ ] Generacion de documento mensual de cierre

---

### M9 · Auditoria — PENDIENTE
- [x] Tabla `auditoria_eventos` preparada en BD con estructura completa
- [ ] Escritura de eventos de auditoria desde el backend (ninguna accion la usa aun)
- [ ] UI de visualizacion de auditoria (solo para admin)
- [ ] Registro de correcciones de fichaje en auditoria
- [ ] Registro de altas/bajas de empleados, clientes y facturas

---

### M10 · Modulos de herramientas — PLACEHOLDER
- [ ] **Calendario fiscal** — actualmente muestra datos estaticos hardcodeados; no hay backend ni modelo de datos
- [ ] **Documentos** — pagina placeholder sin funcionalidad; no hay backend, ni almacenamiento, ni modelo
- [ ] **Ajustes** — pagina con UI estatica; sin persistencia ni endpoints de configuracion

---

## Deuda tecnica y mejoras transversales

### Frontend
- [ ] Estado global de usuario (actualmente cada pagina lee de `sessionStorage` directamente)
- [ ] Manejo de errores HTTP centralizado (el interceptor de auth existe pero no cubre errores de negocio)
- [x] Feedback de carga en modulo de clientes (loading signal + estado vacio)
- [ ] Feedback de carga en modulos de trabajos/pagos (pendiente Sprint 2/3)
- [ ] Tests unitarios en componentes Angular (solo existe `app.spec.ts`)

### Backend
- [x] Endpoints de escritura para clientes (POST/PUT/DELETE — Sprint 1)
- [ ] Endpoints de escritura para trabajos, facturas y pagos (pendiente Sprints 2/3)
- [x] Paginacion en endpoint de clientes (page_size hasta 200, default 50)
- [x] Validacion de formato NIF/CIF en backend (Pydantic field_validator con regex)
- [ ] Rate limiting en endpoints de autenticacion
- [ ] Tests de integracion para escritura (los tests existentes cubren solo lectura)
- [ ] Cobertura de tests en services de clientes, trabajos y pagos

### Base de datos
- [x] Aplicar triggers definidos en modelo (`trg_validar_fichaje`, `trg_validar_pago`, `trg_actualizar_estado_factura`) — ya presentes en V001
- [x] Vistas `v_deuda_por_cliente`, `v_horas_diarias`, `v_resumen_mensual` — creadas en migración V003
- [x] Migracion V003 aplicada — vistas analíticas
- [x] Indice en `fichajes(empleado_id, fecha_hora)` — ya presente en V001 (`idx_fichajes_empleado_fecha`)
- [x] Campo `intentos_fallidos` y `bloqueado_hasta` en `usuarios` — lógica de bloqueo implementada en `auth_service.py`

---

## Proximos pasos recomendados (orden de prioridad)

> Plan detallado en `docs/PLAN_SPRINTS.md`

1. ~~**UI y endpoints de gestion de clientes**~~ — **COMPLETADO** en Sprint 1 (2026-05-04)
2. **Sprint 2 — UI y endpoints de gestion de trabajos** — backend GET listo, falta escritura y UI
3. **Sprint 3 — UI y endpoints de facturacion/pagos**
4. **Sprint 4 — Auditoria** — conectar eventos de escritura con `auditoria_eventos` + UI
5. **Sprint 5 — Herramientas** — Calendario fiscal, Documentos, Ajustes + deuda tecnica

---

## Fuera del MVP (v1+)

- Portal cliente externo
- IA para generacion de documentos y deteccion de anomalias
- Notificaciones automaticas por email
- 2FA obligatoria para todos los usuarios (actualmente es opcional por usuario)
- Integraciones externas (banca, firma electronica)
- Multiempresa
- Analitica historica avanzada
