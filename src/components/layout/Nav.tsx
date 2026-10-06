import { Link, useLocation } from 'react-router';
import { Button } from '../ui/Button';
import { CartButton } from './CartButton';
import { useNav } from './hooks/useNav';
import { Marca } from './Marca';
import { NavMobile } from './NavMobile';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/store/useAuthStore';

export const Nav = () => {
  const { isOpen, toggleMenu } = useNav();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const getButtonConfig = () => {
    if (location.pathname === '/register') {
      return {
        label: 'INICIAR SESIÓN',
        path: '/login',
      };
    }

    if (location.pathname === '/login') {
      return {
        label: 'REGISTRARSE',
        path: '/register',
      };
    }

    return { label: 'INICIAR SESIÓN', path: '/login' };
  };

  const { label, path } = getButtonConfig();

  return (
    <>
      <header className="sticky top-0 left-0 z-400 w-full border-b border-black/20 bg-white">
        <nav className="flex w-full flex-row items-center justify-between gap-3 p-4 pr-8 pl-8 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Link to="/" aria-label="Despescar, inicio" className="md:justify-self-start">
            <Marca />
          </Link>
          <ul className="hidden flex-row gap-6 md:flex lg:gap-12">
            <li className="hover:text-primary min-w-20 text-center underline-offset-4 hover:cursor-pointer hover:font-bold hover:underline">
              <Link to="/" className="block">
                VUELOS
              </Link>
            </li>
            <li className="hover:text-primary min-w-20 text-center underline-offset-4 hover:cursor-pointer hover:font-bold hover:underline">
              <Link to="/hoteles" className="block">
                HOTELES
              </Link>
            </li>
          </ul>
          <div className="flex items-center gap-2 md:gap-4 md:justify-self-end">
            {user?.role === 'USER' && <CartButton />}
            {user ? (
              <UserMenu />
            ) : (
              <Link to={path}>
                <Button
                  variant="secondary"
                  className="hidden w-40 justify-center text-[14px] md:flex"
                >
                  {label}
                </Button>
              </Link>
            )}
            <button
              type="button"
              className="flex h-11 w-11 cursor-pointer items-center justify-center md:hidden"
              onClick={toggleMenu}
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isOpen}
            >
              <span className="material-symbols-outlined">{isOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </nav>
      </header>

      <NavMobile open={isOpen} />
    </>
  );
};
