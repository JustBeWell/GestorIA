export interface EmpleadoModel {

  id: string;
  usuario_id: string;
  email: string;
  nombre: string;
  apellidos: string;
  nif: string;
  telefono: string | null;
  rol: string;
  activo: boolean;
  fecha_alta: string;
  fecha_baja: string | null;
  created_at: string;
  updated_at: string;

}

export interface EmpleadoEditRequest {

  nombre_usuario: string;
  activo: boolean;
  rol: string;

}
