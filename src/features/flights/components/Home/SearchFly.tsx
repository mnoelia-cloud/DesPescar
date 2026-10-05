import { Link } from 'react-router';
import { Search } from '@/components/ui/Search';
import { SectionContainer } from '@/components/ui/SectionContainer';

export const SearchFly = () => {
  return (
    <div className="flex min-h-150 w-full items-center justify-center gap-12 bg-[url(/bgSearch.webp)] bg-cover bg-center bg-no-repeat md:min-h-200">
      <SectionContainer className="gap-10">
        <div className="w-max-180 flex w-full flex-col gap-6 text-center text-white">
          <h1 className="text-2xl font-extrabold sm:text-4xl md:text-6xl">
            Viajar bien empieza con una buena elección.
          </h1>
          <h3 className="text-sm font-semibold md:text-2xl">
            "No colecciones cosas, coleccioná viajes y momentos inolvidables"
          </h3>
        </div>
        <div className="flex w-full flex-col gap-4">
          <Search moodle={false} />
          <p className="text-center text-sm text-white/90 drop-shadow">
            ¿Buscás alojamiento?{' '}
            <Link
              to="/hoteles"
              className="font-semibold underline underline-offset-4 hover:text-white"
            >
              Ver hoteles <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </SectionContainer>
    </div>
  );
};
