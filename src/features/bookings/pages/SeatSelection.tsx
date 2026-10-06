import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { SectionContainer } from '@/components/ui/SectionContainer';
import { cn } from '@/utils/cn';
import { useBarraInferior } from '@/hooks/useBarraInferior';
import { useCarritoStore } from '@/store/useCarritoStore';
import { useFlightStore } from '@/store/useFlightStore';
import { AirplaneCanvas } from '../components/Plane/AirplaneCanvas';
import { DetailSelectionSeats } from '../components/DetailSelectionSeats';
import { useBooking, type ResultadoInit } from '../hooks/useBooking';
import { SeatsProvider } from '../context/SeatsProvider';
import { useSeats } from '../hooks/useSeats';

const FOCO =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary';

const BOTON_BORDE =
  'border-secondary text-secondary hover:bg-secondary flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-5 font-bold transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50';

const SeatSelectionContent = () => {
  useBarraInferior();
  const { initBooking, reemplazarVuelo, isLoading, error } = useBooking();
  const { seatsMap, selectedSeats, isLoading: seatsLoading, error: seatsError } = useSeats();
  const passengers = useFlightStore((state) => state.passengers);
  const limpiarCompra = useFlightStore((state) => state.limpiarCompra);
  const recargarCarrito = useCarritoStore((state) => state.recargar);
  const navigate = useNavigate();
  const passengerCount = Math.max(1, Number(passengers) || 1);
  const [yaTieneVuelo, setYaTieneVuelo] = useState(false);
  // Evita dos POST /init por doble clic antes de que se vuelva a pintar el botón.
  const enCurso = useRef(false);
  const botonAgregar = useRef<HTMLButtonElement>(null);
  const botonReemplazar = useRef<HTMLButtonElement>(null);

  // El diálogo de reemplazo toma el foco al abrirse.
  useEffect(() => {
    if (yaTieneVuelo) botonReemplazar.current?.focus();
  }, [yaTieneVuelo]);

  const cerrarDialogo = () => {
    setYaTieneVuelo(false);
    // Se devuelve el foco al botón que abrió el diálogo, ya habilitado en el próximo pintado.
    window.setTimeout(() => botonAgregar.current?.focus(), 0);
  };

  const alCarrito = async (resultado: () => Promise<ResultadoInit>) => {
    if (enCurso.current) return;
    enCurso.current = true;
    try {
      const r = await resultado();
      if (r.success) {
        await recargarCarrito();
        navigate('/carrito');
        return;
      }
      setYaTieneVuelo(r.codigo === 'CARRITO_YA_TIENE_VUELO');
    } finally {
      enCurso.current = false;
    }
  };

  const handleClick = () => {
    if (isLoading || selectedSeats.length !== passengerCount) return;
    void alCarrito(initBooking);
  };

  /** Ir al carrito sin reemplazar: los asientos recién elegidos no se van a usar. */
  const verCarrito = () => {
    limpiarCompra();
    navigate('/carrito');
  };

  return (
    <SectionContainer className="mx-auto mb-28 flex w-full max-w-312.5 flex-col items-center gap-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <DetailSelectionSeats />
      <div className="relative z-1 w-full">
        <AirplaneCanvas></AirplaneCanvas>
      </div>
      <div className="fixed bottom-0 left-0 z-2 flex w-full justify-center border-t border-[#3234392d] bg-white">
        <div className="flex w-full max-w-360 items-center justify-between gap-3 p-3 sm:p-4">
          <div>
            <h3 className="text-lg font-semibold text-[#323439] sm:text-xl">Asientos</h3>
            <p className="text-sm text-gray-600">
              {selectedSeats.length} de {passengerCount} seleccionados
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 sm:gap-12">
            <button
              ref={botonAgregar}
              type="button"
              className={cn(BOTON_BORDE, 'w-auto', FOCO)}
              onClick={handleClick}
              aria-busy={isLoading}
              disabled={
                !seatsMap ||
                seatsLoading ||
                isLoading ||
                yaTieneVuelo ||
                selectedSeats.length !== passengerCount
              }
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                add_shopping_cart
              </span>
              {isLoading ? 'Agregando...' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
        {yaTieneVuelo && (
          <div
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="ya-tiene-vuelo"
            aria-describedby="ya-tiene-vuelo-ayuda"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                cerrarDialogo();
              }
            }}
            className="absolute right-3 bottom-full left-3 mb-2 flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-lg sm:left-auto sm:max-w-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p id="ya-tiene-vuelo" className="text-secondary font-bold">
                  Tu carrito ya tiene un vuelo
                </p>
                <p id="ya-tiene-vuelo-ayuda" className="text-secondary/70 text-sm">
                  ¿Querés reemplazarlo por este? Las estadías del carrito se mantienen. Si vas al
                  carrito sin reemplazarlo, los asientos que elegiste recién no se van a usar.
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarDialogo}
                aria-label="Cerrar y seguir eligiendo asientos"
                className={cn(
                  'text-secondary/70 hover:bg-secondary/5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  FOCO,
                )}
              >
                <span aria-hidden className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                ref={botonReemplazar}
                type="button"
                className={cn(
                  'bg-secondary flex min-h-11 w-full items-center justify-center rounded-full px-5 font-bold text-white hover:opacity-90 disabled:opacity-50',
                  FOCO,
                )}
                disabled={isLoading}
                onClick={() => {
                  setYaTieneVuelo(false);
                  void alCarrito(reemplazarVuelo);
                }}
              >
                Reemplazar vuelo
              </button>
              <button type="button" className={cn(BOTON_BORDE, FOCO)} onClick={verCarrito}>
                Ver carrito
              </button>
            </div>
          </div>
        )}
        {(error || seatsError) && !yaTieneVuelo && (
          <p
            role="alert"
            className="absolute right-3 bottom-full left-3 mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:right-auto"
          >
            {error || seatsError}
          </p>
        )}
      </div>
    </SectionContainer>
  );
};

/** Una sola instancia del estado de asientos (pedidos y WebSocket) para toda la pantalla. */
export const SeatSelection = () => (
  <SeatsProvider>
    <SeatSelectionContent />
  </SeatsProvider>
);
