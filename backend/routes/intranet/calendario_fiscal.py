from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from models import CalendarioFiscalResponse
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
        return CalendarioFiscalService.get_month(year=year, month=month)
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
