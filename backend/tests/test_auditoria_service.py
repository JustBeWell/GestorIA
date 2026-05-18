from services.auditoria_service import registrar_evento


class _Cursor:
    def __init__(self):
        self.executed = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, query, params):
        self.executed = (query, params)


class _Connection:
    def __init__(self):
        self.cursor_obj = _Cursor()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def cursor(self):
        return self.cursor_obj


def test_registrar_evento_inserts_audit_row(monkeypatch):
    connection = _Connection()
    monkeypatch.setattr("services.auditoria_service.db_connection", lambda: connection)

    registrar_evento(
        actor_id="11111111-1111-1111-1111-111111111111",
        actor_nombre="admin@gestoria.example",
        entidad="cliente",
        entidad_id="22222222-2222-2222-2222-222222222222",
        accion="crear",
        detalle={"nombre_fiscal": "Cliente Escritura SL"},
        ip="127.0.0.1",
    )

    query, params = connection.cursor_obj.executed
    assert "INSERT INTO auditoria_eventos" in query
    assert params[0] == "11111111-1111-1111-1111-111111111111"
    assert params[2] == "cliente"
    assert params[4] == "crear"
    assert params[5] == '{"nombre_fiscal": "Cliente Escritura SL"}'
    assert params[6] == "127.0.0.1"
