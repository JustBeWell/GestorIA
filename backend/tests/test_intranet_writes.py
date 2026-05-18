from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from models import TokenData


client = TestClient(app)


def _headers() -> dict:
    return {"Authorization": "Bearer valid-token"}


def _token(role: str = "empleado") -> TokenData:
    return TokenData(
        user_id="11111111-1111-1111-1111-111111111111",
        nombre_usuario=f"{role}@gestoria.example",
        role=role,
    )


def _cliente_detail(**overrides) -> dict:
    data = {
        "cliente_id": "22222222-2222-2222-2222-222222222222",
        "nombre_fiscal": "Cliente Escritura SL",
        "cif_nif": "B12345678",
        "email": "cliente@example.com",
        "telefono": "600000000",
        "direccion": "Calle Mayor 1",
        "codigo_postal": "28001",
        "ciudad": "Madrid",
        "provincia": "Madrid",
        "activo": True,
        "tipo_cliente": "Sociedad",
        "referencia": "CLI-0001",
        "created_at": "2026-05-18T10:00:00Z",
        "trabajos_count": 0,
        "trabajos_abiertos": 0,
        "facturas_count": 0,
        "facturacion_anio": 0.0,
        "pendiente_total": 0.0,
    }
    data.update(overrides)
    return data


def _trabajo_detail(**overrides) -> dict:
    data = {
        "trabajo_id": "33333333-3333-3333-3333-333333333333",
        "nro_trabajo": 10,
        "titulo": "Preparar IVA",
        "descripcion": "Declaracion trimestral",
        "estado": "pendiente",
        "prioridad": "media",
        "cliente_id": "22222222-2222-2222-2222-222222222222",
        "cliente_nombre": "Cliente Escritura SL",
        "nro_cliente": 1,
        "fecha_inicio": "2026-05-01",
        "fecha_objetivo": "2026-05-20",
        "fecha_cierre": None,
        "nota_bloqueo": None,
        "creado_por_nombre": "Empleado Prueba",
        "created_at": "2026-05-18T10:00:00Z",
        "empleados_asignados": [],
    }
    data.update(overrides)
    return data


def _factura_detail(**overrides) -> dict:
    data = {
        "factura_id": "44444444-4444-4444-4444-444444444444",
        "numero": "F-2026-0001",
        "cliente_id": "22222222-2222-2222-2222-222222222222",
        "cliente_nombre": "Cliente Escritura SL",
        "estado": "emitida",
        "concepto": "Servicios fiscales",
        "notas": None,
        "base_imponible": 1000.0,
        "porcentaje_iva": 21.0,
        "importe_iva": 210.0,
        "total": 1210.0,
        "pagado": 0.0,
        "pendiente": 1210.0,
        "fecha_emision": "2026-05-18",
        "fecha_vencimiento": "2026-06-18",
        "created_at": "2026-05-18T10:00:00Z",
        "pagos": [],
    }
    data.update(overrides)
    return data


def _pago_detail(**overrides) -> dict:
    data = {
        "pago_id": "55555555-5555-5555-5555-555555555555",
        "factura_id": "44444444-4444-4444-4444-444444444444",
        "factura_numero": "F-2026-0001",
        "cliente_nombre": "Cliente Escritura SL",
        "fecha_pago": "2026-05-18",
        "importe": 500.0,
        "metodo_pago": "transferencia",
        "referencia": "TR-001",
        "notas": None,
    }
    data.update(overrides)
    return data


