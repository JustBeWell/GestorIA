# MEMORIA TECNICA DEL PROYECTO GESTORIA

**Proyecto:** GestorIA  
**Fecha de elaboracion:** 2026-05-07  
**Repositorio analizado:** GestorIA  
**Base documental utilizada:** commits de Git, `README.md`, `app/README.md`, `backend/README.md`, `docs/DESARROLLO.md`, `docs/PLAN_SPRINTS.md`, `docs/modelo_datos.md` y `docs/estudio_caso_mvp_gestoria.md`.

---

## 1. Resumen ejecutivo

GestorIA es una aplicacion de gestion integral para una gestoria pequena. El objetivo del sistema es centralizar en una unica herramienta los procesos principales de una asesoria: autenticacion de usuarios, gestion de empleados, fichaje, clientes, trabajos, facturacion, pagos, deuda viva, auditoria, exportaciones y resumen operativo.

Desde el punto de vista de ingenieria de software, el proyecto ha evolucionado desde una base inicial documental y de esquema de datos hasta una aplicacion de escritorio macOS con frontend Angular, runtime Electron, backend FastAPI, base de datos PostgreSQL, despliegue Docker y una arquitectura final separada en microservicios expuestos mediante nginx como API gateway.

El trabajo se ha organizado de forma incremental. Primero se definio el caso de uso y el modelo de datos. Despues se implementaron los modulos nucleares de autenticacion, usuarios, intranet y fichaje. Posteriormente se completo la operativa de negocio por sprints: clientes, trabajos, facturacion y pagos. En la fase final se reforzaron auditoria, exportaciones, experiencia de usuario, launcher de escritorio, splash screen y separacion del backend en servicios independientes.

El resultado actual es un MVP avanzado y usable en entorno local/escritorio, con la mayor parte de los modulos criticos completados y algunos modulos auxiliares aun en estado placeholder.

---

## 2. Problema de negocio

El problema que resuelve GestorIA procede de un escenario habitual en gestorias pequenas: procesos dispersos en hojas de calculo, documentos manuales y comunicaciones no centralizadas. Esa forma de trabajo provoca duplicidad de datos, errores humanos, falta de trazabilidad, dificultad para consolidar informacion mensual y exceso de trabajo repetitivo.

La solucion se diseno para cubrir cuatro bloques funcionales:

1. **Control legal de jornada:** registro fiable de entradas, salidas, pausas, correcciones e informes mensuales.
2. **Gestion operativa:** administracion de clientes, trabajos, asignaciones, estados y comentarios internos.
3. **Control economico:** registro de facturas, pagos parciales o completos, vencimientos y deuda viva por cliente.
4. **Cierre y trazabilidad:** exportaciones, documento mensual, auditoria de acciones criticas y base para automatizacion documental futura.

El MVP se ha planteado con un criterio pragmatico: construir una version que pueda utilizarse en una gestoria pequena desde el primer despliegue, aunque reserve para fases posteriores las integraciones externas, el portal cliente, la automatizacion documental avanzada y herramientas auxiliares completas.

---

## 3. Alcance funcional actual

### 3.1 Modulos completados

El estado actual del proyecto, segun la documentacion y el historial de commits, incluye como completados los siguientes modulos:

| Modulo | Estado | Descripcion |
|---|---:|---|
| M1 Autenticacion y autorizacion | Completo | Login, JWT, RBAC, bloqueo por intentos, logout server-side, blacklist, 2FA por SMS y CORS para Electron. |
| M2 Gestion de empleados | Completo | Alta, edicion, baja logica, roles, activacion/desactivacion y panel de administracion. |
| M3 Fichaje | Completo | Entrada, salida, pausas, validaciones, correccion manual, vista admin, CSV y PDF mensual. |
| M4 Clientes | Completo | CRUD, busqueda, validacion CIF/NIF, detalle, scope por rol, exportacion y borrado en cascada. |
| M5 Trabajos | Completo | Kanban, CRUD, asignaciones N:M, comentarios, filtros, estados, prioridades y exportaciones. |
| M6 Facturacion y pagos | Completo | Facturas, pagos, deuda viva, tabs, KPIs, vencidos, CRUD, pagos embebidos y exportaciones. |
| M7 Resumen operativo | Completo | Home con KPIs, calendario, series trimestrales, graficas y panel admin historico. |
| M8 Exportaciones | Parcial/avanzado | CSV/PDF para fichaje, trabajos, facturas y cierre mensual. |
| M9 Auditoria | Completo | Tabla de auditoria, escritura de eventos y UI de consulta para administradores. |
| M10 Herramientas | Parcial | Calendario fiscal con CRUD administrativo; GIA reemplaza Documentos; Ajustes con perfil, contrasena, 2FA y configuracion de empresa persistente. |
| M11 Notificaciones | Completo | Microservicio `backend-notifications` independiente. Canales in-app (WebSocket), Web Push (VAPID + Service Worker) y Electron nativo. Scheduler APScheduler (4 jobs: vencimientos facturas y deadlines trabajos). Transactional outbox con exponential backoff hasta 5 reintentos. Preferencias por usuario/tipo. Centro Angular con tabs, filtros, agrupacion por dia y badge en campana del header. |

### 3.2 Actores del sistema

El sistema diferencia principalmente dos actores:

- **Administrador o gerente:** gestiona empleados, clientes, trabajos, facturas, pagos, auditoria, correcciones de fichaje y exportaciones.
- **Empleado:** ficha jornada, consulta informacion operativa y trabaja con los datos acotados a su ambito.

Tambien aparecen en la vision de producto la gestoria externa como destinataria de documentacion mensual y el cliente final como posible actor futuro mediante portal cliente. Ninguno de los dos forma parte activa del MVP actual.

---

## 4. Arquitectura general

### 4.1 Vision de alto nivel

La arquitectura final se compone de:

- **Frontend Angular:** aplicacion SPA por modulos funcionales.
- **Electron:** contenedor de escritorio macOS y protocolo `app://localhost`.
- **Backend FastAPI:** servicios HTTP con autenticacion JWT y logica de negocio.
- **PostgreSQL:** persistencia relacional, triggers, vistas y constraints de dominio.
- **Docker Compose:** orquestacion local de base de datos, backend y gateway.
- **nginx API gateway:** enrutamiento de endpoints hacia microservicios FastAPI y gestion centralizada de CORS.
- **Landing Next.js:** pagina comercial/descarga separada del producto principal.

Flujo principal:

```text
Usuario
  -> GestorIA.app / Electron
  -> Angular
  -> API Gateway nginx :8008
  -> Microservicio FastAPI correspondiente
  -> PostgreSQL
```

### 4.2 Evolucion arquitectonica

El backend comenzo como una API FastAPI mas monolitica con rutas agrupadas de intranet. A medida que el dominio crecio, se refactorizo primero por servicios de dominio y despues por micro-rutas. En la fase final se separaron los entry-points de backend en servicios independientes:

- `main_auth.py`
- `main_home.py`
- `main_fichaje.py`
- `main_clientes.py`
- `main_trabajos.py`
- `main_pagos.py`
- `main_admin.py`
- `main_ai.py`

Todos comparten una factoria comun en `backend/app_factory.py`, que centraliza:

- creacion de la app FastAPI,
- CORS,
- rate limiting,
- middleware global de autenticacion,
- rutas publicas,
- health checks,
- conexion con base de datos.

Esta decision reduce duplicacion y permite evolucionar cada area funcional con un entry-point propio, manteniendo consistencia transversal en seguridad y configuracion.

---

## 5. Frontend

### 5.1 Stack

El frontend principal esta construido con Angular y se ejecuta tanto como aplicacion web como dentro de Electron. El `package.json` actual declara Angular 21, TypeScript, RxJS, Electron, Vitest, jsdom, `concurrently` y `wait-on`.

Scripts principales:

- `npm start`: levanta Angular y Electron.
- `npm run start:web`: levanta solo Angular en el puerto 4200.
- `npm run start:desktop`: ejecuta Electron directamente.
- `npm run build`: compila Angular.
- `npm run test`: ejecuta tests del frontend.

### 5.2 Organizacion por capas

La aplicacion Angular sigue una separacion razonable por responsabilidades:

