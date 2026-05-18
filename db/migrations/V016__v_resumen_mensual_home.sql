-- ============================================================================
-- V016 - v_resumen_mensual como fuente de KPIs del Home
-- ============================================================================
-- Amplia la vista mensual para que el Home y el cierre mensual compartan la
-- misma fuente de verdad para facturacion, cobros, clientes, trabajos y deuda.

CREATE OR REPLACE VIEW v_resumen_mensual AS
SELECT
    TO_CHAR(meses.mes, 'YYYY-MM')                         AS periodo,
    EXTRACT(YEAR  FROM meses.mes)::INT                    AS anio,
    EXTRACT(MONTH FROM meses.mes)::INT                    AS mes_num,
    COALESCE(f.total_facturado, 0)                        AS total_facturado,
    COALESCE(p.total_cobrado, 0)                          AS total_cobrado,
    COALESCE(t.trabajos_nuevos, 0)                        AS trabajos_nuevos,
    COALESCE(t.trabajos_cerrados, 0)                      AS trabajos_cerrados,
    COALESCE(c.clientes_nuevos, 0)                        AS clientes_nuevos,
    COALESCE(h.horas_trabajadas, 0)                       AS horas_trabajadas,
    COALESCE(ce.clientes_total, 0)                        AS clientes_total,
    COALESCE(ce.clientes_activos, 0)                      AS clientes_activos,
    COALESCE(te.trabajos_total, 0)                        AS trabajos_total,
    COALESCE(te.trabajos_pendientes, 0)                   AS trabajos_pendientes,
    COALESCE(te.trabajos_en_curso, 0)                     AS trabajos_en_curso,
    COALESCE(te.trabajos_bloqueados, 0)                   AS trabajos_bloqueados,
    COALESCE(te.trabajos_finalizados, 0)                  AS trabajos_finalizados,
    COALESCE(te.trabajos_cancelados, 0)                   AS trabajos_cancelados,
    COALESCE(f.facturas_emitidas_mes, 0)                  AS facturas_emitidas_mes,
    COALESCE(fp.pendiente_total, 0)                       AS pendiente_total,
    COALESCE(fp.pendiente_count, 0)                       AS pendiente_count,
    COALESCE(fp.facturas_vencidas, 0)                     AS facturas_vencidas,
    COALESCE(fp.vencido_total, 0)                         AS vencido_total
FROM (
    SELECT generate_series(
        DATE_TRUNC('month', COALESCE((SELECT MIN(created_at) FROM facturas), NOW())),
        DATE_TRUNC('month', NOW()),
        INTERVAL '1 month'
    ) AS mes
) meses
LEFT JOIN (
    SELECT
        DATE_TRUNC('month', fecha_emision) AS mes,
        SUM(total)                         AS total_facturado,
        COUNT(*)                           AS facturas_emitidas_mes
    FROM facturas
    WHERE estado NOT IN ('anulada', 'borrador')
    GROUP BY 1
) f ON f.mes = meses.mes
LEFT JOIN (
    SELECT
        DATE_TRUNC('month', fecha_pago) AS mes,
        SUM(importe)                    AS total_cobrado
    FROM pagos
    GROUP BY 1
) p ON p.mes = meses.mes
LEFT JOIN (
    SELECT
        DATE_TRUNC('month', created_at) AS mes,
        COUNT(*)                        AS trabajos_nuevos,
        COUNT(*) FILTER (WHERE estado IN ('finalizado','cancelado')) AS trabajos_cerrados
    FROM trabajos
    GROUP BY 1
) t ON t.mes = meses.mes
LEFT JOIN (
    SELECT
        DATE_TRUNC('month', created_at) AS mes,
        COUNT(*)                        AS clientes_nuevos
    FROM clientes
    GROUP BY 1
) c ON c.mes = meses.mes
LEFT JOIN (
    SELECT
        DATE_TRUNC('month', dia) AS mes,
        SUM(horas_netas)         AS horas_trabajadas
    FROM v_horas_diarias
    GROUP BY 1
) h ON h.mes = meses.mes
CROSS JOIN (
    SELECT
        COUNT(*)                               AS clientes_total,
        COUNT(*) FILTER (WHERE activo = TRUE) AS clientes_activos
    FROM clientes
) ce
CROSS JOIN (
    SELECT
        COUNT(*)                                         AS trabajos_total,
        COUNT(*) FILTER (WHERE estado = 'pendiente')     AS trabajos_pendientes,
        COUNT(*) FILTER (WHERE estado = 'en_curso')      AS trabajos_en_curso,
        COUNT(*) FILTER (WHERE estado = 'bloqueado')     AS trabajos_bloqueados,
        COUNT(*) FILTER (WHERE estado = 'finalizado')    AS trabajos_finalizados,
        COUNT(*) FILTER (WHERE estado = 'cancelado')     AS trabajos_cancelados
    FROM trabajos
) te
CROSS JOIN (
    WITH pagos_por_factura AS (
        SELECT factura_id, COALESCE(SUM(importe), 0) AS pagado
        FROM pagos
        GROUP BY factura_id
    )
    SELECT
        COALESCE(SUM(GREATEST(f.total - COALESCE(ppf.pagado, 0), 0))
            FILTER (WHERE f.estado <> 'anulada'), 0) AS pendiente_total,
        COUNT(*) FILTER (
            WHERE GREATEST(f.total - COALESCE(ppf.pagado, 0), 0) > 0
              AND f.estado NOT IN ('anulada', 'borrador')
        ) AS pendiente_count,
        COUNT(*) FILTER (
            WHERE f.estado IN ('emitida', 'pagada_parcial')
              AND f.fecha_vencimiento IS NOT NULL
              AND f.fecha_vencimiento < CURRENT_DATE
        ) AS facturas_vencidas,
        COALESCE(SUM(GREATEST(f.total - COALESCE(ppf.pagado, 0), 0)) FILTER (
            WHERE f.estado IN ('emitida', 'pagada_parcial')
              AND f.fecha_vencimiento IS NOT NULL
              AND f.fecha_vencimiento < CURRENT_DATE
        ), 0) AS vencido_total
    FROM facturas f
    LEFT JOIN pagos_por_factura ppf ON ppf.factura_id = f.id
) fp
ORDER BY meses.mes;

COMMENT ON VIEW v_resumen_mensual IS
    'KPIs mensuales consolidados para Home y cierre: facturacion, cobros, trabajos, clientes, deuda y horas fichadas.';
