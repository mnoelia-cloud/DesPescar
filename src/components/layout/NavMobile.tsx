import { Link, useNavigate } from 'react-router';
import { logoutSession } from '@/features/auth/logout';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '../ui/Button';
import { userMenuItems } from './userMenuItems';

interface NavMobile {
  open: boolean;
}

export const NavMobile = ({ open }: NavMobile) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const cerrarSesion = () => {
    logoutSession();
    navigate('/');
  };

  return (
    <>
      {open && (
        <div className="flex flex-col md:hidden">
          <ul className="flex w-full flex-col justify-between border-t text-center">
            <li className="hover:bg-secondary border-b p-1 underline-offset-4 hover:cursor-pointer hover:font-bold hover:text-white">
              <Link to="/" className="block">
                VUELOS
              </Link>
            </li>
            <li className="hover:bg-secondary border-b p-1 underline-offset-4 hover:cursor-pointer hover:font-bold hover:text-white">
              <Link to="/hoteles" className="block">
                HOTELES
              </Link>
            </li>
            <li className="hover:bg-secondary p-1 underline-offset-4 hover:cursor-pointer hover:font-bold hover:text-white">
              OFERTAS
            </li>
          </ul>
          {user ? (
            <ul className="flex w-full flex-col border-t text-center">
              {userMenuItems.map(({ to, label }) => (
                <li key={to} className="hover:bg-secondary border-b hover:text-white">
                  <Link to={to} className="block p-1">
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Button
                  variant="primary"
                  className="flex w-full justify-center rounded-none text-[14px] md:hidden"
                  onClick={cerrarSesion}
                >
                  CERRAR SESIÓN
                </Button>
              </li>
            </ul>
          ) : (
            <Link to={'/login'}>
              <Button
                variant="primary"
                className="flex w-full justify-center rounded-none text-[14px] md:hidden"
              >
                INICIAR SESIÓN
              </Button>
            </Link>
          )}
        </div>
      )}
    </>
  );
};