| Carpeta | Responsabilidad |
|---|---|
| `src/app/core/models` | Contratos tipados de autenticacion, intranet, empleados y administracion. |
| `src/app/core/services` | Clientes HTTP y servicios de estado. |
| `src/app/core/interceptors` | Interceptor de autenticacion y gestion de errores 401/403. |
| `src/app/core/guards` | Proteccion de rutas mediante autenticacion. |
| `src/app/features` | Pantallas funcionales por dominio. |
| `src/app/shared/components` | Sidebar, header de intranet y widget IA. |
| `src/app/shared/styles` | Estilos compartidos de modulos y shell profesional. |

### 5.3 Routing

El routing usa carga lazy mediante `loadComponent`. Las rutas principales son:

- `/intro`
- `/auth`
- `/home`
- `/fichaje`
- `/clientes`
- `/trabajos`
- `/pagos`
- `/documentos`
- `/ajustes`
- `/calendario-fiscal`
- `/admin`

La raiz redirige a `/intro`, que muestra una introduccion de branding antes del login. Las rutas de intranet estan protegidas con `authGuard`.

### 5.4 Estado y peticiones

El frontend usa servicios tipados como `AuthApiService`, `IntranetService`, `EmpleadoService` y `AiChatService`. Durante el desarrollo se incorporaron mejoras transversales importantes:

- `AuthStateService` con Angular signals para estado global de usuario.
- Interceptor de token Bearer.
- Manejo centralizado de errores HTTP 401/403.
- `withFetch()` para sustituir XMLHttpRequest por Fetch API.
- `withInMemoryScrolling` para restaurar scroll al navegar.
- `OnDestroy` y `takeUntil(destroy$)` en componentes con suscripciones HTTP.
- `registerLocaleData(localeEs)` y `LOCALE_ID = 'es'` para pipes monetarios.

Estas mejoras responden a problemas reales detectados durante el uso: datos obsoletos tras logout, paginas que no renderizaban bien al navegar, memory leaks potenciales, limite de conexiones HTTP/1.1 y errores de locale en `CurrencyPipe`.

### 5.5 Experiencia de usuario

La UI evoluciono desde pantallas funcionales hasta una experiencia mas cuidada:

- branding visual con logo corporativo,
- sidebar con iconos SVG,
- dashboard con tarjetas, sparklines y calendario,
- Kanban para trabajos,
- tabs para facturas, deuda viva y pagos recientes,
- panel admin con graficas historicas combinadas,
- modales de confirmacion,
- estados de carga y vacio,
- intro de video,
- splash screen de escritorio con progreso dinamico,
- paleta visual unificada en verde bosque.

---

## 6. Backend

### 6.1 Stack

El backend esta construido con FastAPI, Pydantic, psycopg2, JWT, passlib/bcrypt, slowapi, Twilio, fpdf2 y pytest. Expone una API HTTP protegida por Bearer Token, con rutas publicas limitadas a login, OTP, health checks y documentacion.

### 6.2 Estructura

La estructura actual del backend es:

| Ruta | Responsabilidad |
|---|---|
| `backend/app_factory.py` | Factoria comun de microservicios. |
| `backend/database.py` | Conexion y health de PostgreSQL. |
| `backend/models.py` | Schemas Pydantic de request/response. |
| `backend/routes/auth.py` | Login, OTP, logout y autenticacion. |
| `backend/routes/users.py` | Gestion de usuarios y empleados. |
| `backend/routes/intranet/*.py` | Rutas por dominio: home, fichaje, clientes, trabajos, pagos, admin. |
| `backend/services/*.py` | Logica de negocio por dominio. |
| `backend/tests/*.py` | Tests de servicios e intranet. |

### 6.3 Microservicios actuales

El `docker-compose.yml` define varios servicios FastAPI construidos desde el mismo contexto `backend`, cada uno arrancando un entry-point distinto:

| Servicio Docker | Entry-point | Dominio |
|---|---|---|
| `backend-auth` | `main_auth:app` | Auth y users. |
| `backend-home` | `main_home:app` | Home y series. |
| `backend-fichaje` | `main_fichaje:app` | Fichajes. |
| `backend-clientes` | `main_clientes:app` | Clientes. |
| `backend-trabajos` | `main_trabajos:app` | Trabajos. |
| `backend-pagos` | `main_pagos:app` | Pagos, deuda y facturas. |
| `backend-admin` | `main_admin:app` | Panel admin, auditoria y cierre. |
| `backend-ai` | `main_ai:app` | Widget de IA legal. |

Aunque comparten codigo y base de datos, esta separacion mejora la escalabilidad organizativa del backend y permite que nginx enrute cada area funcional de forma explicita.

### 6.4 API Gateway

El gateway nginx escucha en `8008` y enruta por prefijos:

- `/auth` y `/users` hacia `backend-auth`.
- `/intranet/admin` hacia `backend-admin`.
- `/intranet/fichaje` hacia `backend-fichaje`.
- `/intranet/clientes` hacia `backend-clientes`.
- `/intranet/trabajos` hacia `backend-trabajos`.
- `/intranet/pagos`, `/intranet/deuda` y `/intranet/facturas` hacia `backend-pagos`.
- `/intranet/home` y `/intranet/series` hacia `backend-home`.
- `/ai` hacia `backend-ai`.

Tambien centraliza CORS para origenes `app://`, `localhost`, `127.0.0.1` y responde preflight `OPTIONS` sin tocar upstream. Un fix final corrigio duplicidad de cabeceras CORS y movio los entry-points a la raiz de `backend/`.

---

## 7. Base de datos

### 7.1 Motor y convenciones

La persistencia usa PostgreSQL. El modelo adopta:

- UUID v4 como identificadores.
- `TIMESTAMPTZ` para trazabilidad temporal.
- nomenclatura `snake_case` en espanol.
- borrado logico en entidades principales donde aplica.
- constraints, triggers y vistas para reforzar reglas de negocio.

### 7.2 Entidades principales

El modelo relacional incluye:

- `usuarios`
- `empleados`
- `fichajes`
- `clientes`
- `trabajos`
- `trabajo_empleado`
- `trabajo_comentarios` / comentarios de trabajo
- `facturas`
- `pagos`
- `auditoria_eventos`
- `token_blacklist`
- tablas de soporte para OTP y seguridad

Relaciones clave:

- `usuarios` 1:1 `empleados`.
- `empleados` 1:N `fichajes`.
- `clientes` 1:N `trabajos`.
- `clientes` 1:N `facturas`.
- `facturas` 1:N `pagos`.
- `trabajos` N:M `empleados`.
- `usuarios` 1:N `auditoria_eventos`.

### 7.3 Reglas en base de datos

La base de datos no se limita a almacenar informacion; tambien protege invariantes de negocio:

- trigger de validacion de fichaje para impedir secuencias invalidas,
- trigger de pagos para impedir que los cobros superen el total de factura,
- trigger de actualizacion automatica de estado de factura,
- campos generados de IVA y total de factura,
- vistas analiticas para deuda, horas diarias y resumen mensual,
- migracion de cascada para eliminar clientes junto con trabajos, facturas y pagos relacionados.

### 7.4 Migraciones

El repositorio contiene migraciones desde `V001` hasta `V010`:

| Migracion | Proposito |
|---|---|
| `V001__schema_inicial.sql` | Esquema inicial completo. |
| `V002__fichaje_pausas.sql` | Soporte de pausas en fichaje. |
| `V003__vistas_analiticas.sql` | Vistas de deuda, horas y resumen. |
| `V003__vistas_historicas_admin.sql` | Vistas historicas para panel admin. |
| `V004__login_bloqueo.sql` | Bloqueo por intentos fallidos. |
| `V005__token_blacklist.sql` | Invalidacion server-side de tokens. |
| `V006__2fa_otp.sql` | OTP para doble factor. |
| `V007__clientes_tipo_referencia.sql` | Evolucion de clientes. |
| `V008__trabajos_nro_comentarios.sql` | Numero de trabajo y comentarios. |
| `V009__cascade_delete_cliente.sql` | Borrado en cascada de datos dependientes. |
| `V010__auditoria_eventos.sql` | Tabla de auditoria. |

---

## 8. Seguridad

