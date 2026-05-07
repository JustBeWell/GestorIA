import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from psycopg2 import Error as PsycopgError

from models import (
    DeudaVivaPorClienteItem,
    FacturaCreate,
    FacturaDetailItem,
    FacturaUpdate,
    PagoCreate,
    PagoDetailItem,
    PagosTabResponse,
)
from services.auth_service import get_current_user
from services.auditoria_service import registrar_evento
from services.pagos_service import PagosService

router = APIRouter(tags=["pagos"])


@router.get("/pagos", response_model=PagosTabResponse)
def intranet_pagos(
    page_facturas: int = Query(default=1, ge=1),
    page_size_facturas: int = Query(default=20, ge=1, le=500),
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
        is_admin=current_user.role == "administrador",
    )
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return data


@router.get("/deuda", response_model=list[DeudaVivaPorClienteItem])
def intranet_deuda_viva(current_user=Depends(get_current_user)):
    is_admin = current_user.role == "administrador"
    return PagosService.get_deuda_viva(current_user.user_id, is_admin)


@router.get("/facturas/export/csv")
def intranet_facturas_export_csv(
    estado_factura: str | None = Query(default=None),
    cliente_id: str | None = Query(default=None),
    vencidas_solo: bool = Query(default=False),
    current_user=Depends(get_current_user),
):
    is_admin = current_user.role == "administrador"
    facturas = PagosService.get_facturas_for_export(
        user_id=current_user.user_id,
        estado_factura=estado_factura,
        cliente_id=cliente_id,
        vencidas_solo=vencidas_solo,
        is_admin=is_admin,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Numero", "Cliente", "Estado", "Fecha emision", "Fecha vencimiento", "Total", "Pagado", "Pendiente"])
    for f in facturas:
        writer.writerow([
            f.get("numero", ""),
            f.get("cliente_nombre", ""),
            f.get("estado", ""),
            f.get("fecha_emision", ""),
            f.get("fecha_vencimiento", ""),
            f.get("total", ""),
            f.get("pagado", ""),
            f.get("pendiente", ""),
        ])
    csv_bytes = buf.getvalue().encode("utf-8-sig")
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=\"facturas.csv\""},
    )


@router.post("/facturas", response_model=FacturaDetailItem, status_code=status.HTTP_201_CREATED)
def intranet_facturas_create(
    payload: FacturaCreate,
    current_user=Depends(get_current_user),
):
    try:
        result = PagosService.create_factura(payload, current_user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="factura",
        entidad_id=result["factura_id"],
        accion="crear",
        detalle={"numero": result["numero"], "cliente_id": result["cliente_id"], "total": result["total"]},
    )
    return result


@router.get("/facturas/{factura_id}", response_model=FacturaDetailItem)
def intranet_facturas_detail(
    factura_id: str,
    current_user=Depends(get_current_user),
):
    result = PagosService.get_factura_detail(factura_id)
    if not result:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return result


@router.put("/facturas/{factura_id}", response_model=FacturaDetailItem)
def intranet_facturas_update(
    factura_id: str,
    payload: FacturaUpdate,
    current_user=Depends(get_current_user),
):
    try:
        result = PagosService.update_factura(factura_id, payload)
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
    if not result:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="factura",
        entidad_id=factura_id,
        accion="editar",
        detalle={k: v for k, v in payload.model_dump(exclude_none=True).items()},
    )
    return result


@router.delete("/facturas/{factura_id}", status_code=status.HTTP_204_NO_CONTENT)
def intranet_facturas_delete(
    factura_id: str,
    current_user=Depends(get_current_user),
):
    is_admin = current_user.role == "administrador"
    try:
        deleted = PagosService.delete_factura(factura_id, is_admin=is_admin)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Factura no encontrada o ya anulada")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="factura",
        entidad_id=factura_id,
        accion="eliminar",
        detalle={"accion": "anulada"},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/facturas/{factura_id}/pagos", response_model=PagoDetailItem, status_code=status.HTTP_201_CREATED)
def intranet_facturas_pago(
    factura_id: str,
    payload: PagoCreate,
    current_user=Depends(get_current_user),
):
    try:
        result = PagosService.create_pago(factura_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PsycopgError as exc:
        detail = exc.pgerror or str(exc)
        if "sobrepago" in detail.lower() or "excede" in detail.lower():
            raise HTTPException(status_code=409, detail="El importe supera el pendiente de la factura") from exc
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {detail}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="pago",
        entidad_id=result["pago_id"],
        accion="crear",
        detalle={"factura_id": factura_id, "importe": result["importe"], "metodo_pago": result["metodo_pago"]},
    )
    return result
