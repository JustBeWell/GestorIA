# GestorIA — App Angular + Electron

Aplicación de escritorio (Electron) y web (Angular 17+) para la gestión de la gestoría.

## Arquitectura aplicada (Angular profesional)

La implementación está organizada por capas:

- `src/app/core/models`: contratos tipados (`LoginRequest`, `AuthUser`, `IntranetModels`, …)
- `src/app/core/services`: servicios HTTP (`AuthApiService`, `IntranetService`)
- `src/app/core/interceptors`: `authInterceptor` para adjuntar token Bearer
- `src/app/core/guards`: guards de autenticación y de rol admin
- `src/app/features/`: módulos funcionales por área de negocio
- `src/app/app.routes.ts`: routing por feature con `loadComponent` (lazy)

Buenas prácticas aplicadas:

- tipado fuerte en requests/responses
- separación de responsabilidades (UI vs API vs almacenamiento)
- componentes standalone + lazy loading
- estado local de UI con `signal` / `computed`
- configuración centralizada de API en `environment`

## Módulos funcionales implementados

| Sprint | Módulo | Descripción |
|--------|--------|-------------|
| S1 | Auth | Login JWT, 2FA OTP, guards |
| S1 | Home | Dashboard de resumen |
| S1 | Fichaje | Registro de eventos de entrada/salida |
| S2 | Clientes | Listado de clientes |
| S2 | Trabajos | Kanban de trabajos por estado/prioridad |
| S3 | Pagos | Facturación y pagos — lista, detalle, crear/editar/anular facturas, registrar pagos |

## Requisitos

- Node.js 20+
- Backend `gestoria-backend` corriendo en `http://127.0.0.1:8008`

## Configuración API

El endpoint base está en `src/environments/environment.ts`:

```ts
apiUrl: 'http://127.0.0.1:8008'
```

## Ejecutar en modo escritorio

```bash
npm install
npm start
```

`npm start` levanta Angular (`4200`) y abre Electron automáticamente.

## Ejecutar solo Angular (web)

```bash
npm run start:web
```

## Build

```bash
npm run build
```

## Docker (frontend web)

El contenedor del frontend genera el build de Angular y lo sirve con Nginx.

```bash
docker-compose up --build frontend-web
```

Disponible en `http://localhost:4200`.
