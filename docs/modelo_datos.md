# Modelo de datos - GestorIA MVP

## Diagrama entidad-relación

```
┌──────────────┐       1:1        ┌──────────────┐
│   usuarios   │─────────────────▶│  empleados   │
│              │                  │              │
│ id (PK)      │                  │ id (PK)      │
│ email (UQ)   │                  │ usuario_id   │──┐
│ password_hash│                  │ nombre       │  │
│ rol (ENUM)   │                  │ apellidos    │  │
│ activo       │                  │ nif (UQ)     │  │
│ intentos_    │                  │ telefono     │  │
│   fallidos   │                  │ activo       │  │
│ bloqueado_   │                  └──────┬───────┘  │
│   hasta      │                         │          │
└──────┬───────┘                         │ 1:N      │
       │                                 ▼          │
       │                        ┌──────────────┐    │
       │                        │   fichajes   │    │
       │                        │              │    │
       │                        │ id (PK)      │    │
       │                        │ empleado_id  │    │
       │               ┌───────▶│ tipo_evento  │    │
       │               │        │ fecha_hora   │    │
       │               │        │ origen       │    │
       │  corregido_por│        │ corregido    │    │
       │───────────────┘        │ corregido_por│    │
       │                        └──────────────┘    │
       │                                            │
       │  creado_por   ┌──────────────┐             │
       │──────────────▶│   trabajos   │             │
       │               │              │             │
       │               │ id (PK)      │    N:M      │
       │               │ cliente_id   │◀────────────┤
       │               │ titulo       │             │
       │               │ estado(ENUM) │   ┌─────────────────────┐
       │               │ prioridad    │   │ trabajo_empleado    │
       │               │ fecha_obj.   │   │                     │
       │               └──────┬───────┘   │ trabajo_id (FK)     │
       │                      │           │ empleado_id (FK)    │
       │                      │ 1:N       │ asignado_en         │
       │                      ▼           │ desasignado_en      │
       │            ┌──────────────────┐  └─────────────────────┘
       │            │ trabajo_         │
       │            │   comentarios    │
       │            │                  │
       │            │ trabajo_id (FK)  │
       │            │ usuario_id (FK)  │
       │            │ contenido        │
       │            └──────────────────┘
       │
       │                ┌──────────────┐
       │                │   clientes   │
       │                │              │
       │                │ id (PK)      │
       │                │ nombre_fiscal│
       │                │ cif_nif (UQ) │
       │                │ email        │
       │                │ telefono     │
       │                │ direccion    │
       │                │ activo       │
       │                └──────┬───────┘
       │                       │ 1:N
       │                       ▼
       │                ┌──────────────┐        ┌──────────────┐
       │                │   facturas   │  1:N   │    pagos     │
       │                │              │───────▶│              │
       │                │ id (PK)      │        │ id (PK)      │
       │                │ cliente_id   │        │ factura_id   │
       │                │ numero (UQ)  │        │ fecha_pago   │
       │                │ base_impon.  │        │ importe      │
       │                │ iva          │        │ metodo_pago  │
       │                │ total (GEN)  │        │ referencia   │
       │                │ estado(ENUM) │        └──────────────┘
       │                └──────────────┘
       │
       │  usuario_id   ┌──────────────────┐
       └──────────────▶│ auditoria_       │
                       │   eventos        │
                       │                  │
                       │ id (PK)          │
                       │ usuario_id (FK)  │
                       │ entidad          │
                       │ entidad_id       │
                       │ accion (ENUM)    │
                       │ detalle (JSONB)  │
                       │ ip               │
                       └──────────────────┘
```

## Tablas y relaciones

| Tabla | Descripción | Relaciones clave |
|---|---|---|
| `usuarios` | Identidad de acceso (email, hash, rol) | 1:1 con `empleados` |
| `empleados` | Datos personales y laborales | FK → `usuarios`; 1:N con `fichajes`; N:M con `trabajos` |
| `fichajes` | Eventos entrada/salida de jornada | FK → `empleados`, FK → `usuarios` (correcciones) |
| `clientes` | Datos fiscales y de contacto | 1:N con `trabajos`; 1:N con `facturas` |
| `trabajos` | Expedientes/tareas por cliente | FK → `clientes`, FK → `usuarios`; N:M con `empleados` |
| `trabajo_empleado` | Asignación empleados ↔ trabajos | FK → `trabajos`, FK → `empleados` |
| `trabajo_comentarios` | Comentarios internos por trabajo | FK → `trabajos`, FK → `usuarios` |
| `facturas` | Facturas emitidas | FK → `clientes`; 1:N con `pagos` |
| `pagos` | Pagos parciales o totales | FK → `facturas` |
| `auditoria_eventos` | Log inmutable de acciones críticas | FK → `usuarios` |

## Tipos enumerados (ENUM)

| Tipo | Valores |
|---|---|
| `rol_usuario` | administrador, empleado |
| `tipo_evento_fichaje` | entrada, salida |
| `origen_fichaje` | web, manual, correccion |
| `estado_trabajo` | pendiente, en_curso, bloqueado, finalizado, cancelado |
| `prioridad_trabajo` | baja, media, alta, urgente |
| `estado_factura` | borrador, emitida, pagada_parcial, pagada, anulada |
| `metodo_pago` | transferencia, efectivo, tarjeta, domiciliacion, otro |
| `accion_auditoria` | crear, editar, eliminar, login, logout, correccion_fichaje, cambio_estado |

## Reglas de negocio implementadas en BD

1. **Secuencia de fichaje**: trigger `trg_validar_fichaje` impide dos entradas o salidas consecutivas (excepto correcciones del gerente).
2. **Pagos no exceden factura**: trigger `trg_validar_pago` impide que la suma de pagos supere el total facturado.
3. **Estado automático de factura**: trigger `trg_actualizar_estado_factura` cambia el estado a `pagada_parcial` o `pagada` automáticamente tras registrar un pago.
4. **`updated_at` automático**: triggers en `usuarios`, `empleados`, `clientes`, `trabajos` y `facturas`.

## Vistas predefinidas

| Vista | Propósito |
|---|---|
| `v_deuda_por_cliente` | Deuda viva = total facturado − pagos, agrupado por cliente |
| `v_horas_diarias` | Pares entrada/salida con horas trabajadas por empleado y día |
| `v_resumen_mensual` | Panel del gerente: horas totales, trabajos activos, facturación, deuda (últimos 12 meses) |

## Campos calculados (GENERATED)

- `facturas.importe_iva` = `base_imponible * porcentaje_iva / 100`
- `facturas.total` = `base_imponible + importe_iva`

## Convenciones

- **IDs**: UUID v4 generados por `uuid-ossp`
- **Timestamps**: `TIMESTAMPTZ` (con zona horaria) para trazabilidad precisa
- **Borrado lógico**: campo `activo` (booleano) en `usuarios`, `empleados`, `clientes`; nunca se eliminan registros físicamente
- **Nomenclatura**: snake_case en español, coherente con el dominio de negocio
- **Auditoría**: `created_at` en todas las tablas, `updated_at` donde aplica
