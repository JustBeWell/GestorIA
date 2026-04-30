# Desarrollo

## Contexto
Este documento sigue el avance del MVP descrito en `docs/estudio_caso_mvp_gestoria.md` y sirve como guia de trabajo para no perder el hilo entre sesiones.

Ultima revision: 2026-04-30 (lanzador macOS + splash rediseñado)

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

### M4 · Gestion de clientes — PENDIENTE (backend OK, UI placeholder)
- [x] Endpoint `GET /intranet/clientes` — listado con resumen
- [x] Series trimestrales de clientes activos
- [x] Modelo `clientes` en BD con CIF/NIF unico y borrado logico
- [ ] **UI: pantalla de clientes** — actualmente muestra "Work in progress"
- [ ] Formulario de alta de cliente
- [ ] Formulario de edicion y baja logica
- [ ] Busqueda por nombre, CIF o email
- [ ] Vista de detalle de cliente con trabajos y facturas asociadas
- [ ] Validacion de formato CIF/NIF en frontend
- [ ] Endpoints de escritura: `POST`, `PUT`, `DELETE` clientes (no existen en backend)

---

### M5 · Gestion de trabajos — PENDIENTE (backend OK, UI placeholder)
- [x] Endpoint `GET /intranet/trabajos` — listado filtrado por estado, prioridad, cliente, rango
- [x] Series trimestrales de trabajos finalizados
- [x] Modelo `trabajos` en BD con estados y prioridades
- [x] Tabla `trabajo_empleado` para asignaciones N:M
- [ ] **UI: pantalla de trabajos** — actualmente muestra "Work in progress"
- [ ] Formulario de alta de trabajo vinculado a cliente
- [ ] Cambio de estado desde UI
- [ ] Asignacion/desasignacion de empleados desde UI
- [ ] Comentarios internos por trabajo (tabla preparada en BD, sin endpoints)
- [ ] Filtros visuales por estado, prioridad y cliente
- [ ] Endpoints de escritura: `POST`, `PUT`, `DELETE` trabajos (no existen en backend)
- [ ] Endpoint de asignacion de empleados a trabajo (no existe en backend)

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
- [ ] Feedback de carga en modulos de clientes/trabajos/pagos
- [ ] Tests unitarios en componentes Angular (solo existe `app.spec.ts`)

### Backend
- [ ] Endpoints de escritura para clientes, trabajos, facturas y pagos (todos los modulos tienen solo `GET`)
- [ ] Paginacion en endpoint de clientes (actualmente devuelve todos)
- [ ] Validacion de formato NIF/CIF en backend (solo hay unicidad en BD)
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

1. **UI de gestion de clientes** — modulo mas urgente segun MVP; backend ya esta listo
2. **UI de gestion de trabajos** — segundo modulo con backend listo
3. **Endpoints de escritura de clientes y trabajos** — alta, edicion y baja
4. **UI y endpoints de facturacion/pagos**
5. **Migracion V003** — triggers y vistas de BD
6. **Auditoria** — conectar eventos de escritura con la tabla de auditoria
7. **Exportacion PDF de fichaje**
8. **Calendario fiscal y Documentos** — definir modelo de datos y backend

---

## Fuera del MVP (v1+)

- Portal cliente externo
- IA para generacion de documentos y deteccion de anomalias
- Notificaciones automaticas por email
- 2FA obligatoria para todos los usuarios (actualmente es opcional por usuario)
- Integraciones externas (banca, firma electronica)
- Multiempresa
- Analitica historica avanzada
