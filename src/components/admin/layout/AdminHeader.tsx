import { UserMenu } from '@/components/layout/UserMenu';
import { useAuthStore } from '@/store/useAuthStore';

interface AdminHeaderProps {
  /** Si no se pasa, se deduce del rol del usuario logueado. */
  userRole?: string;
  /** Abre el menú lateral (drawer) en pantallas chicas. */
  onMenuClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administrador general',
  AIRLINE_ADMIN: 'Administrador de aerolínea',
  HOTEL_ADMIN: 'Administrador de hotel',
};

export const AdminHeader = ({ userRole, onMenuClick }: AdminHeaderProps) => {
  const user = useAuthStore((state) => state.user);
  const displayRole = userRole ?? (user ? (ROLE_LABELS[user.role] ?? user.role) : '');

  return (
    <header className="flex w-full items-center justify-between gap-5 border-b border-black/10 bg-white px-4 py-4 sm:px-6 lg:justify-end lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="hover:text-secondary cursor-pointer text-[#44474E] lg:hidden"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
      <div className="flex items-center gap-5">
        <button type="button" className="hover:text-secondary cursor-pointer text-[#44474E]">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <span className="hidden text-[11px] text-[#44474E] sm:inline">{displayRole}</span>
        <UserMenu />
      </div>
    </header>
  );
};
