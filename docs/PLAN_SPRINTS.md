# Plan de Sprints — GestorIA MVP

**Generado:** 2026-05-04  
**Última revisión:** 2026-05-04  
**Estado global:** 🟢 Sprint 2 completado — pendiente aprobación Sprint 3

---

## Contexto y base de partida

Los módulos M1 (Auth), M2 (Empleados), M3 (Fichaje) y M7 (Home / Resumen operativo) están **COMPLETOS**. El trabajo restante hasta cerrar el MVP abarca los módulos M4–M6 (operativa de negocio), M8 (exportaciones pendientes), M9 (auditoría) y M10 (herramientas de soporte), más la deuda técnica acumulada.

El plan se organiza en **5 sprints de ~1 semana cada uno** priorizados por dependencias de dominio:

```
M4 Clientes → M5 Trabajos → M6 Facturación → M9 Auditoría + M8 resto → M10 Herramientas + Calidad
```

Cada sprint requiere **aprobación explícita** antes de comenzar el siguiente.

---

## Resumen visual de sprints

| Sprint | Módulo(s) | Foco principal | HUs |
|--------|-----------|----------------|-----|
| S1 | M4 | Gestión de clientes — full stack | 7 |
| S2 | M5 | Gestión de trabajos — full stack | 8 |
| S3 | M6 | Facturación y pagos — full stack | 7 |
| S4 | M9 + M8 | Auditoría + exportaciones restantes | 7 |
| S5 | M10 + DT | Herramientas + calidad y tests | 9 |
| **Total** | | | **38 HUs** |

---

## Sprint 1 — Gestión de Clientes (M4)

**Objetivo del sprint:** dejar el módulo de clientes 100 % operativo, con backend completo de escritura y UI funcional conectada.

**Dependencias previas:** ninguna (backend GET ya existe).

**Criterio de aceptación del sprint:** un gerente puede dar de alta, editar, dar de baja lógica y buscar clientes desde la UI, con validaciones de formato CIF/NIF en ambas capas.

---

### HU-M4-01 · Endpoints de escritura de clientes (backend)

**Como** sistema,  
**quiero** disponer de endpoints `POST /intranet/clientes`, `PUT /intranet/clientes/{id}` y `DELETE /intranet/clientes/{id}`,  
**para que** la UI pueda crear, editar y dar de baja lógica a clientes.

**Tareas técnicas:**
- Crear `ClienteCreate` y `ClienteUpdate` como schemas Pydantic en `schemas/`.
- Implementar `post_cliente`, `put_cliente` y `delete_cliente` en `routes/intranet.py`.
- Añadir lógica de unicidad de CIF/NIF con respuesta 409 si ya existe.
- Baja lógica: campo `activo = false`, nunca `DELETE` físico.
- Validación de formato CIF/NIF (regex) en capa de servicio.
- Tests de integración: alta, edición, baja, unicidad, formato inválido.

**Definición de hecho:**
- [ ] Endpoints documentados en OpenAPI (`/docs`).
- [ ] Validación CIF/NIF rechaza formatos incorrectos con 422.
- [ ] Unicidad devuelve 409 con mensaje claro.
- [ ] Tests pasan en CI.

---

### HU-M4-02 · Pantalla de listado de clientes (UI)

**Como** gerente,  
**quiero** ver la lista de clientes activos con nombre fiscal, CIF/NIF, email y teléfono,  
**para** tener una visión rápida del portfolio de clientes.

**Tareas técnicas:**
- Reemplazar el placeholder "Work in progress" por el componente real en `features/clientes/`.
- Tabla/listado con columnas: nombre fiscal, CIF/NIF, email, teléfono, estado.
- Paginación en frontend (o scroll virtual) si hay muchos registros.
- Indicador de carga y estado vacío.
- Conectar con `GET /intranet/clientes` existente.

**Definición de hecho:**
- [ ] Lista visible con datos reales de BD.
- [ ] Estado de carga visible durante petición.
- [ ] Estado vacío con mensaje accionable.

---

### HU-M4-03 · Buscador de clientes (UI)

**Como** gerente,  
**quiero** buscar clientes por nombre fiscal, CIF/NIF o email,  
**para** localizar rápidamente un cliente específico.

**Tareas técnicas:**
- Input de búsqueda con debounce (300 ms) en la cabecera del listado.
- Filtrado en frontend sobre el array cargado (o query param al backend si se añade paginación).
- Limpieza de búsqueda con botón "×".

**Definición de hecho:**
- [ ] Búsqueda reactiva sin recarga de página.
- [ ] Funciona con nombre parcial, CIF parcial y email parcial.
- [ ] Sin resultados muestra mensaje informativo.