class TestClientesWrites:
    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.clientes.registrar_evento")
    @patch("routes.intranet.clientes.ClientesService.create_cliente")
    def test_create_cliente_writes_and_audits(self, mock_create, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_create.return_value = _cliente_detail()

        response = client.post(
            "/intranet/clientes",
            headers=_headers(),
            json={
                "nombre_fiscal": "Cliente Escritura SL",
                "cif_nif": "B12345678",
                "email": "cliente@example.com",
                "tipo_cliente": "Sociedad",
            },
        )

        assert response.status_code == 201
        assert response.json()["cliente_id"] == "22222222-2222-2222-2222-222222222222"
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["entidad"] == "cliente"
        assert mock_audit.call_args.kwargs["accion"] == "crear"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.clientes.registrar_evento")
    @patch("routes.intranet.clientes.ClientesService.update_cliente")
    def test_update_cliente_writes_and_audits(self, mock_update, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_update.return_value = _cliente_detail(nombre_fiscal="Cliente Actualizado SL")

        response = client.put(
            "/intranet/clientes/22222222-2222-2222-2222-222222222222",
            headers=_headers(),
            json={"nombre_fiscal": "Cliente Actualizado SL"},
        )

        assert response.status_code == 200
        assert response.json()["nombre_fiscal"] == "Cliente Actualizado SL"
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["accion"] == "editar"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.clientes.registrar_evento")
    @patch("routes.intranet.clientes.ClientesService.delete_cliente")
    def test_delete_cliente_requires_admin_and_audits(self, mock_delete, mock_audit, mock_decode):
        mock_decode.return_value = _token("administrador")
        mock_delete.return_value = True

        response = client.delete(
            "/intranet/clientes/22222222-2222-2222-2222-222222222222",
            headers=_headers(),
        )

        assert response.status_code == 204
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["accion"] == "eliminar"


class TestTrabajosWrites:
    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.trabajos.registrar_evento")
    @patch("routes.intranet.trabajos.TrabajosService.create_trabajo")
    def test_create_trabajo_writes_and_audits(self, mock_create, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_create.return_value = _trabajo_detail()

        response = client.post(
            "/intranet/trabajos",
            headers=_headers(),
            json={
                "titulo": "Preparar IVA",
                "cliente_id": "22222222-2222-2222-2222-222222222222",
                "prioridad": "media",
                "fecha_inicio": "2026-05-01",
                "fecha_objetivo": "2026-05-20",
            },
        )

        assert response.status_code == 201
        assert response.json()["titulo"] == "Preparar IVA"
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["entidad"] == "trabajo"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.trabajos.registrar_evento")
    @patch("routes.intranet.trabajos.TrabajosService.update_trabajo")
    def test_update_trabajo_writes_and_audits(self, mock_update, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_update.return_value = _trabajo_detail(estado="en_curso", prioridad="alta")

        response = client.put(
            "/intranet/trabajos/33333333-3333-3333-3333-333333333333",
            headers=_headers(),
            json={"estado": "en_curso", "prioridad": "alta"},
        )

        assert response.status_code == 200
        assert response.json()["estado"] == "en_curso"
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["accion"] == "editar"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.trabajos.registrar_evento")
    @patch("routes.intranet.trabajos.TrabajosService.delete_trabajo")
    def test_delete_trabajo_writes_and_audits(self, mock_delete, mock_audit, mock_decode):
        mock_decode.return_value = _token("administrador")
        mock_delete.return_value = True

        response = client.delete(
            "/intranet/trabajos/33333333-3333-3333-3333-333333333333",
            headers=_headers(),
        )

        assert response.status_code == 204
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["accion"] == "eliminar"


class TestFacturasPagosWrites:
    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.pagos.registrar_evento")
    @patch("routes.intranet.pagos.PagosService.create_factura")
    def test_create_factura_writes_and_audits(self, mock_create, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_create.return_value = _factura_detail()

        response = client.post(
            "/intranet/facturas",
            headers=_headers(),
            json={
                "cliente_id": "22222222-2222-2222-2222-222222222222",
                "concepto": "Servicios fiscales",
                "base_imponible": 1000.0,
                "porcentaje_iva": 21.0,
                "fecha_emision": "2026-05-18",
                "fecha_vencimiento": "2026-06-18",
            },
        )

        assert response.status_code == 201
        assert response.json()["total"] == 1210.0
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["entidad"] == "factura"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.pagos.registrar_evento")
    @patch("routes.intranet.pagos.PagosService.update_factura")
    def test_update_factura_writes_and_audits(self, mock_update, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_update.return_value = _factura_detail(estado="borrador")

        response = client.put(
            "/intranet/facturas/44444444-4444-4444-4444-444444444444",
            headers=_headers(),
            json={"estado": "borrador", "notas": "Revisar antes de emitir"},
        )

        assert response.status_code == 200
        assert response.json()["estado"] == "borrador"
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["accion"] == "editar"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.pagos.registrar_evento")
    @patch("routes.intranet.pagos.PagosService.delete_factura")
    def test_delete_factura_writes_and_audits(self, mock_delete, mock_audit, mock_decode):
        mock_decode.return_value = _token("administrador")
        mock_delete.return_value = True

        response = client.delete(
            "/intranet/facturas/44444444-4444-4444-4444-444444444444",
            headers=_headers(),
        )

        assert response.status_code == 204
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["detalle"] == {"accion": "anulada"}

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.pagos.registrar_evento")
    @patch("routes.intranet.pagos.PagosService.create_pago")
    def test_create_pago_writes_and_audits(self, mock_create, mock_audit, mock_decode):
        mock_decode.return_value = _token()
        mock_create.return_value = _pago_detail()

        response = client.post(
            "/intranet/facturas/44444444-4444-4444-4444-444444444444/pagos",
            headers=_headers(),
            json={
                "importe": 500.0,
                "metodo_pago": "transferencia",
                "fecha_pago": "2026-05-18",
                "referencia": "TR-001",
            },
        )

        assert response.status_code == 201
        assert response.json()["importe"] == 500.0
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["entidad"] == "pago"


class TestAuditoriaWrites:
    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.admin.registrar_evento")
    @patch("routes.intranet.admin.AdminService.create_correccion")
    def test_admin_correccion_writes_audit_event(self, mock_create, mock_audit, mock_decode):
        mock_decode.return_value = _token("administrador")
        mock_create.return_value = {
            "fichaje_id": "66666666-6666-6666-6666-666666666666",
            "empleado_id": "77777777-7777-7777-7777-777777777777",
            "nombre_completo": "Empleado Prueba",
            "tipo_evento": "entrada",
            "fecha_hora": "2026-05-18T08:00:00Z",
            "origen": "correccion",
            "observaciones": "Alta manual",
        }

        response = client.post(
            "/intranet/admin/fichajes/correccion",
            headers=_headers(),
            json={
                "empleado_id": "77777777-7777-7777-7777-777777777777",
                "tipo_evento": "entrada",
                "fecha_hora": "2026-05-18T08:00:00Z",
                "observaciones": "Alta manual",
            },
        )

        assert response.status_code == 201
        assert response.json()["origen"] == "correccion"
        mock_audit.assert_called_once()
        assert mock_audit.call_args.kwargs["accion"] == "correccion_fichaje"
