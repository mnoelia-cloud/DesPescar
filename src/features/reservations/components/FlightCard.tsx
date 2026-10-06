import { useNavigate } from 'react-router';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/formatCurrency';
import type { FlightReservation } from '@/features/reservations/reservations.types';

interface FlightCardProps {
  flight: FlightReservation;
  onManage?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRepurchase?: (id: string) => void;
}

export const FlightCard = ({
  flight,
  onManage,
  onViewDetails,
  onCancel,
  onRepurchase,
}: FlightCardProps) => {
  const navigate = useNavigate();

  if (!flight.origin || !flight.destination) return null;

  const handleManage = () => {
    onManage?.(flight.id);
    navigate(`/my-reservations/${flight.id}/manage`);
  };

  const handleViewDetails = () => {
    onViewDetails?.(flight.id);
    navigate(`/my-reservations/${flight.id}/details`);
  };

  const handleCancel = () => {
    onCancel?.(flight.id);
    navigate(`/my-reservations/${flight.id}/cancel`);
  };

  const {
    origin,
    destination,
    flightNumber,
    seats,
    reservationCode,
    status,
    nextDayArrival,
    passengerName,
    flightPrice,
    totalPaid,
    hotels,
    refunded,
  } = flight;
  // Esta tarjeta es solo del vuelo: si la reserva también tiene hoteles, se ven en la pestaña Hoteles
  // y el precio es el del vuelo, no el total de la reserva.
  const precio = flightPrice ?? totalPaid;
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isPast = isCompleted || isCancelled;

  const badge = (
    <>
      {status === 'upcoming' && (
        <span className="rounded-full bg-[#e8f5e9] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#2e7d32] uppercase">
          Próximo
        </span>
      )}
      {isCompleted && (
        <span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#1565c0] uppercase">
          Completado
        </span>
      )}
      {isCancelled && (
        <span className="rounded-full bg-[#fce4e4] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#c62828] uppercase">
          Cancelado
        </span>
      )}
    </>
  );

  return (
    <div
      className={cn(
        'mb-4 flex flex-col overflow-hidden rounded-[14px] border border-gray-200 bg-white transition-shadow hover:shadow-[0_4px_20px_rgba(13,27,62,.08)] sm:flex-row sm:items-stretch',
        isCompleted && 'opacity-88',
        isCancelled && 'opacity-70',
      )}
    >
      <img
        src={flight.thumbnail}
        alt={destination?.city ?? ''}
        className="h-32 w-full shrink-0 object-cover sm:h-auto sm:w-25"
      />

      <div className="flex flex-1 flex-col gap-5 px-4 py-4 sm:flex-row sm:items-center sm:gap-0 sm:px-6 sm:py-5">
        <div className="flex flex-1 items-center justify-between gap-3 sm:gap-6">
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                'text-xl leading-tight font-extrabold tracking-tight sm:text-[26px]',
                isPast ? 'text-gray-700' : 'text-secondary',
              )}
            >
              {origin.iata}
            </span>
            <span className="text-xs font-semibold text-gray-400">{origin.city}</span>
            <span
              className={cn(
                'mt-1.5 text-base font-bold sm:text-lg',
                isPast ? 'text-gray-700' : 'text-secondary',
              )}
            >
              {origin.time}
            </span>
            {origin.date && (
              <span className="text-[11px] font-semibold text-gray-400">{origin.date}</span>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <span
              className={cn(
                'material-symbols-outlined text-[22px]!',
                isPast ? 'text-gray-400' : 'text-primary',
              )}
            >
              flight_takeoff
            </span>
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full bg-gray-200" />
              ))}
            </div>
            {badge}
          </div>

          <div className="flex flex-col items-end gap-0.5 text-right">
            <span
              className={cn(
                'text-xl leading-tight font-extrabold tracking-tight sm:text-[26px]',
                isPast ? 'text-gray-700' : 'text-secondary',
              )}
            >
              {destination.iata}
            </span>
            <span className="text-xs font-semibold text-gray-400">{destination.city}</span>
            <span
              className={cn(
                'mt-1.5 text-base font-bold sm:text-lg',
                isPast ? 'text-gray-700' : 'text-secondary',
              )}
            >
              {destination.time}
              {nextDayArrival && <span className="text-primary align-super text-[10px]">+1</span>}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-gray-200 pt-4 text-[13px] sm:ml-7 sm:min-w-40 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-7">
          {origin && (
            <>
              <div className="flex items-center gap-2">
                <span className="min-w-16 font-semibold text-gray-400">Vuelo</span>
                <span className="text-secondary font-bold">{flightNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-16 font-semibold text-gray-400">Asientos</span>
                <span className="text-secondary font-bold">{seats || '—'}</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="min-w-16 font-semibold text-gray-400">Reserva</span>
            <span className="text-secondary font-bold">{reservationCode}</span>
          </div>
          {passengerName && (
            <div className="flex items-center gap-2">
              <span className="min-w-16 font-semibold text-gray-400">Pasajero</span>
              <span className="text-secondary font-bold">{passengerName}</span>
            </div>
          )}
          {precio != null && (
            <div className="flex items-center gap-2">
              <span className="min-w-16 font-semibold text-gray-400">Total</span>
              <span className="text-secondary font-bold">{formatCurrency(precio)}</span>
            </div>
          )}
          {isCancelled && refunded != null && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="min-w-16 font-semibold text-gray-400">Reembolso</span>
                <span className="font-bold text-[#15803d]">{formatCurrency(refunded)}</span>
              </div>
              {hotels.length > 0 && (
                <span className="pl-18 text-[11px] text-gray-400">de toda la reserva</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-center gap-2.5 border-t border-gray-200 px-4 py-4 sm:min-w-45 sm:border-t-0 sm:border-l sm:px-6 sm:py-5">
        {isCancelled ? (
          <>
            <button
              type="button"
              onClick={() => onRepurchase?.(flight.id)}
              className="bg-secondary min-h-10 cursor-pointer rounded-lg px-4 py-2.5 text-center text-[13px] font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90"
            >
              Reservar de nuevo
            </button>
            <button
              type="button"
              onClick={handleViewDetails}
              className="text-secondary hover:border-secondary min-h-10 cursor-pointer rounded-lg border-[1.5px] border-gray-200 px-4 py-[9px] text-center text-[13px] font-bold whitespace-nowrap transition-colors hover:bg-gray-100"
            >
              Ver detalles
            </button>
          </>
        ) : isCompleted ? (
          <>
            <button
              type="button"
              onClick={() => onRepurchase?.(flight.id)}
              className="bg-secondary min-h-10 cursor-pointer rounded-lg px-4 py-2.5 text-center text-[13px] font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90"
            >
              Repetir viaje
            </button>
            <button
              type="button"
              onClick={handleViewDetails}
              className="text-secondary hover:border-secondary min-h-10 cursor-pointer rounded-lg border-[1.5px] border-gray-200 px-4 py-[9px] text-center text-[13px] font-bold whitespace-nowrap transition-colors hover:bg-gray-100"
            >
              Ver detalles
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleManage}
              className="bg-primary hover:bg-primary/90 min-h-10 cursor-pointer rounded-lg px-4 py-2.5 text-center text-[13px] font-bold whitespace-nowrap text-white transition-colors"
            >
              Gestionar viaje
            </button>
            <button
              type="button"
              onClick={handleViewDetails}
              className="text-secondary hover:border-secondary min-h-10 cursor-pointer rounded-lg border-[1.5px] border-gray-200 px-4 py-[9px] text-center text-[13px] font-bold whitespace-nowrap transition-colors hover:bg-gray-100"
            >
              Ver detalles
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-alert min-h-10 cursor-pointer py-0.5 text-center text-xs font-semibold transition-opacity hover:opacity-70"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
};
