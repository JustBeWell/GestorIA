# Desarrollo

## Contexto
Este documento sigue el avance del MVP descrito en docs/estudio_caso_mvp_gestoria.md y sirve como guia de trabajo para no perder el hilo.

## Estado actual (2026-04-28)
### Hecho
- Backend FastAPI con endpoints de intranet y autenticacion.
- Fichaje: reglas de entrada/salida diarias y soporte de pausas (inicio/fin).
- Exportacion CSV de fichaje desde backend.
- UI Home y Fichaje alineadas con el diseño PPTX (layout shell).
- Sidebar refinada con indicador activo y estados hover.
- Error de fichaje como modal sin sugerir cierre de sesion.
- Accion para deshacer el ultimo fichaje del dia.
- Docker-compose operativo con db, backend, frontend.

### En curso
- Ajustes finos de estilos y pruebas de flujo en fichaje.

### Bloqueos
- Ninguno reportado.

## Backlog MVP (segun estudio MVP)
### Autenticacion y autorizacion
- Login por DNI/password.
- Roles administrador/empleado.

### Empleados
- Alta/baja/edicion.
- Vista resumen por empleado.

### Fichaje
- Entrada/salida diaria con validaciones.
- Pausas: inicio/fin.
- Exportacion CSV por rango.

### Clientes
- CRUD basico y datos fiscales.
- Busqueda por nombre/CIF.

### Trabajos
- Alta y estados basicos.
- Asignaciones a empleados.

### Facturacion y pagos
- Registro de factura y pagos parciales.
- Deuda viva por cliente.

### Resumen operativo
- Panel con horas del mes, trabajos activos, facturacion, deuda.

## Pendiente inmediato
- Probar exportacion CSV, pausas y deshacer fichaje en UI.
- Validar modal de error y mensajes de accion.
- Revisar endpoints de clientes/trabajos/pagos para asegurar cobertura MVP.

## Notas
- Mantener este documento actualizado con cambios relevantes y bloqueos.
