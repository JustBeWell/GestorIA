from datetime import date

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fpdf import FPDF
from psycopg2 import Error as PsycopgError

from models import (
    AdminResumenResponse,
    AdminChartsResponse,
    AdminCorreccionRequest,
    AdminCorreccionResponse,
    AdminFichajesResponse,
    ClienteCreate,
    ClienteDetailItem,
    ClientesTabResponse,
    ClienteUpdate,
    FichajeRegistroRequest,
    FichajeRegistroResponse,
    FichajeUndoResponse,
    FichajeTabResponse,
    PagosTabResponse,
    PortalIntranetHomeResponse,
    QuarterSeriesResponse,
    TrabajosTabResponse,
)
from services.admin_service import AdminService
from services.auth_service import get_current_user
from services.clientes_service import ClientesService
from services.fichaje_service import FichajeService
from services.home_service import HomeService
from services.pagos_service import PagosService
from services.series_service import SeriesService
from services.trabajos_service import TrabajosService

router = APIRouter(prefix="/intranet", tags=["intranet"])


@router.get("/home", response_model=PortalIntranetHomeResponse)
async def intranet_home(current_user=Depends(get_current_user)):
    data = HomeService.get_home(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/fichaje", response_model=QuarterSeriesResponse)
async def intranet_series_fichaje(current_user=Depends(get_current_user)):
    data = SeriesService.get_fichaje_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/clientes", response_model=QuarterSeriesResponse)
async def intranet_series_clientes(current_user=Depends(get_current_user)):
    data = SeriesService.get_clientes_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/trabajos", response_model=QuarterSeriesResponse)
async def intranet_series_trabajos(current_user=Depends(get_current_user)):
    data = SeriesService.get_trabajos_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/pagos", response_model=QuarterSeriesResponse)
async def intranet_series_pagos(current_user=Depends(get_current_user)):
    data = SeriesService.get_pagos_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/fichaje", response_model=FichajeTabResponse)
async def intranet_fichaje(
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
async def intranet_fichaje_registrar(
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
async def intranet_fichaje_eliminar_ultimo(current_user=Depends(get_current_user)):
    try:
        data = FichajeService.delete_last_fichaje(current_user.user_id)
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc

    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/fichaje/export")
async def intranet_fichaje_export(
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
async def intranet_fichaje_export_pdf(
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


def _build_fichaje_pdf(data: dict) -> bytes:
    """Genera el PDF del registro de fichaje a partir de los datos de exportación."""
    usuario = data["usuario"]
    rows = data["rows"]
    label = data["label"]
    nombre_completo = usuario.get("nombre_completo", usuario.get("nombre_usuario", "Empleado"))

    # ── Colores corporativos ──
    C_PRIMARY   = (30,  41,  59)   # slate-800
    C_HEADER_BG = (241, 245, 249)  # slate-100
    C_WHITE     = (255, 255, 255)
    C_ALT_ROW   = (248, 250, 252)  # slate-50
    C_COMPLETA  = (21,  128, 61)   # green-700
    C_EN_CURSO  = (180, 83,  9)    # amber-700
    C_AUSENCIA  = (100, 116, 139)  # slate-500
    C_BORDER    = (226, 232, 240)  # slate-200

    pdf = FPDF()
    pdf.set_margins(left=15, top=15, right=15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ── Cabecera ──────────────────────────────────────────────────────────────
    pdf.set_fill_color(*C_PRIMARY)
    pdf.rect(x=0, y=0, w=210, h=28, style="F")

    pdf.set_y(8)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 8, "GestorIA", align="L")

    pdf.set_y(17)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)  # slate-400
    pdf.cell(0, 5, "Sistema de gestión de fichaje", align="L")

    # Título del documento a la derecha
    pdf.set_xy(15, 8)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 8, "REGISTRO DE FICHAJE", align="R")

    pdf.set_xy(15, 17)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, label, align="R")

    # ── Ficha del empleado ────────────────────────────────────────────────────
    pdf.set_y(34)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*C_PRIMARY)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 5, nombre_completo, ln=True)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 4, f"Periodo: {label}  ·  Exportado el {_pdf_today()}", ln=True)

    pdf.ln(5)

    # ── Tabla ─────────────────────────────────────────────────────────────────
    col_widths = [32, 28, 28, 24, 30]  # Día | Entrada | Salida | Horas | Estado
    headers    = ["Día", "Entrada", "Salida", "Horas", "Estado"]
    row_h = 7

    # Cabecera de tabla
    pdf.set_fill_color(*C_HEADER_BG)
    pdf.set_draw_color(*C_BORDER)
    pdf.set_text_color(*C_PRIMARY)
    pdf.set_font("Helvetica", "B", 8)
    for i, (col, w) in enumerate(zip(headers, col_widths)):
        align = "R" if col == "Horas" else "C"
        pdf.cell(w, row_h, col, border=1, align=align, fill=True)
    pdf.ln()

    # Filas de datos
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
        pdf.cell(col_widths[0], row_h, row["day_label"],    border="LRB", align="L", fill=True)
        pdf.cell(col_widths[1], row_h, row["entry_time"],   border="LRB", align="C", fill=True)
        pdf.cell(col_widths[2], row_h, row["exit_time"],    border="LRB", align="C", fill=True)
        pdf.cell(col_widths[3], row_h, row["hours_label"],  border="LRB", align="R", fill=True)

        # Celda de estado con color específico
        pdf.set_text_color(*status_color)
        pdf.cell(col_widths[4], row_h, status_label,        border="LRB", align="C", fill=True)
        pdf.set_text_color(*C_PRIMARY)
        pdf.ln()

    # ── Resumen estadístico ───────────────────────────────────────────────────
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
    pdf.cell(50, 5, f"Días completos: {total_completas}")
    pdf.cell(50, 5, f"Ausencias: {total_ausencias}")
    pdf.cell(0,  5, f"Horas acumuladas: {horas_acumuladas:.1f} h", ln=True)

    # ── Pie de página ─────────────────────────────────────────────────────────
    pdf.set_y(-12)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 4, f"Documento generado por GestorIA · {_pdf_today()} · Confidencial", align="C")

    return bytes(pdf.output())