---

### HU-M4-04 · Formulario de alta de cliente (UI)

**Como** gerente,  
**quiero** dar de alta un nuevo cliente desde un formulario,  
**para** registrar sus datos fiscales en el sistema.

**Tareas técnicas:**
- Modal o panel lateral con campos: nombre fiscal*, CIF/NIF*, email*, teléfono, dirección, notas.
- Validación de formato CIF/NIF en frontend con regex y mensaje de error inline.
- Validación de campos obligatorios antes de enviar.
- Llamada a `POST /intranet/clientes` con manejo de 409 (CIF/NIF duplicado).
- Feedback de éxito (toast) y refresco del listado.

**Definición de hecho:**
- [ ] Formulario con validaciones reactivas en Angular.
- [ ] Error 409 mostrado como mensaje de validación en el campo CIF/NIF.
- [ ] Lista se actualiza tras alta exitosa.

---

### HU-M4-05 · Formulario de edición de cliente (UI)

**Como** gerente,  
**quiero** editar los datos de un cliente existente,  
**para** mantener la información actualizada.

**Tareas técnicas:**
- Reutilizar el formulario de alta en modo edición (precargado con datos actuales).
- Llamada a `PUT /intranet/clientes/{id}`.
- El CIF/NIF es editable pero sigue validando unicidad.
- Botón "Editar" accesible desde el listado o desde el detalle.

**Definición de hecho:**
- [ ] Datos actuales visibles al abrir el formulario.
- [ ] Cambios persistidos correctamente.
- [ ] Sin cambios no llama al backend (validación de "dirty form").

---

### HU-M4-06 · Baja lógica de cliente (UI)

**Como** gerente,  
**quiero** desactivar un cliente que ya no opera,  
**para** mantener limpia la lista sin perder el historial.

**Tareas técnicas:**
- Botón "Dar de baja" con modal de confirmación.
- Llamada a `DELETE /intranet/clientes/{id}` (baja lógica en backend).
- Cliente desactivado no aparece en listado por defecto.
- Toggle opcional "Mostrar inactivos" para recuperabilidad.

**Definición de hecho:**
- [ ] Confirmación requerida antes de ejecutar.
- [ ] Cliente desaparece del listado tras baja.
- [ ] Toggle "Mostrar inactivos" funcional.

---

### HU-M4-07 · Vista de detalle de cliente (UI)

**Como** gerente,  
**quiero** acceder a la ficha completa de un cliente,  
**para** ver sus datos, trabajos asociados y facturas vinculadas.

**Tareas técnicas:**
- Página o panel expandible con datos completos del cliente.
- Sección "Trabajos" con listado resumido (título, estado, fecha) — datos procedentes del endpoint de trabajos filtrado por `cliente_id`.
- Sección "Facturas" con listado resumido (número, importe, estado) — datos del endpoint de pagos/facturas filtrado por `cliente_id`.
- Enlace a los módulos correspondientes para ver detalle completo.
- Botones de editar / dar de baja accesibles desde la ficha.

**Definición de hecho:**
- [ ] Datos fiscales completos visibles.
- [ ] Trabajos y facturas se cargan (aunque los módulos estén en placeholder aún).
- [ ] Navegación a módulo de trabajos/facturas funcional.

---

## Sprint 2 — Gestión de Trabajos (M5) ✅ COMPLETADO (2026-05-04)

**Objetivo del sprint:** módulo de trabajos completamente funcional, con asignación de empleados, cambio de estado y comentarios internos.

**Dependencias previas:** Sprint 1 completado (se necesita selector de clientes en el formulario de trabajos).

**Criterio de aceptación del sprint:** un gerente puede crear trabajos vinculados a un cliente, asignar empleados, cambiar el estado y dejar comentarios internos.

---

### HU-M5-01 · Endpoints de escritura de trabajos (backend)

**Como** sistema,  
**quiero** disponer de endpoints `POST /intranet/trabajos`, `PUT /intranet/trabajos/{id}` y `DELETE /intranet/trabajos/{id}`,  
**para** gestionar el ciclo de vida de un trabajo.

**Tareas técnicas:**
- Schemas `TrabajoCreate` y `TrabajoUpdate` en Pydantic.
- Validación: `cliente_id` debe existir y estar activo.
- Estados válidos: `pendiente`, `en_curso`, `bloqueado`, `finalizado`, `cancelado`.
- Baja lógica (no DELETE físico).
- Tests: creación, edición, cambio de estado, cliente inexistente.

