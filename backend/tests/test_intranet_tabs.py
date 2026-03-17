from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from models import TokenData


client = TestClient(app)


def _auth_headers() -> dict:
    return {"Authorization": "Bearer valid-token"}


def _token_data() -> TokenData:
    return TokenData(
        user_id="11111111-1111-1111-1111-111111111111",
        nombre_usuario="empleado@gestoria.local",
        role="empleado",
    )


class TestIntranetTabs:
    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_fichaje_tab_filtered")
    def test_fichaje_tab(self, mock_service, mock_decode):
        mock_decode.return_value = _token_data()
        mock_service.return_value = {
            "usuario": {
                "usuario_id": "11111111-1111-1111-1111-111111111111",
                "empleado_id": "22222222-2222-2222-2222-222222222222",
                "nombre_usuario": "empleado@gestoria.local",
                "nombre_completo": "Ana Pérez",
                "rol": "empleado",
            },
            "resumen": {
                "eventos_hoy": 1,
                "ultimo_evento_tipo": "entrada",
                "ultimo_evento_fecha_hora": "2026-03-17T08:00:00Z",
                "turno_activo": True,
            },
            "eventos_recientes": [
                {
                    "id": "33333333-3333-3333-3333-333333333333",
                    "tipo_evento": "entrada",
                    "fecha_hora": "2026-03-17T08:00:00Z",
                    "origen": "web",
                    "observaciones": None,
                }
            ],
            "paginacion": {
                "page": 1,
                "page_size": 20,
                "total": 1,
                "total_pages": 1,
            },
        }

        response = client.get(
            "/intranet/fichaje?page=1&page_size=20&tipo_evento=entrada",
            headers=_auth_headers(),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["resumen"]["turno_activo"] is True
        assert len(body["eventos_recientes"]) == 1
        assert body["paginacion"]["total"] == 1

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_clientes_tab")
    def test_clientes_tab(self, mock_service, mock_decode):
        mock_decode.return_value = _token_data()
        mock_service.return_value = {
            "usuario": {
                "usuario_id": "11111111-1111-1111-1111-111111111111",
                "empleado_id": "22222222-2222-2222-2222-222222222222",
                "nombre_usuario": "empleado@gestoria.local",
                "nombre_completo": "Ana Pérez",
                "rol": "empleado",
            },
            "resumen": {"total": 1, "activos": 1},
            "clientes": [
                {
                    "cliente_id": "44444444-4444-4444-4444-444444444444",
                    "nombre_fiscal": "Cliente Demo S.L.",
                    "cif_nif": "B12345678",
                    "activo": True,
                    "trabajos_abiertos": 2,
                    "pendiente_total": 300.0,
                }
            ],
        }

        response = client.get("/intranet/clientes", headers=_auth_headers())

        assert response.status_code == 200
        body = response.json()
        assert body["resumen"]["total"] == 1
        assert body["clientes"][0]["trabajos_abiertos"] == 2

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_trabajos_tab_filtered")
    def test_trabajos_tab(self, mock_service, mock_decode):
        mock_decode.return_value = _token_data()
        mock_service.return_value = {
            "usuario": {
                "usuario_id": "11111111-1111-1111-1111-111111111111",
                "empleado_id": "22222222-2222-2222-2222-222222222222",
                "nombre_usuario": "empleado@gestoria.local",
                "nombre_completo": "Ana Pérez",
                "rol": "empleado",
            },
            "resumen": {
                "total": 1,
                "pendientes": 0,
                "en_curso": 1,
                "bloqueados": 0,
                "finalizados": 0,
                "cancelados": 0,
            },
            "trabajos": [
                {
                    "trabajo_id": "55555555-5555-5555-5555-555555555555",
                    "titulo": "Nóminas marzo",
                    "estado": "en_curso",
                    "prioridad": "alta",
                    "cliente_id": "44444444-4444-4444-4444-444444444444",
                    "cliente_nombre": "Cliente Demo S.L.",
                    "fecha_inicio": "2026-03-01",
                    "fecha_objetivo": "2026-03-31",
                    "fecha_cierre": None,
                }
            ],
            "paginacion": {
                "page": 1,
                "page_size": 20,
                "total": 1,
                "total_pages": 1,
            },
        }

        response = client.get(
            "/intranet/trabajos?page=1&page_size=20&estado=en_curso&prioridad=alta",
            headers=_auth_headers(),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["resumen"]["en_curso"] == 1
        assert body["trabajos"][0]["titulo"] == "Nóminas marzo"
        assert body["paginacion"]["page"] == 1

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_pagos_tab_filtered")
    def test_pagos_tab(self, mock_service, mock_decode):
        mock_decode.return_value = _token_data()
        mock_service.return_value = {
            "usuario": {
                "usuario_id": "11111111-1111-1111-1111-111111111111",
                "empleado_id": "22222222-2222-2222-2222-222222222222",
                "nombre_usuario": "empleado@gestoria.local",
                "nombre_completo": "Ana Pérez",
                "rol": "empleado",
            },
            "resumen": {
                "cobrado_mes": 500.0,
                "pendiente_total": 1200.0,
                "facturas_vencidas": 1,
            },
            "facturas": [
                {
                    "factura_id": "66666666-6666-6666-6666-666666666666",
                    "numero": "F-2026-0001",
                    "cliente_id": "44444444-4444-4444-4444-444444444444",
                    "cliente_nombre": "Cliente Demo S.L.",
                    "estado": "emitida",
                    "fecha_emision": "2026-03-01",
                    "fecha_vencimiento": "2026-03-20",
                    "total": 1000.0,
                    "pagado": 500.0,
                    "pendiente": 500.0,
                }
            ],
            "pagos_recientes": [
                {
                    "pago_id": "77777777-7777-7777-7777-777777777777",
                    "factura_id": "66666666-6666-6666-6666-666666666666",
                    "factura_numero": "F-2026-0001",
                    "cliente_nombre": "Cliente Demo S.L.",
                    "fecha_pago": "2026-03-10",
                    "importe": 500.0,
                    "metodo_pago": "transferencia",
                }
            ],
            "paginacion_facturas": {
                "page": 1,
                "page_size": 20,
                "total": 1,
                "total_pages": 1,
            },
            "paginacion_pagos": {
                "page": 1,
                "page_size": 20,
                "total": 1,
                "total_pages": 1,
            },
        }

        response = client.get(
            "/intranet/pagos?page_facturas=1&page_size_facturas=20&page_pagos=1&page_size_pagos=20&vencidas_solo=true",
            headers=_auth_headers(),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["resumen"]["facturas_vencidas"] == 1
        assert body["facturas"][0]["pendiente"] == 500.0
        assert body["pagos_recientes"][0]["importe"] == 500.0
        assert body["paginacion_facturas"]["total_pages"] == 1

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_pagos_tab_filtered")
    def test_tab_returns_404_when_user_not_found(self, mock_service, mock_decode):
        mock_decode.return_value = _token_data()
        mock_service.return_value = {}

        response = client.get("/intranet/pagos", headers=_auth_headers())

        assert response.status_code == 404
