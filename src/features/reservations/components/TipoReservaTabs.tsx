import { cn } from '@/utils/cn';

export type TipoReserva = 'vuelos' | 'hoteles';

const tipos: { id: TipoReserva; label: string; icon: string }[] = [
  { id: 'vuelos', label: 'Vuelos', icon: 'flight' },
  { id: 'hoteles', label: 'Hoteles', icon: 'hotel' },
];

interface TipoReservaTabsProps {
  active: TipoReserva;
  onChange: (tipo: TipoReserva) => void;
  /** Cuántas reservas próximas hay de cada tipo (se muestra solo si es mayor que 0). */
  proximas: Record<TipoReserva, number>;
}

/** Elige qué se está viendo: los vuelos o los hoteles reservados. Debajo van las pestañas por estado. */
export const TipoReservaTabs = ({ active, onChange, proximas }: TipoReservaTabsProps) => {
  return (
    <div role="tablist" aria-label="Tipo de reserva" className="mb-5 flex gap-2">
      {tipos.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={cn(
            'focus-visible:outline-secondary flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
            active === id
              ? 'bg-secondary border-secondary text-white'
              : 'text-secondary hover:border-secondary border-gray-200 bg-white',
          )}
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]!">
            {icon}
          </span>
          {label}
          {proximas[id] > 0 && (
            <span
              aria-label={`${proximas[id]} próximas`}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] leading-none font-bold',
                active === id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
              )}
            >
              {proximas[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