**Definición de hecho:**
- [x] Endpoints documentados en OpenAPI.
- [x] Transiciones de estado validadas.
- [x] Baja lógica funcional.
- [x] Tests pasan.

---

### HU-M5-02 · Endpoint de asignación de empleados a trabajo (backend)

**Como** sistema,  
**quiero** disponer de `POST /intranet/trabajos/{id}/empleados` y `DELETE /intranet/trabajos/{id}/empleados/{empleado_id}`,  
**para** gestionar la tabla `trabajo_empleado` (N:M).

**Tareas técnicas:**
- Validar que el empleado existe y está activo.
- Evitar duplicados en la tabla intermedia.
- Devolver la lista actualizada de empleados asignados.
- Tests: asignar, desasignar, duplicado, empleado inexistente.

**Definición de hecho:**
- [x] Asignación y desasignación funcionales.
- [x] Respuesta incluye lista actualizada.
- [x] Tests pasan.

---

### HU-M5-03 · Endpoints de comentarios internos (backend)

**Como** sistema,  
**quiero** disponer de `GET /intranet/trabajos/{id}/comentarios` y `POST /intranet/trabajos/{id}/comentarios`,  
**para** permitir comentarios internos por trabajo.

**Tareas técnicas:**
- Verificar que la tabla `comentarios_trabajo` (o equivalente) existe en el modelo de datos; si no, crear migración `V004`.
- Schema `ComentarioCreate` con campo `texto` (máx. 1000 chars).
- El autor del comentario se extrae del JWT (usuario autenticado).
- Comentarios inmutables (no editar ni borrar en MVP).

**Definición de hecho:**
- [x] Migración aplicada si procede.
- [x] GET devuelve comentarios ordenados por fecha.
- [x] POST crea comentario con autor y timestamp.

---

### HU-M5-04 · Pantalla de listado de trabajos (UI)

**Como** gerente,  
**quiero** ver todos los trabajos con su estado, cliente y prioridad,  
**para** tener una visión global de la carga de trabajo.

**Tareas técnicas:**
- Reemplazar placeholder en `features/trabajos/`.
- Tabla con columnas: título, cliente, estado (badge de color), prioridad, empleados asignados, fecha objetivo.
- Conectar con `GET /intranet/trabajos`.
- Estado de carga y estado vacío.

**Definición de hecho:**
- [x] Lista con datos reales (Kanban board con 4 columnas).
- [x] Badges de estado con color semántico (pendiente=azul, en_curso=ámbar, bloqueado=rojo, finalizado=verde, cancelado=gris).
- [x] Estado de carga visible (skeleton loading).

---

### HU-M5-05 · Filtros de trabajos (UI)

**Como** gerente,  
**quiero** filtrar trabajos por estado, prioridad y cliente,  
**para** localizar rápidamente los que me interesan.

**Tareas técnicas:**
- Filtros en la cabecera del listado: dropdown de estado, dropdown de prioridad, selector de cliente.
- Filtrado en frontend sobre el array cargado.
- Botón "Limpiar filtros".

**Definición de hecho:**
- [x] Filtros combinables (AND lógico).
- [x] Limpiar filtros restaura listado completo.

---

### HU-M5-06 · Formulario de alta y edición de trabajo (UI)

**Como** gerente,  
**quiero** crear y editar trabajos desde un formulario,  
**para** gestionar el ciclo de vida de cada expediente.

**Tareas técnicas:**
- Modal con campos: título*, descripción, cliente* (selector), prioridad, fecha objetivo, estado (en edición).
- Selector de cliente carga de `GET /intranet/clientes` (solo activos).
- Llamada a `POST` o `PUT` según modo.
- Feedback de éxito y refresco del listado.

**Definición de hecho:**
- [x] Selector de cliente funcional.
- [x] Alta y edición sin recargar la página.
- [x] Validaciones de campos obligatorios.

---

### HU-M5-07 · Cambio de estado y asignación de empleados (UI)

**Como** gerente,  
**quiero** cambiar el estado de un trabajo y asignar/desasignar empleados,  
**para** mantener el seguimiento operativo al día.

**Tareas técnicas:**
- Selector de estado inline en la tarjeta o en el detalle del trabajo.
- Panel de empleados asignados con avatares/nombres y botón "×" para desasignar.
- Selector para añadir nuevo empleado (carga de `GET /users/`).
- Llamadas a los endpoints de asignación.

**Definición de hecho:**
- [x] Cambio de estado sin abrir formulario completo (pills rápidas en panel lateral).
- [x] Lista de asignados actualizada en tiempo real.

---

### HU-M5-08 · Comentarios internos de trabajo (UI)