La seguridad del MVP se ha trabajado en varias capas.

### 8.1 Autenticacion

El sistema usa JWT Bearer Token. Las rutas privadas requieren `Authorization: Bearer <token>`, validado por middleware global. Las rutas publicas estan acotadas a login, verificacion OTP, health checks y documentacion.

### 8.2 Autorizacion

La autorizacion se basa en roles:

- `administrador`
- `empleado`

El backend aplica scope de datos segun el usuario autenticado. En general, el administrador ve todos los datos y el empleado ve los datos asociados a su ambito. En frontend, la UI oculta o muestra acciones segun rol, aunque la autoridad real permanece en backend.

### 8.3 Refuerzos incorporados

Durante el desarrollo se implementaron:

- bloqueo temporal por intentos fallidos,
- logout server-side mediante blacklist de tokens con TTL,
- 2FA por SMS con Twilio,
- normalizacion telefonica a E.164,
- rate limiting en `/auth/login` y `/auth/otp/verify`,
- validacion de NIF/CIF en backend,
- CORS especifico para Electron y navegador local,
- prompt del widget IA endurecido contra prompt injection y social engineering.

---

## 9. Modulos funcionales en detalle

### 9.1 M1 - Autenticacion y autorizacion

Este modulo fue uno de los primeros pilares. Incluye login por NIF/password, emision de JWT, consulta de usuario autenticado, guards de frontend, interceptor de token, roles y logout.

La evolucion posterior anadio:

- bloqueo por intentos fallidos,
- blacklist de tokens,
- 2FA por SMS,
- rate limiting,
- estado global de usuario con signals,
- manejo centralizado de errores 401/403.

### 9.2 M2 - Empleados

El modulo de empleados permite al administrador gestionar usuarios vinculados a empleados. Incluye alta, edicion, baja logica, activacion/desactivacion, cambio de rol y gestion de MFA. Tambien se integro en el panel admin con vistas de resumen y filtros.

### 9.3 M3 - Fichaje

El fichaje cubre entrada, salida, pausas, calculo diario, duracion total, deshacer ultimo fichaje, filtros, exportacion CSV y PDF mensual. El administrador puede ver fichajes de todos los empleados y corregir manualmente eventos.

Desde ingenieria, este modulo es importante porque combina validaciones de UI, reglas de servicio y triggers de base de datos. Esa combinacion reduce el riesgo de inconsistencias en un requisito legalmente sensible.

### 9.4 M4 - Clientes

El sprint de clientes completo el flujo full stack de gestion de clientes:

- listado,
- busqueda,
- alta,
- edicion,
- detalle,
- baja o eliminacion segun evolucion posterior,
- validacion CIF/NIF,
- control de duplicados,
- exportacion CSV/PDF,
- scope por rol.

Una evolucion posterior cambio la relacion con datos dependientes para permitir borrado en cascada de trabajos, facturas y pagos asociados.

### 9.5 M5 - Trabajos

El modulo de trabajos evoluciono hasta un Kanban operativo por estados:

- pendiente,
- en curso,
- bloqueado,
- finalizado,
- cancelado.

Incluye prioridades, asignacion de empleados, comentarios internos, detalle lateral, filtros por cliente y prioridad, baja logica/cancelacion, exportaciones y recarga de datos tras cambios. Se corrigio especificamente un bug de refresco del Kanban.

### 9.6 M6 - Facturacion y pagos

El modulo de facturacion y pagos cubre:

- listado de facturas,
- creacion y edicion,
- anulacion,
- registro de pagos,
- detalle de factura con pagos embebidos,
- KPIs de facturado/cobrado/pendiente/vencido,
- deuda viva por cliente,
- pagos recientes,
- vencimientos resaltados,
- filtros y paginacion,
- exportaciones CSV/PDF.

Es uno de los modulos mas completos porque afecta tanto a UI, backend, base de datos, triggers, vistas y reglas de negocio.

### 9.7 M7 - Home y resumen operativo

El Home actua como panel de control:

- horas fichadas,
- clientes activos,
- trabajos en curso,
- cobrado del mes,
- KPIs mensuales desde `v_resumen_mensual` como fuente comun con el cierre,
- graficas mensuales,
- calendario de fichajes,
- panel admin con KPIs historicos,
- grafica combinada con hover y toggles.

El commit history muestra una mejora progresiva de este dashboard, tanto funcional como visual. En HU-M8-02 se anade el endpoint `GET /intranet/resumen/mensual?year=&month=` y el Home deja de componer KPIs desde servicios paralelos.

### 9.8 M8 - Exportaciones

Las exportaciones se fueron incorporando por necesidad operativa:

- CSV de fichaje,
- PDF mensual de fichaje,
- CSV/PDF de facturas,
- PDF de cierre mensual,
- exportaciones en tabs de fichajes y trabajos del panel admin,
- exportaciones en pantallas generales de fichaje y trabajos.

Tambien hubo fixes especificos para PDF: descarga con auth header, blob download y compatibilidad de caracteres con Helvetica.

### 9.9 M9 - Auditoria

La auditoria se completo en Sprint 4. Se introdujo `auditoria_eventos`, escritura de eventos desde backend y una UI de consulta para administradores con filtros y paginacion.

Los eventos cubren acciones sobre:

- clientes,
- trabajos,
- facturas,
- pagos,
- fichajes,
- empleados,
- correcciones manuales.

### 9.10 M10 - Herramientas

El modulo M10 agrupa tres herramientas auxiliares que han avanzado durante el Sprint 5:

- **Calendario fiscal:** pantalla conectada al microservicio `backend-calendario`. Datos reales AEAT/TGSS, navegacion mensual, alta manual de vencimientos, edicion, borrado logico y marcado de presentados.
- **GIA:** portal de IA conversacional que reemplaza el antiguo modulo Documentos. Conversaciones, mensajes, adjuntos, generacion de PDF e imagenes via OpenAI.
- **Ajustes:** pantalla funcional con perfil editable via `PUT /users/me`, cambio de contrasena via `POST /users/me/password`, toggle 2FA via `PATCH /users/me/mfa`, cierre de sesion y configuracion de empresa persistida en `empresa_configuracion`.

---

## 10. Aplicacion de escritorio macOS

Una parte destacada del flujo de trabajo fue convertir la aplicacion en una experiencia de escritorio. Se creo `GestorIA.app`, un bundle doble-clic que arranca la pila y abre Electron sin que el usuario tenga que ejecutar comandos manualmente.

El launcher resuelve varios problemas propios de macOS:

- cuarentena de aplicaciones descargadas,
- firma ad-hoc de Electron,
- `xattr -cr`,
- uso de `open -n`,
- paso de parametros mediante fichero temporal en `/tmp`,
- rutas absolutas para evitar errores `uv_cwd EPERM`,
- nombre e icono de app correctos en Dock y barra de menu,
- uso de ICNS del bundle para que macOS aplique correctamente la mascara visual.

El splash screen se refino varias veces. La version actual usa una ventana de 700x440 px, fondo con imagen corporativa, barra dinamica basada en `requestAnimationFrame`, mensajes realistas por pasos, funciones de progreso preservadas y fade-out antes de abrir la ventana principal.

---

## 11. Landing page

Ademas de la aplicacion principal, el repositorio contiene una landing en Next.js. Su objetivo es presentar GestorIA y ofrecer descargas.

La landing evoluciono con:

- hero con `app-banner.png`,
- animacion `hero.gif`,
- secciones de funcionalidades, modulos, funcionamiento, FAQ y descarga,
- iconos oficiales de Windows y Apple,
- compatibilidad con exportacion estatica mediante `images.unoptimized`,
- correccion de enlaces de descarga.

Hay cambios locales sin commitear en `landing/.next` y `landing/components/Download.tsx` en el momento de redactar esta memoria. No forman parte del historial consolidado salvo que se commiteen posteriormente.

---

## 12. Despliegue y ejecucion

### 12.1 Docker Compose

La pila Docker actual incluye:

- `db`: PostgreSQL 17 con migracion inicial.
- `backend-*`: microservicios FastAPI por dominio.
- `gateway`: nginx en `8008`.
- `frontend-electron`: contenedor de soporte para build Electron.

