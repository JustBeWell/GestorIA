from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2 import Error as PsycopgError

from models import (
    ChangePasswordRequest,
    EmpresaConfigResponse,
    EmpresaConfigUpdateRequest,
    UserAdminUpdateRequest,
    UserCreateRequest,
    UserMfaUpdateRequest,
    UserUpdateRequest,
)
from services.auth_service import get_current_user
from services.auditoria_service import registrar_evento
from services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(get_current_user)])


@router.get("/")
def list_users(_current_user=Depends(get_current_user)):
    return UserService.list_users()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateRequest, current_user=Depends(get_current_user)):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    try:
        result = UserService.create(payload)
    except PsycopgError as exc:
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {exc.pgerror or str(exc)}") from exc
    registrar_evento(
        actor_id=current_user.user_id,
        actor_nombre=current_user.nombre_usuario,
        entidad="empleado",
        entidad_id=result.get("usuario_id", ""),
        accion="crear",
        detalle={"nombre_usuario": payload.nombre_usuario, "rol": payload.rol},
    )
    return result


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    user = UserService.get(current_user.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/me")
def update_me(payload: UserUpdateRequest, current_user=Depends(get_current_user)):
    updated = UserService.update_self(current_user.user_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: ChangePasswordRequest, current_user=Depends(get_current_user)):
    try:
        changed = UserService.change_password(current_user.user_id, payload.current_password, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not changed:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")


@router.patch("/me/mfa")
def update_my_mfa(payload: UserMfaUpdateRequest, current_user=Depends(get_current_user)):
    updated = UserService.update_mfa(current_user.user_id, payload.mfa_habilitado)
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated


@router.delete("/me")
def delete_me(current_user=Depends(get_current_user)):
    return {"deleted": UserService.delete(current_user.user_id)}


@router.get("/company-config", response_model=EmpresaConfigResponse)
def get_company_config(_current_user=Depends(get_current_user)):
    return UserService.get_company_config()


@router.put("/company-config", response_model=EmpresaConfigResponse)
def update_company_config(payload: EmpresaConfigUpdateRequest, current_user=Depends(get_current_user)):
    if current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    return UserService.update_company_config(payload)


@router.get("/{user_id}")
def get_user_by_id(user_id: str, _current_user=Depends(get_current_user)):
    user = UserService.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/{user_id}/exists")
def user_exists(user_id: str):
    return {"exists": UserService.exists(user_id)}


@router.put("/{user_id}/admin")
def admin_update_user(user_id: str, payload: UserAdminUpdateRequest, _current_user=Depends(get_current_user)):
    if _current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    if not UserService.is_valid_user_id(user_id):
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
    updated = UserService.admin_update(user_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    registrar_evento(
        actor_id=_current_user.user_id,
        actor_nombre=_current_user.nombre_usuario,
        entidad="empleado",
        entidad_id=user_id,
        accion="editar",
        detalle={k: v for k, v in payload.model_dump(exclude_none=True).items()},
    )
    return updated


@router.delete("/{user_id}")
def admin_delete_user(user_id: str, _current_user=Depends(get_current_user)):
    if _current_user.role != "administrador":
        raise HTTPException(status_code=403, detail="Se requiere rol administrador")
    deleted = UserService.delete(user_id)
    registrar_evento(
        actor_id=_current_user.user_id,
        actor_nombre=_current_user.nombre_usuario,
        entidad="empleado",
        entidad_id=user_id,
        accion="eliminar",
    )
    return {"deleted": deleted}
