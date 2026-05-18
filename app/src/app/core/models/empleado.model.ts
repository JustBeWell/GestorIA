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
  mfa_habilitado?: boolean;
  fecha_alta: string;
  fecha_baja: string | null;
  created_at: string;
  updated_at: string;

}

export interface EmpresaConfig {

  nombre_fiscal: string;
  cif_nif: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  web: string | null;
  updated_at: string | null;

}

export interface EmpleadoEditRequest {

  nombre_usuario: string;
  activo: boolean;
  rol: string;

}
