from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fpdf import FPDF
from psycopg2 import Error as PsycopgError

from models import (
    AdminChartsResponse,
    AdminCorreccionRequest,
    AdminCorreccionResponse,
    AdminFichajesResponse,
    AdminIaUsageResponse,
    AdminResumenResponse,
    AuditoriaResponse,
)
from services.admin_service import AdminService
from services.auth_service import get_current_user
from services.auditoria_service import registrar_evento

router = APIRouter(tags=["admin"])


@router.get("/admin/resumen", response_model=AdminResumenResponse)
def intranet_admin_resumen(current_user=Depends(get_current_user)):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_admin_resumen()


@router.get("/admin/charts", response_model=AdminChartsResponse)
def intranet_admin_charts(
    months: int = Query(default=12, ge=3, le=24),
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_admin_charts(months=months)


@router.get("/admin/ia/usage", response_model=AdminIaUsageResponse)
def intranet_admin_ia_usage(
    days: int = Query(default=30, ge=1, le=365),
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_admin_ia_usage(days=days)


@router.get("/admin/fichajes", response_model=AdminFichajesResponse)
def intranet_admin_fichajes(
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
def intranet_admin_fichajes_correccion(
    payload: AdminCorreccionRequest,
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    try:
        result = AdminService.create_correccion(
            empleado_id=payload.empleado_id,
            tipo_evento=payload.tipo_evento,
            fecha_hora=payload.fecha_hora,
            observaciones=payload.observaciones,
        )
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="fichaje",
        entidad_id=result["fichaje_id"],
        accion="correccion_fichaje",
        detalle={"empleado_id": payload.empleado_id, "tipo_evento": payload.tipo_evento, "corregido_por": current_user.nombre_usuario},
    )
    return result


@router.get("/admin/auditoria", response_model=AuditoriaResponse)
def intranet_admin_auditoria(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    entidad: str | None = Query(default=None),
    actor_id: str | None = Query(default=None),
    accion: str | None = Query(default=None),
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    return AdminService.get_auditoria(
        page=page,
        page_size=page_size,
        entidad=entidad,
        actor_id=actor_id,
        accion=accion,
        fecha_desde=fecha_desde.isoformat() if fecha_desde else None,
        fecha_hasta=fecha_hasta.isoformat() if fecha_hasta else None,
    )


@router.get("/admin/cierre/pdf")
def intranet_admin_cierre_pdf(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
    data = AdminService.get_cierre_mensual(year=year, month=month)
    pdf_bytes = _build_cierre_pdf(data, year, month)
    filename = f"cierre_{year}_{month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


# ── PDF helper ─────────────────────────────────────────────────────────────────

def _build_cierre_pdf(data: dict, year: int, month: int) -> bytes:
    MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    C_PRIMARY   = (30, 41, 59)
    C_HEADER_BG = (241, 245, 249)
    C_WHITE     = (255, 255, 255)
    C_BORDER    = (226, 232, 240)
    titulo_periodo = f"{MESES_ES[month - 1]} {year}"

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
    pdf.cell(0, 5, "Informe de cierre mensual", align="L")
    pdf.set_xy(15, 8)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 8, "CIERRE MENSUAL", align="R")
    pdf.set_xy(15, 17)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, titulo_periodo, align="R")

    pdf.set_y(34)
    pdf.set_text_color(*C_PRIMARY)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 6, f"Resumen - {titulo_periodo}", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 116, 139)
    from datetime import datetime
    from zoneinfo import ZoneInfo
    now = datetime.now(ZoneInfo("Europe/Madrid"))
    months_es = ["ene", "feb", "mar", "abr", "may", "jun",
                 "jul", "ago", "sep", "oct", "nov", "dic"]
    today_str = f"{now.day:02d} {months_es[now.month - 1]} {now.year}"
    pdf.cell(0, 4, f"Generado el {today_str}", ln=True)
    pdf.ln(4)

    resumen = data.get("resumen", {})
    kpis = [
        ("Facturado", f"{resumen.get('total_facturado', 0):,.2f} EUR"),
        ("Cobrado", f"{resumen.get('total_cobrado', 0):,.2f} EUR"),
        ("Trabajos nuevos", str(resumen.get("trabajos_nuevos", 0))),
        ("Trabajos cerrados", str(resumen.get("trabajos_cerrados", 0))),
        ("Clientes nuevos", str(resumen.get("clientes_nuevos", 0))),
        ("Horas trabajadas", f"{resumen.get('horas_trabajadas', 0):,.1f} h"),
    ]
    col_w = [90, 85]
    pdf.set_fill_color(*C_HEADER_BG)
    pdf.set_draw_color(*C_BORDER)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*C_PRIMARY)
    pdf.cell(col_w[0], 7, "Indicador", border=1, fill=True, align="C")
    pdf.cell(col_w[1], 7, "Valor", border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for label, value in kpis:
        pdf.cell(col_w[0], 6, f"  {label}", border=1)
        pdf.cell(col_w[1], 6, f"  {value}", border=1)
        pdf.ln()

    pdf.ln(6)

    facturas = data.get("facturas", [])
    if facturas:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*C_PRIMARY)
        pdf.cell(0, 6, "Facturas emitidas en el periodo", ln=True)
        pdf.ln(2)
        headers_f = ["Numero", "Cliente", "Estado", "Total EUR", "Pendiente EUR"]
        col_widths_f = [28, 65, 24, 22, 22]
        pdf.set_fill_color(*C_HEADER_BG)
        pdf.set_font("Helvetica", "B", 8)
        for h, w in zip(headers_f, col_widths_f):
            pdf.cell(w, 7, h, border=1, fill=True, align="C")
        pdf.ln()
        pdf.set_font("Helvetica", "", 7)
        for row in facturas[:30]:
            pdf.cell(col_widths_f[0], 6, str(row.get("numero", "")), border=1)
            nombre = str(row.get("cliente_nombre", ""))[:35]
            pdf.cell(col_widths_f[1], 6, nombre, border=1)
            pdf.cell(col_widths_f[2], 6, str(row.get("estado", "")), border=1, align="C")
            pdf.cell(col_widths_f[3], 6, f"{row.get('total', 0):,.2f}", border=1, align="R")
            pdf.cell(col_widths_f[4], 6, f"{row.get('pendiente', 0):,.2f}", border=1, align="R")
            pdf.ln()

    return bytes(pdf.output())
