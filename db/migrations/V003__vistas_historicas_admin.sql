-- ============================================================================
-- V003: Vistas históricas mensuales para el panel de administración
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Vista: Facturación mensual
-- base_imponible, IVA y total de facturas emitidas/cobradas, agrupadas por mes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_facturacion_mensual AS
SELECT
    DATE_TRUNC('month', f.fecha_emision)::date          AS mes,
    TO_CHAR(f.fecha_emision, 'YYYY-MM')                 AS mes_label,
    COUNT(*)                                             AS facturas_emitidas,
    COALESCE(SUM(f.base_imponible), 0)                  AS base_imponible_total,
    COALESCE(SUM(f.importe_iva),    0)                  AS iva_total,
    COALESCE(SUM(f.total),          0)                  AS facturado_total,
    COUNT(*) FILTER (WHERE f.estado = 'pagada')         AS facturas_pagadas,
    COUNT(*) FILTER (WHERE f.estado IN ('emitida','pagada_parcial')
                     AND f.fecha_vencimiento < CURRENT_DATE) AS facturas_vencidas
FROM facturas f
WHERE f.estado != 'anulada'
GROUP BY DATE_TRUNC('month', f.fecha_emision), TO_CHAR(f.fecha_emision, 'YYYY-MM')
ORDER BY mes;

-- ----------------------------------------------------------------------------
-- Vista: Cobros mensuales (pagos reales recibidos)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_cobros_mensuales AS
SELECT
    DATE_TRUNC('month', p.fecha_pago)::date             AS mes,
    TO_CHAR(p.fecha_pago, 'YYYY-MM')                    AS mes_label,
    COUNT(*)                                             AS num_pagos,
    COALESCE(SUM(p.importe), 0)                         AS cobrado_total,
    COUNT(DISTINCT f.cliente_id)                        AS clientes_pagadores
FROM pagos p
JOIN facturas f ON f.id = p.factura_id
GROUP BY DATE_TRUNC('month', p.fecha_pago), TO_CHAR(p.fecha_pago, 'YYYY-MM')
ORDER BY mes;

-- ----------------------------------------------------------------------------
-- Vista: Trabajos creados por mes y estado
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_trabajos_mensuales AS
SELECT
    DATE_TRUNC('month', t.created_at)::date             AS mes,
    TO_CHAR(t.created_at, 'YYYY-MM')                    AS mes_label,
    COUNT(*)                                             AS trabajos_creados,
    COUNT(*) FILTER (WHERE t.estado = 'finalizado')     AS finalizados,
    COUNT(*) FILTER (WHERE t.estado = 'cancelado')      AS cancelados,
    COUNT(*) FILTER (WHERE t.estado = 'en_curso')       AS en_curso,
    COUNT(*) FILTER (WHERE t.estado = 'bloqueado')      AS bloqueados,
    COUNT(*) FILTER (WHERE t.estado = 'pendiente')      AS pendientes
FROM trabajos t
GROUP BY DATE_TRUNC('month', t.created_at), TO_CHAR(t.created_at, 'YYYY-MM')
ORDER BY mes;

-- ----------------------------------------------------------------------------
-- Vista: Clientes nuevos por mes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_clientes_mensuales AS
SELECT
    DATE_TRUNC('month', c.created_at)::date             AS mes,
    TO_CHAR(c.created_at, 'YYYY-MM')                    AS mes_label,
    COUNT(*)                                             AS clientes_nuevos,
    COUNT(*) FILTER (WHERE c.activo = TRUE)             AS activos_nuevos
FROM clientes c
GROUP BY DATE_TRUNC('month', c.created_at), TO_CHAR(c.created_at, 'YYYY-MM')
ORDER BY mes;

-- ----------------------------------------------------------------------------
-- Vista: Horas de jornada laboral por mes (todos los empleados)
-- Empareja entrada->salida para calcular horas reales trabajadas
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_horas_mensuales AS
WITH eventos AS (
    SELECT
        f.empleado_id,
        f.tipo_evento,
        f.fecha_hora,
        LEAD(f.tipo_evento) OVER (PARTITION BY f.empleado_id ORDER BY f.fecha_hora) AS siguiente_evento,
        LEAD(f.fecha_hora)  OVER (PARTITION BY f.empleado_id ORDER BY f.fecha_hora) AS siguiente_hora
    FROM fichajes f
),
jornadas AS (
    SELECT
        DATE_TRUNC('month', fecha_hora)::date                           AS mes,
        TO_CHAR(fecha_hora, 'YYYY-MM')                                  AS mes_label,
        EXTRACT(EPOCH FROM (siguiente_hora - fecha_hora)) / 3600.0      AS horas_tramo
    FROM eventos
    WHERE tipo_evento = 'entrada'
      AND siguiente_evento = 'salida'
)
SELECT
    mes,
    mes_label,
    ROUND(SUM(horas_tramo)::numeric, 2)         AS horas_totales,
    COUNT(DISTINCT mes)                          AS dias_con_registro
FROM jornadas
GROUP BY mes, mes_label
ORDER BY mes;
