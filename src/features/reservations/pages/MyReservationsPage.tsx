import { useSearchParams } from 'react-router';
import {
  ReservationTabs,
  type ReservationTab,
} from '@/features/reservations/components/ReservationTabs';
import { ReservasTab } from '@/features/reservations/components/ReservasTab';
import {
  TipoReservaTabs,
  type TipoReserva,
} from '@/features/reservations/components/TipoReservaTabs';
import { useReservations } from '@/features/reservations/hooks/useReservations';

const ESTADOS: ReservationTab[] = ['proximos', 'historial', 'cancelados'];

export const MyReservationsPage = () => {
  // Qué se está viendo queda en la URL (?tipo=hoteles&estado=historial): al volver de un detalle o
  // al recargar, la página sigue donde estaba.
  const [params, setParams] = useSearchParams();
  const tipo: TipoReserva = params.get('tipo') === 'hoteles' ? 'hoteles' : 'vuelos';
  const estado = ESTADOS.find((e) => e === params.get('estado')) ?? 'proximos';
  const { vuelos, hoteles, isLoading, error, recargar } = useReservations();

  const elegir = (cambios: { tipo?: TipoReserva; estado?: ReservationTab }) =>
    setParams(
      (actual) => {
        const siguiente = new URLSearchParams(actual);
        if (cambios.tipo) siguiente.set('tipo', cambios.tipo);
        if (cambios.estado) siguiente.set('estado', cambios.estado);
        return siguiente;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col">
      <div className="bg-secondary relative mb-6 flex min-h-32 flex-col justify-center overflow-hidden rounded-2xl px-6 py-8 sm:mb-8 sm:min-h-40 sm:px-11 sm:py-10">
        <div className="pointer-events-none absolute top-1/2 right-[-30px] h-85 w-85 -translate-y-1/2 rounded-full bg-white/3" />
        <div className="pointer-events-none absolute top-1/2 right-20 h-55 w-55 -translate-y-1/2 rounded-full bg-white/4" />
        <h1 className="relative z-10 mb-2 text-2xl font-extrabold text-white sm:text-3xl">
          Mis reservas
        </h1>
        <p className="relative z-10 text-sm font-medium text-white/65 sm:text-[15px]">
          Gestioná y consultá tus vuelos y tus hoteles.
        </p>
      </div>

      <TipoReservaTabs
        active={tipo}
        onChange={(t) => elegir({ tipo: t })}
        proximas={{ vuelos: vuelos.upcoming.length, hoteles: hoteles.upcoming.length }}
      />
      <ReservationTabs active={estado} onChange={(e) => elegir({ estado: e })} />

      <ReservasTab
        tipo={tipo}
        estado={estado}
        vuelos={vuelos}
        hoteles={hoteles}
        isLoading={isLoading}
        error={error}
        onRetry={recargar}
      />
    </div>
  );
};