El backend comparte variables de entorno para PostgreSQL, JWT, OpenAI y Twilio. Todos los microservicios dependen de `db` con healthcheck.

### 12.2 Ejecucion local

Segun la documentacion:

- Backend local: `python -m uvicorn main:app --reload --port 8008`.
- Frontend web: `npm run start:web`.
- Desktop: `npm start` o `npm run start:desktop`.
- Pila completa: `docker-compose up --build`.
- Launcher: doble clic en `GestorIA.app` o `bash scripts/launch.sh`.

Tras la migracion a microservicios, el flujo Docker con gateway es la via mas representativa de la arquitectura actual.

---

## 13. Calidad, pruebas y mantenibilidad

### 13.1 Pruebas existentes

El backend contiene tests en:

- `backend/tests/test_intranet_home.py`
- `backend/tests/test_intranet_tabs.py`
- `backend/tests/test_user_service.py`

El frontend contiene tests unitarios para:

- `AuthStateService`,
- `authInterceptor`,
- `IntranetService`,
- componentes base.

La documentacion de backend indica una suite de tests con `27 passed` en una revision previa. No obstante, conviene ejecutar de nuevo la suite tras la separacion en microservicios para confirmar que la documentacion sigue sincronizada con el estado actual.

### 13.2 Refactors relevantes

Los refactors mas importantes han sido:

- separacion de `IntranetService` monolitico en servicios de dominio,
- division de `intranet.py` en micro-rutas por seccion,
- creacion de `app_factory.py`,
- separacion del backend en microservicios Docker,
- adaptacion del launcher Electron a la arquitectura de microservicios,
- consolidacion de estilos compartidos en frontend.

### 13.3 Deuda tecnica identificada

La propia documentacion mantiene deuda tecnica pendiente:

- ampliar tests de integracion para operaciones de escritura,
- mejorar cobertura en servicios de clientes, trabajos y pagos,
- completar skeletons/feedback de carga en algunos modulos,
- conectar o explotar completamente algunas vistas analiticas,
- implementar de verdad M10,
- revisar documentacion de backend tras la migracion final a microservicios,
- limpiar artefactos generados versionados o modificados en `landing/.next` si no deben formar parte del repositorio.

---

## 14. Flujo de trabajo de principio a fin

### 14.1 Fase 0 - Inicio del repositorio

El proyecto comenzo con un commit inicial el 2026-02-24. En esta fase se preparo la base del repositorio y se dejo espacio para evolucionar hacia una aplicacion full stack.

### 14.2 Fase 1 - Analisis, caso de uso y modelo de datos

El 2026-03-12 se incorporo el estudio de caso, la definicion del MVP y el modelo de datos inicial. Esta fase fue importante porque fijo el alcance de producto antes de construir: actores, modulos, entidades, reglas de negocio y limites del MVP.

Desde ingenieria, esta decision fue correcta porque evito empezar por pantallas aisladas sin dominio. El modelo relacional ya contemplaba fichajes, clientes, trabajos, facturas, pagos y auditoria, por lo que el backend pudo crecer de forma coherente.

### 14.3 Fase 2 - Primer sprint tecnico: login y usuarios

El 2026-03-14 se implemento la primera seccion funcional: login y gestion de usuarios. Esto establecio la identidad del sistema, la autenticacion y la base para RBAC.

Esta fase desbloqueo el resto de modulos, ya que todo el producto depende de saber quien actua, que rol tiene y que datos puede ver.

### 14.4 Fase 3 - Intranet inicial

El 2026-03-17 se incorporo la segunda iteracion: modulo de intranet con login, home, clientes, fichaje, trabajos y pagos como paginas iniciales, auth guard, shell header, rutas y servicios backend.

Fue una fase de esqueleto funcional. No todos los modulos estaban completos, pero ya existia la navegacion principal y la estructura para completar cada dominio.

### 14.5 Fase 4 - Dockerizacion

El 2026-04-07 se dockerizo la aplicacion. Esto permitio estandarizar ejecucion local, base de datos y despliegue. Docker fue clave para pasar de un desarrollo dependiente del entorno local a una pila reproducible.

### 14.6 Fase 5 - Endurecimiento y experiencia de usuario

El 2026-04-29 y especialmente el 2026-04-30 se concentro una fase intensa de mejoras:

- dashboard home,
- widget IA,
- refactor de servicios backend,
- bloqueo de login,
- logout server-side,
- gestion de empleados,
- fichajes admin,
- correccion manual,
- 2FA,
- fixes CORS,
- graficas,
- PDF de fichaje,
- iconografia,
- launcher macOS,
- splash screen,
- icono y nombre de app,
- vistas analiticas,
- paginacion,
- validaciones,
- rate limiting,
- estado global frontend,
- tests unitarios.

Esta fase transformo la aplicacion desde un MVP funcional basico hacia un producto mas robusto, seguro y presentable.

### 14.7 Fase 6 - Sprint 1: clientes

El 2026-05-04 se cerro la gestion de clientes. Se implementaron endpoints, UI, validaciones, detalle, busqueda, RBAC y mejoras visuales. Tambien se actualizaron documentos de seguimiento y plan de sprints.

El modulo de clientes era una dependencia natural para trabajos y facturacion, porque ambos necesitan vincularse a un cliente.

### 14.8 Fase 7 - Sprint 2: trabajos

Tambien el 2026-05-04 se completo la gestion de trabajos full stack. El producto incorporo Kanban, estados, prioridades, asignaciones, comentarios y acciones CRUD.

Este sprint completo la parte operativa del negocio: saber que se esta haciendo, para que cliente, en que estado y por que empleados.

### 14.9 Fase 8 - Sprint 3: facturacion y pagos

Entre el 2026-05-06 y el 2026-05-07 se completo facturacion y pagos. Se implementaron facturas, pagos, KPIs, deuda viva, tabs, CRUD completo, detalle de factura, pagos embebidos, exportaciones y multiples fixes de UI y SQL.

Este sprint cerro el bloque economico del MVP y conecto directamente con las vistas de deuda y el resumen operativo.

### 14.10 Fase 9 - Sprint 4: auditoria y exportaciones

El 2026-05-07 se completo la auditoria y se ampliaron exportaciones. Se incorporaron eventos de auditoria para acciones criticas, UI de consulta, CSV de facturas, PDF de cierre mensual y exportaciones en fichajes/trabajos.

Desde una perspectiva de software empresarial, esta fase es importante porque aporta trazabilidad, no solo funcionalidad.

### 14.11 Fase 10 - Refactor final a microservicios

En la parte final del 2026-05-07 se dividio `intranet.py` en micro-rutas, se separo el backend en microservicios Docker y se introdujo nginx como API gateway.

Tambien se adapto el launcher Electron a esta nueva arquitectura, se corrigio CORS en gateway y se mejoro el splash con barra dinamica y mensajes por pasos.

Esta fase cambia el caracter tecnico del proyecto: de una aplicacion full stack modular pasa a una arquitectura local distribuida por servicios de dominio.

---

## 15. Cronologia resumida por fechas

| Fecha | Hito |
|---|---|
| 2026-02-24 | Inicio del repositorio. |
| 2026-03-12 | Documentacion inicial, caso de uso, MVP y modelo de datos. |
| 2026-03-14 | Login y gestion de usuarios. |
| 2026-03-17 | Intranet inicial con home, clientes, fichaje, trabajos y pagos. |
| 2026-04-07 | Dockerizacion. |
| 2026-04-29 | Mejoras del dashboard. |
| 2026-04-30 | Seguridad, fichaje, empleados, launcher macOS, splash, vistas analiticas y tests. |
| 2026-05-04 | Sprint 1 clientes y Sprint 2 trabajos. |
| 2026-05-06 | Sprint 3 facturacion y pagos, fixes de navegacion y UI. |
| 2026-05-07 | Deuda viva, auditoria, exportaciones, microservicios, gateway nginx y launcher adaptado. |

---

## 16. Decisiones tecnicas relevantes

### 16.1 PostgreSQL como fuente de verdad

La decision de apoyar reglas criticas en PostgreSQL mediante constraints, triggers y vistas mejora la integridad. En modulos como fichaje y pagos, confiar solo en frontend o servicios seria insuficiente.

