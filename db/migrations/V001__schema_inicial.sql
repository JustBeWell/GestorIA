-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================================

CREATE TYPE rol_usuario AS ENUM ('administrador', 'empleado');

CREATE TYPE tipo_evento_fichaje AS ENUM ('entrada', 'salida');

CREATE TYPE origen_fichaje AS ENUM ('web', 'manual', 'correccion');

CREATE TYPE estado_trabajo AS ENUM (
    'pendiente',
    'en_curso',
    'bloqueado',
    'finalizado',
    'cancelado'
);

CREATE TYPE prioridad_trabajo AS ENUM ('baja', 'media', 'alta', 'urgente','no_aplica');

CREATE TYPE estado_factura AS ENUM (
    'borrador',
    'emitida',
    'pagada_parcial',
    'pagada',
    'anulada'
);

CREATE TYPE metodo_pago AS ENUM (
    'transferencia',
    'efectivo',
    'tarjeta',
    'domiciliacion',
    'otro'
);

CREATE TYPE accion_auditoria AS ENUM (
    'crear',
    'editar',
    'eliminar',
    'login',
    'logout',
    'correccion_fichaje',
    'cambio_estado'
);

-- ============================================================================
-- 3. TABLAS PRINCIPALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 USUARIOS (identidad de acceso)
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    rol             rol_usuario  NOT NULL DEFAULT 'empleado',
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuarios_usuario UNIQUE (usuario)
);

COMMENT ON TABLE  usuarios IS 'Identidades de acceso al sistema con rol y estado.';

-- ----------------------------------------------------------------------------
-- 3.2 EMPLEADOS (datos personales y laborales)
-- ----------------------------------------------------------------------------
CREATE TABLE empleados (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id      UUID         NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(150) NOT NULL,
    nif             VARCHAR(20)  NOT NULL,
    telefono        VARCHAR(20),
    fecha_alta      DATE         NOT NULL DEFAULT CURRENT_DATE,
    fecha_baja      DATE,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_empleados_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT uq_empleados_usuario UNIQUE (usuario_id),
    CONSTRAINT uq_empleados_nif     UNIQUE (nif)
);

COMMENT ON TABLE  empleados IS 'Datos personales y laborales de cada persona trabajadora.';
COMMENT ON COLUMN empleados.fecha_baja IS 'Fecha de baja lógica; NULL si el empleado sigue activo.';

-- ----------------------------------------------------------------------------
-- 3.3 FICHAJES (registro de jornada)
-- ----------------------------------------------------------------------------
CREATE TABLE fichajes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id     UUID                NOT NULL,
    tipo_evento     tipo_evento_fichaje NOT NULL,
    fecha_hora      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    origen          origen_fichaje      NOT NULL DEFAULT 'web',
    observaciones   TEXT,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_fichajes_empleado FOREIGN KEY (empleado_id)
        REFERENCES empleados(id) ON DELETE RESTRICT
);

COMMENT ON TABLE  fichajes IS 'Eventos de entrada/salida para control legal de jornada.';
COMMENT ON COLUMN fichajes.origen IS 'Indica si el fichaje fue registrado por el empleado (web), introducido manualmente o es una corrección.';

-- ----------------------------------------------------------------------------
-- 3.4 CLIENTES (datos fiscales y de contacto)
-- ----------------------------------------------------------------------------
CREATE TABLE clientes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_fiscal   VARCHAR(255) NOT NULL,
    cif_nif         VARCHAR(20)  NOT NULL,
    email           VARCHAR(255),
    telefono        VARCHAR(20),
    direccion       TEXT,
    codigo_postal   VARCHAR(10),
    ciudad          VARCHAR(100),
    provincia       VARCHAR(100),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_clientes_cif_nif UNIQUE (cif_nif)
);

COMMENT ON TABLE  clientes IS 'Personas físicas o jurídicas que reciben servicios de la gestoría.';

-- ----------------------------------------------------------------------------
-- 3.5 TRABAJOS (expedientes / tareas por cliente)
-- ----------------------------------------------------------------------------
CREATE TABLE trabajos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id      UUID             NOT NULL,
    titulo          VARCHAR(255)     NOT NULL,
    descripcion     TEXT,
    estado          estado_trabajo   NOT NULL DEFAULT 'pendiente',
    prioridad       prioridad_trabajo NOT NULL DEFAULT 'media',
    fecha_inicio    DATE,
    fecha_objetivo  DATE,
    fecha_cierre    DATE,
    creado_por      UUID             NOT NULL,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    comentarios      TEXT,

    CONSTRAINT fk_trabajos_cliente FOREIGN KEY (cliente_id)
        REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_trabajos_creado_por FOREIGN KEY (creado_por)
        REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT chk_trabajos_fechas
        CHECK (fecha_objetivo IS NULL OR fecha_inicio IS NULL OR fecha_objetivo >= fecha_inicio)
);

