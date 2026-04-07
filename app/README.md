# LoginDesktop (Angular + Electron)

Módulo de escritorio para login de GestorIA.

## Arquitectura aplicada (Angular profesional)

La implementación de login está organizada por capas:

- `src/app/core/models`: contratos tipados (`LoginRequest`, `LoginResponse`, `AuthUser`)
- `src/app/core/services`: servicio HTTP (`AuthApiService`) y sesión (`SessionStorageService`)
- `src/app/core/interceptors`: `authInterceptor` para adjuntar token Bearer
- `src/app/features/auth/pages`: `LoginPageComponent` (UI y flujo de login)
- `src/app/app.routes.ts`: routing por feature usando `loadComponent` (lazy)
- `src/app/app.ts`: shell limpio con `router-outlet`

Buenas prácticas aplicadas:

- tipado fuerte en requests/responses
- separación de responsabilidades (UI vs API vs almacenamiento)
- componentes standalone + lazy loading
- estado local de UI con `signal`
- configuración centralizada de API en `environment`

## Requisitos

- Node.js 20+
- Backend `user-service` corriendo en `http://127.0.0.1:8008`

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
