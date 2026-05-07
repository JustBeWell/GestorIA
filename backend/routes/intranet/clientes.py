from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from psycopg2 import Error as PsycopgError

from models import ClienteCreate, ClienteDetailItem, ClientesTabResponse, ClienteUpdate
from services.auth_service import get_current_user
from services.auditoria_service import registrar_evento
from services.clientes_service import ClientesService

router = APIRouter(tags=["clientes"])


@router.get("/clientes", response_model=ClientesTabResponse)
def intranet_clientes(
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
def intranet_cliente_detail(
    cliente_id: str,
    current_user=Depends(get_current_user),
):
    data = ClientesService.get_cliente_detail(cliente_id)
    if not data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return data


@router.post("/clientes", response_model=ClienteDetailItem, status_code=status.HTTP_201_CREATED)
def intranet_clientes_create(
    payload: ClienteCreate,
    current_user=Depends(get_current_user),
):
    try:
        result = ClientesService.create_cliente(payload)
    except PsycopgError as exc:
        detail = exc.pgerror or str(exc)
        if "uq_clientes_cif_nif" in detail:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con ese CIF/NIF") from exc
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {detail}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="cliente",
        entidad_id=result["cliente_id"],
        accion="crear",
        detalle={"nombre_fiscal": result["nombre_fiscal"], "cif_nif": result["cif_nif"]},
    )
    return result


@router.put("/clientes/{cliente_id}", response_model=ClienteDetailItem)
def intranet_clientes_update(
    cliente_id: str,
    payload: ClienteUpdate,
    current_user=Depends(get_current_user),
):
    try:
        data = ClientesService.update_cliente(cliente_id, payload)
    except PsycopgError as exc:
        detail = exc.pgerror or str(exc)
        if "uq_clientes_cif_nif" in detail:
            raise HTTPException(status_code=409, detail="Ya existe un cliente con ese CIF/NIF") from exc
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {detail}") from exc
    if not data:
        raise HTTPException(status_code=404, detail="Cliente no encontrado o inactivo")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="cliente",
        entidad_id=cliente_id,
        accion="editar",
        detalle={k: v for k, v in payload.model_dump(exclude_none=True).items()},
    )
    return data


@router.delete("/clientes/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def intranet_clientes_delete(
    cliente_id: str,
    current_user=Depends(get_current_user),
):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Solo los administradores pueden eliminar clientes")
    deleted = ClientesService.delete_cliente(cliente_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="cliente",
        entidad_id=cliente_id,
        accion="eliminar",
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