### 16.2 Angular standalone y lazy loading

El uso de componentes standalone y `loadComponent` reduce complejidad de modulos Angular tradicionales y encaja bien con una app por features.

### 16.3 FastAPI con servicios de dominio

FastAPI aporta velocidad de desarrollo, OpenAPI y tipado con Pydantic. La separacion por servicios de dominio mejora legibilidad y facilita extraer microservicios.

### 16.4 Electron para escritorio

Electron permite distribuir una experiencia de escritorio sin reescribir el frontend. El coste es mayor complejidad de empaquetado, CORS, protocolo local, iconos y comportamiento macOS, problemas que se abordaron durante el desarrollo.

### 16.5 nginx como gateway

El gateway permite mantener un unico puerto publico (`8008`) aunque el backend se haya dividido en varios servicios. Tambien centraliza CORS y reduce configuracion duplicada.

### 16.6 Sprints por dependencias de dominio

El orden seguido es coherente:

```text
Auth y empleados -> fichaje/home -> clientes -> trabajos -> facturacion/pagos -> auditoria/exportaciones -> microservicios/desktop
```

Clientes precede a trabajos y facturacion porque es entidad base. Facturacion precede a deuda y cierre. Auditoria se incorpora cuando ya existen acciones relevantes que registrar.

---

## 17. Riesgos y observaciones

1. **Artefactos generados en landing:** existen cambios y ficheros `.next` en el arbol; conviene decidir si deben ignorarse o versionarse.
2. **Tests insuficientes para todo el dominio actual:** hay tests, pero la cobertura no parece equivalente al tamano funcional del proyecto.
3. **M10 parcialmente completado:** calendario fiscal y ajustes son operativos; GIA sustituye documentos. Pendiente toggle 2FA en ajustes y configuracion de empresa.
4. **Duplicidad potencial entre CORS de app y gateway:** nginx centraliza CORS, pero los servicios tambien tienen middleware CORS. Ya se ocultaron cabeceras upstream en nginx, pero conviene mantenerlo vigilado.
5. **Microservicios con base compartida:** la separacion por entry-points mejora modularidad, pero todos los servicios comparten repositorio y base de datos; no es una arquitectura de microservicios completamente desacoplada.
6. **Migraciones con numeracion duplicada:** existen dos migraciones `V003`; no bloquea el estado actual, pero debe corregirse si se adopta una herramienta estricta de migraciones.

---

## 18. Estado final del MVP

El MVP actual puede considerarse funcionalmente muy avanzado. Estan resueltos los flujos centrales:

- autenticacion segura,
- gestion de empleados,
- fichaje legal,
- gestion de clientes,
- trabajos y asignaciones,
- facturacion,
- pagos,
- deuda viva,
- exportaciones,
- auditoria,
- home operativo,
- panel admin,
- app de escritorio macOS.

Pendiente queda completar herramientas auxiliares, ampliar test coverage, limpiar artefactos generados y preparar una estrategia de despliegue mas formal si el producto va a salir de entorno local.

---

## 19. Recomendaciones de continuidad

1. **Aumentar cobertura de tests:** priorizar clientes, trabajos, pagos, auditoria y auth.
2. **Formalizar migraciones:** revisar duplicidad de numeracion `V003` y definir una herramienta de migraciones si el proyecto crece.
3. **Limpiar repositorio:** excluir `.next`, caches, `__pycache__` y artefactos generados si no son necesarios.
4. **Completar M10:** decidir si calendario fiscal, documentos y ajustes entran en el alcance real de la siguiente version.
5. **Revisar permisos de empleados:** algunos commits ajustan que empleados puedan gestionar trabajos, clientes y facturas; conviene dejar la politica exacta documentada y probada.
6. **Preparar despliegue productivo:** separar secretos, cambiar `JWT_SECRET_KEY`, revisar Twilio/OpenAI, backups de PostgreSQL y logs.

---

## 20. Anexo I - Historial de commits

El repositorio contiene **87 commits** hasta `40fcbeb` en 2026-05-07. Historial cronologico:

