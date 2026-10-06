import { cn } from '@/utils/cn';

export type ReservationTab = 'proximos' | 'historial' | 'cancelados';

const tabs: { id: ReservationTab; label: string }[] = [
  { id: 'proximos', label: 'Próximas' },
  { id: 'historial', label: 'Historial' },
  { id: 'cancelados', label: 'Canceladas' },
];

interface ReservationTabsProps {
  active: ReservationTab;
  onChange: (tab: ReservationTab) => void;
}

export const ReservationTabs = ({ active, onChange }: ReservationTabsProps) => {
  return (
    <div className="mb-7 flex gap-0 overflow-x-auto border-b-2 border-gray-200">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            '-mb-0.5 min-h-10 cursor-pointer border-b-2 border-transparent px-3 pt-2.5 pb-3 text-sm font-bold whitespace-nowrap transition-colors sm:px-5',
            active === id ? 'border-primary text-primary' : 'hover:text-secondary text-gray-400',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
