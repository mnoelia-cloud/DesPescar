import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { logoutSession } from '@/features/auth/logout';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { useAuthStore } from '@/store/useAuthStore';
import { userMenuItemsFor } from './userMenuItems';

const itemClass =
  'text-neutral hover:bg-neutral/10 hover:text-secondary flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold transition-colors';

const controlClass =
  'focus-visible:outline-secondary hover:bg-neutral/10 flex max-w-60 shrink-0 cursor-pointer items-center gap-2 rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:pr-3';

const nombreClass = 'text-secondary hidden truncate text-sm font-bold md:inline';

/**
 * Control de cuenta del header: la misma burbuja con iniciales en todas las vistas.
 * Con sesión abre el menú de perfil; sin sesión lleva a iniciar sesión (o a registrarse
 * cuando ya se está en el login).
 */
export const UserMenu = () => {
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      botonRef.current?.focus();
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    const alRegistro = pathname === '/login';
    const destino = alRegistro ? '/register' : '/login';
    const label = alRegistro ? 'Registrarse' : 'Iniciar sesión';
    return (
      <Link to={destino} aria-label={label} className={controlClass}>
        <span
          aria-hidden="true"
          className="bg-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
        >
          <span className="material-symbols-outlined">person</span>
        </span>
        <span className={nombreClass}>{label}</span>
      </Link>
    );
  }

  const iniciales =
    `${profile.nombre.trim()[0] ?? ''}${profile.apellido.trim()[0] ?? ''}`.toUpperCase();
  const nombreCompleto = `${profile.nombre} ${profile.apellido}`.trim();
  const items = userMenuItemsFor(user.role);

  const cerrarSesion = () => {
    setOpen(false);
    logoutSession();
    navigate('/');
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={botonRef}
        type="button"
        className={controlClass}
        aria-label={`Menú de ${nombreCompleto || 'tu cuenta'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ProfileAvatar foto={profile.foto} iniciales={iniciales} className="h-10 w-10 text-sm" />
        <span className={nombreClass}>{nombreCompleto}</span>
        <span aria-hidden="true" className="hidden md:inline">
          <span className="material-symbols-outlined text-secondary text-[18px]!">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white py-2 shadow-lg"
        >
          {items.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <span className="material-symbols-outlined text-[18px]!">{icon}</span>
              {label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} mt-1 border-t border-black/10 pt-3`}
            onClick={cerrarSesion}
          >
            <span className="material-symbols-outlined text-[18px]!">logout</span>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};
