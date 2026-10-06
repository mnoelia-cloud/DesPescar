import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { EstadoLista, SinReservas } from '@/features/reservations/components/EstadoLista';
import { FlightCard } from '@/features/reservations/components/FlightCard';
import { HistorySummaryCard } from '@/features/reservations/components/HistorySummaryCard';
import { HotelCard } from '@/features/reservations/components/HotelCard';
import type { ReservationTab } from '@/features/reservations/components/ReservationTabs';
import type { TipoReserva } from '@/features/reservations/components/TipoReservaTabs';
import type { FlightReservation, HotelBooking } from '@/features/reservations/reservations.types';

type PorEstado<T> = { upcoming: T[]; history: T[]; cancelled: T[] };

interface ReservasTabProps {
  tipo: TipoReserva;
  estado: ReservationTab;
  vuelos: PorEstado<FlightReservation>;
  hoteles: PorEstado<HotelBooking>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CLAVE: Record<ReservationTab, keyof PorEstado<unknown>> = {
  proximos: 'upcoming',
  historial: 'history',
  cancelados: 'cancelled',
};

const LINK = 'text-primary font-bold hover:underline';

const TEXTOS: Record<TipoReserva, Record<ReservationTab, { titulo: string; vacio: ReactNode }>> = {
  vuelos: {
    proximos: {
      titulo: 'Próximos vuelos',
      vacio: (
        <>
          No tenés vuelos próximos.{' '}
          <Link to="/" className={LINK}>
            Buscá tu próximo vuelo
          </Link>
        </>
      ),
    },
    historial: {
      titulo: 'Historial de vuelos',
      vacio: 'Todavía no tenés vuelos en tu historial.',
    },
    cancelados: { titulo: 'Vuelos cancelados', vacio: 'No tenés vuelos cancelados.' },
  },
  hoteles: {
    proximos: {
      titulo: 'Próximas estadías',
      vacio: (
        <>
          No tenés estadías próximas.{' '}
          <Link to="/hoteles" className={LINK}>
            Buscá tu próximo alojamiento
          </Link>
        </>
      ),
    },
    historial: {
      titulo: 'Historial de estadías',
      vacio: 'Todavía no tenés estadías en tu historial.',
    },
    cancelados: { titulo: 'Estadías canceladas', vacio: 'No tenés estadías canceladas.' },
  },
};

/** La lista de vuelos o de hoteles de una pestaña (próximas, historial o canceladas). */
export const ReservasTab = ({
  tipo,
  estado,
  vuelos,
  hoteles,
  isLoading,
  error,
  onRetry,
}: ReservasTabProps) => {
  const navigate = useNavigate();
  const { titulo, vacio } = TEXTOS[tipo][estado];
  const clave = CLAVE[estado];
  const lista = tipo === 'vuelos' ? vuelos[clave] : hoteles[clave];

  const resumen =
    estado === 'historial' &&
    (tipo === 'vuelos' ? (
      <div className="mb-7 flex flex-wrap gap-4">
        <HistorySummaryCard icon="✈️" value={vuelos.history.length} label="Vuelos realizados" />
        <HistorySummaryCard
          icon="🌍"
          value={new Set(vuelos.history.map((v) => v.destination?.city)).size}
          label="Destinos visitados"
        />
      </div>
    ) : (
      <div className="mb-7 flex flex-wrap gap-4">
        <HistorySummaryCard icon="🏨" value={hoteles.history.length} label="Estadías realizadas" />
        <HistorySummaryCard
          icon="🌙"
          value={hoteles.history.reduce((total, h) => total + h.nights, 0)}
          label="Noches reservadas"
        />
      </div>
    ));

  return (
    <div className="flex flex-col">
      <EstadoLista isLoading={isLoading} error={error} onRetry={onRetry}>
        {resumen}
        <h2 className="text-secondary mb-5 text-xl font-extrabold">{titulo}</h2>

        {lista.length === 0 ? (
          <SinReservas>{vacio}</SinReservas>
        ) : tipo === 'vuelos' ? (
          vuelos[clave].map((vuelo) => (
            <FlightCard
              key={vuelo.id}
              flight={vuelo}
              onRepurchase={estado === 'proximos' ? undefined : () => navigate('/')}
            />
          ))
        ) : (
          hoteles[clave].map((estadia) => (
            <HotelCard
              key={`${estadia.reservationId}-${estadia.id}`}
              stay={estadia}
              onRepurchase={(e) => navigate(`/hoteles/${e.hotelId}`)}
            />
          ))
        )}
      </EstadoLista>
    </div>
  );
};