**Como** empleado o gerente,  
**quiero** ver y añadir comentarios internos en un trabajo,  
**para** dejar notas de seguimiento visibles para el equipo.

**Tareas técnicas:**
- Sección de comentarios en el detalle del trabajo (orden cronológico ascendente).
- Campo de texto + botón "Añadir comentario".
- Mostrar autor y timestamp de cada comentario.
- Los comentarios son de solo lectura una vez guardados.

**Definición de hecho:**
- [x] Comentarios cargados al abrir el detalle.
- [x] Nuevo comentario aparece inmediatamente tras guardar.
- [x] Autor y fecha visibles en cada mensaje.

---

## Sprint 3 — Facturación y Pagos (M6)

**Objetivo del sprint:** módulo de facturación completo con alta de facturas, registro de pagos, deuda viva y alertas de vencimiento.

**Dependencias previas:** Sprint 1 (cliente selector), Sprint 2 (opcional: vincular trabajos a facturas).

**Criterio de aceptación del sprint:** un gerente puede emitir facturas, registrar cobros parciales o totales, y consultar la deuda pendiente por cliente con alertas de vencimiento.

---

### HU-M6-01 · Endpoints de escritura de facturas (backend)

**Como** sistema,  
**quiero** disponer de `POST /intranet/facturas` y `PUT /intranet/facturas/{id}`,  
**para** registrar y actualizar facturas emitidas.

**Tareas técnicas:**
- Schemas `FacturaCreate` y `FacturaUpdate`.
- Validar que `cliente_id` existe y está activo.
- Calcular `total = base_imponible * (1 + iva/100)` en backend.
- Estado inicial: `pendiente`.
- Trigger de BD `trg_actualizar_estado_factura` debe activarse al registrar pagos.
- Tests: alta, edición, cliente inválido, cálculo de total.

**Definición de hecho:**
- [ ] Endpoints documentados en OpenAPI.
- [ ] Total calculado correctamente.
- [ ] Tests pasan.

---

### HU-M6-02 · Endpoints de escritura de pagos (backend)

**Como** sistema,  
**quiero** disponer de `POST /intranet/pagos` y `PUT /intranet/pagos/{id}`,  
**para** registrar cobros sobre una factura.

**Tareas técnicas:**
- Schema `PagoCreate` con `factura_id`, `importe`, `metodo_pago`, `referencia`.
- Validar que la suma de pagos no supere el total de la factura (regla de negocio 12.5 del estudio de caso).
- Actualizar estado de factura automáticamente: `parcialmente_pagada` / `pagada`.
- Utilizar la vista `v_deuda_por_cliente` para el cálculo de deuda.
- Tests: pago parcial, pago completo, sobrepago bloqueado.

**Definición de hecho:**
- [ ] Sobrepago devuelve 422 con mensaje claro.
- [ ] Estado de factura actualizado tras el pago.
- [ ] Deuda viva calculada correctamente en BD.
- [ ] Tests pasan.

---

### HU-M6-03 · Pantalla de listado de facturas (UI)

**Como** gerente,  
**quiero** ver todas las facturas con su estado de cobro,  
**para** controlar la situación económica de la gestoría.

**Tareas técnicas:**
- Reemplazar placeholder en `features/pagos/` (o renombrar a `features/facturacion/`).
- Tabla con columnas: número, cliente, fecha emisión, fecha vencimiento, total, cobrado, pendiente, estado.
- Badge de estado con color semántico.
- Alertas visuales para facturas vencidas (fecha vencimiento < hoy AND estado ≠ pagada).
- Conectar con `GET /intranet/pagos`.

**Definición de hecho:**
- [ ] Lista con datos reales.
- [ ] Facturas vencidas marcadas con badge o fila en color ámbar/rojo.
- [ ] Columna "Pendiente" calculada correctamente.

---

### HU-M6-04 · Formulario de alta de factura (UI)

**Como** gerente,  
**quiero** registrar una nueva factura desde un formulario,  
**para** asociarla a un cliente y controlar su cobro.

**Tareas técnicas:**
- Modal con campos: cliente* (selector), número de factura*, fecha emisión*, fecha vencimiento, base imponible*, IVA (select: 0%, 4%, 10%, 21%), descripción.
- Visualización del total calculado en tiempo real.
- Llamada a `POST /intranet/facturas`.
- Feedback y refresco.

**Definición de hecho:**
- [ ] Total calculado reactivamente al cambiar base/IVA.
- [ ] Factura creada y visible en listado.

---

### HU-M6-05 · Registro de pago sobre factura (UI)

**Como** gerente,  
**quiero** registrar un pago (parcial o total) sobre una factura,  
**para** actualizar la deuda pendiente.

