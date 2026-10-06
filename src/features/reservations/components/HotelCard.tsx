import { useNavigate } from 'react-router';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/formatCurrency';
import type { HotelBooking } from '@/features/reservations/reservations.types';

interface HotelCardProps {
  stay: HotelBooking;
  /** Volver a reservar el mismo hotel (estadías completadas o canceladas). */
  onRepurchase?: (stay: HotelBooking) => void;
}

const ETIQUETAS = {
  upcoming: { texto: 'Próxima', estilo: 'bg-[#e8f5e9] text-[#2e7d32]' },
  completed: { texto: 'Completada', estilo: 'bg-[#e3f2fd] text-[#1565c0]' },
  cancelled: { texto: 'Cancelada', estilo: 'bg-[#fce4e4] text-[#c62828]' },
} as const;

const BOTON_CLARO =
  'text-secondary hover:border-secondary min-h-10 cursor-pointer rounded-lg border-[1.5px] border-gray-200 px-4 py-[9px] text-center text-[13px] font-bold whitespace-nowrap transition-colors hover:bg-gray-100';

const Dato = ({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="min-w-16 font-semibold text-gray-400">{etiqueta}</span>
    <span className="text-secondary font-bold">{children}</span>
  </div>
);

/** Una estadía de hotel en Mis reservas. Las pantallas de detalle y cancelación son de la reserva que la contiene. */
export const HotelCard = ({ stay, onRepurchase }: HotelCardProps) => {
  const navigate = useNavigate();
  const { status, withFlight } = stay;
  const etiqueta = ETIQUETAS[status];
  const terminada = status !== 'upcoming';

  const verDetalles = () => navigate(`/my-reservations/${stay.reservationId}/details`);
  const cancelar = () => navigate(`/my-reservations/${stay.reservationId}/cancel`);

  return (
    <div
      className={cn(
        'mb-4 flex flex-col overflow-hidden rounded-[14px] border border-gray-200 bg-white transition-shadow hover:shadow-[0_4px_20px_rgba(13,27,62,.08)] sm:flex-row sm:items-stretch',
        status === 'completed' && 'opacity-88',
        status === 'cancelled' && 'opacity-70',
      )}
    >
      <img
        src={stay.thumbnail}
        alt={stay.city}
        className="h-32 w-full shrink-0 object-cover sm:h-auto sm:w-25"
      />

      <div className="flex flex-1 flex-col gap-5 px-4 py-4 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'material-symbols-outlined text-[22px]!',
                terminada ? 'text-gray-400' : 'text-primary',
              )}
            >
              hotel
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                etiqueta.estilo,
              )}
            >
              {etiqueta.texto}
            </span>
          </div>
          <h3
            className={cn(
              'text-xl leading-tight font-extrabold tracking-tight',
              terminada ? 'text-gray-700' : 'text-secondary',
            )}
          >
            {stay.name}
          </h3>
          <span className="text-xs font-semibold text-gray-400">
            {stay.city} · {stay.room}
          </span>
          <span className="text-secondary mt-1.5 text-sm font-bold">
            {stay.checkIn} → {stay.checkOut}
          </span>
          <span className="text-[11px] font-semibold text-gray-400">
            {stay.nights} {stay.nights === 1 ? 'noche' : 'noches'}
            {stay.checkInTime && ` · check-in desde las ${stay.checkInTime}`}
          </span>
          {withFlight && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
              <span aria-hidden className="material-symbols-outlined text-[16px]!">
                flight
              </span>
              <span>
                Incluida en la misma reserva que tu vuelo {withFlight}: se gestiona y se cancela
                junto con él.
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-200 pt-4 text-[13px] sm:ml-7 sm:min-w-44 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-7">
          <Dato etiqueta="Reserva">{stay.reservationCode}</Dato>
          {stay.holder && <Dato etiqueta="Titular">{stay.holder}</Dato>}
          <Dato etiqueta="Estadía">
            {stay.rooms} {stay.rooms === 1 ? 'habitación' : 'habitaciones'} · {stay.guests}{' '}
            {stay.guests === 1 ? 'huésped' : 'huéspedes'}
          </Dato>
          <Dato etiqueta="Total">{formatCurrency(stay.price)}</Dato>
          {status === 'cancelled' && stay.refunded != null && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="min-w-16 font-semibold text-gray-400">Reembolso</span>
                <span className="font-bold text-[#15803d]">{formatCurrency(stay.refunded)}</span>
              </div>
              <span className="pl-18 text-[11px] text-gray-400">de toda la reserva</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-2.5 border-t border-gray-200 px-4 py-4 sm:min-w-45 sm:border-t-0 sm:border-l sm:px-6 sm:py-5">
        {terminada ? (
          <>
            <button
              type="button"
              onClick={() => onRepurchase?.(stay)}
              className="bg-secondary min-h-10 cursor-pointer rounded-lg px-4 py-2.5 text-center text-[13px] font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90"
            >
              Volver a reservar
            </button>
            <button type="button" onClick={verDetalles} className={BOTON_CLARO}>
              Ver detalles
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={verDetalles}
              className="bg-primary hover:bg-primary/90 min-h-10 cursor-pointer rounded-lg px-4 py-2.5 text-center text-[13px] font-bold whitespace-nowrap text-white transition-colors"
            >
              Ver detalles
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="text-alert min-h-10 cursor-pointer py-0.5 text-center text-xs font-semibold transition-opacity hover:opacity-70"
            >
              Cancelar reserva
            </button>
          </>
        )}
      </div>
    </div>
  );
};
