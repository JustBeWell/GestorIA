from datetime import date

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from psycopg2 import Error as PsycopgError

from models import (
    ClientesTabResponse,
    FichajeRegistroRequest,
    FichajeRegistroResponse,
    FichajeUndoResponse,
    FichajeTabResponse,
    PagosTabResponse,
    PortalIntranetHomeResponse,
    QuarterSeriesResponse,
    TrabajosTabResponse,
)
from services.auth_service import get_current_user
from services.intranet_service import IntranetService

router = APIRouter(prefix="/intranet", tags=["intranet"])


@router.get("/home", response_model=PortalIntranetHomeResponse)
async def intranet_home(current_user=Depends(get_current_user)):
    data = IntranetService.get_home(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/fichaje", response_model=QuarterSeriesResponse)
async def intranet_series_fichaje(current_user=Depends(get_current_user)):
    data = IntranetService.get_fichaje_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/clientes", response_model=QuarterSeriesResponse)
async def intranet_series_clientes(current_user=Depends(get_current_user)):
    data = IntranetService.get_clientes_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/trabajos", response_model=QuarterSeriesResponse)
async def intranet_series_trabajos(current_user=Depends(get_current_user)):
    data = IntranetService.get_trabajos_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/pagos", response_model=QuarterSeriesResponse)
async def intranet_series_pagos(current_user=Depends(get_current_user)):
    data = IntranetService.get_pagos_quarter_series(current_user.user_id)
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
    data = IntranetService.get_fichaje_tab_filtered(
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
        data = IntranetService.create_fichaje_event(
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
        data = IntranetService.delete_last_fichaje(current_user.user_id)
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
    data = IntranetService.get_fichaje_export(
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


@router.get("/clientes", response_model=ClientesTabResponse)
async def intranet_clientes(current_user=Depends(get_current_user)):
    data = IntranetService.get_clientes_tab(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


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
    data = IntranetService.get_trabajos_tab_filtered(
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
    data = IntranetService.get_pagos_tab_filtered(
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