**Tareas técnicas:**
- Botón "Registrar pago" en cada fila de factura no pagada.
- Modal con campos: importe*, método de pago (efectivo/transferencia/otro), referencia, fecha pago.
- Mostrar importe pendiente antes de confirmar.
- Error de sobrepago mostrado como validación inline.
- Estado de factura actualizado visualmente tras el pago.

**Definición de hecho:**
- [ ] Importe pendiente visible en el modal.
- [ ] Sobrepago bloqueado con mensaje claro.
- [ ] Estado de factura refrescado tras pago exitoso.

---

### HU-M6-06 · Vista de deuda viva por cliente (UI)

**Como** gerente,  
**quiero** ver un resumen de la deuda pendiente agrupada por cliente,  
**para** priorizar cobros y detectar morosos.

**Tareas técnicas:**
- Panel o tab "Deuda viva" en el módulo de facturación.
- Tabla: cliente, total facturado, total cobrado, deuda pendiente — datos de `v_deuda_por_cliente`.
- Ordenación por deuda descendente por defecto.
- Enlace a la ficha del cliente.

**Definición de hecho:**
- [ ] Datos procedentes de la vista de BD `v_deuda_por_cliente`.
- [ ] Ordenación funcional.
- [ ] Enlace a ficha de cliente.

---

### HU-M6-07 · Exportación CSV de facturas y deuda (M8 parcial)

**Como** gerente,  
**quiero** exportar el listado de facturas y la deuda viva a CSV,  
**para** compartirlos con la gestoría externa o procesarlos en Excel.

**Tareas técnicas:**
- Nuevo endpoint `GET /intranet/facturas/export/csv` con filtros opcionales (rango de fechas, estado, cliente).
- Endpoint `GET /intranet/deuda/export/csv` basado en `v_deuda_por_cliente`.
- Botones "Exportar CSV" en la UI de facturas y deuda, análogos a los ya existentes en fichaje.

**Definición de hecho:**
- [ ] CSV descargable desde la UI.
- [ ] Columnas limpias con cabeceras en español.
- [ ] Encoding UTF-8 con BOM para compatibilidad con Excel español.

---

## Sprint 4 — Auditoría (M9) + Exportaciones restantes (M8)

**Objetivo del sprint:** activar el sistema de auditoría de forma transversal en todos los módulos ya construidos, completar la generación del documento mensual de cierre y conectar la vista `v_resumen_mensual` al Home.

**Dependencias previas:** Sprints 1-3 completados (los endpoints de escritura deben existir para poder auditarlos).

**Criterio de aceptación del sprint:** toda acción crítica (alta/edición/baja de clientes, trabajos, facturas, pagos y empleados; correcciones de fichaje) queda registrada en `auditoria_eventos`. El gerente puede consultar el registro desde la UI.

---

### HU-M9-01 · Servicio de auditoría en backend

**Como** sistema,  
**quiero** disponer de una función auxiliar `registrar_evento_auditoria(actor_id, entidad, entidad_id, accion, detalle, ip)`,  
**para** ser llamada desde cualquier endpoint sin duplicar lógica.

**Tareas técnicas:**
- Crear `services/auditoria_service.py` con la función helper.
- Compatibilidad con llamadas asíncronas (async/await).
- Inserción en `auditoria_eventos` con los campos del modelo de BD.
- El fallo de auditoría NO debe romper la transacción principal (try/except silencioso con log).

**Definición de hecho:**
- [ ] Función helper disponible e importable.
- [ ] Fallo de auditoría no propaga error al cliente.
- [ ] Test unitario del helper.

---

### HU-M9-02 · Registro de auditoría en endpoints de clientes y trabajos

**Como** sistema,  
**quiero** que toda alta, edición y baja de clientes y trabajos quede registrada en auditoría,  
**para** tener trazabilidad completa sobre los datos de negocio.

**Tareas técnicas:**
- Llamar a `registrar_evento_auditoria` en `post_cliente`, `put_cliente`, `delete_cliente`.
- Idem en `post_trabajo`, `put_trabajo`, `delete_trabajo`, `post_asignacion`, `delete_asignacion`.
- `detalle_json` incluye snapshot del estado antes y después para ediciones.

**Definición de hecho:**
- [ ] Eventos registrados verificables en BD tras cada operación.
- [ ] Tests de integración verifican la inserción en `auditoria_eventos`.

---

### HU-M9-03 · Registro de auditoría en facturación, pagos y empleados

**Como** sistema,  
**quiero** que toda alta/edición/baja de facturas, pagos y empleados quede en auditoría,  
**para** cumplir con la trazabilidad mínima del MVP.