- `93311c5` · 2026-02-24 · Angel Escaño · Initial commit
- `902e7f2` · 2026-03-12 · Angel Escaño · Feature: Add initial schema and documentation for the data model and case study
- `a96cc31` · 2026-03-14 · Angel Escaño · first sprint: login section and user management implemented
- `55ad659` · 2026-03-17 · Angel Escaño · Second iteration: Intranet module with login, home, clientes, fichaje, trabajos and pagos pages. Added auth guard and intranet shell header component. Backend routes and services for intranet data.
- `ec5e3c9` · 2026-04-07 · Angel Escaño · Dockerice the app
- `b78eb51` · 2026-04-29 · Angel Escaño · feat: mejoras home dashboard - graficas mensuales fichaje, card horas rediseñada, sidebar fixes
- `72baf8e` · 2026-04-30 · Angel Escaño · feat: AI legal chat widget + fixes tipografía y layout sidebar
- `cedd45c` · 2026-04-30 · Angel Escaño · refactor(backend): split IntranetService monolith into domain services
- `8bca731` · 2026-04-30 · Angel Escaño · feat(M1.1): bloqueo temporal por intentos fallidos de login
- `e396413` · 2026-04-30 · Angel Escaño · feat(M1.2): logout server-side con blacklist de tokens JWT
- `3c1495d` · 2026-04-30 · Angel Escaño · feat(M2.1-M2.3): UI gestión de empleados en panel admin
- `f49bda0` · 2026-04-30 · Angel Escaño · feat(M3.1): vista fichajes de todos los empleados (admin)
- `d3882d8` · 2026-04-30 · Angel Escaño · feat(M3.2): corrección manual de fichaje desde UI admin
- `b243f8a` · 2026-04-30 · Angel Escaño · feat(M1.3): 2FA por SMS (Twilio) en el login
- `ec0956a` · 2026-04-30 · Angel Escaño · fix: CORS Electron, 2FA OTP, logout redirect, video streaming, admin charts signal
- `6541a04` · 2026-04-30 · Angel Escaño · feat(admin): gráfica histórica combinada con hover interactivo y toggle de series
- `d919136` · 2026-04-30 · Angel Escaño · feat(fichaje): exportación PDF mensual de registro de fichaje (M3 completo)
- `6b27753` · 2026-04-30 · Angel Escaño · feat(ui): logo corporativo en login/sidebar e iconos SVG en navegación
- `78b1316` · 2026-04-30 · Angel Escaño · feat(fichaje): iconos SVG en stat cards (H/J/P/S → reloj/calendario/tendencia/pausa)
- `2438979` · 2026-04-30 · Angel Escaño · feat(home): iconos SVG en actividad reciente (F/T/P/C → reloj/maletín/tarjeta/personas)
- `80860f2` · 2026-04-30 · Angel Escaño · feat: launcher macOS doble-cliqueable (GestorIA.app + scripts/launch.sh)
- `198d651` · 2026-04-30 · Angel Escaño · feat: splash window de carga profesional al iniciar GestorIA.app
- `f5a5ed8` · 2026-04-30 · Angel Escaño · fix(launcher): usar Docker Desktop CLI real y separar build de up
- `c023480` · 2026-04-30 · Angel Escaño · fix(launcher): docker-compose en lugar de docker compose (CLI v1)
- `1f1124c` · 2026-04-30 · Angel Escaño · fix(launcher): cd APP_DIR + xattr -cr para evitar EPERM de quarantine macOS
- `f9b2a2a` · 2026-04-30 · Angel Escaño · fix(launcher): pasar ruta absoluta a main.cjs para evitar uv_cwd EPERM
- `d73b8bc` · 2026-04-30 · Angel Escaño · fix(launcher): xattr -cr sobre Electron.app en node_modules para quitar quarantine
- `8e22035` · 2026-04-30 · Angel Escaño · fix(launcher): codesign --force --deep ad-hoc en Electron.app para resolver EPERM macOS
- `42d6e5a` · 2026-04-30 · Angel Escaño · fix(launcher): open -n para lanzar Electron fuera del sandbox + params via /tmp
- `8a3a313` · 2026-04-30 · Angel Escaño · feat(launcher): icono personalizado de GestorIA en Finder y Dock (AppIcon.icns)
- `3c9816f` · 2026-04-30 · Angel Escaño · fix(launcher): nombre GestorIA e icono propio en Dock y barra de menú (no Electron)
- `8a1f021` · 2026-04-30 · Angel Escaño · feat(launcher): icono macOS con esquinas redondeadas (1024×1024, radio 229px)
- `fe3bd8d` · 2026-04-30 · Angel Escaño · fix(launcher): parchar Electron.app con nombre e icono GestorIA en cada arranque
- `72bebf8` · 2026-04-30 · Angel Escaño · fix(icon): icono sólido sin alpha — macOS aplica squircle mask
- `87e4dc4` · 2026-04-30 · Angel Escaño · fix(icon): fondo blanco en icono de la app
- `6ed1575` · 2026-04-30 · Angel Escaño · fix(icon): eliminar dock.setIcon — usar ICNS del bundle para squircle correcto
- `c9ca302` · 2026-04-30 · Angel Escaño · fix(icon): dock-icon.png cuadrado 1024px sólido para squircle correcto en Dock
- `3f89afe` · 2026-04-30 · Angel Escaño · fix(icon): logo más pequeño en dock-icon (padding 28%)
- `927bebc` · 2026-04-30 · Angel Escaño · fix(icon): squircle pre-aplicado en dock-icon (radio 230px macOS)
- `12efbb2` · 2026-04-30 · Angel Escaño · feat(splash): rediseño con estilo de la app y mensajes amigables
- `c7f0d7a` · 2026-04-30 · Angel Escaño · refactor(splash): eliminar stepId — splash ya no tiene indicadores de pasos
- `0857d3c` · 2026-04-30 · Angel Escaño · docs: actualizar README, SEGUIMIENTO y DESARROLLO con lanzador macOS y nuevo splash
- `90c9a10` · 2026-04-30 · Angel Escaño · security(ai): fortalecer system prompt — restricción de ámbito, anti-injection, anti-social-engineering
- `f5d246c` · 2026-04-30 · Angel Escaño · feat(db): V003 — vistas analíticas v_deuda_por_cliente, v_horas_diarias, v_resumen_mensual
- `d559b8d` · 2026-04-30 · Angel Escaño · feat(backend): paginación en endpoint /intranet/clientes (page, page_size)
- `8f80125` · 2026-04-30 · Angel Escaño · feat(backend): validación formato NIF/CIF en UserCreateRequest (DNI, NIE, CIF)
- `8b67cc0` · 2026-04-30 · Angel Escaño · feat(backend): rate limiting 10 req/min en /auth/login y /auth/otp/verify (slowapi)
- `28a39ee` · 2026-04-30 · Angel Escaño · feat(frontend): estado global de usuario con AuthStateService (Angular signals)
- `6c3b6e5` · 2026-04-30 · Angel Escaño · feat(frontend): manejo centralizado de errores HTTP 401/403 en interceptor
- `71ab37b` · 2026-04-30 · Angel Escaño · test(frontend): tests unitarios AuthStateService, authInterceptor e IntranetService
- `a25f11c` · 2026-04-30 · Angel Escaño · fix(frontend): corregir referencia sessionStorageService residual en sidebar
- `cbb4b56` · 2026-05-04 · GestorIA Dev · feat(M4): Gestion de clientes Sprint 1
- `151c64d` · 2026-05-04 · GestorIA Dev · docs: DESARROLLO + PLAN_SPRINTS + SEGUIMIENTO tras Sprint 1
- `d01ae45` · 2026-05-04 · Angel · fix(clientes): corregir TS2339 filter(Boolean) en template strictTemplates
- `ea99750` · 2026-05-04 · Angel · feat(clientes): adaptar UI al prototipo 3.1 — full stack
- `f9389a4` · 2026-05-04 · Angel · chore: commit estado actual del proyecto
- `e411153` · 2026-05-04 · Angel · feat(clientes): export CSV/PDF dropdown + UI cleanup
- `90596ef` · 2026-05-04 · Angel · feat(M5): Sprint 2 — Gestión de trabajos full stack
- `4fdddf9` · 2026-05-04 · Angel · Sprint 2 - Implementación de la funcionalidad de gestión de trabajos, incluyendo la creación, edición y eliminación de trabajos, así como la visualización de los mismos en la interfaz de usuario. Se han realizado cambios en el frontend para mostrar los trabajos y en el backend para manejar las operaciones relacionadas con los trabajos.
- `67f063a` · 2026-05-06 · Angel · feat(M6): Sprint 3 — Facturación y Pagos completo (backend + UI)
- `584798a` · 2026-05-06 · Angel · fix: empleados pueden gestionar trabajos, clientes y facturas
- `3319d7c` · 2026-05-06 · Angel · fix(pagos): alinear layout con sistema de diseño compartido
- `2903b97` · 2026-05-06 · Angel · fix(pagos): is_admin scope, cards prototipo, exportar CSV/PDF
- `86c4337` · 2026-05-06 · Angel · Feat: Visual adjustment
- `2a45a84` · 2026-05-06 · Angel · fix: resolver bug de carga en paginas post-navegacion
- `4ad1548` · 2026-05-06 · Angel · Fix: kanban board data refresh bug fixed
- `c80a52c` · 2026-05-06 · Angel · fix: admin tab pagos, fix SQL resumen pagos, home snapshot limpio
- `29578ba` · 2026-05-06 · Angel · Landing Page and Admin Page updates
- `26c7044` · 2026-05-07 · Angel · Hotfix: Corrección de enlaces de descarga en la landing page y ajustes en la gestión de facturas y comentarios.
- `8d5b2b6` · 2026-05-07 · Angel · .
- `848a493` · 2026-05-07 · Angel · feat: intro de branding, borrado en cascada de clientes, mejoras landing y UX
- `7eab1cc` · 2026-05-07 · Angel · feat(M6): tab deuda viva + CRUD completo facturas/pagos — Sprint 3 cerrado
- `119ffb4` · 2026-05-07 · Angel · feat: Mejora visual de cargado de la app
- `05a99f1` · 2026-05-07 · Angel · Sprint 4: M9 auditoría completa + M8 exportaciones (CSV facturas + PDF cierre mensual)
- `77bdc7a` · 2026-05-07 · Angel · fix: PDF cierre con auth header (blob download) + estilo botón
- `5d65a4c` · 2026-05-07 · Angel · fix: PDF cierre - reemplazar em dash y euro por ASCII compatible con Helvetica
- `8122a62` · 2026-05-07 · Angel · feat: exportar CSV/PDF en tabs fichajes y trabajos del panel admin
- `6ae846a` · 2026-05-07 · Angel · feat: exportar CSV/PDF en pantallas generales fichaje y trabajos
- `5d29ef2` · 2026-05-07 · Angel · .
- `27b071f` · 2026-05-07 · Angel · feat: crear trabajos abierto a todos los empleados + exportar antes de nuevo trabajo
- `1628427` · 2026-05-07 · Angel · refactor: dividir intranet.py en micro-rutas por sección
- `4f6787d` · 2026-05-07 · Angel · feat: separar backend en microservicios Docker con nginx como API gateway
- `7b0e531` · 2026-05-07 · Angel · .
- `2c6d324` · 2026-05-07 · Angel · feat: adaptar launcher Electron a arquitectura de microservicios
- `05b6436` · 2026-05-07 · Angel · feat: splash screen con barra dinámica RAF y mensajes realistas por pasos
- `26be1d2` · 2026-05-07 · Angel · fix: CORS nginx gateway + mover entry-points de backend/main/ a backend/
- `40fcbeb` · 2026-05-07 · Angel · refactor
- `pendiente` · 2026-05-08 · Angel · feat(gia): rediseño UI módulo GIA (header chat, burbujas tipo mensajería, panel archivos, sidebar conversaciones), indicador de typing animado, bloqueo total de interacción durante envío (textarea, modos, adjuntar y cambio de conversación), eliminación de conversaciones con confirmación y borrado en cascada (servicio + endpoint DELETE `/ai/gia/conversations/:id`), refuerzo de aislamiento por `user_id` ya existente y limpieza best-effort del directorio físico de adjuntos al borrar.

### 20.1 Cambios módulo GIA (2026-05-08)

**Backend**

