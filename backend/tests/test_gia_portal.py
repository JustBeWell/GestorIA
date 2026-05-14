from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from models import TokenData
from services.gia_service import GiaService


client = TestClient(app)


def _headers() -> dict:
    return {"Authorization": "Bearer valid-token"}


def _token() -> TokenData:
    return TokenData(
        user_id="11111111-1111-1111-1111-111111111111",
        nombre_usuario="empleado@gestoria.local",
        role="empleado",
    )


class TestGiaPortal:
    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.ai.GiaService.list_conversations")
    def test_list_conversations(self, mock_service, mock_decode):
        mock_decode.return_value = _token()
        mock_service.return_value = [
            {
                "id": "22222222-2222-2222-2222-222222222222",
                "titulo": "IVA trimestral",
                "updated_at": "2026-05-08T10:00:00Z",
                "last_message": "Resumen generado",
                "message_count": 2,
            }
        ]

        response = client.get("/ai/gia/conversations", headers=_headers())

        assert response.status_code == 200
        assert response.json()[0]["titulo"] == "IVA trimestral"

    @patch("services.auth_service.TokenService.decode_token")
    @patch("routes.ai.GiaService.send_message")
    def test_send_message(self, mock_service, mock_decode):
        mock_decode.return_value = _token()
        mock_service.return_value = {
            "conversation": {
                "id": "22222222-2222-2222-2222-222222222222",
                "titulo": "Nueva conversación",
                "updated_at": "2026-05-08T10:00:00Z",
                "last_message": "Respuesta",
                "message_count": 2,
            },
            "user_message": {
                "id": "33333333-3333-3333-3333-333333333333",
                "role": "user",
                "content": "Genera un PDF",
                "created_at": "2026-05-08T10:00:00Z",
                "files": [],
            },
            "assistant_message": {
                "id": "44444444-4444-4444-4444-444444444444",
                "role": "assistant",
                "content": "Documento listo",
                "created_at": "2026-05-08T10:00:01Z",
                "files": [],
            },
            "generated_files": [],
        }

        response = client.post(
            "/ai/gia/conversations/22222222-2222-2222-2222-222222222222/messages",
            headers=_headers(),
            data={"message": "Genera un PDF", "mode": "pdf"},
        )

        assert response.status_code == 200
        assert response.json()["assistant_message"]["content"] == "Documento listo"

    def test_pdf_mode_generates_from_previous_report_reference(self):
        assert GiaService._effective_generation_mode(
            "Generame un PDF a partir de ese informe",
            "pdf",
            [],
        ) == "pdf"

    def test_pdf_mode_does_not_generate_for_follow_up_question(self):
        assert GiaService._effective_generation_mode(
            "Sobre que te he preguntado antes",
            "pdf",
            [],
        ) == "respuesta"

    def test_pdf_source_context_uses_previous_assistant_report(self):
        context = GiaService._pdf_source_context(
            [
                {"role": "user", "content": "Dame un analisis semanal"},
                {
                    "role": "assistant",
                    "content": "Informe semanal: Angel trabajo 2 dias y Miguel 6 dias.",
                },
                {"role": "user", "content": "Generame un PDF a partir de ese informe"},
            ]
        )

        assert "Fuente conversacional prioritaria" in context
        assert "Angel trabajo 2 dias" in context
