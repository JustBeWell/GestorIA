# GestorIA - App Angular + Electron

Aplicacion de escritorio y web para la gestion interna de una asesoria. El frontend esta construido con Angular y se ejecuta en dos modos:

- como SPA web en desarrollo (`http://localhost:4200`),
- como aplicacion de escritorio mediante Electron y el protocolo `app://localhost`.

## Stack actual

- Angular 21
- TypeScript 5.9
- RxJS
- Electron 35
- Vitest/jsdom para pruebas unitarias
- API backend expuesta por nginx en `http://127.0.0.1:8008`

## Arquitectura frontend

La aplicacion esta organizada por capas:

| Ruta | Responsabilidad |
|---|---|
| `src/app/core/models` | Contratos tipados de auth, intranet, empleados y administracion. |
| `src/app/core/services` | Clientes HTTP y servicios de estado (`AuthApiService`, `IntranetService`, `AuthStateService`, etc.). |
| `src/app/core/interceptors` | Interceptor de autenticacion y errores 401/403. |
| `src/app/core/guards` | Proteccion de rutas autenticadas. |
| `src/app/features` | Paginas por dominio funcional. |
| `src/app/shared/components` | Sidebar, cabecera de intranet y widget IA. |
| `src/app/shared/styles` | Sistema visual compartido para modulos internos. |

## Rutas principales

| Ruta | Funcion |
|---|---|
| `/intro` | Intro de branding previa al login. |
| `/auth` | Login y verificacion OTP. |
| `/home` | Resumen operativo. |
| `/fichaje` | Registro y consulta de jornada. |
| `/clientes` | Gestion de clientes. |
| `/trabajos` | Kanban y gestion de trabajos. |
| `/pagos` | Facturas, pagos y deuda viva. |
| `/admin` | Gestion de empleados, fichajes globales, auditoria y cierre mensual. |
| `/calendario-fiscal` | Placeholder de calendario fiscal. |
| `/documentos` | Placeholder de documentos. |
| `/ajustes` | Placeholder de ajustes. |

## Modulos implementados

| Modulo | Estado |
|---|---|
| Auth | Login JWT, OTP 2FA, guards, interceptor y estado global. |
| Home | KPIs, calendario, graficas y actividad reciente. |
| Fichaje | Entrada/salida/pausas, export CSV/PDF y correcciones admin. |
| Clientes | CRUD, busqueda, detalle, exportaciones y validacion CIF/NIF. |
| Trabajos | Kanban, CRUD, asignaciones, comentarios y exportaciones. |
| Pagos | Facturas, pagos, deuda viva, vencidos, tabs y exportaciones. |
| Admin | Empleados, fichajes globales, auditoria y PDF de cierre mensual. |
| IA | Widget de consulta acotado al ambito de GestorIA. |

## Configuracion API

El endpoint base esta en `src/environments/environment.ts`:

```ts
apiUrl: 'http://127.0.0.1:8008'
```

En la arquitectura actual ese puerto corresponde al gateway nginx, que enruta las peticiones hacia los microservicios FastAPI.

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Levantar solo Angular:

```bash
npm run start:web
```

Levantar Angular y Electron:

```bash
npm start
```

Ejecutar Electron contra un build ya generado:

```bash
npm run start:desktop
```

## Build y tests

```bash
npm run build
npm run test
```

## Desktop

Electron registra el esquema `app://localhost`, sirve los assets compilados desde `dist/` y muestra una splash screen antes de abrir la ventana principal. El launcher macOS `GestorIA.app` y `scripts/launch.sh` se encargan de construir/arrancar la pila Docker y abrir la aplicacion.

## Docker

En la arquitectura actual no existe un servicio `frontend-web` en `docker-compose.yml`. El compose levanta la base de datos, los microservicios backend, el gateway nginx y un servicio `frontend-electron` de soporte para el build Electron.

Para levantar la pila completa desde la raiz del repositorio:

```bash
docker-compose up --build
```

