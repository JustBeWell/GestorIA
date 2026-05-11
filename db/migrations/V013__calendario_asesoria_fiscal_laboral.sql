-- ============================================================================
-- V013 — Calendario de asesoría fiscal y laboral
-- ============================================================================
-- Amplía el calendario 2026 con obligaciones recurrentes de una asesoría:
-- IVA, IRPF, retenciones, informativas, Renta, Sociedades y Seguridad Social.
-- ============================================================================

INSERT INTO calendario_fiscal_vencimientos
    (fecha, modelo, titulo, descripcion, categoria, periodo, prioridad, estado,
     aplica_tipo_cliente, fuente, fuente_url)
VALUES
    ('2026-01-20', '111', 'Retenciones de trabajo y actividades', 'Retenciones e ingresos a cuenta. Cuarto trimestre 2025.', 'Renta y Sociedades', '4T 2025', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-01-20', '115', 'Retenciones por alquileres urbanos', 'Retenciones e ingresos a cuenta por arrendamientos urbanos. Cuarto trimestre 2025.', 'Renta y Sociedades', '4T 2025', 'media', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-01-30', '130', 'Pago fraccionado IRPF', 'Estimación directa. Cuarto trimestre 2025.', 'Pagos fraccionados Renta', '4T 2025', 'alta', 'pendiente', ARRAY['Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/enero/hasta-30-enero.html'),
    ('2026-01-30', '303', 'IVA trimestral', 'Autoliquidación de IVA. Cuarto trimestre 2025.', 'IVA', '4T 2025', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/enero/hasta-30-enero.html'),
    ('2026-01-30', '390', 'Resumen anual IVA', 'Resumen anual de IVA. Ejercicio 2025.', 'IVA', '2025', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/enero/hasta-30-enero.html'),
    ('2026-01-30', '180', 'Resumen anual alquileres', 'Declaración informativa anual de retenciones por arrendamientos urbanos. Ejercicio 2025.', 'Informativas', '2025', 'media', 'pendiente', ARRAY['Sociedad','Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-01-30', '190', 'Resumen anual retenciones trabajo', 'Declaración informativa anual de retenciones del trabajo y actividades profesionales. Ejercicio 2025.', 'Informativas', '2025', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-03-02', '347', 'Operaciones con terceros', 'Declaración anual de operaciones con terceras personas. Ejercicio 2025.', 'Informativas', '2025', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-04-08', '100', 'Inicio campaña Renta web', 'Inicio de presentación por Internet de Renta y Patrimonio 2025.', 'Renta', '2025', 'media', 'pendiente', ARRAY['Autónomo','Persona física'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-04-20', '111', 'Retenciones de trabajo y actividades', 'Retenciones e ingresos a cuenta. Primer trimestre 2026.', 'Renta y Sociedades', '1T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-04-20', '115', 'Retenciones por alquileres urbanos', 'Retenciones e ingresos a cuenta por arrendamientos urbanos. Primer trimestre 2026.', 'Renta y Sociedades', '1T 2026', 'media', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-04-20', '130', 'Pago fraccionado IRPF', 'Estimación directa. Primer trimestre 2026.', 'Pagos fraccionados Renta', '1T 2026', 'alta', 'pendiente', ARRAY['Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-04-20', '202', 'Pago fraccionado Impuesto sobre Sociedades', 'Primer pago fraccionado del Impuesto sobre Sociedades.', 'Sociedades', 'Abril 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-04-20', '303', 'IVA trimestral', 'Autoliquidación de IVA. Primer trimestre 2026.', 'IVA', '1T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-05-06', '100', 'Renta por teléfono', 'Inicio de atención telefónica para Renta 2025.', 'Renta', '2025', 'baja', 'pendiente', ARRAY['Autónomo','Persona física'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-06-25', '100', 'Renta con domiciliación', 'Fin de plazo para Renta y Patrimonio 2025 con resultado a ingresar domiciliado.', 'Renta', '2025', 'alta', 'pendiente', ARRAY['Autónomo','Persona física'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-06-30', '100', 'Declaración de la Renta', 'Fin de campaña de Renta 2025.', 'Renta', '2025', 'alta', 'pendiente', ARRAY['Autónomo','Persona física'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html'),
    ('2026-07-20', '111', 'Retenciones de trabajo y actividades', 'Retenciones e ingresos a cuenta. Segundo trimestre 2026.', 'Renta y Sociedades', '2T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-07-20', '130', 'Pago fraccionado IRPF', 'Estimación directa. Segundo trimestre 2026.', 'Pagos fraccionados Renta', '2T 2026', 'alta', 'pendiente', ARRAY['Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-07-20', '202', 'Pago fraccionado Impuesto sobre Sociedades', 'Segundo pago fraccionado del Impuesto sobre Sociedades.', 'Sociedades', 'Julio 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-07-20', '303', 'IVA trimestral', 'Autoliquidación de IVA. Segundo trimestre 2026.', 'IVA', '2T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-07-27', '200', 'Impuesto sobre Sociedades', 'Declaración anual 2025 para entidades cuyo periodo impositivo coincide con el año natural.', 'Sociedades', '2025', 'alta', 'pendiente', ARRAY['Sociedad'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/julio/hasta-27-julio.html'),
    ('2026-10-20', '111', 'Retenciones de trabajo y actividades', 'Retenciones e ingresos a cuenta. Tercer trimestre 2026.', 'Renta y Sociedades', '3T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-10-20', '130', 'Pago fraccionado IRPF', 'Estimación directa. Tercer trimestre 2026.', 'Pagos fraccionados Renta', '3T 2026', 'alta', 'pendiente', ARRAY['Autónomo'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-10-20', '202', 'Pago fraccionado Impuesto sobre Sociedades', 'Tercer pago fraccionado del Impuesto sobre Sociedades.', 'Sociedades', 'Octubre 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-10-20', '303', 'IVA trimestral', 'Autoliquidación de IVA. Tercer trimestre 2026.', 'IVA', '3T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-11-05', '102', 'Segundo plazo Renta', 'Ingreso del segundo plazo de Renta 2025 para declaraciones fraccionadas.', 'Renta', '2025', 'media', 'pendiente', ARRAY['Autónomo','Persona física'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html'),
    ('2026-12-21', '202', 'Pago fraccionado Impuesto sobre Sociedades', 'Pago fraccionado de diciembre del Impuesto sobre Sociedades.', 'Sociedades', 'Diciembre 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'AEAT', 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/plazos-presentacion-autoliquidaciones-domiciliacion-bancaria.html')
ON CONFLICT (fecha, modelo, periodo, titulo) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    categoria = EXCLUDED.categoria,
    prioridad = EXCLUDED.prioridad,
    aplica_tipo_cliente = EXCLUDED.aplica_tipo_cliente,
    fuente = EXCLUDED.fuente,
    fuente_url = EXCLUDED.fuente_url,
    updated_at = NOW();

INSERT INTO calendario_fiscal_vencimientos
    (fecha, modelo, titulo, descripcion, categoria, periodo, prioridad, estado,
     aplica_tipo_cliente, fuente, fuente_url)
SELECT
    (date_trunc('month', month_start)::date + (EXTRACT(day FROM (date_trunc('month', month_start) + interval '1 month - 1 day'))::int - 2))::date,
    'SLD',
    'Sistema RED - presentación RNT y bases',
    'Presentación de liquidación de cotizaciones por Sistema de Liquidación Directa.',
    'Laboral y Seguridad Social',
    period_label,
    'alta',
    'pendiente',
    ARRAY['Sociedad'],
    'TGSS',
    'https://www.seg-social.es/wps/portal/wss/internet/InformacionUtil/5300/1861/186/187/1177/1178/114961?changeLanguage=es'
FROM generate_series('2026-01-01'::date, '2026-12-01'::date, interval '1 month') AS month_start
CROSS JOIN LATERAL (
    SELECT
        CASE EXTRACT(MONTH FROM month_start - interval '1 month')::int
            WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
            WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
            WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
            WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' ELSE 'Diciembre'
        END || ' ' || EXTRACT(YEAR FROM month_start - interval '1 month')::int AS period_label
) AS previous_period
ON CONFLICT (fecha, modelo, periodo, titulo) DO NOTHING;

INSERT INTO calendario_fiscal_vencimientos
    (fecha, modelo, titulo, descripcion, categoria, periodo, prioridad, estado,
     aplica_tipo_cliente, fuente, fuente_url)
SELECT
    (date_trunc('month', month_start) + interval '1 month - 1 day')::date,
    model,
    title,
    description,
    'Laboral y Seguridad Social',
    period_label,
    priority,
    'pendiente',
    clients,
    'TGSS',
    'https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/9896/38386/38389'
FROM generate_series('2026-01-01'::date, '2026-12-01'::date, interval '1 month') AS month_start
CROSS JOIN LATERAL (
    VALUES
        (
            'TGSS',
            'Seguros sociales - ingreso de cuotas',
            'Ingreso de cuotas del Régimen General dentro del mes natural siguiente al devengo.',
            CASE EXTRACT(MONTH FROM month_start - interval '1 month')::int
                WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
                WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
                WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
                WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' ELSE 'Diciembre'
            END || ' ' || EXTRACT(YEAR FROM month_start - interval '1 month')::int,
            'alta',
            ARRAY['Sociedad']
        ),
        (
            'RETA',
            'RETA - ingreso cuota autónomos',
            'Ingreso mensual de cuotas del Régimen Especial de Trabajadores Autónomos.',
            CASE EXTRACT(MONTH FROM month_start)::int
                WHEN 1 THEN 'Enero' WHEN 2 THEN 'Febrero' WHEN 3 THEN 'Marzo'
                WHEN 4 THEN 'Abril' WHEN 5 THEN 'Mayo' WHEN 6 THEN 'Junio'
                WHEN 7 THEN 'Julio' WHEN 8 THEN 'Agosto' WHEN 9 THEN 'Septiembre'
                WHEN 10 THEN 'Octubre' WHEN 11 THEN 'Noviembre' ELSE 'Diciembre'
            END || ' ' || EXTRACT(YEAR FROM month_start)::int,
            'media',
            ARRAY['Autónomo']
        )
) AS seed(model, title, description, period_label, priority, clients)
ON CONFLICT (fecha, modelo, periodo, titulo) DO NOTHING;
