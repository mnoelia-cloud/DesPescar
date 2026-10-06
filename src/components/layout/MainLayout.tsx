import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Footer } from './Footer';
import { Nav } from './Nav';
import KoiChat from '@/features/koi/pages/KoiChat';

export const MainLayout = () => {
  // Cada página nueva arranca arriba: antes el login o el registro quedaban scrolleados
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Nav />
      <main className="flex w-full flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
      <KoiChat></KoiChat>
    </div>
  );
};
