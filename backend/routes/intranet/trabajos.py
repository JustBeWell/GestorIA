from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from psycopg2 import Error as PsycopgError

from models import (
    TrabajoComentarioCreate,
    TrabajoComentarioItem,
    TrabajoCreate,
    TrabajoDetailItem,
    TrabajoEmpleadoRequest,
    TrabajosTabResponse,
    TrabajoUpdate,
)
from services.auth_service import get_current_user
from services.auditoria_service import registrar_evento
from services.trabajos_service import TrabajosService

router = APIRouter(tags=["trabajos"])


@router.get("/trabajos", response_model=TrabajosTabResponse)
def intranet_trabajos(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=500),
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


@router.post("/trabajos", response_model=TrabajoDetailItem, status_code=status.HTTP_201_CREATED)
def intranet_trabajos_create(
    payload: TrabajoCreate,
    current_user=Depends(get_current_user),
):
    try:
        result = TrabajosService.create_trabajo(payload, current_user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="trabajo",
        entidad_id=result["trabajo_id"],
        accion="crear",
        detalle={"titulo": result["titulo"], "cliente_id": result["cliente_id"]},
    )
    return result


@router.get("/trabajos/{trabajo_id}", response_model=TrabajoDetailItem)
def intranet_trabajo_detail(
    trabajo_id: str,
    current_user=Depends(get_current_user),
):
    result = TrabajosService.get_trabajo_detail(trabajo_id)
    if not result:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    return result


@router.put("/trabajos/{trabajo_id}", response_model=TrabajoDetailItem)
def intranet_trabajos_update(
    trabajo_id: str,
    payload: TrabajoUpdate,
    current_user=Depends(get_current_user),
):
    result = TrabajosService.update_trabajo(trabajo_id, payload)
    if not result:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="trabajo",
        entidad_id=trabajo_id,
        accion="editar",
        detalle={k: v for k, v in payload.model_dump(exclude_none=True).items()},
    )
    return result


@router.delete("/trabajos/{trabajo_id}", status_code=status.HTTP_204_NO_CONTENT)
def intranet_trabajos_delete(
    trabajo_id: str,
    current_user=Depends(get_current_user),
):
    is_admin = current_user.role == "administrador"
    deleted = TrabajosService.delete_trabajo(trabajo_id, is_admin=is_admin)
    if not deleted:
        raise HTTPException(status_code=404, detail="Trabajo no encontrado o ya cancelado")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="trabajo",
        entidad_id=trabajo_id,
        accion="eliminar",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/trabajos/{trabajo_id}/empleados")
def intranet_trabajos_empleados(
    trabajo_id: str,
    current_user=Depends(get_current_user),
):
    result = TrabajosService.get_empleados_asignados(trabajo_id)
    return {"empleados": result}


@router.post("/trabajos/{trabajo_id}/empleados", status_code=status.HTTP_201_CREATED)
def intranet_trabajos_asignar_empleado(
    trabajo_id: str,
    payload: TrabajoEmpleadoRequest,
    current_user=Depends(get_current_user),
):
    try:
        result = TrabajosService.assign_empleado(trabajo_id, payload.empleado_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PsycopgError as exc:
        detail = exc.pgerror or str(exc)
        if "uq_te_trabajo_empleado_activo" in detail:
            raise HTTPException(status_code=409, detail="El empleado ya está asignado a este trabajo") from exc
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {detail}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="trabajo",
        entidad_id=trabajo_id,
        accion="editar",
        detalle={"accion": "asignar_empleado", "empleado_id": payload.empleado_id},
    )
    return {"empleados": result}


@router.delete("/trabajos/{trabajo_id}/empleados/{empleado_id}", status_code=status.HTTP_204_NO_CONTENT)
def intranet_trabajos_desasignar_empleado(
    trabajo_id: str,
    empleado_id: str,
    current_user=Depends(get_current_user),
):
    removed = TrabajosService.unassign_empleado(trabajo_id, empleado_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="trabajo",
        entidad_id=trabajo_id,
        accion="editar",
        detalle={"accion": "desasignar_empleado", "empleado_id": empleado_id},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/trabajos/{trabajo_id}/comentarios", response_model=list[TrabajoComentarioItem])
def intranet_trabajos_comentarios(
    trabajo_id: str,
    current_user=Depends(get_current_user),
):
    return TrabajosService.get_comentarios(trabajo_id)


@router.post("/trabajos/{trabajo_id}/comentarios", response_model=TrabajoComentarioItem, status_code=status.HTTP_201_CREATED)
def intranet_trabajos_add_comentario(
    trabajo_id: str,
    payload: TrabajoComentarioCreate,
    current_user=Depends(get_current_user),
):
    try:
        result = TrabajosService.add_comentario(trabajo_id, current_user.user_id, payload.texto)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return result
