import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { leerErrorApi } from '@/features/cart/carrito';
import { BOTON_BORDE, BOTON_LLENO, FOCO } from '@/features/cart/components/estilos';
import { ESPERA_CONSULTA_MS, resultadoParte, seguirConsultando } from '@/features/payments/pagos';
import type { EstadoPago, Pago, RetornoPago } from '@/features/payments/payments.types';
import { leerPagoDeRetorno } from '@/features/payments/services/pagosService';
import { useCarritoStore } from '@/store/useCarritoStore';
import { useFlightStore } from '@/store/useFlightStore';
import { cn } from '@/utils/cn';
import { formatMonto } from '../grupo';
import type { FuenteGrupo, Grupo } from '../grupo.types';
import { participacion } from '../services/grupoService';
import { PanelGrupo } from './PanelGrupo';
import { rutaMisReservas } from '@/features/reservations/bookingToReservation';

const ICONO = { exito: 'check_circle', pendiente: 'hourglass_top', error: 'cancel' } as const;
const COLOR = { exito: 'text-success', pendiente: 'text-amber-600', error: 'text-alert' } as const;

interface Props {
  /** Vuelta del mock (con o sin parte en la URL) o de Mercado Pago (el pago trae parteNumero). */
  retorno: RetornoPago;
  /** El pago que la página ya leyó, para no empezar en blanco. */
  pagoInicial?: Pago | null;
}

/**
 * Resultado del pago de una parte (D-b21): el pago, lo que significa según el estado del grupo y,
 * debajo, el panel del grupo. El grupo se lee por participación (la reserva es de quien organiza) y
 * se mantiene al día con las lecturas del panel.
 */
export const ResultadoParte = ({ retorno, pagoInicial = null }: Props) => {
  const [pago, setPago] = useState<Pago | null>(pagoInicial);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  // Hasta leer el grupo (o saber que no se puede) no se muestra un resultado a medias.
  const [grupoLeido, setGrupoLeido] = useState(false);
  const [sinGrupo, setSinGrupo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [inicio, setInicio] = useState(() => Date.now());
  const [agotado, setAgotado] = useState(false);
  const estadoPago = useRef<EstadoPago | null>(pagoInicial?.status ?? null);
  const estadoGrupo = useRef<Grupo['estado'] | null>(null);
  const seguirRef = useRef(false);
  const limpiado = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const recargarCarrito = useCarritoStore((s) => s.recargar);

  const resultado = pago && grupoLeido ? resultadoParte(pago, grupo) : null;
  const pendiente = resultado?.seguirConsultando ?? false;

  // Una consulta por intento; la siguiente se programa cuando termina esta (no se pisan).
  useEffect(() => {
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
        const p = await leerPagoDeRetorno(retorno, estadoPago.current);
        if (!p) throw new Error('No encontramos el pago de tu parte.');
        let g: Grupo | null = null;
        let sinAcceso = false;
        try {
          g = await participacion(p.reservationId);
        } catch (err: unknown) {
          // 404: sin parte (la liberaron) o sin grupo. Alcanza con el pago.
          sinAcceso = leerErrorApi(err, '').status === 404;
        }
        if (!activo) return;
        estadoPago.current = p.status;
        setPago(p);
        if (g) {
          estadoGrupo.current = g.estado;
          setGrupo(g);
        }
        if (sinAcceso) setSinGrupo(true);
        setGrupoLeido(true);
        setError(null);
        // Con la reserva confirmada, quien organizó ya no tiene carrito ni compra de vuelos en curso.
        if (g?.estado === 'CONFIRMADO' && g.soyOrganizador && !limpiado.current) {
          limpiado.current = true;
          useFlightStore.getState().clearSearch();
          void recargarCarrito();
        }
        const r = resultadoParte(p, g);
        seguirRef.current = r.seguirConsultando;
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
  }, [retorno, intento, inicio, recargarCarrito]);

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

  // El panel de abajo consulta el grupo cada 15 s: el resultado acompaña lo que va leyendo y, si
  // el grupo cambió de estado (se confirmó, se cerró), se vuelve a leer el pago.
  const alLeerGrupo = useCallback((g: Grupo) => {
    setGrupo(g);
    if (estadoGrupo.current !== null && estadoGrupo.current !== g.estado) {
      setAgotado(false);
      setInicio(Date.now());
      setIntento((n) => n + 1);
    }
    estadoGrupo.current = g.estado;
  }, []);

  const alPerderAcceso = useCallback(() => setSinGrupo(true), []);

  const reservaId = pago?.reservationId ?? null;
  const fuente = useMemo<FuenteGrupo | null>(
    () => (reservaId !== null && !sinGrupo ? { tipo: 'participacion', reservaId } : null),
    [reservaId, sinGrupo],
  );
  const confirmada = grupo?.estado === 'CONFIRMADO';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5 text-center shadow-sm sm:p-10">
        <div aria-live="polite" className="flex w-full flex-col items-center gap-4">
          {!resultado && !error && (
            <>
              <span
                aria-hidden
                className="material-symbols-outlined text-secondary animate-spin text-5xl motion-reduce:animate-none"
              >
                autorenew
              </span>
              <p className="text-secondary font-semibold">Consultando el pago de tu parte...</p>
            </>
          )}
          {resultado && pago && (
            <>
              <span
                aria-hidden
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
              <p className="text-secondary/70 max-w-lg">{resultado.detalle}</p>
              <dl className="grid w-full max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-[#F8FAFC] p-4 text-left text-sm">
                <dt className="text-secondary/60">Reserva</dt>
                <dd className="text-secondary text-right font-semibold">#{pago.reservationId}</dd>
                <dt className="text-secondary/60">Parte</dt>
                <dd className="text-secondary text-right font-semibold">
                  {pago.parteNumero ?? '—'}
                  {grupo ? ` de ${grupo.cantidadPartes}` : ''}
                </dd>
                <dt className="text-secondary/60">Monto</dt>
                <dd className="text-secondary text-right font-semibold tabular-nums">
                  {formatMonto(pago.amount)}
                </dd>
              </dl>
            </>
          )}
          {pendiente && agotado && (
            <p className="text-secondary/70 text-sm">
              Está tardando más de lo normal. Podés actualizar para volver a consultar.
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="w-full rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {(error || (pendiente && agotado)) && (
            <button type="button" onClick={actualizar} className={cn(BOTON_LLENO, FOCO)}>
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                refresh
              </span>
              Actualizar estado
            </button>
          )}
          {resultado?.reintentar && grupo?.enlaceToken && (
            <Link to={`/grupo/${grupo.enlaceToken}`} className={cn(BOTON_LLENO, FOCO, 'px-6')}>
              Volver al grupo e intentar de nuevo
            </Link>
          )}
          {confirmada && grupo.soyOrganizador && (
            <Link
              to={rutaMisReservas(Boolean(grupo.viaje.vuelo))}
              className={cn(BOTON_LLENO, FOCO)}
            >
              Ver mis reservas
            </Link>
          )}
          <Link to="/" className={cn(BOTON_BORDE, FOCO, 'min-h-12')}>
            Ir al inicio
          </Link>
        </div>
      </div>
      {fuente && (
        <PanelGrupo
          fuente={fuente}
          titulo="El grupo"
          onGrupo={alLeerGrupo}
          onSinAcceso={alPerderAcceso}
        />
      )}
    </div>
  );
};