- `backend/services/gia_service.py` · método estático `delete_conversation(user_id, conversation_id)` que ejecuta `DELETE FROM gia_conversaciones WHERE id = %s AND user_id = %s`. La tabla tiene `ON DELETE CASCADE` sobre `gia_mensajes` y `gia_archivos`, así que mensajes y registros de archivos se eliminan automáticamente. Tras el commit, hace `shutil.rmtree` best-effort del directorio físico (`settings.gia_storage_dir/<conversation_id>`). Devuelve `True` si la fila existía y pertenecía al usuario, `False` en caso contrario para permitir un 404 limpio.
- `backend/routes/ai.py` · nuevo `DELETE /ai/gia/conversations/{conversation_id}` con `status_code=204`. Usa `Depends(get_current_user)` y delega en el servicio. Devuelve 404 si `delete_conversation` retorna `False` (conversación inexistente o de otro usuario), garantizando aislamiento.

**Aislamiento por usuario** (verificado, no se modifica)

Todas las consultas del servicio GIA filtran por `user_id`:

- `list_conversations`: `WHERE c.user_id = %s AND c.archivada = FALSE`.
- `_get_owned_conversation` (usado por `get_conversation` y `send_message`): `WHERE id = %s AND user_id = %s`.
- `get_file_for_download`: `JOIN gia_conversaciones c ON c.id = a.conversacion_id WHERE a.id = %s AND c.user_id = %s`.

Esto hace imposible que un usuario consulte, lea, escriba, descargue o borre conversaciones/archivos de otro usuario.

**Frontend**

- `app/src/app/core/services/gia.service.ts` · método `deleteConversation(id)` que hace `DELETE` al endpoint.
- `app/src/app/features/gia/pages/gia-page.component.ts` · refactor:
  - Nuevos signals `deletingId` y `mobileSidebarOpen`; computed `busy = sending() || deletingId() !== null` que centraliza el estado de bloqueo.
  - `deleteConversation(event, id)` con `confirm()`, `stopPropagation()`, sincronización local de `conversations` y reapertura automática de la siguiente conversación o creación de una nueva si era la última.
  - Toda interacción (`createConversation`, `openConversation`, `setMode`, `onFilesSelected`, `send`) se aborta si `busy()` es true.
  - Auto-scroll al final del chat con `AfterViewChecked + shouldScroll` para no parpadear en cada CD.
  - Atajo Enter (Shift+Enter = nueva línea) gestionado desde `onPromptKeydown`.
  - Helper `formatTime` para el timestamp en cada burbuja.
- `app/src/app/features/gia/pages/gia-page.component.html` · estructura totalmente nueva:
  - Sidebar de conversaciones con avatar, título, último mensaje y botón eliminar (visible al hover y conversación activa).
  - Cabecera de chat con avatar GIA, título y badge "Pensando.../Eliminando..." cuando `busy()`.
  - Mensajes en formato burbuja con avatar lateral, hora y chips de archivos adjuntos.
  - Burbuja de typing (tres puntos animados) que aparece debajo del último mensaje mientras `sending()`.
  - Composer con tabs de modo, input grande, botón adjuntar (label fileInput) y botón enviar (con dots blancos durante envío).
  - Todos los controles bindean `[disabled]="busy()"` y los containers de modo y composer reciben `--disabled` para feedback visual.
- `app/src/app/features/gia/pages/gia-page.component.css` · diseño completamente nuevo:
  - Variables CSS centralizadas (`--gia-primary`, `--gia-accent`, `--gia-radius`, sombras, etc.) alineadas con la paleta `intranet-pro-shell.css` (verde `#1a3528`, dorado `#d89d37`).
  - Layout grid de tres columnas (sidebar 280 / chat / archivos 280) con altura `calc(100vh - 110px)` y colapso a 2 columnas en <1180px y a 1 columna + sidebar deslizable en <820px.
  - Animación `gia-bounce` para typing dots y `gia-pulse` para el badge de estado.
  - Estados hover, activo, deshabilitado y deleting trabajados con transiciones suaves.

**Arquitectura / decisiones de diseño**

- *Aislamiento*: se confía en el servidor (no en el front) — el filtro por `user_id` está en cada query SQL. El front solo envía el ID y recibe 404 si la conversación no le pertenece.
- *Borrado*: el endpoint usa `DELETE` REST estándar y devuelve 204. La cascada SQL evita orquestar borrados manuales (evita drift entre tablas si se añadiera lógica futura).
- *Bloqueo de UI*: un único computed (`busy`) gobierna `[disabled]` de todos los controles, evitando estados inconsistentes (p. ej. bloqueando textarea pero no el botón enviar). Toda mutación pasa por una guard al inicio.
- *Performance*: el typing dot es CSS puro (animation), sin polling ni timers en TS.

### 20.2 Fixes módulo GIA (2026-05-08, segunda iteración)

**Bug 1 — Textarea desbordando el card del chat**

`gia-page.component.css`: el componente Angular es standalone y no heredaba `box-sizing: border-box` del `intranet-pro-shell.css` (que solo aplica a su propio `:host *`). El textarea con `width: 100%` + padding usaba `content-box` por defecto y desbordaba el contenedor.

Fix: añadido `:host, :host *, :host *::before, :host *::after { box-sizing: border-box }` al inicio del CSS. Adicionalmente se añadió `min-width: 0` y `max-width: 100%` al wrapper `.gia-composer__input` y al propio `textarea` para que respete el ancho del grid aunque el contenido tienda a expandir.

**Bug 2 — Botón "Nueva" con aspecto pobre**

Mejoras en `.gia-new-btn`: padding horizontal a 14px, altura fija 32px, `text-transform: none` y `letter-spacing: 0` explícitos para protegerlo de cualquier estilo global, `flex-shrink: 0` para que no se aplaste cuando el sidebar es estrecho.

**Bug 3 — Mensaje del usuario desaparece hasta que llega la respuesta**

`gia-page.component.ts`: el método `send()` solo añadía el mensaje del usuario a la lista en el callback `next`, así que durante toda la espera del agente el chat parecía vacío.

Fix: optimistic update. Al disparar `send()`:

1. Se construye un `GiaMessageItem` temporal con `id = tmp-{timestamp}` y `role = 'user'`, mapeando los `File` seleccionados a `GiaFileItem` stubs (con `download_url: ''` que no se puede pulsar pero muestra el chip con nombre y tamaño).
2. Se inserta en `messages()` inmediatamente y se limpia el composer (textarea y archivos).
3. En `next`, se filtra el mensaje optimista por `id` y se añaden los reales (`response.user_message`, `response.assistant_message`).
4. En `error`, se revierte el optimistic update y se devuelve el texto al composer (`this.prompt = text`) para que el usuario pueda reintentar sin reescribir.

Ventaja arquitectónica: la burbuja de typing dots (que aparece cuando `sending() === true`) se renderiza ahora *después* del mensaje del usuario, dando una experiencia conversacional natural.

### 20.3 Fix generación PDF e imagen GIA (2026-05-08)

**Diagnóstico**

- *Imagen*: `service_config.py` definía `OPENAI_IMAGE_MODEL` con default `"gpt-4o-mini"` (modelo de chat, no de imagen). `_generate_image` usaba `client.responses.create(...)` con tool `image_generation`, una API que requiere SDK ≥ 1.50 y un modelo agéntico compatible (gpt-4.1, gpt-4o, o3 — `gpt-4o-mini` NO está soportado). Resultado: 502 silencioso "Error al contactar con OpenAI" cada vez que se elegía modo imagen.
- *PDF*: `fpdf2` con fuentes core (Helvetica) solo soporta Latin-1. `_pdf_safe` aplicaba `encode('latin-1', errors='replace')`, lo que sustituye comillas tipográficas, em dashes, emojis, comilla simple Unicode, etc. por `?`. Documentos profesionales con `?` en lugar de caracteres Unicode. Formato pobre (sin márgenes definidos, sin separación visual, todo a 11pt).
- *Errores genéricos*: la cláusula `except Exception` en `_run_openai` capturaba cualquier fallo de imagen y devolvía siempre `"Error al contactar con OpenAI"` sin detalle, dificultando el diagnóstico.

**Cambios**