def _pdf_today() -> str:
    from datetime import datetime, timezone
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo("Europe/Madrid"))
    months = ["ene", "feb", "mar", "abr", "may", "jun",
              "jul", "ago", "sep", "oct", "nov", "dic"]
    return f"{now.day:02d} {months[now.month - 1]} {now.year}"


@router.get("/clientes", response_model=ClientesTabResponse)
async def intranet_clientes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    is_admin = current_user.role == "administrador"
    data = ClientesService.get_clientes_tab(current_user.user_id, page, page_size, is_admin=is_admin)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/clientes/{cliente_id}", response_model=ClienteDetailItem)
async def intranet_cliente_detail(
    cliente_id: str,
    current_user=Depends(get_current_user),
):
    data = ClientesService.get_cliente_detail(cliente_id)
    if not data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return data


@router.post("/clientes", response_model=ClienteDetailItem, status_code=status.HTTP_201_CREATED)
async def intranet_clientes_create(
    payload: ClienteCreate,
    current_user=Depends(get_current_user),
):
    try:
        return ClientesService.create_cliente(payload)
    except PsycopgError as exc:
        detail = exc.pgerror or str(exc)
        if "uq_clientes_cif_nif" in detail:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con ese CIF/NIF") from exc
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {detail}") from exc


@router.put("/clientes/{cliente_id}", response_model=ClienteDetailItem)
async def intranet_clientes_update(
    cliente_id: str,
    payload: ClienteUpdate,
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    try:
        data = ClientesService.update_cliente(cliente_id, payload)
    except PsycopgError as exc:
        detail = exc.pgerror or str(exc)
        if "uq_clientes_cif_nif" in detail:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con ese CIF/NIF") from exc
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {detail}") from exc
    if not data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado o inactivo")
    return data


@router.delete("/clientes/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def intranet_clientes_delete(
    cliente_id: str,
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    deleted = ClientesService.delete_cliente(cliente_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cliente no encontrado o ya inactivo")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/trabajos", response_model=TrabajosTabResponse)
async def intranet_trabajos(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    estado: str | None = Query(default=None),
    prioridad: str | None = Query(default=None),
    cliente_id: str | None = Query(default=None),
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    data = TrabajosService.get_trabajos_tab_filtered(
        current_user.user_id,
        page=page,
        page_size=page_size,
        estado=estado,
        prioridad=prioridad,
        cliente_id=cliente_id,
        fecha_desde=fecha_desde.isoformat() if fecha_desde else None,
        fecha_hasta=fecha_hasta.isoformat() if fecha_hasta else None,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/pagos", response_model=PagosTabResponse)
async def intranet_pagos(
    page_facturas: int = Query(default=1, ge=1),
    page_size_facturas: int = Query(default=20, ge=1, le=100),
    page_pagos: int = Query(default=1, ge=1),
    page_size_pagos: int = Query(default=20, ge=1, le=100),
    estado_factura: str | None = Query(default=None),
    cliente_id: str | None = Query(default=None),
    vencidas_solo: bool = Query(default=False),
    fecha_pago_desde: date | None = Query(default=None),
    fecha_pago_hasta: date | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    data = PagosService.get_pagos_tab_filtered(
        current_user.user_id,
        page_facturas=page_facturas,
        page_size_facturas=page_size_facturas,
        page_pagos=page_pagos,
        page_size_pagos=page_size_pagos,
        estado_factura=estado_factura,
        cliente_id=cliente_id,
        vencidas_solo=vencidas_solo,
        fecha_pago_desde=fecha_pago_desde.isoformat() if fecha_pago_desde else None,
        fecha_pago_hasta=fecha_pago_hasta.isoformat() if fecha_pago_hasta else None,
    )
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/admin/resumen", response_model=AdminResumenResponse)
async def intranet_admin_resumen(current_user=Depends(get_current_user)):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_admin_resumen()


@router.get("/admin/charts", response_model=AdminChartsResponse)
async def intranet_admin_charts(
    months: int = Query(default=12, ge=3, le=24),
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_admin_charts(months=months)


@router.get("/admin/fichajes", response_model=AdminFichajesResponse)
async def intranet_admin_fichajes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
    empleado_id: str | None = Query(default=None),
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    tipo_evento: str | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_admin_fichajes(
        page=page,
        page_size=page_size,
        empleado_id=empleado_id,
        fecha_desde=fecha_desde.isoformat() if fecha_desde else None,
        fecha_hasta=fecha_hasta.isoformat() if fecha_hasta else None,
        tipo_evento=tipo_evento,
    )


@router.post("/admin/fichajes/correccion", response_model=AdminCorreccionResponse, status_code=status.HTTP_201_CREATED)
async def intranet_admin_fichajes_correccion(
    payload: AdminCorreccionRequest,
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    try:
        return AdminService.create_correccion(
            empleado_id=payload.empleado_id,
            tipo_evento=payload.tipo_evento,
            fecha_hora=payload.fecha_hora,
            observaciones=payload.observaciones,
        )
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
