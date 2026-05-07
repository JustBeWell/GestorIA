# Desarrollo

## Contexto
Este documento sigue el avance del MVP descrito en `docs/estudio_caso_mvp_gestoria.md` y sirve como guia de trabajo para no perder el hilo entre sesiones.

Ultima revision: 2026-05-07 (Sprint 3 en curso — admin panel completo, borrado en cascada, landing page y UX de intro mejorados)

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
- [x] Borrado fisico en cascada: al eliminar cliente se borran trabajos, facturas y pagos asociados (V009 + DELETE fisico)
- [x] "Dar de baja" eliminado del modal de detalle de clientes (solo disponible en panel admin)

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
- [x] Comentarios cargan en paralelo con detalle del trabajo (forkJoin); recarga al enviar comentario
- [x] Auto-scroll al comentario mas reciente al abrir detalle y al enviar
- [x] Admin puede cancelar trabajos en estado `finalizado` (bypass is_admin en delete_trabajo)

---

### M6 · Facturacion y pagos — EN CURSO (Sprint 3 · iniciado 2026-05-06)
- [x] Endpoint `GET /intranet/pagos` — listado facturas y pagos con filtros
- [x] Series trimestrales de pagos cobrados
- [x] Modelos `facturas` y `pagos` en BD con triggers de validacion
- [x] Vista `v_deuda_por_cliente` en BD
- [x] **UI: pantalla de pagos completa** — KPIs (Total facturado, Pendiente de cobro, Vencido), tabla de facturas, filtros, paginacion
- [x] KPIs enriquecidos: `cobrado_mes`, `facturado_mes`, `facturas_emitidas_mes`, `pendiente_total`, `pendiente_count`, `facturas_vencidas`, `vencido_total`
- [x] Bypass `is_admin` en backend — admin ve todas las facturas; empleado solo las de sus clientes
- [x] Export CSV desde frontend (descarga directa del listado visible)
- [x] Export PDF desde frontend (impresion via `window.print()`)
- [x] Tabla siempre renderizada; estado vacio como `<tr colspan>` dentro del `<tbody>`
- [x] `withInMemoryScrolling` en router (`scrollPositionRestoration: 'top'`) para corregir renderizado al navegar
- [x] `OnDestroy` + `takeUntil(destroy$)` en suscripciones HTTP del componente de pagos
- [x] Admin puede anular facturas con pagos asociados (bypass is_admin en delete_factura)
- [x] Panel admin: acciones de eliminar trabajos (incluyendo `finalizado`) y anular facturas operativas
- [x] Bug 422 corregido: `page_size_facturas` acepta hasta 500
- [ ] Endpoints de escritura: `POST /intranet/facturas`, `PUT /intranet/facturas/{id}` (PENDIENTE)
- [ ] Endpoints de escritura: `POST /intranet/pagos`, `PUT /intranet/pagos/{id}` (PENDIENTE)
- [ ] Formulario de alta de factura en UI (PENDIENTE — requiere endpoint POST)
- [ ] Modal de registro de pago parcial/total (PENDIENTE — requiere endpoint POST pagos)
- [ ] Vista de deuda viva por cliente (tab o panel, datos de `v_deuda_por_cliente`) (PENDIENTE)
- [ ] Listado de facturas vencidas con alerta visual reforzada (PENDIENTE)
- [ ] Endpoint backend `GET /intranet/facturas/export/csv` con filtros (PENDIENTE)

---

### M7 · Resumen operativo — COMPLETO (Home)
- [x] Panel Home con horas fichaje, clientes activos, trabajos en curso, cobrado mes
- [x] Graficas sparkline con serie mensual de horas por dia
- [x] Card de fichaje con horas del dia, total mensual y diferencial vs media
- [x] Series trimestrales para todas las metricas del dashboard
- [x] Calendario visual de fichajes del mes con detalle por dia
- [x] Panel de administracion con KPIs, graficas historicas 12 meses y gestion de empleados y fichajes
- [x] Graficas del panel admin reactivas con signals (cargan sin necesidad de refrescar)
- [x] Grafica combinada historica: 6 series normalizadas, hover con tooltip, toggle de series y toggle Combinada/Individual
- [ ] Vista `v_resumen_mensual` de BD no conectada al Home (disponible en BD, no usada)

---