COMMENT ON TABLE  trabajos IS 'Actividades, expedientes o tareas gestionadas para un cliente.';
COMMENT ON COLUMN trabajos.fecha_cierre IS 'Se rellena automáticamente al pasar a estado finalizado o cancelado.';

-- ----------------------------------------------------------------------------
-- 3.6 TRABAJO_EMPLEADO (asignaciones N:M)
-- ----------------------------------------------------------------------------
CREATE TABLE trabajo_empleado (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trabajo_id      UUID NOT NULL,
    empleado_id     UUID NOT NULL,
    asignado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    desasignado_en  TIMESTAMPTZ,

    CONSTRAINT fk_te_trabajo  FOREIGN KEY (trabajo_id)
        REFERENCES trabajos(id)  ON DELETE CASCADE,
    CONSTRAINT fk_te_empleado FOREIGN KEY (empleado_id)
        REFERENCES empleados(id) ON DELETE RESTRICT,
    CONSTRAINT uq_te_trabajo_empleado_activo
        UNIQUE (trabajo_id, empleado_id)
);

COMMENT ON TABLE  trabajo_empleado IS 'Relación muchos-a-muchos entre trabajos y empleados asignados.';
COMMENT ON COLUMN trabajo_empleado.desasignado_en IS 'NULL mientras la asignación esté activa.';

-- ----------------------------------------------------------------------------
-- 3.8 FACTURAS
-- ----------------------------------------------------------------------------
CREATE TABLE facturas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id        UUID            NOT NULL,
    numero            VARCHAR(50)     NOT NULL,
    fecha_emision     DATE            NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    base_imponible    NUMERIC(12,2)   NOT NULL,
    porcentaje_iva    NUMERIC(5,2)    NOT NULL DEFAULT 21.00,
    importe_iva       NUMERIC(12,2)   NOT NULL GENERATED ALWAYS AS (base_imponible * porcentaje_iva / 100) STORED,
    total             NUMERIC(12,2)   NOT NULL GENERATED ALWAYS AS (base_imponible + base_imponible * porcentaje_iva / 100) STORED,
    estado            estado_factura  NOT NULL DEFAULT 'borrador',
    concepto          TEXT,
    notas             TEXT,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_facturas_cliente FOREIGN KEY (cliente_id)
        REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT uq_facturas_numero UNIQUE (numero),
    CONSTRAINT chk_facturas_base_positiva CHECK (base_imponible >= 0),
    CONSTRAINT chk_facturas_iva_valido CHECK (porcentaje_iva >= 0 AND porcentaje_iva <= 100),
    CONSTRAINT chk_facturas_vencimiento
        CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento >= fecha_emision)
);

COMMENT ON TABLE  facturas IS 'Facturas emitidas a clientes.';
COMMENT ON COLUMN facturas.importe_iva IS 'Calculado automáticamente: base_imponible * porcentaje_iva / 100.';
COMMENT ON COLUMN facturas.total IS 'Calculado automáticamente: base_imponible + importe_iva.';

-- ----------------------------------------------------------------------------
-- 3.9 PAGOS
-- ----------------------------------------------------------------------------
CREATE TABLE pagos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factura_id      UUID          NOT NULL,
    fecha_pago      DATE          NOT NULL DEFAULT CURRENT_DATE,
    importe         NUMERIC(12,2) NOT NULL,
    metodo_pago     metodo_pago   NOT NULL DEFAULT 'transferencia',
    referencia      VARCHAR(100),
    notas           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_pagos_factura FOREIGN KEY (factura_id)
        REFERENCES facturas(id) ON DELETE RESTRICT,
    CONSTRAINT chk_pagos_importe_positivo CHECK (importe > 0)
);

COMMENT ON TABLE  pagos IS 'Pagos parciales o totales asociados a una factura.';


-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================

-- Usuarios
CREATE INDEX idx_usuarios_email       ON usuarios (email);
CREATE INDEX idx_usuarios_activo      ON usuarios (activo) WHERE activo = TRUE;

-- Empleados
CREATE INDEX idx_empleados_nif        ON empleados (nif);
CREATE INDEX idx_empleados_activo     ON empleados (activo) WHERE activo = TRUE;