**Tareas técnicas:**
- Llamar a `registrar_evento_auditoria` en endpoints de facturas y pagos (sprints anteriores).
- Añadir auditoría en `post_usuario`, `put_usuario_admin`, `delete_usuario` (M2).
- Auditoría en corrección de fichaje (`PUT /intranet/fichaje/{id}` — ya existente en M3).

**Definición de hecho:**
- [ ] Los 5 dominios (clientes, trabajos, facturas, pagos, empleados) generan eventos.
- [ ] Corrección de fichaje genera evento con campo `corregido_por`.

---

### HU-M9-04 · Endpoint de consulta de auditoría (backend)

**Como** sistema,  
**quiero** disponer de `GET /intranet/auditoria` con filtros por entidad, actor y rango de fechas,  
**para** que la UI del admin pueda mostrar el log de actividad.

**Tareas técnicas:**
- Filtros: `entidad`, `actor_id`, `accion`, `fecha_desde`, `fecha_hasta`.
- Paginación (page + page_size).
- Solo accesible para rol `administrador`.
- Tests: sin filtros, con filtros combinados, acceso denegado para empleado.

**Definición de hecho:**
- [ ] Endpoint documentado en OpenAPI.
- [ ] Paginación funcional.
- [ ] Acceso restringido por rol.

---

### HU-M9-05 · UI de auditoría (admin)

**Como** gerente,  
**quiero** ver el historial de acciones críticas desde la intranet,  
**para** auditar cambios y detectar actividad inusual.

**Tareas técnicas:**
- Nueva sección "Auditoría" en el panel de administración (o ruta `/admin/auditoria`).
- Tabla con columnas: fecha/hora, actor, entidad, ID entidad, acción, detalle (expandible).
- Filtros: tipo de entidad, actor, rango de fechas.
- Solo visible para administradores.

**Definición de hecho:**
- [ ] Tabla paginada con datos reales.
- [ ] Filtros funcionales.
- [ ] Detalle JSON expandible en cada fila.
- [ ] No visible para empleados.

---

### HU-M8-01 · Documento mensual de cierre (exportación)

**Como** gerente,  
**quiero** generar un documento PDF mensual de cierre operativo,  
**para** consolidar el estado de fichajes, trabajos e ingresos del mes y compartirlo con la gestoría externa.

**Tareas técnicas:**
- Nuevo endpoint `GET /intranet/cierre/mensual/pdf?year={y}&month={m}`.
- Usar `fpdf2` (ya disponible en `requirements.txt`).
- Secciones del PDF: cabecera corporativa, resumen de empleados y horas, listado de trabajos del mes (nuevos, finalizados, en curso), facturación del mes (emitida, cobrada, pendiente), incidencias de fichaje.
- Conectar `v_resumen_mensual` al cálculo de datos.
- Botón "Exportar cierre mensual PDF" en el panel de administración.

**Definición de hecho:**
- [ ] PDF generado con datos reales del mes seleccionado.
- [ ] Todas las secciones presentes.
- [ ] Descargable desde la UI del admin.

---

### HU-M8-02 · Conectar v_resumen_mensual al Home

**Como** gerente,  
**quiero** que el Home use los datos de `v_resumen_mensual`,  
**para** asegurar coherencia entre el resumen operativo y los datos de BD.

**Tareas técnicas:**
- Endpoint `GET /intranet/resumen/mensual?year={y}&month={m}` que consume `v_resumen_mensual`.
- Actualizar `HomePageComponent` para usar este endpoint en lugar de los cálculos paralelos actuales.
- Verificar que los KPIs del Home coinciden con los de `v_resumen_mensual`.

**Definición de hecho:**
- [ ] KPIs del Home alimentados por la vista de BD.
- [ ] Sin divergencias entre Home y documento de cierre.

---

## Sprint 5 — Herramientas (M10) + Calidad y Deuda Técnica

**Objetivo del sprint:** completar los módulos de soporte (Calendario fiscal, Documentos, Ajustes) y cerrar la deuda técnica prioritaria (estado global, errores centralizados, tests).

**Dependencias previas:** Sprints 1-4 completados.

**Criterio de aceptación del sprint:** el MVP cumple la "Definición de hecho" del estudio de caso (sección 20), con cobertura de tests básica y sin deuda técnica bloqueante.

---

### HU-M10-01 · Calendario fiscal (backend + UI)

**Como** gerente,  
**quiero** consultar las fechas clave fiscales y laborales del año en curso,  
**para** anticipar obligaciones tributarias y laborales.