### M8 · Exportaciones — PARCIAL
- [x] Exportacion CSV de fichaje por rango de fechas
- [x] Exportacion PDF de fichaje mensual (fpdf2, endpoint GET /intranet/fichaje/export/pdf)
- [x] Exportacion CSV de facturas desde frontend (descarga del listado visible con headers en espanol)
- [x] Exportacion PDF de facturas desde frontend (impresion via window.print)
- [ ] Endpoint backend `GET /intranet/facturas/export/csv` con filtros y UTF-8 BOM
- [ ] Generacion de documento mensual de cierre (PDF con fpdf2)

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
- [x] Feedback de carga en modulo de pagos (skeleton + tabla siempre visible)
- [x] `withInMemoryScrolling` en router (`scrollPositionRestoration: 'top'`) — corrige renderizado al navegar entre paginas
- [x] `OnDestroy` + `takeUntil(destroy$)` en suscripciones HTTP de pagos — evita memory leaks
- [x] `OnDestroy` + `takeUntil(destroy$)` extendido a todos los pages (home, fichaje, clientes, trabajos, admin) — cancelacion de peticiones al navegar
- [x] `NgZone.run()` en actualizaciones de signals de pagos — garantiza change detection fuera del contexto de navegacion
- [x] Timer de 3s como fallback de recarga en pagos (se cancela si los datos cargan antes)
- [x] `withFetch()` en `provideHttpClient` — sustituye XMLHttpRequest por Fetch API, elimina limite de 6 conexiones HTTP/1.1
- [x] `registerLocaleData(localeEs)` + `{ provide: LOCALE_ID, useValue: 'es' }` — evita NG0701 en CurrencyPipe
- [x] Parametro `'es'` eliminado de todos los pipes `currency` del template de pagos (13 ocurrencias) — locale ya global
- [x] Paleta de colores global migrada a verde bosque (tono banner `#1a3528`) en todos los modulos CSS
- [ ] Feedback de carga en modulos de trabajos (kanban usa carga parcial, sin skeleton global)
- [ ] Tests unitarios en componentes Angular (solo existe `app.spec.ts`)

### Backend
- [x] Endpoints de escritura para clientes (POST/PUT/DELETE — Sprint 1)
- [x] Endpoints de escritura para trabajos (POST/PUT/DELETE, asignaciones, comentarios — Sprint 2)
- [ ] Endpoints de escritura para facturas (POST/PUT — pendiente Sprint 3)
- [ ] Endpoints de escritura para pagos (POST/PUT — pendiente Sprint 3)
- [x] Paginacion en endpoint de clientes (page_size hasta 200, default 50)
- [x] Route handlers convertidos de `async def` a `def` en todos los routers (intranet, auth, users, ai) — psycopg2 sincrono bloqueaba el event loop; FastAPI ahora los ejecuta en thread pool concurrente
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
- [x] Migracion V009 aplicada — FK `trabajos.cliente_id`, `facturas.cliente_id` y `pagos.factura_id` cambiadas a `ON DELETE CASCADE`

---

## Electron / Desktop

- [x] App empaquetada como Electron con `app://localhost` CORS
- [x] Splash screen rediseñada: `app-banner.png` como fondo pantalla completa (`object-fit: cover`), barra de progreso en overlay inferior semitransparente
- [x] Splash window ampliada a 700x440 px
- [x] Funciones `updateProgress(pct, text)`, `showDone()`, `showError(msg)` preservadas para integración con `main.cjs`
- [x] Splash con fade-out suave (opacity 0 en 0.6 s) antes de mostrar la app

---

## UX / Experiencia de usuario transversal

- [x] Ruta `/intro` con componente `BrandingVideoPageComponent` — video `hero.mp4` en pantalla completa antes del login
- [x] Intro: fade-in 0.6 s al montar; fade-out 1.2 s al terminar video; fallback de 20 s si el video no se reproduce
- [x] Intro: volumen 0.25 para evitar susto al arrancar
- [x] Intro: `goLogin()` navega a `/auth` con `replaceUrl: true` (sin historial de intro)
- [x] Login: animación `loginFadeIn` 0.8 s al montar componente
- [x] Fondo global oscuro `#0c1a16` en `html, body` — evita flash blanco entre rutas
- [x] Widget de IA oculto en rutas `/`, `/auth` e `/intro`
- [x] Ruta raiz redirige a `/intro` (antes redirigía a `/auth`)

---

## Landing page

- [x] Hero: sustituido SVG genérico por imagen real `app-banner.png` (max-width 860 px)
- [x] Hero: card flotante animada con `hero.gif` en esquina inferior derecha (`floatOrbit` 7 s)
- [x] Sección Download: iconos oficiales Windows (flag SVG) y Apple (logo SVG) en lugar de emojis
- [x] Sección Download: títulos de plataforma a 26 px/800 para mayor visibilidad
- [x] `next.config.mjs`: `images: { unoptimized: true }` para compatibilidad con `output: 'export'`
- [x] Assets en `landing/public/` (app-banner.png, hero.gif) para que Next.js los sirva correctamente

---

## Proximos pasos recomendados (orden de prioridad)

> Plan detallado en `docs/PLAN_SPRINTS.md`

1. ~~**UI y endpoints de gestion de clientes**~~ — **COMPLETADO** en Sprint 1 (2026-05-04)
2. ~~**Sprint 2 — UI y endpoints de gestion de trabajos**~~ — **COMPLETADO** en Sprint 2 (2026-05-04)
3. **Sprint 3 (en curso) — Endpoints de escritura de facturas y pagos** — `POST/PUT /intranet/facturas` y `POST/PUT /intranet/pagos`
4. **Sprint 3 (en curso) — Formularios en UI** — modal alta de factura + modal registro de pago + tab deuda viva
5. **Sprint 4 — Auditoria** — conectar eventos de escritura con `auditoria_eventos` + UI
6. **Sprint 5 — Herramientas** — Calendario fiscal, Documentos, Ajustes + deuda tecnica

---

## Fuera del MVP (v1+)

- Portal cliente externo
- IA para generacion de documentos y deteccion de anomalias
- Notificaciones automaticas por email
- 2FA obligatoria para todos los usuarios (actualmente es opcional por usuario)
- Integraciones externas (banca, firma electronica)
- Multiempresa
- Analitica historica avanzada