-- Fichajes
CREATE INDEX idx_fichajes_empleado_fecha ON fichajes (empleado_id, fecha_hora DESC);
CREATE INDEX idx_fichajes_fecha          ON fichajes (fecha_hora DESC);

-- Clientes
CREATE INDEX idx_clientes_cif_nif     ON clientes (cif_nif);
CREATE INDEX idx_clientes_nombre      ON clientes (nombre_fiscal);
CREATE INDEX idx_clientes_activo      ON clientes (activo) WHERE activo = TRUE;

-- Trabajos
CREATE INDEX idx_trabajos_cliente     ON trabajos (cliente_id);
CREATE INDEX idx_trabajos_estado      ON trabajos (estado);
CREATE INDEX idx_trabajos_cliente_estado ON trabajos (cliente_id, estado);

-- Trabajo-Empleado
CREATE INDEX idx_te_empleado          ON trabajo_empleado (empleado_id);

-- Facturas
CREATE INDEX idx_facturas_cliente     ON facturas (cliente_id);
CREATE INDEX idx_facturas_estado      ON facturas (estado);
CREATE INDEX idx_facturas_vencimiento ON facturas (fecha_vencimiento)
    WHERE estado NOT IN ('pagada', 'anulada');

-- Pagos
CREATE INDEX idx_pagos_factura        ON pagos (factura_id);



-- ============================================================================
-- 5. FUNCIONES Y TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Actualización automática de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_empleados_updated_at
    BEFORE UPDATE ON empleados
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_trabajos_updated_at
    BEFORE UPDATE ON trabajos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_updated_at();

CREATE TRIGGER trg_facturas_updated_at
    BEFORE UPDATE ON facturas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_updated_at();

-- ----------------------------------------------------------------------------
-- 5.2 Validación de secuencia de fichaje
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_fichaje()
RETURNS TRIGGER AS $$
DECLARE
    ultimo_tipo tipo_evento_fichaje;
BEGIN
    -- Obtener el último tipo de evento del empleado
    SELECT tipo_evento INTO ultimo_tipo
    FROM fichajes
    WHERE empleado_id = NEW.empleado_id
    ORDER BY fecha_hora DESC
    LIMIT 1;

    -- Si no hay fichajes previos, solo se permite 'entrada'
    IF ultimo_tipo IS NULL AND NEW.tipo_evento = 'salida' THEN
        RAISE EXCEPTION 'No se puede registrar una salida sin una entrada previa.';
    END IF;

    -- No permitir dos entradas o dos salidas consecutivas
    IF ultimo_tipo IS NOT NULL AND ultimo_tipo = NEW.tipo_evento THEN
        RAISE EXCEPTION 'No se permite registrar dos eventos de tipo "%" consecutivos.', NEW.tipo_evento;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_fichaje
    BEFORE INSERT ON fichajes
    FOR EACH ROW
    WHEN (NEW.origen <> 'correccion')
    EXECUTE FUNCTION fn_validar_fichaje();

-- ----------------------------------------------------------------------------
-- 5.3 Validación de pagos (no superar total de factura)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_pago()
RETURNS TRIGGER AS $$
DECLARE
    total_factura   NUMERIC(12,2);
    total_pagado    NUMERIC(12,2);
BEGIN
    SELECT total INTO total_factura
    FROM facturas
    WHERE id = NEW.factura_id;

    SELECT COALESCE(SUM(importe), 0) INTO total_pagado
    FROM pagos
    WHERE factura_id = NEW.factura_id;

    IF (total_pagado + NEW.importe) > total_factura THEN
        RAISE EXCEPTION 'El pago (%.2f) supera la deuda pendiente de la factura. Total factura: %.2f, ya pagado: %.2f.',
            NEW.importe, total_factura, total_pagado;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pago
    BEFORE INSERT ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_pago();

-- ----------------------------------------------------------------------------
-- 5.4 Actualización automática del estado de factura tras pago
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_estado_factura()
RETURNS TRIGGER AS $$
DECLARE
    total_factura   NUMERIC(12,2);
    total_pagado    NUMERIC(12,2);
BEGIN
    SELECT total INTO total_factura
    FROM facturas
    WHERE id = NEW.factura_id;

    SELECT COALESCE(SUM(importe), 0) INTO total_pagado
    FROM pagos
    WHERE factura_id = NEW.factura_id;

    IF total_pagado >= total_factura THEN
        UPDATE facturas SET estado = 'pagada' WHERE id = NEW.factura_id;
    ELSIF total_pagado > 0 THEN
        UPDATE facturas SET estado = 'pagada_parcial' WHERE id = NEW.factura_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_estado_factura
    AFTER INSERT ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_estado_factura();