**Tareas técnicas:**
- Modelo de datos: tabla `calendario_fiscal(id, fecha, descripcion, tipo, año)`.
- Migración `V005__calendario_fiscal.sql` con datos iniciales del año en curso (IVA trimestral, IRPF, cotizaciones, festivos nacionales).
- Endpoint `GET /intranet/calendario-fiscal?year={y}`.
- Endpoint admin `POST /intranet/calendario-fiscal` y `PUT`, `DELETE` para gestionar entradas.
- UI: reemplazar placeholder con vista de calendario visual mensual o listado cronológico.
- Gestión admin de entradas del calendario.

**Definición de hecho:**
- [ ] Datos reales del año cargados desde BD.
- [ ] Vista de calendario o listado filtrable por mes.
- [ ] Admin puede añadir/editar/eliminar entradas.

---

### HU-M10-02 · Módulo de documentos (backend + UI básica)

**Como** gerente o empleado,  
**quiero** subir y consultar documentos asociados a clientes o trabajos,  
**para** centralizar la documentación de la gestoría.

**Tareas técnicas:**
- Modelo de datos: tabla `documentos(id, nombre, tipo, ruta_archivo, cliente_id nullable, trabajo_id nullable, subido_por, fecha_subida, activo)`.
- Migración `V006__documentos.sql`.
- Almacenamiento en sistema de ficheros local (carpeta `uploads/`, configurable).
- Endpoints: `POST /intranet/documentos` (upload multipart), `GET /intranet/documentos`, `GET /intranet/documentos/{id}/download`, `DELETE /intranet/documentos/{id}` (baja lógica).
- UI: reemplazar placeholder con listado de documentos, botón de subida y descarga.
- Límite de tamaño de archivo configurable (default 10 MB).

**Definición de hecho:**
- [ ] Upload y download funcionales.
- [ ] Documentos visibles en el listado con nombre, tipo y fecha.
- [ ] Baja lógica sin eliminación física.

---

### HU-M10-03 · Módulo de ajustes (backend + UI)

**Como** gerente,  
**quiero** configurar parámetros del sistema desde la UI de ajustes,  
**para** personalizar el comportamiento de la intranet sin tocar código.

**Tareas técnicas:**
- Modelo de datos: tabla `configuracion(clave, valor, descripcion, modificable_por_admin)`.
- Migración `V007__configuracion.sql` con valores iniciales: nombre de la empresa, logo URL, jornada estándar (horas/día), IVA por defecto.
- Endpoints: `GET /intranet/configuracion` y `PUT /intranet/configuracion/{clave}` (solo admin).
- UI: formulario de ajustes con los campos configurables, guardado con feedback.

**Definición de hecho:**
- [ ] Valores persistidos en BD (no hardcodeados).
- [ ] Solo admin puede modificar.
- [ ] Cambio de nombre de empresa refleja en cabecera de la app (si aplica).

---

### HU-DT-01 · Estado global de usuario (frontend)

**Como** desarrollador,  
**quiero** que los datos del usuario autenticado se gestionen mediante un servicio/signal global,  
**para** eliminar la dependencia de `sessionStorage` directo en cada componente.

**Tareas técnicas:**
- Crear/ampliar `AuthStateService` con `currentUser` como `signal<EmpleadoResponse | null>`.
- Reemplazar lecturas directas de `sessionStorage` en todos los componentes por inyección del servicio.
- Asegurar que el signal se limpia en logout y se carga en login (ya parcialmente hecho en M1).

**Definición de hecho:**
- [ ] Cero lecturas directas de `sessionStorage` en componentes de features.
- [ ] Signal actualizado en login/logout.

---

### HU-DT-02 · Manejo de errores HTTP centralizado (frontend)

**Como** desarrollador,  
**quiero** que los errores HTTP de negocio (400, 409, 422, 500) se gestionen de forma centralizada,  
**para** mostrar mensajes consistentes al usuario sin duplicar lógica en cada componente.

**Tareas técnicas:**
- Ampliar `auth.interceptor.ts` o crear `error.interceptor.ts` para capturar errores de negocio.
- Mapear códigos HTTP a mensajes en español legibles.
- Toast o snackbar global para errores no manejados localmente.
- Los errores de validación de formulario (422) se mapean a campos inline.

**Definición de hecho:**
- [ ] Errors 500 muestran mensaje genérico amable, no el stack.
- [ ] Errors 409/422 muestran el detalle del error en el contexto correcto.
- [ ] Sin `console.error` sin capturar en componentes.

---

### HU-DT-03 · Paginación en endpoint de clientes (backend)

