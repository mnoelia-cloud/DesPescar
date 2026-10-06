import { precioAsiento } from '../precios';
import { cn } from '@/utils/cn';
import { useSeats } from '../hooks/useSeats';
import { getColorSettings } from './Plane/ColorSettings';

// Función para asignar un orden específico basado en el nombre de la tarifa
const getFareClassRank = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('primera')) return 1;
  if (lowerName.includes('rapida') || lowerName.includes('rápida')) return 2;
  if (lowerName.includes('emergencia')) return 3;
  if (lowerName.includes('estandar') || lowerName.includes('estándar')) return 4;
  return 5;
};

export const DetailSelectionSeats = () => {
  const { seatsMap, selectedSeats } = useSeats();

  const total = seatsMap?.totalSelectedLimit ?? 0;

  const getSeatDetails = (seatId: string) => {
    if (!seatsMap?.layout) return null;

    for (const element of seatsMap.layout) {
      if (element.type === 'row') {
        const foundSeat = element.items.find(
          (item) => item.type === 'seat' && item.seatUuid === seatId,
        );
        if (foundSeat && foundSeat.type === 'seat') {
          return foundSeat;
        }
      }
    }
    return null;
  };

  return (
    // Siempre a la vista: en escritorio es una columna a la izquierda que acompaña el scroll (sticky) y se detiene al terminar
    // la sección, sin tapar el pie de página; en celular/tablet es una franja compacta pegada bajo el menú.
    <div className="sticky top-18 z-30 -mx-4 flex min-w-0 flex-col gap-3 self-stretch border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-28 lg:m-0 lg:w-72 lg:gap-3 lg:self-start lg:rounded-2xl lg:border lg:bg-white lg:p-3 lg:shadow-lg">
      <div className="flex flex-col gap-2 lg:gap-2">
        <h2 className="text-secondary text-sm font-bold lg:text-lg">Tipos de asientos</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
          {Object.entries(seatsMap?.fareClasses ?? {})
            .sort(([, a], [, b]) => getFareClassRank(a.name) - getFareClassRank(b.name))
            .map(([key, value]) => {
              const colorStyle = getColorSettings(value.colorKey);

              return (
                <div
                  className="border-secondary flex shrink-0 items-center gap-2 rounded-lg border bg-white p-2 lg:w-full lg:px-2 lg:py-1"
                  key={key}
                >
                  <div
                    className={cn(
                      `flex h-full max-h-10 w-full max-w-8 items-center justify-center rounded-lg`,
                    )}
                  >
                    <span className={cn('material-symbols-outlined text-2xl!', colorStyle.text)}>
                      chair
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex flex-col lg:flex-1 lg:flex-row lg:items-center lg:justify-between lg:gap-2',
                      colorStyle.text,
                    )}
                  >
                    <h4 className="text-sm font-semibold whitespace-nowrap">{value.name}</h4>
                    <h5 className="text-sm">{precioAsiento(value.price)}</h5>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-secondary text-sm font-bold lg:text-lg">Asientos elegidos</h2>
          <span className="text-secondary text-lg font-bold lg:text-2xl">
            {selectedSeats.length}
            <span className="text-secondary/50 text-sm font-semibold"> / {total}</span>
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Asientos elegidos"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={selectedSeats.length}
          className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
        >
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{
              width: `${total > 0 ? Math.min(100, (selectedSeats.length / total) * 100) : 0}%`,
            }}
          />
        </div>

        {selectedSeats.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {selectedSeats.map((seatId) => {
              const seat = getSeatDetails(seatId);
              if (!seat) return null;
              const fareClass = seatsMap?.fareClasses?.[seat.fareClass];
              const colorStyle = fareClass ? getColorSettings(fareClass.colorKey) : null;

              return (
                <span
                  key={seatId}
                  title={fareClass?.name}
                  className={cn(
                    'shrink-0 rounded-md px-2 py-1 text-sm font-bold text-white',
                    colorStyle ? colorStyle.select : 'bg-gray-400',
                  )}
                >
                  {seat.displayNumber}
                </span>
              );
            })}
          </div>
        )}

        {total > 0 && selectedSeats.length >= total && (
          <p className="text-success text-xs font-semibold">Ya elegiste todos los asientos.</p>
        )}
      </div>
    </div>
  );
};
