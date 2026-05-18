from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from models import (
    CalendarioFiscalEstadoUpdate,
    CalendarioFiscalResponse,
    CalendarioFiscalVencimientoCreate,
    CalendarioFiscalVencimientoItem,
    CalendarioFiscalVencimientoUpdate,
)
from services.auth_service import get_current_user
from services.calendario_fiscal_service import CalendarioFiscalService

router = APIRouter(tags=["calendario-fiscal"])


@router.get("/calendario-fiscal", response_model=CalendarioFiscalResponse)
def intranet_calendario_fiscal(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user=Depends(get_current_user),
):
    try:
        return CalendarioFiscalService.get_month(year=year, month=month, user_id=current_user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/calendario-fiscal/export/ics")
def intranet_calendario_fiscal_export_ics(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user=Depends(get_current_user),
):
    target = date.today()
    export_year = year or target.year
    export_month = month or target.month
    content = CalendarioFiscalService.get_ics(year=export_year, month=export_month)
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="calendario-fiscal-{export_year}-{export_month:02d}.ics"',
        },
    )


@router.post("/calendario-fiscal", response_model=CalendarioFiscalVencimientoItem, status_code=201)
def intranet_calendario_fiscal_create(
    payload: CalendarioFiscalVencimientoCreate,
    current_user=Depends(get_current_user),
):
    return CalendarioFiscalService.create_vencimiento(payload)


@router.put("/calendario-fiscal/{vencimiento_id}", response_model=CalendarioFiscalVencimientoItem)
def intranet_calendario_fiscal_update(
    vencimiento_id: str,
    payload: CalendarioFiscalVencimientoUpdate,
    current_user=Depends(get_current_user),
):
    result = CalendarioFiscalService.update_vencimiento(vencimiento_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    return result


@router.delete("/calendario-fiscal/{vencimiento_id}", status_code=204)
def intranet_calendario_fiscal_delete(
    vencimiento_id: str,
    current_user=Depends(get_current_user),
):
    deleted = CalendarioFiscalService.delete_vencimiento(vencimiento_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    return Response(status_code=204)


@router.patch("/calendario-fiscal/{vencimiento_id}/estado", response_model=CalendarioFiscalVencimientoItem)
def intranet_calendario_fiscal_update_estado(
    vencimiento_id: str,
    payload: CalendarioFiscalEstadoUpdate,
    current_user=Depends(get_current_user),
):
    result = CalendarioFiscalService.update_estado(vencimiento_id, payload.estado)
    if not result:
        raise HTTPException(status_code=404, detail="Vencimiento no encontrado")
    return result
