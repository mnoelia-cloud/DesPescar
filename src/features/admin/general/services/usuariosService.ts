import { api } from '@/config/api';

export type RolUsuario = 'SUPER_ADMIN' | 'AIRLINE_ADMIN' | 'HOTEL_ADMIN' | 'USER';

export interface UsuarioPlataforma {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  /** Rol principal que devuelve identity-service. */
  role: RolUsuario | string;
}

export interface NuevaCuenta {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Exclude<RolUsuario, 'USER'>;
}

export const listarUsuarios = async (): Promise<UsuarioPlataforma[]> => {
  const { data } = await api.get<UsuarioPlataforma[]>('/api/users');
  return data;
};

/**
 * Crea la cuenta (el registro siempre la deja como USER) y le asigna el rol pedido. Si el rol falla,
 * la cuenta ya existe: el error lo dice para que no se intente crear de nuevo con el mismo correo.
 */
export const crearCuenta = async ({ role, ...datos }: NuevaCuenta): Promise<UsuarioPlataforma> => {
  const { data: creado } = await api.post<UsuarioPlataforma>('/api/auth/register', datos);
  try {
    const { data } = await api.post<UsuarioPlataforma>(`/api/users/${creado.id}/roles`, {
      roleName: role,
    });
    return data;
  } catch (error) {
    throw Object.assign(
      new Error(
        `La cuenta ${datos.email} se creó pero no se le pudo asignar el rol. Asignalo desde la lista.`,
      ),
      { cause: error },
    );
  }
};

export const asignarRol = async (id: number, role: RolUsuario): Promise<UsuarioPlataforma> => {
  const { data } = await api.post<UsuarioPlataforma>(`/api/users/${id}/roles`, { roleName: role });
  return data;
};
