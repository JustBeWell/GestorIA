# Seguimiento

## 2026-04-28
- Preparado fichero de seguimiento.
- Ejecutada migracion V002__fichaje_pausas.sql en Postgres.
- Rebuild backend OK.
- Rebuild frontend OK tras subir presupuesto de CSS.
- Vista Home/Fichaje alineadas a PPTX con nueva shell.
- Exportacion CSV desde backend para fichaje.
- Soporte real de pausas (inicio/fin) con reglas backend.
- Ajuste de sidebar con indicador activo y hover.
- Error de fichaje presentado como modal (sin sugerir cerrar sesion).
- Accion para deshacer el ultimo fichaje del dia.
- Corregido page_size en fichaje (max 100).

## 2026-04-30

### Caché de empleado obsoleta al cambiar de usuario
- `AuthApiService.logout()` ahora llama a `empleadoService.clearCachedEmpleado()` antes de limpiar la sesión, cubriendo todos los puntos de logout (manual, automático, expiración de token).
- `completeLogin()` en `login-page.component.ts` limpia el caché del empleado anterior antes de establecer la nueva sesión, evitando que componentes ya montados muestren datos del usuario anterior.
- Eliminada la llamada redundante a `clearCachedEmpleado()` en el sidebar (ahora centralizada en `AuthApiService`).

### CORS para Electron (`app://localhost`)
- Eliminado `ElectronCORSMiddleware` personalizado (enfoque con `BaseHTTPMiddleware` fallaba por conflictos de orden en la pila de Starlette).
- Solución definitiva: añadido `"app://localhost"` y `"app://."` directamente a `allow_origins` del `CORSMiddleware` estándar de Starlette, que hace comparación de string sin validar el esquema.
- Añadida `/auth/otp/verify` a `PUBLIC_PATHS` en `main.py` — el `require_token_middleware` bloqueaba el endpoint con 401 antes de que el route handler ejecutase, ya que durante el flujo 2FA no existe JWT todavía.
- Rebuild backend con `docker-compose restart backend`.

### Redirección tras logout
- Corregida ruta de navegación en `AuthApiService.logout()`: `'/login'` → `'/auth'` (la ruta registrada en `app.routes.ts`).

### Video de fondo en login se cortaba
- `onHeroVideoEnded()` ahora asigna `videoElement.src` directamente antes de `load()`, evitando que Angular no propagase el cambio de señal al DOM antes de la llamada.
- Chunk de video en `electron/main.cjs` eliminado: el rango ahora va de `start` hasta `stat.size - 1` en lugar de limitarse a 1 MB, permitiendo que Chromium prebuffere el video completo en una sola request.

### Gráficas del panel de administración no cargaban sin refrescar
- `charts` convertida de propiedad plana a `signal<AdminChartsResponse | null>(null)` en `admin-page.component.ts`.
- El template actualizado para usar `charts()` en el bloque `@if` y en todos los helpers (`facturacionValues`, `trabajosValues`, `chartLabels`, `horasValues`, `clientesValues`).
- Con signal, Angular detecta el cambio cuando `getAdminCharts()` responde y renderiza las gráficas automáticamente sin necesidad de refrescar.

### Gráfica combinada histórica en panel admin (M7)
- Nueva vista "Combinada" por defecto en la sección de gráficas históricas del panel de administración.
- SVG de ancho completo (800×200 viewBox) con 6 series normalizadas a su propio máximo: Facturado, Cobrado, Trabajos nuevos, Finalizados, Clientes nuevos, Horas trabajadas.
- Hover interactivo: línea vertical, puntos de intersección por serie y tooltip oscuro con valores reales del mes.
- Leyenda con 6 botones toggle para ocultar/mostrar series individualmente.
- Toggle "Combinada / Individual" para alternar entre la nueva vista y las 4 gráficas pequeñas anteriores.
- Grid lines horizontales en el SVG para referencia visual.
- `combinedSeries` declarado como array de descriptores en el componente; métodos `buildNormPolyline`, `buildNormArea`, `hoverLineX`, `hoverDot`, `tooltipData`, `tooltipLeft` añadidos al TS.

### Exportación PDF de fichaje (M3 — última HU)
- Nuevo endpoint `GET /intranet/fichaje/export/pdf` en FastAPI (route `intranet.py`).
- Generación del PDF con `fpdf2` (añadido a `requirements.txt`): cabecera corporativa con fondo `slate-800`, tabla de días con filas alternas, columna Estado con color semántico (verde/ámbar/gris), resumen estadístico (días completos, ausencias, horas acumuladas) y pie de página.
- Función auxiliar `_build_fichaje_pdf(data)` y `_pdf_today()` colocadas en `routes/intranet.py`.
- Nuevo método `exportFichajePDF()` en `IntranetService` (Angular).
- Signal `exportingPDF` y método `exportHistorialPDF()` añadidos a `FichajePageComponent`.
- Botón "Exportar PDF" en la cabecera de la página de fichaje; el botón CSV renombrado a "Exportar CSV" para distinguirlos.
- Backend reconstruido con `docker-compose build --no-cache backend` — endpoint confirmado en OpenAPI.

### Lanzador macOS — GestorIA.app
- Creado `GestorIA.app` como bundle nativo macOS (doble clic, sin terminal).
- El script `GestorIA.app/Contents/MacOS/GestorIA` usa `open -n` para lanzar Electron fuera del sandbox de macOS, evitando errores EPERM.
- Parámetros pasados al proceso Electron mediante fichero temporal `/tmp/.gestoria_launcher` (env vars no se propagan con `open -n`).
- Firma ad-hoc con `codesign --force --deep --sign -` para eliminar cuarentena de `node_modules/electron/dist/Electron.app`.
- `Info.plist` de Electron.app parcheado en cada arranque con `PlistBuddy` para mostrar "GestorIA" en la barra de menú.
- Icono `AppIcon.icns` generado desde PNG 1024×1024 con fondo blanco sólido para que macOS aplique la máscara squircle sobre el bundle.
- `dock-icon.png` (1024×1024, squircle pre-aplicado, radio 230 px) usado en `app.dock.setIcon()` para el icono durante la ejecución.

### Pantalla de carga (splash)
- `app/electron/splash.html` rediseñado con el estilo visual de la app: fondo `#f6f7f8`, tipografía Plus Jakarta Sans, colores `#0f1b2d`/`#3b82f6`.
- Eliminados los indicadores técnicos de pasos (DB/API/UI/Launch); sustituidos por barra de progreso con porcentaje numérico y mensajes amigables.
- Mensajes: "Preparando los datos…", "Conectando con la base de datos…", "Cargando los servicios…", "Preparando la interfaz…", "Abriendo GestorIA…", "¡Todo listo!".
- `splashUpdate()` en `main.cjs` simplificada a `(splash, pct, text)` — sin `stepId`.
