-- ============================================================================
-- V003 · Vistas analíticas
-- Añade las tres vistas operativas referenciadas en el modelo de datos
-- pero ausentes en migraciones anteriores:
--   · v_deuda_por_cliente   — deuda viva (pendiente de cobro) por cliente
--   · v_horas_diarias       — horas trabajadas por empleado y día
--   · v_resumen_mensual     — KPIs mensuales consolidados de la empresa
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. v_deuda_por_cliente
--    Muestra, para cada cliente activo, el importe total facturado,
--    lo ya cobrado y la deuda pendiente (facturas no anuladas).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_deuda_por_cliente AS
SELECT
    c.id                                    AS cliente_id,
    c.nombre_fiscal,
    c.cif_nif,
    c.activo,
    COUNT(DISTINCT f.id)                    AS total_facturas,
    COALESCE(SUM(f.total), 0)               AS total_facturado,
    COALESCE(SUM(cobros.cobrado), 0)        AS total_cobrado,
    COALESCE(SUM(f.total), 0)
      - COALESCE(SUM(cobros.cobrado), 0)    AS deuda_pendiente
FROM clientes c
LEFT JOIN facturas f
       ON f.cliente_id = c.id
      AND f.estado NOT IN ('anulada', 'borrador')
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.importe), 0) AS cobrado
    FROM pagos p
    WHERE p.factura_id = f.id
) cobros ON TRUE
GROUP BY c.id, c.nombre_fiscal, c.cif_nif, c.activo;

COMMENT ON VIEW v_deuda_por_cliente IS
    'Deuda viva por cliente: total facturado, cobrado y pendiente de cobro.';

-- ----------------------------------------------------------------------------
-- 2. v_horas_diarias
--    Calcula las horas netas trabajadas por empleado y día,
--    considerando pares entrada/salida y descontando pausas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_horas_diarias AS
WITH eventos AS (
    SELECT
        f.empleado_id,
        DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid') AS dia,
        f.tipo_evento,
        f.fecha_hora,
        ROW_NUMBER() OVER (
            PARTITION BY f.empleado_id,
                         DATE(f.fecha_hora AT TIME ZONE 'Europe/Madrid'),
                         f.tipo_evento
            ORDER BY f.fecha_hora
        ) AS rn
    FROM fichajes f
),
entradas AS (
    SELECT empleado_id, dia, fecha_hora, rn FROM eventos WHERE tipo_evento = 'entrada'
),
salidas  AS (
    SELECT empleado_id, dia, fecha_hora, rn FROM eventos WHERE tipo_evento = 'salida'
),
pausas_inicio AS (
    SELECT empleado_id, dia, fecha_hora, rn FROM eventos WHERE tipo_evento = 'pausa_inicio'
),
pausas_fin AS (
    SELECT empleado_id, dia, fecha_hora, rn FROM eventos WHERE tipo_evento = 'pausa_fin'
),
pares_trabajo AS (
    SELECT
        e.empleado_id,
        e.dia,
        EXTRACT(EPOCH FROM (s.fecha_hora - e.fecha_hora)) / 3600.0 AS horas
    FROM entradas e
    JOIN salidas s
      ON s.empleado_id = e.empleado_id
     AND s.dia         = e.dia
     AND s.rn          = e.rn
),
pares_pausa AS (
    SELECT
        pi.empleado_id,
        pi.dia,
        EXTRACT(EPOCH FROM (pf.fecha_hora - pi.fecha_hora)) / 3600.0 AS horas_pausa
    FROM pausas_inicio pi
    JOIN pausas_fin pf
      ON pf.empleado_id = pi.empleado_id
     AND pf.dia         = pi.dia
     AND pf.rn          = pi.rn
)
SELECT
    pt.empleado_id,
    e.nombre,
    e.apellidos,
    pt.dia,
    ROUND(
        GREATEST(
            COALESCE(SUM(pt.horas), 0) - COALESCE(SUM(pp.horas_pausa), 0),
            0
        )::NUMERIC, 2
    )                                                      AS horas_netas
FROM pares_trabajo pt
LEFT JOIN pares_pausa pp
       ON pp.empleado_id = pt.empleado_id
      AND pp.dia         = pt.dia
JOIN empleados e ON e.id = pt.empleado_id
GROUP BY pt.empleado_id, e.nombre, e.apellidos, pt.dia;

COMMENT ON VIEW v_horas_diarias IS
    'Horas netas trabajadas por empleado y día (entrada-salida descontando pausas).';

-- ----------------------------------------------------------------------------
-- 3. v_resumen_mensual
--    KPIs mensuales de la empresa: facturación, cobros, trabajos y fichajes.
--    Cada fila representa un mes natural (año + mes).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_resumen_mensual AS
SELECT
    TO_CHAR(meses.mes, 'YYYY-MM')            AS periodo,
    EXTRACT(YEAR  FROM meses.mes)::INT       AS anio,
    EXTRACT(MONTH FROM meses.mes)::INT       AS mes_num,
    COALESCE(f.total_facturado, 0)           AS total_facturado,
    COALESCE(p.total_cobrado,   0)           AS total_cobrado,
    COALESCE(t.trabajos_nuevos,   0)         AS trabajos_nuevos,
    COALESCE(t.trabajos_cerrados, 0)         AS trabajos_cerrados,
    COALESCE(c.clientes_nuevos,   0)         AS clientes_nuevos,
    COALESCE(h.horas_trabajadas,  0)         AS horas_trabajadas
FROM (
    SELECT generate_series(
        DATE_TRUNC('month', COALESCE((SELECT MIN(created_at) FROM facturas), NOW())),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
    ) AS mes
) meses
LEFT JOIN (
    SELECT DATE_TRUNC('month', fecha_emision) AS mes,
           SUM(total)                          AS total_facturado
    FROM facturas
    WHERE estado NOT IN ('anulada', 'borrador')
    GROUP BY 1
) f ON f.mes = meses.mes
LEFT JOIN (
    SELECT DATE_TRUNC('month', fecha_pago) AS mes,
           SUM(importe)                     AS total_cobrado
    FROM pagos
    GROUP BY 1
) p ON p.mes = meses.mes
LEFT JOIN (
    SELECT DATE_TRUNC('month', created_at)                        AS mes,
           COUNT(*)                                                AS trabajos_nuevos,
           COUNT(*) FILTER (WHERE estado IN ('finalizado','cancelado')) AS trabajos_cerrados
    FROM trabajos
    GROUP BY 1
) t ON t.mes = meses.mes
LEFT JOIN (
    SELECT DATE_TRUNC('month', created_at) AS mes,
           COUNT(*)                         AS clientes_nuevos
    FROM clientes
    GROUP BY 1
) c ON c.mes = meses.mes
LEFT JOIN (
    SELECT DATE_TRUNC('month', dia) AS mes,
           SUM(horas_netas)          AS horas_trabajadas
    FROM v_horas_diarias
    GROUP BY 1
) h ON h.mes = meses.mes
ORDER BY meses.mes;

COMMENT ON VIEW v_resumen_mensual IS
    'KPIs mensuales consolidados: facturación, cobros, trabajos y horas fichadas.';
