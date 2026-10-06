import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { SectionContainer } from '@/components/ui/SectionContainer';
import type { Carrito } from '@/features/cart/cart.types';
import { estadiasActivas, leerErrorApi } from '@/features/cart/carrito';
import { BOTON_BORDE, BOTON_LLENO, FOCO } from '@/features/cart/components/estilos';
import { obtenerReserva } from '@/features/cart/services/carritoService';
import { ResultadoParte } from '@/features/grupo/components/ResultadoParte';
import { useCarritoStore } from '@/store/useCarritoStore';
import { useFlightStore } from '@/store/useFlightStore';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  ESPERA_CONSULTA_MS,
  leerRetornoPago,
  limpiarAlConfirmar,
  resultadoPago,
  seguirConsultando,
} from '../pagos';
import type { Pago, RetornoPago } from '../payments.types';
import type { EstadoPago } from '../payments.types';
import { leerPagoDeRetorno } from '../services/pagosService';
import { rutaMisReservas } from '@/features/reservations/bookingToReservation';

const ICONO = { exito: 'check_circle', pendiente: 'hourglass_top', error: 'cancel' } as const;
const COLOR = { exito: 'text-success', pendiente: 'text-amber-600', error: 'text-alert' } as const;

/**
 * Pago y reserva actuales. Con Mercado Pago concilia con el payment_id en cada consulta mientras
 * el pago siga pendiente (D16). Si la reserva no se puede leer (venció, 403/404/410), se devuelve
 * solo el pago: su estado alcanza para mostrar el resultado.
 */
const consultar = async (
  retorno: RetornoPago,
  estadoPrevio: EstadoPago | null,
): Promise<{ pago: Pago; reserva: Carrito | null }> => {
  const pago = await leerPagoDeRetorno(retorno, estadoPrevio);
  if (!pago) throw new Error('Esta reserva no tiene pagos.');
  // El pago de una parte lo muestra ResultadoParte: la reserva es de quien organiza (D-b21).
  if (pago.parteNumero !== null) return { pago, reserva: null };
  try {
    return { pago, reserva: await obtenerReserva(pago.reservationId) };
  } catch {
    return { pago, reserva: null };
  }
};

