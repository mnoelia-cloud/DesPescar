import { useState } from 'react';
import { Outlet } from 'react-router';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import type { AdminNavItem } from '../admin.types';

interface AdminLayoutProps {
  /** Menú lateral del panel (general, aerolínea u hotel). */
  navItems: AdminNavItem[];
  sidebarSubtitle?: string;
  /** Sobrescribe el rol del header (por defecto sale del usuario logueado). */
  userRole?: string;
}

/**
 * Layout raíz de cualquier panel de administrador. Es el mismo para los tres
 * (general, aerolínea, hotel): cada uno solo le pasa su menú.
 */
export const AdminLayout = ({
  navItems,
  sidebarSubtitle,
  userRole,
}: AdminLayoutProps) => {
  // En pantallas chicas el menú lateral es un drawer que se abre desde el header.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F7F8FA]">
      <AdminSidebar
        items={navItems}
        subtitle={sidebarSubtitle}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        <AdminHeader
          userRole={userRole}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
