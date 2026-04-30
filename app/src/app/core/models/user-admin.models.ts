export interface UserCreatePayload {
  nombre_usuario: string; // email
  password: string;
  rol: 'administrador' | 'empleado';
  nombre: string;
  apellidos: string;
  nif: string;
  telefono?: string;
}

export interface UserAdminUpdatePayload {
  rol?: 'administrador' | 'empleado';
  activo?: boolean;
  mfa_habilitado?: boolean;
}