**Como** sistema,  
**quiero** que `GET /intranet/clientes` soporte paginación,  
**para** no devolver todos los registros en una sola respuesta al crecer la base de datos.

**Tareas técnicas:**
- Añadir `page` y `page_size` como query params (default: page=1, page_size=50).
- Respuesta paginada: `{ items: [...], total: int, page: int, page_size: int }`.
- UI adaptar para consumir respuesta paginada (o lazy load).

**Definición de hecho:**
- [ ] Endpoint paginado y retrocompatible.
- [ ] UI funcional con la nueva estructura de respuesta.

---

### HU-DT-04 · Rate limiting en autenticación (backend)

**Como** sistema,  
**quiero** limitar el número de intentos de login por IP,  
**para** reforzar la seguridad contra ataques de fuerza bruta.

**Tareas técnicas:**
- Añadir `slowapi` o middleware propio de rate limiting.
- Límite: 10 intentos por minuto por IP en `/auth/login` y `/auth/otp/verify`.
- Respuesta 429 con cabecera `Retry-After`.

**Definición de hecho:**
- [ ] Más de 10 intentos/min devuelve 429.
- [ ] Test de rate limiting.

---

### HU-DT-05 · Tests de integración para escritura (backend)

**Como** desarrollador,  
**quiero** ampliar la cobertura de tests a todos los endpoints de escritura creados en S1-S4,  
**para** garantizar que la lógica crítica no regresa silenciosamente.

**Tareas técnicas:**
- Tests para clientes (POST, PUT, DELETE): happy path + edge cases.
- Tests para trabajos (POST, PUT, DELETE, asignación).
- Tests para facturas y pagos (regla de sobrepago).
- Tests para auditoría (verificar inserción en `auditoria_eventos`).
- Cobertura mínima objetivo: 80% en `routes/intranet.py`.

**Definición de hecho:**
- [ ] Suite de tests sin fallos en CI.
- [ ] Cobertura ≥ 80% en módulos de negocio.

---

### HU-DT-06 · Feedback de carga en módulos de negocio (frontend)

**Como** usuario,  
**quiero** ver un indicador de carga mientras se obtienen datos de cualquier módulo,  
**para** no confundir una respuesta lenta con un error.

**Tareas técnicas:**
- Añadir skeleton screens o spinner consistente en clientes, trabajos, facturas, auditoría y documentos.
- Reutilizar el patrón ya establecido en M3/M7.

**Definición de hecho:**
- [ ] Todos los módulos nuevos muestran estado de carga.
- [ ] Sin parpadeos ni saltos de layout durante la carga.

---

## Criterio de aceptación global del MVP

El MVP se considera **COMPLETO** cuando:

- [x] Autenticación y roles funcionan (M1 ✓).
- [x] Empleados gestionables (M2 ✓).
- [x] Fichaje con exportación CSV y PDF (M3 ✓).
- [ ] Clientes: CRUD completo + UI (S1).
- [ ] Trabajos: CRUD + asignaciones + comentarios (S2).
- [ ] Facturas + pagos + deuda viva (S3).
- [ ] Exportaciones CSV facturas/deuda y PDF cierre mensual (S3 + S4).
- [ ] Auditoría registra y muestra acciones críticas (S4).
- [ ] Herramientas: Calendario fiscal, Documentos, Ajustes (S5).
- [ ] Deuda técnica bloqueante resuelta (S5).
- [ ] Tests con cobertura ≥ 80% en lógica de negocio (S5).

---

## Flujo de aprobación

```
[Presentación del plan] → ✅ Aprobación → [Sprint 1]
                                              ↓
                                         Revisión S1 → ✅ Aprobación → [Sprint 2]
                                                                          ↓
                                                                     Revisión S2 → ✅ → [Sprint 3]
                                                                                            ↓
                                                                                       Revisión S3 → ✅ → [Sprint 4]
                                                                                                              ↓
                                                                                                         Revisión S4 → ✅ → [Sprint 5]
                                                                                                                               ↓
                                                                                                                          MVP ✅ COMPLETO
```

---

## Registro de aprobaciones

| Sprint | Fecha presentación | Fecha aprobación | Observaciones |
|--------|-------------------|-----------------|---------------|
| Plan completo | 2026-05-04 | 2026-05-04 | Aprobado — arrancado inmediatamente |
| Sprint 1 | 2026-05-04 | 2026-05-04 | ✅ Completado — commit cbb4b56 |
| Sprint 2 | 2026-05-04 | Full stack trabajos: Kanban board, CRUD, comentarios, asignación de empleados | ✅ |
| Sprint 3 | — | — | — |
| Sprint 4 | — | — | — |
| Sprint 5 | — | — | — |
