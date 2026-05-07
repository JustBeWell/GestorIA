import csv
import io
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fpdf import FPDF
from psycopg2 import Error as PsycopgError

from models import (
    FichajeRegistroRequest,
    FichajeRegistroResponse,
    FichajeTabResponse,
    FichajeUndoResponse,
)
from services.auth_service import get_current_user
from services.fichaje_service import FichajeService

router = APIRouter(tags=["fichaje"])


@router.get("/fichaje", response_model=FichajeTabResponse)
def intranet_fichaje(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    tipo_evento: str | None = Query(default=None),
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    data = FichajeService.get_fichaje_tab_filtered(
        current_user.user_id,
        page=page,
        page_size=page_size,
        tipo_evento=tipo_evento,
        fecha_desde=fecha_desde.isoformat() if fecha_desde else None,
        fecha_hasta=fecha_hasta.isoformat() if fecha_hasta else None,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.post("/fichaje/registrar", response_model=FichajeRegistroResponse, status_code=status.HTTP_201_CREATED)
def intranet_fichaje_registrar(
    payload: FichajeRegistroRequest,
    current_user=Depends(get_current_user),
):
    try:
        data = FichajeService.create_fichaje_event(
            current_user.user_id,
            tipo_evento=payload.tipo_evento,
            observaciones=payload.observaciones,
        )
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc

    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.post("/fichaje/ultimo/eliminar", response_model=FichajeUndoResponse)
def intranet_fichaje_eliminar_ultimo(current_user=Depends(get_current_user)):
    try:
        data = FichajeService.delete_last_fichaje(current_user.user_id)
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc

    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/fichaje/export")
def intranet_fichaje_export(
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    data = FichajeService.get_fichaje_export(
        current_user.user_id,
        fecha_desde.isoformat() if fecha_desde else None,
        fecha_hasta.isoformat() if fecha_hasta else None,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Dia", "Entrada", "Salida", "Horas", "Estado"])
    for row in data["rows"]:
        writer.writerow([
            row["day_label"],
            row["entry_time"],
            row["exit_time"],
            row["hours_label"],
            row["status_label"],
        ])

    filename = f"fichaje_{data['label'].replace(' ', '_')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


@router.get("/fichaje/export/pdf")
def intranet_fichaje_export_pdf(
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    data = FichajeService.get_fichaje_export(
        current_user.user_id,
        fecha_desde.isoformat() if fecha_desde else None,
        fecha_hasta.isoformat() if fecha_hasta else None,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    pdf_bytes = _build_fichaje_pdf(data)
    filename = f"fichaje_{data['label'].replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


# ── PDF helpers ────────────────────────────────────────────────────────────────

def _pdf_today() -> str:
    now = datetime.now(ZoneInfo("Europe/Madrid"))
    months = ["ene", "feb", "mar", "abr", "may", "jun",
              "jul", "ago", "sep", "oct", "nov", "dic"]
    return f"{now.day:02d} {months[now.month - 1]} {now.year}"


def _build_fichaje_pdf(data: dict) -> bytes:
    usuario = data["usuario"]
    rows = data["rows"]
    label = data["label"]
    nombre_completo = usuario.get("nombre_completo", usuario.get("nombre_usuario", "Empleado"))

    C_PRIMARY   = (30,  41,  59)
    C_HEADER_BG = (241, 245, 249)
    C_WHITE     = (255, 255, 255)
    C_ALT_ROW   = (248, 250, 252)
    C_COMPLETA  = (21,  128, 61)
    C_EN_CURSO  = (180, 83,  9)
    C_AUSENCIA  = (100, 116, 139)
    C_BORDER    = (226, 232, 240)

    pdf = FPDF()
    pdf.set_margins(left=15, top=15, right=15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_fill_color(*C_PRIMARY)
    pdf.rect(x=0, y=0, w=210, h=28, style="F")
    pdf.set_y(8)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 8, "GestorIA", align="L")
    pdf.set_y(17)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, "Sistema de gestion de fichaje", align="L")
    pdf.set_xy(15, 8)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 8, "REGISTRO DE FICHAJE", align="R")
    pdf.set_xy(15, 17)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, label, align="R")

    pdf.set_y(34)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*C_PRIMARY)
    pdf.cell(0, 5, nombre_completo, ln=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 4, f"Periodo: {label}  -  Exportado el {_pdf_today()}", ln=True)
    pdf.ln(5)

    col_widths = [32, 28, 28, 24, 30]
    headers    = ["Dia", "Entrada", "Salida", "Horas", "Estado"]
    row_h = 7

    pdf.set_fill_color(*C_HEADER_BG)
    pdf.set_draw_color(*C_BORDER)
    pdf.set_text_color(*C_PRIMARY)
    pdf.set_font("Helvetica", "B", 8)
    for col, w in zip(headers, col_widths):
        align = "R" if col == "Horas" else "C"
        pdf.cell(w, row_h, col, border=1, align=align, fill=True)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for idx, row in enumerate(rows):
        status_label = row["status_label"]
        fill_bg = C_ALT_ROW if idx % 2 == 1 else C_WHITE
        pdf.set_fill_color(*fill_bg)

        if status_label == "Completa":
            status_color = C_COMPLETA
        elif status_label == "En curso":
            status_color = C_EN_CURSO
        else:
            status_color = C_AUSENCIA

        pdf.set_text_color(*C_PRIMARY)
        pdf.cell(col_widths[0], row_h, row["day_label"],   border="LRB", align="L", fill=True)
        pdf.cell(col_widths[1], row_h, row["entry_time"],  border="LRB", align="C", fill=True)
        pdf.cell(col_widths[2], row_h, row["exit_time"],   border="LRB", align="C", fill=True)
        pdf.cell(col_widths[3], row_h, row["hours_label"], border="LRB", align="R", fill=True)
        pdf.set_text_color(*status_color)
        pdf.cell(col_widths[4], row_h, status_label,       border="LRB", align="C", fill=True)
        pdf.set_text_color(*C_PRIMARY)
        pdf.ln()

    total_completas = sum(1 for r in rows if r["status_label"] == "Completa")
    total_ausencias = sum(1 for r in rows if r["status_label"] == "Ausencia")
    horas_acumuladas = 0.0
    for r in rows:
        h = r["hours_label"].replace("h", "")
        try:
            horas_acumuladas += float(h)
        except ValueError:
            pass

    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C_PRIMARY)
    pdf.cell(0, 5, "RESUMEN DEL PERIODO", ln=True)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(50, 5, f"Dias completos: {total_completas}")
    pdf.cell(50, 5, f"Ausencias: {total_ausencias}")
    pdf.cell(0,  5, f"Horas acumuladas: {horas_acumuladas:.1f} h", ln=True)

    pdf.set_y(-12)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 4, f"Documento generado por GestorIA - {_pdf_today()} - Confidencial", align="C")

    return bytes(pdf.output())
