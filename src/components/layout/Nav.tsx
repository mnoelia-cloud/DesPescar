import { Link } from 'react-router';
import { CartButton } from './CartButton';
import { useNav } from './hooks/useNav';
import { Marca } from './Marca';
import { NavMobile } from './NavMobile';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/store/useAuthStore';

export const Nav = () => {
  const { isOpen, toggleMenu } = useNav();
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <header className="sticky top-0 left-0 z-400 w-full border-b border-black/20 bg-white">
        <nav className="flex w-full flex-row items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Link
            to="/"
            aria-label="Despescar, inicio"
            className="min-w-0 shrink md:justify-self-start"
          >
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
          <div className="flex shrink-0 items-center gap-1 md:gap-4 md:justify-self-end">
            {user?.role === 'USER' && <CartButton />}
            <UserMenu />
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
