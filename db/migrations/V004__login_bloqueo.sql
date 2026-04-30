-- Añade columnas de bloqueo por intentos fallidos a la tabla usuarios
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS intentos_fallidos  SMALLINT     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bloqueado_hasta    TIMESTAMPTZ;

COMMENT ON COLUMN usuarios.intentos_fallidos IS 'Contador de contraseñas incorrectas consecutivas. Se resetea al hacer login con éxito.';
COMMENT ON COLUMN usuarios.bloqueado_hasta    IS 'Si no es NULL y es futuro, el usuario está bloqueado temporalmente.';
