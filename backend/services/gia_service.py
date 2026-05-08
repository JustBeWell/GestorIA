from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
import shutil
from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from fpdf import FPDF
from psycopg2.extras import RealDictCursor

from database import db_connection
from service_config import settings


TEXT_MIME_PREFIXES = ("text/",)
TEXT_MIME_TYPES = {
    "application/json",
    "application/xml",
    "application/csv",
    "application/vnd.ms-excel",
}
IMAGE_MIME_PREFIXES = ("image/",)


class GiaService:
    @staticmethod
    def create_conversation(user_id: str, title: str | None = None) -> dict:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                GiaService._ensure_schema(cursor)
                cursor.execute(
                    """
                    INSERT INTO gia_conversaciones (user_id, titulo)
                    VALUES (%s, COALESCE(NULLIF(%s, ''), 'Nueva conversación'))
                    RETURNING id::text, titulo, created_at, updated_at
                    """,
                    (user_id, title),
                )
                row = dict(cursor.fetchone())
                connection.commit()
        return row

    @staticmethod
    def list_conversations(user_id: str) -> list[dict]:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                GiaService._ensure_schema(cursor)
                cursor.execute(
                    """
                    SELECT
                        c.id::text,
                        c.titulo,
                        c.updated_at,
                        COUNT(m.id) AS message_count,
                        (
                            SELECT m2.content
                            FROM gia_mensajes m2
                            WHERE m2.conversacion_id = c.id
                            ORDER BY m2.created_at DESC
                            LIMIT 1
                        ) AS last_message
                    FROM gia_conversaciones c
                    LEFT JOIN gia_mensajes m ON m.conversacion_id = c.id
                    WHERE c.user_id = %s AND c.archivada = FALSE
                    GROUP BY c.id
                    ORDER BY c.updated_at DESC
                    """,
                    (user_id,),
                )
                rows = [GiaService._conversation_summary(row) for row in cursor.fetchall()]
        return rows

    @staticmethod
    def get_conversation(user_id: str, conversation_id: str) -> dict | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                GiaService._ensure_schema(cursor)
                conversation = GiaService._get_owned_conversation(cursor, user_id, conversation_id)
                if not conversation:
                    return None
                messages = GiaService._get_messages(cursor, conversation_id)
                files = GiaService._get_files(cursor, conversation_id)
        return {
            **conversation,
            "messages": messages,
            "files": files,
        }

    @staticmethod
    def send_message(
        user_id: str,
        conversation_id: str,
        message: str,
        mode: str = "respuesta",
        files: list[UploadFile] | None = None,
    ) -> dict:
        if mode not in {"respuesta", "pdf", "imagen"}:
            raise HTTPException(status_code=422, detail="Modo GIA no soportado")

        uploaded = files or []
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                GiaService._ensure_schema(cursor)
                conversation = GiaService._get_owned_conversation(cursor, user_id, conversation_id)
                if not conversation:
                    raise HTTPException(status_code=404, detail="Conversación no encontrada")

                user_message = GiaService._insert_message(cursor, conversation_id, "user", message)
                attachments = [
                    GiaService._store_upload(cursor, conversation_id, user_message["id"], user_id, upload)
                    for upload in uploaded
                    if upload.filename
                ]

                GiaService._touch_conversation(cursor, conversation_id, message)
                history = GiaService._get_messages(cursor, conversation_id, limit=16)
                connection.commit()

        assistant_text, generated_image = GiaService._run_openai(message, history, attachments, mode)

        generated_files: list[dict] = []
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                assistant_message = GiaService._insert_message(
                    cursor,
                    conversation_id,
                    "assistant",
                    assistant_text,
                    {"mode": mode},
                )
                if mode == "pdf":
                    generated_files.append(
                        GiaService._create_pdf(cursor, conversation_id, assistant_message["id"], user_id, assistant_text)
                    )
                if generated_image:
                    generated_files.append(
                        GiaService._store_generated_image(
                            cursor,
                            conversation_id,
                            assistant_message["id"],
                            user_id,
                            generated_image,
                        )
                    )
                GiaService._touch_conversation(cursor, conversation_id, message)
                summary = GiaService._get_conversation_summary(cursor, conversation_id)
                user_message["files"] = GiaService._files_for_message(cursor, user_message["id"])
                assistant_message["files"] = GiaService._files_for_message(cursor, assistant_message["id"])
                connection.commit()

        return {
            "conversation": summary,
            "user_message": user_message,
            "assistant_message": assistant_message,
            "generated_files": generated_files,
        }

    @staticmethod
    def get_file_for_download(user_id: str, file_id: str) -> dict | None:
        with db_connection() as connection:
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                GiaService._ensure_schema(cursor)
                cursor.execute(
                    """
                    SELECT
                        a.id::text,
                        a.nombre_original,
                        a.mime_type,
                        a.ruta_archivo
                    FROM gia_archivos a
                    JOIN gia_conversaciones c ON c.id = a.conversacion_id
                    WHERE a.id = %s AND c.user_id = %s
                    """,
                    (file_id, user_id),
                )
                row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def _run_openai(message: str, history: list[dict], attachments: list[dict], mode: str) -> tuple[str, bytes | None]:
        if not settings.openai_api_key:
            raise HTTPException(status_code=503, detail="OPENAI_API_KEY no está configurada")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="Dependencia OpenAI no instalada") from exc

        client = OpenAI(api_key=settings.openai_api_key)
        context = GiaService._attachment_context(attachments)
        today = date.today().isoformat()
        mode_hint = {
            "respuesta": "Responde normalmente en el chat.",
            "pdf": "Redacta el contenido final como documento profesional listo para convertir a PDF.",
            "imagen": "Redacta una breve descripción de la imagen generada y confirma el archivo adjunto.",
        }[mode]

        messages: list[dict] = [
            {
                "role": "system",
                "content": (
                    "Eres GIA, el portal de IA de GestorIA. Ayudas a una gestoría española con "
                    "consultas internas, análisis de archivos, redacción documental fiscal/laboral "
                    "y generación de entregables. Responde siempre en español, no inventes datos "
                    f"y usa la fecha actual {today}. {mode_hint}"
                ),
            }
        ]
        for item in history[-12:]:
            if item["role"] in {"user", "assistant"}:
                messages.append({"role": item["role"], "content": item["content"]})

        user_content: str | list[dict] = message + context
        image_parts = GiaService._image_parts(attachments)
        if image_parts:
            user_content = [{"type": "text", "text": message + context}, *image_parts]
        messages.append({"role": "user", "content": user_content})

        try:
            for _ in range(5):
                response = client.chat.completions.create(
                    model=settings.openai_gia_model,
                    messages=messages,
                    tools=__import__("routes.ai", fromlist=["TOOLS"]).TOOLS,
                    tool_choice="auto",
                    max_tokens=1800,
                    temperature=0.25,
                )
                choice = response.choices[0]
                if choice.finish_reason != "tool_calls":
                    answer = choice.message.content or ""
                    break
                messages.append(choice.message)
                ai_module = __import__("routes.ai", fromlist=["_execute_tool"])
                for tool_call in choice.message.tool_calls:
                    args = json.loads(tool_call.function.arguments or "{}")
                    result = ai_module._execute_tool(tool_call.function.name, args)
                    messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})
            else:
                response = client.chat.completions.create(
                    model=settings.openai_gia_model,
                    messages=messages,
                    max_tokens=1800,
                    temperature=0.25,
                )
                answer = response.choices[0].message.content or ""

            generated_image = None
            if mode == "imagen":
                generated_image = GiaService._generate_image(client, message + context)
                if not answer.strip():
                    answer = "He generado la imagen solicitada y la he adjuntado a esta conversación."
            return answer, generated_image
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Error al contactar con OpenAI") from exc

    @staticmethod
    def _generate_image(client, prompt: str) -> bytes:
        response = client.responses.create(
            model=settings.openai_image_model,
            input=prompt,
            tools=[{"type": "image_generation", "size": "1024x1024", "quality": "medium"}],
            tool_choice={"type": "image_generation"},
        )
        for output in getattr(response, "output", []):
            if getattr(output, "type", None) == "image_generation_call":
                result = getattr(output, "result", None)
                if result:
                    return base64.b64decode(result)
        raise HTTPException(status_code=502, detail="OpenAI no devolvió una imagen")

    @staticmethod
    def _store_upload(cursor, conversation_id: str, message_id: str, user_id: str, upload: UploadFile) -> dict:
        storage_dir = GiaService._conversation_dir(conversation_id)
        suffix = Path(upload.filename or "archivo").suffix
        stored_name = f"{uuid4().hex}{suffix}"
        path = storage_dir / stored_name
        with path.open("wb") as output:
            shutil.copyfileobj(upload.file, output)
        mime_type = upload.content_type or mimetypes.guess_type(upload.filename or "")[0] or "application/octet-stream"
        size = path.stat().st_size
        extracted = GiaService._extract_text(path, mime_type)
        return GiaService._insert_file(
            cursor,
            conversation_id,
            message_id,
            user_id,
            upload.filename or stored_name,
            stored_name,
            mime_type,
            size,
            str(path),
            "upload",
            extracted,
        )

    @staticmethod
    def _store_generated_image(cursor, conversation_id: str, message_id: str, user_id: str, image_bytes: bytes) -> dict:
        storage_dir = GiaService._conversation_dir(conversation_id)
        stored_name = f"gia-imagen-{uuid4().hex}.png"
        path = storage_dir / stored_name
        path.write_bytes(image_bytes)
        return GiaService._insert_file(
            cursor,
            conversation_id,
            message_id,
            user_id,
            "imagen-generada-gia.png",
            stored_name,
            "image/png",
            len(image_bytes),
            str(path),
            "image",
            None,
        )

    @staticmethod
    def _create_pdf(cursor, conversation_id: str, message_id: str, user_id: str, content: str) -> dict:
        storage_dir = GiaService._conversation_dir(conversation_id)
        stored_name = f"gia-documento-{uuid4().hex}.pdf"
        path = storage_dir / stored_name
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.multi_cell(0, 10, GiaService._pdf_safe("Documento generado por GIA"))
        pdf.ln(4)
        pdf.set_font("Helvetica", "", 11)
        for paragraph in content.split("\n"):
            pdf.multi_cell(0, 7, GiaService._pdf_safe(paragraph))
        pdf.output(str(path))
        return GiaService._insert_file(
            cursor,
            conversation_id,
            message_id,
            user_id,
            "documento-generado-gia.pdf",
            stored_name,
            "application/pdf",
            path.stat().st_size,
            str(path),
            "pdf",
            content,
        )

    @staticmethod
    def _extract_text(path: Path, mime_type: str) -> str | None:
        if mime_type.startswith(TEXT_MIME_PREFIXES) or mime_type in TEXT_MIME_TYPES:
            return path.read_text(encoding="utf-8", errors="replace")[:20000]
        if mime_type == "application/pdf" or path.suffix.lower() == ".pdf":
            try:
                from pypdf import PdfReader
                reader = PdfReader(str(path))
                return "\n".join((page.extract_text() or "") for page in reader.pages)[:30000]
            except Exception:
                return "PDF recibido. No se pudo extraer texto automáticamente."
        return None

    @staticmethod
    def _attachment_context(attachments: list[dict]) -> str:
        chunks = []
        for item in attachments:
            if item.get("extracted_text"):
                chunks.append(
                    f"\n\n[Archivo: {item['nombre_original']}]\n{item['extracted_text'][:12000]}"
                )
            elif item["mime_type"].startswith("image/"):
                chunks.append(f"\n\n[Imagen adjunta: {item['nombre_original']}]")
            else:
                chunks.append(f"\n\n[Archivo adjunto sin texto extraíble: {item['nombre_original']}]")
        return "".join(chunks)

    @staticmethod
    def _image_parts(attachments: list[dict]) -> list[dict]:
        parts = []
        for item in attachments:
            if not item["mime_type"].startswith(IMAGE_MIME_PREFIXES):
                continue
            path = Path(item["ruta_archivo"])
            if path.stat().st_size > 8 * 1024 * 1024:
                continue
            encoded = base64.b64encode(path.read_bytes()).decode("ascii")
            parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:{item['mime_type']};base64,{encoded}"},
            })
        return parts

    @staticmethod
    def _ensure_schema(cursor) -> None:
        cursor.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS gia_conversaciones (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                titulo VARCHAR(180) NOT NULL DEFAULT 'Nueva conversación',
                archivada BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS gia_mensajes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversacion_id UUID NOT NULL REFERENCES gia_conversaciones(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS gia_archivos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversacion_id UUID NOT NULL REFERENCES gia_conversaciones(id) ON DELETE CASCADE,
                mensaje_id UUID REFERENCES gia_mensajes(id) ON DELETE SET NULL,
                created_by UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                nombre_original VARCHAR(255) NOT NULL,
                nombre_guardado VARCHAR(255) NOT NULL,
                mime_type VARCHAR(120) NOT NULL,
                tamano_bytes BIGINT NOT NULL DEFAULT 0,
                ruta_archivo TEXT NOT NULL,
                tipo VARCHAR(20) NOT NULL DEFAULT 'upload',
                extracted_text TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )

    @staticmethod
    def _insert_message(cursor, conversation_id: str, role: str, content: str, metadata: dict | None = None) -> dict:
        cursor.execute(
            """
            INSERT INTO gia_mensajes (conversacion_id, role, content, metadata)
            VALUES (%s, %s, %s, %s::jsonb)
            RETURNING id::text, role, content, created_at
            """,
            (conversation_id, role, content, json.dumps(metadata or {})),
        )
        row = dict(cursor.fetchone())
        row["files"] = []
        return row

    @staticmethod
    def _insert_file(
        cursor,
        conversation_id: str,
        message_id: str,
        user_id: str,
        original_name: str,
        stored_name: str,
        mime_type: str,
        size: int,
        path: str,
        kind: str,
        extracted_text: str | None,
    ) -> dict:
        cursor.execute(
            """
            INSERT INTO gia_archivos
                (conversacion_id, mensaje_id, created_by, nombre_original, nombre_guardado,
                 mime_type, tamano_bytes, ruta_archivo, tipo, extracted_text)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id::text, nombre_original, mime_type, tamano_bytes, tipo, created_at
            """,
            (conversation_id, message_id, user_id, original_name, stored_name, mime_type, size, path, kind, extracted_text),
        )
        return GiaService._file_item(cursor.fetchone())

    @staticmethod
    def _get_owned_conversation(cursor, user_id: str, conversation_id: str) -> dict | None:
        cursor.execute(
            """
            SELECT id::text, titulo, created_at, updated_at
            FROM gia_conversaciones
            WHERE id = %s AND user_id = %s AND archivada = FALSE
            """,
            (conversation_id, user_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def _get_messages(cursor, conversation_id: str, limit: int | None = None) -> list[dict]:
        if limit:
            cursor.execute(
                """
                SELECT id::text, role, content, created_at
                FROM (
                    SELECT id, role, content, created_at
                    FROM gia_mensajes
                    WHERE conversacion_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                ) recent_messages
                ORDER BY created_at ASC
                """,
                (conversation_id, limit),
            )
        else:
            cursor.execute(
                """
                SELECT id::text, role, content, created_at
                FROM gia_mensajes
                WHERE conversacion_id = %s
                ORDER BY created_at ASC
                """,
                (conversation_id,),
            )
        messages = [dict(row) for row in cursor.fetchall()]
        for msg in messages:
            msg["files"] = GiaService._files_for_message(cursor, msg["id"])
        return messages

    @staticmethod
    def _get_files(cursor, conversation_id: str) -> list[dict]:
        cursor.execute(
            """
            SELECT id::text, nombre_original, mime_type, tamano_bytes, tipo, created_at
            FROM gia_archivos
            WHERE conversacion_id = %s
            ORDER BY created_at DESC
            """,
            (conversation_id,),
        )
        return [GiaService._file_item(row) for row in cursor.fetchall()]

    @staticmethod
    def _files_for_message(cursor, message_id: str) -> list[dict]:
        cursor.execute(
            """
            SELECT id::text, nombre_original, mime_type, tamano_bytes, tipo, created_at
            FROM gia_archivos
            WHERE mensaje_id = %s
            ORDER BY created_at ASC
            """,
            (message_id,),
        )
        return [GiaService._file_item(row) for row in cursor.fetchall()]

    @staticmethod
    def _get_conversation_summary(cursor, conversation_id: str) -> dict:
        cursor.execute(
            """
            SELECT
                c.id::text,
                c.titulo,
                c.updated_at,
                COUNT(m.id) AS message_count,
                (
                    SELECT m2.content
                    FROM gia_mensajes m2
                    WHERE m2.conversacion_id = c.id
                    ORDER BY m2.created_at DESC
                    LIMIT 1
                ) AS last_message
            FROM gia_conversaciones c
            LEFT JOIN gia_mensajes m ON m.conversacion_id = c.id
            WHERE c.id = %s
            GROUP BY c.id
            """,
            (conversation_id,),
        )
        return GiaService._conversation_summary(cursor.fetchone())

    @staticmethod
    def _touch_conversation(cursor, conversation_id: str, message: str) -> None:
        title = GiaService._title_from_message(message)
        cursor.execute(
            """
            UPDATE gia_conversaciones
            SET updated_at = NOW(),
                titulo = CASE WHEN titulo = 'Nueva conversación' THEN %s ELSE titulo END
            WHERE id = %s
            """,
            (title, conversation_id),
        )

    @staticmethod
    def _conversation_summary(row) -> dict:
        data = dict(row)
        data["message_count"] = int(data.get("message_count") or 0)
        if data.get("last_message") and len(data["last_message"]) > 120:
            data["last_message"] = data["last_message"][:117] + "..."
        return data

    @staticmethod
    def _file_item(row) -> dict:
        data = dict(row)
        data["tamano_bytes"] = int(data.get("tamano_bytes") or 0)
        data["download_url"] = f"/ai/gia/files/{data['id']}/download"
        return data

    @staticmethod
    def _conversation_dir(conversation_id: str) -> Path:
        safe_id = re.sub(r"[^a-zA-Z0-9-]", "", conversation_id)
        path = Path(settings.gia_storage_dir) / safe_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def _title_from_message(message: str) -> str:
        clean = " ".join(message.strip().split())
        return clean[:80] or "Nueva conversación"

    @staticmethod
    def _pdf_safe(value: str) -> str:
        return value.encode("latin-1", errors="replace").decode("latin-1")
