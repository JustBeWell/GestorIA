from fastapi import APIRouter, Depends, HTTPException

from models import PortalIntranetHomeResponse, QuarterSeriesResponse
from services.auth_service import get_current_user
from services.home_service import HomeService
from services.series_service import SeriesService

router = APIRouter(tags=["home"])


@router.get("/home", response_model=PortalIntranetHomeResponse)
def intranet_home(current_user=Depends(get_current_user)):
    data = HomeService.get_home(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/fichaje", response_model=QuarterSeriesResponse)
def intranet_series_fichaje(current_user=Depends(get_current_user)):
    data = SeriesService.get_fichaje_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/clientes", response_model=QuarterSeriesResponse)
def intranet_series_clientes(current_user=Depends(get_current_user)):
    data = SeriesService.get_clientes_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/trabajos", response_model=QuarterSeriesResponse)
def intranet_series_trabajos(current_user=Depends(get_current_user)):
    data = SeriesService.get_trabajos_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/series/pagos", response_model=QuarterSeriesResponse)
def intranet_series_pagos(current_user=Depends(get_current_user)):
    data = SeriesService.get_pagos_quarter_series(current_user.user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data
