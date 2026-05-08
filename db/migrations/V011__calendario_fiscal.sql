-- ============================================================================
-- V011 — Calendario fiscal
-- ============================================================================
-- Tabla de vencimientos fiscales usada por el microservicio M10 Calendario.
-- Las filas iniciales proceden del Calendario del contribuyente 2026 de AEAT.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS calendario_fiscal_vencimientos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha               DATE NOT NULL,
    modelo              VARCHAR(20) NOT NULL,
    titulo              VARCHAR(255) NOT NULL,
    descripcion         TEXT,
    categoria           VARCHAR(120) NOT NULL,
    periodo             VARCHAR(80) NOT NULL,
    prioridad           VARCHAR(20) NOT NULL DEFAULT 'media',
    estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    aplica_tipo_cliente TEXT[],
    fuente              VARCHAR(120) NOT NULL DEFAULT 'AEAT',
    fuente_url          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_calendario_prioridad
        CHECK (prioridad IN ('alta', 'media', 'baja')),
    CONSTRAINT chk_calendario_estado
        CHECK (estado IN ('pendiente', 'presentado', 'en_preparacion', 'no_aplica')),
    CONSTRAINT uq_calendario_vencimiento
        UNIQUE (fecha, modelo, periodo, titulo)
);

CREATE INDEX IF NOT EXISTS idx_calendario_fecha
    ON calendario_fiscal_vencimientos (fecha);

COMMENT ON TABLE calendario_fiscal_vencimientos IS
    'Vencimientos fiscales consultados por la herramienta de calendario fiscal.';

INSERT INTO calendario_fiscal_vencimientos
    (fecha, modelo, titulo, descripcion, categoria, periodo, prioridad, estado, aplica_tipo_cliente, fuente_url)
VALUES
    ('2026-04-20', '111', 'Retenciones de trabajo y actividades', 'Retenciones e ingresos a cuenta. Primer trimestre 2026.', 'Renta y Sociedades', '1T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-20-abril.html'),
    ('2026-04-20', '115', 'Retenciones por alquileres urbanos', 'Retenciones e ingresos a cuenta por arrendamientos urbanos. Primer trimestre 2026.', 'Renta y Sociedades', '1T 2026', 'media', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-20-abril.html'),
    ('2026-04-20', '130', 'Pago fraccionado IRPF', 'Estimación directa. Primer trimestre 2026.', 'Pagos fraccionados Renta', '1T 2026', 'alta', 'pendiente', ARRAY['Autónomo'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-20-abril.html'),
    ('2026-04-20', '202', 'Pago fraccionado Impuesto sobre Sociedades', 'Régimen general. Ejercicio en curso.', 'Pagos fraccionados Sociedades', 'Abril 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-20-abril.html'),
    ('2026-04-20', '303', 'IVA trimestral', 'Autoliquidación de IVA. Primer trimestre 2026.', 'IVA', '1T 2026', 'alta', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-20-abril.html'),
    ('2026-04-20', '349', 'Operaciones intracomunitarias', 'Declaración recapitulativa de operaciones intracomunitarias. Primer trimestre 2026.', 'IVA', '1T 2026', 'baja', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-20-abril.html'),
    ('2026-04-30', '303', 'IVA mensual', 'Autoliquidación de IVA. Marzo 2026.', 'IVA', 'Marzo 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-30-abril-30-abril-junio.html'),
    ('2026-04-30', '322', 'IVA grupo de entidades individual', 'Grupo de entidades, modelo individual. Marzo 2026.', 'IVA', 'Marzo 2026', 'baja', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-30-abril-30-abril-junio.html'),
    ('2026-04-30', '353', 'IVA grupo de entidades agregado', 'Grupo de entidades, modelo agregado. Marzo 2026.', 'IVA', 'Marzo 2026', 'baja', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/abril/hasta-30-abril-30-abril-junio.html'),
    ('2026-05-20', '111', 'Retenciones de trabajo y actividades', 'Retenciones e ingresos a cuenta. Abril 2026, grandes empresas.', 'Renta y Sociedades', 'Abril 2026', 'alta', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/mayo/hasta-20-mayo.html'),
    ('2026-05-20', '115', 'Retenciones por alquileres urbanos', 'Retenciones e ingresos a cuenta. Abril 2026, grandes empresas.', 'Renta y Sociedades', 'Abril 2026', 'media', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/mayo/hasta-20-mayo.html'),
    ('2026-05-20', '349', 'Operaciones intracomunitarias', 'Declaración recapitulativa de operaciones intracomunitarias. Abril 2026.', 'IVA', 'Abril 2026', 'baja', 'pendiente', ARRAY['Sociedad','Autónomo','SCP','CB'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/mayo/hasta-20-mayo.html'),
    ('2026-05-20', '430', 'Impuesto sobre las Primas de Seguros', 'Declaración mensual. Abril 2026.', 'Impuesto sobre las Primas de Seguros', 'Abril 2026', 'baja', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/mayo/hasta-20-mayo.html'),
    ('2026-05-20', '592', 'Impuesto sobre envases de plástico', 'Autoliquidación mensual. Abril 2026.', 'Impuestos Medioambientales', 'Abril 2026', 'baja', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/mayo/hasta-20-mayo.html'),
    ('2026-05-20', '583', 'Producción de energía eléctrica', 'Primer pago fraccionado 2026.', 'Impuestos Medioambientales', '2026', 'media', 'pendiente', ARRAY['Sociedad'], 'https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/calendario-anual/mayo/hasta-20-mayo.html')
ON CONFLICT (fecha, modelo, periodo, titulo) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    categoria = EXCLUDED.categoria,
    prioridad = EXCLUDED.prioridad,
    aplica_tipo_cliente = EXCLUDED.aplica_tipo_cliente,
    fuente = EXCLUDED.fuente,
    fuente_url = EXCLUDED.fuente_url,
    updated_at = NOW();
