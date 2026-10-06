import { getHomeForRole } from '@/features/admin/roles';

export interface UserMenuItem {
  to: string;
  label: string;
  icon: string;
}

export const userMenuItems: UserMenuItem[] = [
  { to: '/my-reservations', label: 'Mis reservas', icon: 'confirmation_number' },
  { to: '/my-data', label: 'Mis datos', icon: 'person' },
  { to: '/settings', label: 'Ajustes', icon: 'settings' },
];

/** Opciones del menú de cuenta según el rol: el cliente ve su perfil, los admins su panel. */
export const userMenuItemsFor = (role: string): UserMenuItem[] =>
  role === 'USER'
    ? userMenuItems
    : [{ to: getHomeForRole(role), label: 'Panel de administración', icon: 'dashboard' }];