- `backend/requirements.txt` · `+ reportlab>=4.0.0`. fpdf2 se conserva por si otros módulos lo usan (no encontrado, candidato a remoción futura).
- `backend/service_config.py` · default `openai_image_model = "gpt-image-1"` (estándar OpenAI Images API). Comentario explícito advirtiendo de no usar modelos de chat aquí.
- `backend/services/gia_service.py`:
  - **`_create_pdf` reescrito con reportlab**. Usa `SimpleDocTemplate` (A4, 2cm márgenes), `Paragraph` con estilos custom (`title_style` 18pt verde corporativo `#1a3528`, `meta_style` con fecha y firma "GestorIA · GIA", `body_style` 11pt/16leading), `HRFlowable` separador y respeto de párrafos (regex `\n\s*\n` para párrafos, `<br/>` dentro). UTF-8 nativo: acentos, comillas, em dashes, símbolos preservados. Helper `_html_escape` para escapar `&<>` antes de pasar a `Paragraph` (que parsea mini-HTML).
  - **`_generate_image` reescrito con `client.images.generate(...)`**. API estándar compatible con SDK ≥ 1.0. Bloqueo defensivo de modelos de chat (`gpt-4*`, `o1*`, `o3*`) con mensaje claro 503. Soporta tanto `b64_json` (gpt-image-1 por defecto) como `url` (dall-e-3 por defecto): si llega URL, descarga con `urllib.request` (timeout 30s). `prompt[:4000]` para respetar el límite de la API. Cada error tiene su `logger.exception` y propaga `HTTPException` con detalle real.
  - **Eliminado `_pdf_safe` y el import `from fpdf import FPDF`** (código muerto tras la migración).
  - **`_run_openai`**: `except Exception` ahora hace `logger.exception` y devuelve el detalle del error (`f"Error al contactar con OpenAI: {exc}"`) en lugar del mensaje genérico, para facilitar debugging desde la UI.

**Decisiones arquitectónicas**

- *reportlab vs fpdf2 con fuentes Unicode*: reportlab gana porque (a) UTF-8 nativo sin embeber TTFs, (b) layout declarativo (Platypus) más mantenible que el modo imperativo de fpdf2, (c) soporta tablas, imágenes, headers/footers de forma trivial si más adelante GIA debe generar facturas o documentos estructurados. fpdf2 con TTFs requería distribuir DejaVuSans.ttf en el repo.
- *images.generate vs responses.create + tool*: la API clásica `images.generate` es estable desde SDK 1.0, soporta tanto `gpt-image-1` como `dall-e-3` con la misma firma, y no depende de la disponibilidad del tool agéntico (que cambia con cada release del SDK). Se sacrifica algo de orquestación (no hay loop de tool calls que decida cuándo generar imagen) a cambio de fiabilidad.
- *Bloqueo defensivo de modelos en `_generate_image`*: prevenimos que un mal `OPENAI_IMAGE_MODEL` en `.env` cause un 502 oscuro. Mejor un 503 explicativo.
- *`logger.exception` en lugar de prints*: los servicios usan `logging` para integrar con el stack centralizado (uvicorn / docker logs).

**Variables de entorno relevantes**

- `OPENAI_IMAGE_MODEL` (default `"gpt-image-1"`). Para usar DALL·E 3: `OPENAI_IMAGE_MODEL=dall-e-3`.
- `OPENAI_GIA_MODEL` (sin cambios, default `"gpt-4o-mini"`).
- `OPENAI_API_KEY` (obligatorio para que GIA funcione).

**Acción operativa requerida**

Tras hacer pull, reconstruir el contenedor `backend-ai` (o todos los `backend-*` si comparten `Dockerfile`/`requirements.txt`):

```bash
docker compose build backend-ai
docker compose up -d backend-ai
```

Si la variable `OPENAI_IMAGE_MODEL` está fijada en el `.env` con valor antiguo (`gpt-4o-mini`), **eliminarla o cambiarla a `gpt-image-1`** — si no, el bloqueo defensivo devolverá 503 con mensaje claro.

---

## 21. Anexo II - Documentos consultados

- `README.md`: vision general, ejecucion local, Docker y launcher macOS.
- `app/README.md`: arquitectura Angular/Electron, scripts y modulos frontend.
- `backend/README.md`: API backend, rutas, variables de entorno y pruebas.
- `docs/estudio_caso_mvp_gestoria.md`: definicion del caso, problema, actores, alcance y MVP.
- `docs/modelo_datos.md`: modelo entidad-relacion, tablas, ENUMs, triggers, vistas y convenciones.
- `docs/DESARROLLO.md`: estado actual por modulo, deuda tecnica y proximos pasos.
- `docs/PLAN_SPRINTS.md`: planificacion por sprints, historias de usuario y criterios de aceptacion.

### 20.4 HU-M10-03 Ajustes funcionales (2026-05-13)

**Contexto**

La pantalla de ajustes era un mockup estatico completo: dos pestanas (Seguridad / Apariencia) con datos hardcodeados, sin ninguna llamada al backend. Esta HU remodelo la pantalla para dejar solo los ajustes que tienen soporte real en la API.

**Backend**

- `backend/models.py` · anadido `ChangePasswordRequest` con `current_password` y `new_password` (ambos `min_length=8, max_length=128`).
- `backend/services/user_service.py` · anadido `UserService.change_password(user_id, current_password, new_password)`. Verifica la contrasena actual contra el hash bcrypt almacenado; si es incorrecta lanza `ValueError("Contrasena actual incorrecta")`; si es correcta hashea la nueva y actualiza `usuarios.password_hash`.
- `backend/routes/users.py` · anadido `POST /users/me/password` (204 No Content en exito, 400 si la contrasena actual es incorrecta, 404 si el usuario no existe). Solo accesible con JWT valido.

**Frontend**

- `ajustes-page.component.ts` · reescrito completamente. Inyecta `EmpleadoService`, `AuthApiService`, `FormBuilder` y `HttpClient`. Signals para estado de carga, modo edicion y feedback. Formulario reactivo de perfil (nombre, apellidos, telefono) y formulario de contrasena (actual, nueva, confirmacion).
- `ajustes-page.component.html` · reescrito completamente. Sidebar con "Mi perfil" y "Seguridad" (eliminada "Apariencia"). Mi perfil: vista de datos con modo edicion inline. Seguridad: formulario de cambio de contrasena y boton de cierre de sesion.
- `ajustes-page.component.css` · reducido de 529 a 279 lineas. Eliminados todos los estilos de theme-card, accent-chip, density-card, language-row, strength-track y sessions-list.

**Ajustes eliminados del mockup**

- Pestana Apariencia completa (tema claro/oscuro/sistema, color de acento, idioma, densidad).
- Panel de 2FA con Google Authenticator y SMS de respaldo (no implementados).
- Codigos de recuperacion (no implementados).
- Lista de sesiones activas con dispositivos hardcodeados.
- Indicador de fortaleza de contrasena y caducidad automatica de 90 dias.

**Pendiente**

- Toggle de `mfa_habilitado` en frontend (el campo existe en base de datos y el admin ya puede modificarlo via `PUT /users/{id}/admin`).
- Configuracion de empresa (nombre, logo, jornada estandar, IVA) requiere modelo y endpoints nuevos.

### 20.5 Sprint notificaciones push in-app (2026-05-15)

Se implemento el modulo de notificaciones definido en `docs/Notifications.md` como microservicio dedicado `backend-notifications`. Incluye persistencia en PostgreSQL, preferencias por usuario/tipo, suscripciones Web Push, outbox transaccional, endpoint interno firmado con HMAC, scheduler de vencimientos y dispatcher VAPID.

En frontend se anadio el modelo y servicio de notificaciones, el service worker de push, la campana persistente en la intranet, el centro completo `/notificaciones` y la pantalla de preferencias/dispositivos `/notificaciones/preferencias`. El gateway Docker enruta `/intranet/notifications` al nuevo servicio y bloquea `/internal/events` desde el exterior.

Los eventos inmediatos de trabajos se emiten desde `TrabajosService` tras confirmar la operacion de negocio: asignacion, desasignacion, nuevo comentario, cambio de estado, cancelacion y cambio de prioridad.
