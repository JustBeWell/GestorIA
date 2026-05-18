# Modelo de datos - GestorIA MVP

Documento de referencia del modelo relacional actual de GestorIA.

**Ultima revision:** 2026-05-08

---

## Diagrama entidad-relacion

```text
usuarios 1:1 empleados
empleados 1:N fichajes
clientes 1:N trabajos
clientes 1:N facturas
trabajos N:M empleados             via trabajo_empleado
trabajos 1:N comentarios_trabajo
facturas 1:N pagos
usuarios 1:N auditoria_eventos
usuarios 1:N comentarios_trabajo   via autor_id
calendario_fiscal_vencimientos -> clientes via aplica_tipo_cliente
usuarios 1:N gia_conversaciones
gia_conversaciones 1:N gia_mensajes
gia_conversaciones 1:N gia_archivos
```

---

## Tablas principales

| Tabla | Proposito | Relaciones clave |
|---|---|---|
| `usuarios` | Identidad de acceso, password hash, rol y estado. | 1:1 con `empleados`; 1:N con `auditoria_eventos`. |
| `empleados` | Datos personales y laborales. | FK a `usuarios`; 1:N con `fichajes`; N:M con `trabajos`. |
| `fichajes` | Eventos de jornada. | FK a `empleados`. |
| `clientes` | Datos fiscales y contacto. | 1:N con `trabajos`; 1:N con `facturas`. |
| `trabajos` | Expedientes o tareas por cliente. | FK a `clientes`; FK a `usuarios` como creador; N:M con `empleados`. |
| `trabajo_empleado` | Asignaciones de empleados a trabajos. | FK a `trabajos`; FK a `empleados`. |
| `comentarios_trabajo` | Comentarios internos de seguimiento. | FK a `trabajos`; FK a `usuarios` como autor. |
| `facturas` | Facturas emitidas a clientes. | FK a `clientes`; 1:N con `pagos`. |
| `pagos` | Pagos parciales o totales de facturas. | FK a `facturas`. |
| `auditoria_eventos` | Log de acciones criticas del sistema. | FK logica a `usuarios` mediante `actor_id`. |
| `calendario_fiscal_vencimientos` | Vencimientos fiscales y laborales usados por la herramienta de calendario. | Relacion logica con `clientes.tipo_cliente` mediante `aplica_tipo_cliente`. |
| `gia_conversaciones` | Conversaciones persistidas del portal GIA. | FK a `usuarios`. |
| `gia_mensajes` | Mensajes de usuario/asistente dentro de una conversacion GIA. | FK a `gia_conversaciones`. |
| `gia_archivos` | Adjuntos subidos y archivos generados por GIA. | FK a `gia_conversaciones`, `gia_mensajes` y `usuarios`. |

---

## Tipos enumerados

| Tipo | Valores |
|---|---|
| `rol_usuario` | `administrador`, `empleado` |
| `tipo_evento_fichaje` | `entrada`, `salida` |
| `origen_fichaje` | `web`, `manual`, `correccion` |
| `estado_trabajo` | `pendiente`, `en_curso`, `bloqueado`, `finalizado`, `cancelado` |
| `prioridad_trabajo` | `baja`, `media`, `alta`, `urgente`, `no_aplica` |
| `estado_factura` | `borrador`, `emitida`, `pagada_parcial`, `pagada`, `anulada` |
| `metodo_pago` | `transferencia`, `efectivo`, `tarjeta`, `domiciliacion`, `otro` |
| `accion_auditoria` | `crear`, `editar`, `eliminar`, `login`, `logout`, `correccion_fichaje`, `cambio_estado` |
| `prioridad_calendario_fiscal` | `alta`, `media`, `baja` |
| `estado_calendario_fiscal` | `pendiente`, `presentado`, `en_preparacion`, `no_aplica` |

---

## Reglas de negocio en base de datos

1. **Secuencia de fichaje:** `trg_validar_fichaje` impide secuencias invalidas de entrada/salida.
2. **Pagos no exceden factura:** `trg_validar_pago` evita que la suma de pagos supere el total facturado.
3. **Estado automatico de factura:** `trg_actualizar_estado_factura` actualiza la factura a `pagada_parcial` o `pagada`.
4. **Timestamps de actualizacion:** triggers de `updated_at` en entidades principales.
5. **Campos calculados:** `importe_iva` y `total` se calculan como columnas generadas en `facturas`.
6. **Calendario fiscal:** cada vencimiento es unico por `fecha`, `modelo`, `periodo` y `titulo`; `aplica_tipo_cliente` permite calcular clientes afectados sin duplicar vencimientos por cliente y `deleted_at` soporta borrado logico.

---

## Vistas

| Vista | Proposito |
|---|---|
| `v_deuda_por_cliente` | Deuda viva por cliente: total facturado menos pagos. |
| `v_horas_diarias` | Horas trabajadas por empleado y dia. |
| `v_resumen_mensual` | Resumen mensual para gerencia: horas, trabajos, facturacion y deuda. |
| Vistas historicas admin | Series historicas usadas por el panel de administracion. |

---

## Migraciones

| Migracion | Descripcion |
|---|---|
| `V001__schema_inicial.sql` | Esquema base: usuarios, empleados, fichajes, clientes, trabajos, facturas, pagos, enums, triggers e indices. |
| `V002__fichaje_pausas.sql` | Soporte de pausas en fichaje. |
| `V003__vistas_analiticas.sql` | Vistas analiticas de deuda, horas y resumen. |
| `V003__vistas_historicas_admin.sql` | Vistas historicas para panel admin. |
| `V004__login_bloqueo.sql` | Campos de bloqueo por intentos fallidos. |
| `V005__token_blacklist.sql` | Tabla para invalidacion server-side de JWT. |
| `V006__2fa_otp.sql` | Soporte de OTP 2FA. |
| `V007__clientes_tipo_referencia.sql` | Evolucion de datos de cliente. |
| `V008__trabajos_nro_comentarios.sql` | Secuencia `nro_trabajo` y tabla `comentarios_trabajo`. |
| `V009__cascade_delete_cliente.sql` | Cascada en relaciones de cliente con trabajos, facturas y pagos. |
| `V010__auditoria_eventos.sql` | Tabla de auditoria. |
| `V011__calendario_fiscal.sql` | Tabla y semillas iniciales AEAT 2026 para calendario fiscal. |
| `V012__gia_portal.sql` | Conversaciones, mensajes y archivos generados/subidos del portal GIA. |
| `V013__calendario_asesoria_fiscal_laboral.sql` | Ampliacion 2026 con Renta, IVA, IRPF, Sociedades, informativas y Seguridad Social. |
| `V017__calendario_fiscal_admin_delete.sql` | Baja logica de vencimientos fiscales eliminados desde administracion. |

> Nota: existen dos migraciones con prefijo `V003`. Si se adopta una herramienta estricta de migraciones, conviene renumerarlas o consolidarlas.

---

## Convenciones

- IDs UUID v4 mediante `uuid-ossp`.
- Fechas con `TIMESTAMPTZ` para trazabilidad.
- Nomenclatura `snake_case` en espanol.
- Borrado logico en usuarios, empleados y clientes cuando aplica.
- Borrado en cascada para eliminar dependencias de cliente segun `V009`.
- Reglas criticas duplicadas en backend y base de datos cuando la integridad lo requiere.