const fecha = (iso: string | null | undefined) => {
  if (!iso) return 'fecha a confirmar';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

export const PagoResultadoPage = () => {
  const [sp] = useSearchParams();
  const retorno = useMemo(() => leerRetornoPago(sp), [sp]);
  const recargarCarrito = useCarritoStore((s) => s.recargar);
  const [datos, setDatos] = useState<{ pago: Pago; reserva: Carrito | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cada cambio de intento dispara una consulta; inicio marca desde cuándo se espera.
  const [intento, setIntento] = useState(0);
  const [inicio, setInicio] = useState(() => Date.now());
  const [agotado, setAgotado] = useState(false);
  const estadoPago = useRef<EstadoPago | null>(null);
  const vistoPendiente = useRef(false);
  const seguirRef = useRef(false);
  const limpiado = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  const resultado = datos
    ? resultadoPago(datos.pago, datos.reserva?.estadoGeneral ?? 'EXPIRADA')
    : null;
  const pendiente = resultado?.seguirConsultando ?? false;
  const confirmado = resultado?.tono === 'exito';

  // Una consulta por intento. El próximo intento se programa recién cuando termina esta, así
  // las consultas no se pisan, y el temporizador se cancela al salir de la página.
  // La vuelta del mock con parte no se consulta acá: la muestra ResultadoParte.
  const esParteMock = retorno?.tipo === 'mock' && retorno.parte !== null;
  useEffect(() => {
    if (!retorno || esParteMock) return;
    let activo = true;
    let timer: number | undefined;
    const programar = (seguir: boolean) => {
      if (!seguir) return;
      timer = window.setTimeout(() => {
        if (seguirConsultando(true, inicio, Date.now())) setIntento((n) => n + 1);
        else setAgotado(true);
      }, ESPERA_CONSULTA_MS);
    };
    const cargar = async () => {
      try {
        const d = await consultar(retorno, estadoPago.current);
        if (!activo) return;
        if (d.pago.parteNumero !== null) {
          // Pago de una parte (Mercado Pago): desde acá sigue ResultadoParte.
          setDatos(d);
          setError(null);
          return;
        }
        const r = resultadoPago(d.pago, d.reserva?.estadoGeneral ?? 'EXPIRADA');
        estadoPago.current = d.pago.status;
        seguirRef.current = r.seguirConsultando;
        if (r.seguirConsultando) vistoPendiente.current = true;
        setDatos(d);
        setError(null);
        // Con la reserva confirmada se olvida la compra de vuelos y el carrito queda vacío.
        if (
          r.tono === 'exito' &&
          !limpiado.current &&
          limpiarAlConfirmar(vistoPendiente.current, d.pago.createdAt, Date.now())
        ) {
          limpiado.current = true;
          useFlightStore.getState().clearSearch();
          void recargarCarrito();
        }
        programar(r.seguirConsultando);
      } catch (err: unknown) {
        if (!activo) return;
        setError(leerErrorApi(err, 'No pudimos consultar el pago.').mensaje);
        // Un error pasajero no corta el seguimiento de un pago que ya se veía pendiente.
        programar(seguirRef.current);
      }
    };
    void cargar();
    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, [retorno, esParteMock, intento, inicio, recargarCarrito]);

  // El foco pasa al título cuando llega el resultado (o cambia).
  const tituloTexto = resultado?.titulo;
  useEffect(() => {
    if (tituloTexto) titulo.current?.focus();
  }, [tituloTexto]);

  const actualizar = useCallback(() => {
    setAgotado(false);
    setInicio(Date.now());
    setIntento((n) => n + 1);
  }, []);

  if (!retorno) {
    return (
      <SectionContainer className="max-w-xl">
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          No encontramos los datos del pago.{' '}
          <Link to="/carrito" className={cn('font-bold underline', FOCO)}>
            Ir al carrito
          </Link>
        </p>
      </SectionContainer>
    );
  }

  if (esParteMock || (datos && datos.pago.parteNumero !== null)) {
    return (
      <SectionContainer className="max-w-3xl">
        <ResultadoParte retorno={retorno} pagoInicial={datos?.pago ?? null} />
      </SectionContainer>
    );
  }

  const estadias = datos?.reserva ? estadiasActivas(datos.reserva) : [];
  const vuelo = datos?.reserva?.vuelo ?? null;
  const pagoFinalSinCarrito =
    resultado?.tono === 'error' && !resultado.reintentar && datos?.pago.status !== 'REFUNDED';

  return (
    <SectionContainer className="max-w-xl">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center shadow-sm sm:p-10">
        <div aria-live="polite" className="flex w-full flex-col items-center gap-4">
          {!resultado && !error && (
            <>
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-secondary animate-spin text-5xl motion-reduce:animate-none"
              >
                autorenew
              </span>
              <p className="text-secondary font-semibold">Consultando tu pago...</p>
            </>
          )}
          {resultado && datos && (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'material-symbols-outlined text-6xl',
                  COLOR[resultado.tono],
                  pendiente && !agotado && 'animate-pulse motion-reduce:animate-none',
                )}
              >
                {ICONO[resultado.tono]}
              </span>
              <h1
                ref={titulo}
                tabIndex={-1}
                className="text-secondary text-2xl font-bold outline-none"
              >
                {resultado.titulo}
              </h1>
              <p className="text-secondary/70">{resultado.detalle}</p>
              {pagoFinalSinCarrito && (
                <p className="text-secondary font-semibold">Tu carrito venció. Armalo de nuevo.</p>
              )}
              <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-[#F8FAFC] p-4 text-left text-sm">
                <dt className="text-secondary/60">Reserva</dt>
                <dd className="text-secondary text-right font-semibold">
                  #{datos.reserva?.idCarrito ?? datos.pago.reservationId}
                </dd>
                {confirmado && vuelo && (
                  <>
                    <dt className="text-secondary/60">Vuelo</dt>
                    <dd className="text-secondary text-right font-semibold">
                      {vuelo.cantidadPasajeros}{' '}
                      {vuelo.cantidadPasajeros === 1 ? 'pasajero' : 'pasajeros'}, sale el{' '}
                      {fecha(vuelo.salida)}
                    </dd>
                  </>
                )}
                {confirmado &&
                  estadias.map((e) => (
                    <div key={e.id} className="col-span-2 grid grid-cols-subgrid">
                      <dt className="text-secondary/60">Estadía</dt>
                      <dd className="text-secondary text-right font-semibold">
                        {e.hotelNombre}, {fecha(e.checkIn)} al {fecha(e.checkOut)}
                      </dd>
                    </div>
                  ))}
                <dt className="text-secondary/60">Monto</dt>
                <dd className="text-secondary text-right font-semibold">
                  {formatCurrency(datos.pago.amount)}
                </dd>
              </dl>
            </>
          )}
          {pendiente && agotado && (
            <p className="text-secondary/70 text-sm">
              Seguimos procesando tu pago. Puede tardar un poco más de lo normal: podés actualizar
              para volver a consultar.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="w-full rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {confirmado && (
            <Link
              to={rutaMisReservas(Boolean(datos?.reserva?.vuelo))}
              className={cn(BOTON_LLENO, FOCO)}
            >
              Ver mis reservas
            </Link>
          )}
          {(error || (pendiente && agotado)) && (
            <button type="button" onClick={actualizar} className={cn(BOTON_LLENO, FOCO)}>
              Actualizar estado
            </button>
          )}
          {!confirmado && resultado?.reintentar && (
            <Link to="/carrito" className={cn(BOTON_LLENO, FOCO)}>
              Volver al carrito
            </Link>
          )}
          {pagoFinalSinCarrito && (
            <>
              <Link to="/vuelos" className={cn(BOTON_LLENO, FOCO)}>
                Buscar vuelos
              </Link>
              <Link to="/hoteles" className={cn(BOTON_LLENO, FOCO)}>
                Buscar hoteles
              </Link>
            </>
          )}
          <Link to="/" className={cn(BOTON_BORDE, FOCO, 'min-h-12')}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </SectionContainer>
  );
};
