-- V009: borrado en cascada al eliminar un cliente
-- Al borrar un cliente se eliminan automáticamente:
--   trabajos  (y sus trabajos_empleados + comentarios por cascade existente)
--   facturas  (y sus pagos por cascade añadido aquí)

-- 1. trabajos.cliente_id: RESTRICT → CASCADE
ALTER TABLE trabajos
    DROP CONSTRAINT fk_trabajos_cliente,
    ADD CONSTRAINT fk_trabajos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

-- 2. facturas.cliente_id: RESTRICT → CASCADE
ALTER TABLE facturas
    DROP CONSTRAINT fk_facturas_cliente,
    ADD CONSTRAINT fk_facturas_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

-- 3. pagos.factura_id: RESTRICT → CASCADE
--    (necesario para que facturas se pueda borrar cuando el cliente se elimina)
ALTER TABLE pagos
    DROP CONSTRAINT fk_pagos_factura,
    ADD CONSTRAINT fk_pagos_factura
        FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE;
