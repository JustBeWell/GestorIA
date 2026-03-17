from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from models import TokenData


client = TestClient(app)


class TestIntranetHome:
    def test_requires_auth(self):
        response = client.get("/intranet/home")
        assert response.status_code == 401

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_home")
    def test_returns_home_payload(self, mock_get_home, mock_decode):
        mock_decode.return_value = TokenData(
            user_id="11111111-1111-1111-1111-111111111111",
            nombre_usuario="empleado@gestoria.local",
            role="empleado",
        )
        mock_get_home.return_value = {
            "usuario": {
                "usuario_id": "11111111-1111-1111-1111-111111111111",
                "empleado_id": "22222222-2222-2222-2222-222222222222",
                "nombre_usuario": "empleado@gestoria.local",
                "nombre_completo": "Ana Pérez",
                "rol": "empleado",
            },
            "funcionalidades": [
                {
                    "clave": "fichaje",
                    "titulo": "Fichaje",
                    "descripcion": "Registro diario",
                    "ruta": "/fichaje",
                }
            ],
            "fichaje": {
                "eventos_hoy": 2,
                "ultimo_evento_tipo": "salida",
                "ultimo_evento_fecha_hora": "2026-03-17T09:30:00Z",
                "turno_activo": False,
            },
            "clientes": {
                "total": 12,
                "activos": 10,
            },
            "trabajos": {
                "total": 20,
                "pendientes": 8,
                "en_curso": 6,
                "bloqueados": 1,
                "finalizados": 4,
                "cancelados": 1,
            },
            "pagos": {
                "cobrado_mes": 2400.5,
                "pendiente_total": 1200.0,
                "facturas_vencidas": 2,
            },
        }

        response = client.get(
            "/intranet/home",
            headers={"Authorization": "Bearer valid-token"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["usuario"]["nombre_usuario"] == "empleado@gestoria.local"
        assert body["fichaje"]["eventos_hoy"] == 2
        assert body["clientes"]["activos"] == 10
        assert body["trabajos"]["en_curso"] == 6
        assert body["pagos"]["facturas_vencidas"] == 2

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.intranet.IntranetService.get_home")
    def test_returns_404_when_user_not_found(self, mock_get_home, mock_decode):
        mock_decode.return_value = TokenData(
            user_id="11111111-1111-1111-1111-111111111111",
            nombre_usuario="empleado@gestoria.local",
            role="empleado",
        )
        mock_get_home.return_value = {}

        response = client.get(
            "/intranet/home",
            headers={"Authorization": "Bearer valid-token"},
        )

        assert response.status_code == 404
