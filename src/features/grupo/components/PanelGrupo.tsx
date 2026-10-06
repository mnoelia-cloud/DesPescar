import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { leerErrorApi } from '@/features/cart/carrito';
import { BOTON_BORDE, BOTON_LLENO, CARD, FOCO } from '@/features/cart/components/estilos';
import { crearPago } from '@/features/payments/services/pagosService';
import { useCarritoStore } from '@/store/useCarritoStore';
import { cn } from '@/utils/cn';
import { destinoPago } from '@/utils/destinoPago';
import {
  estadoGrupoTexto,
  formatMonto,
  formatPlazo,
  leerErrorGrupo,
  progresoGrupo,
  urgenciaPlazo,
  type TonoEstado,
} from '../grupo';
import type { EditarPartesRequest, FuenteGrupo, Grupo } from '../grupo.types';
import { useGrupo } from '../hooks/useGrupo';
import { cancelarGrupo, editarPartes, liberarParte } from '../services/grupoService';
import { EditorMontos } from './EditorMontos';
import { EnlaceGrupo } from './EnlaceGrupo';
import { PartesGrupo } from './PartesGrupo';
import { ViajeGrupo } from './ViajeGrupo';
import { rutaMisReservas } from '@/features/reservations/bookingToReservation';

const TONO: Record<TonoEstado, string> = {
  neutro: 'border-[#E2E8F0] bg-white text-secondary',
  aviso: 'border-amber-300 bg-amber-50 text-amber-900',
  exito: 'border-green-200 bg-green-50 text-success',
  error: 'border-red-200 bg-red-50 text-red-700',
};

const ICONO_ESTADO: Record<TonoEstado, string> = {
  neutro: 'info',
  aviso: 'hourglass_top',
  exito: 'check_circle',
  error: 'error',
};

/** Cuenta regresiva del plazo en horas y minutos; se recalcula con cada lectura del grupo. */
const PlazoGrupo = ({
  segundosRestantes,
  leidoEn,
}: {
  segundosRestantes: number;
  leidoEn: number;
}) => {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const segundos = Math.max(0, segundosRestantes - Math.floor((ahora - leidoEn) / 1000));
  const nivel = urgenciaPlazo(segundos);
  return (
    <p
      role="timer"
      aria-label={`Plazo para pagar: ${formatPlazo(segundos)}`}
      className={cn(
        'flex w-fit shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold',
        nivel === 'vencido' ? TONO.error : nivel === 'aviso' ? TONO.aviso : TONO.neutro,
      )}
    >
      <span aria-hidden className="material-symbols-outlined text-[20px]">
        {nivel === 'vencido' ? 'timer_off' : 'timer'}
      </span>
      {nivel === 'vencido' ? (
        'Plazo vencido'
      ) : (
        <>
          Quedan <span className="font-bold tabular-nums">{formatPlazo(segundos)}</span> para pagar
        </>
      )}
    </p>
  );
};

const ErrorInline = ({ children }: { children: string }) => (
  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
    {children}
  </p>
);

interface Props {
  fuente: FuenteGrupo;
  /** El padre se entera de cada lectura (por ejemplo /carrito recarga el carrito al cerrarse el grupo). */
  onGrupo?: (grupo: Grupo) => void;
  /** Encabezado opcional (la página de invitación pone el suyo). */
  titulo?: string;
  /** La lectura respondió 404: el usuario ya no tiene parte (se la liberaron) o el grupo no existe. */
  onSinAcceso?: () => void;
}

/**
 * El grupo completo: estado, plazo, enlace, partes, acciones y el viaje. Lo usan /carrito,
 * /grupo/:token y el resultado del pago de una parte.
 */
export const PanelGrupo = ({ fuente, onGrupo, titulo = 'Pago en grupo', onSinAcceso }: Props) => {
  const { grupo, leidoEn, cargando, error, anuncio, recargar, aplicar } = useGrupo(fuente);
  const navigate = useNavigate();
  const recargarCarrito = useCarritoStore((s) => s.recargar);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const botonCancelarGrupo = useRef<HTMLButtonElement>(null);
  const botonEditar = useRef<HTMLButtonElement>(null);
  const estadoPrevio = useRef<Grupo['estado'] | null>(null);

  useEffect(() => {
    if (!grupo) return;
    onGrupo?.(grupo);
    // Al cerrarse el grupo (confirmado, cancelado o vencido) el carrito del organizador cambia.
    if (
      estadoPrevio.current &&
      estadoPrevio.current !== grupo.estado &&
      grupo.estado !== 'COMPLETO'
    ) {
      void recargarCarrito();
    }
    estadoPrevio.current = grupo.estado;
  }, [grupo, onGrupo, recargarCarrito]);

  const sinAcceso = error?.status === 404;
  useEffect(() => {
    if (sinAcceso) onSinAcceso?.();
  }, [sinAcceso, onSinAcceso]);

  useEffect(() => {
    if (confirmandoCancelar) botonConfirmar.current?.focus();
  }, [confirmandoCancelar]);

  const cerrarConfirmacion = () => {
    setConfirmandoCancelar(false);
    window.setTimeout(() => botonCancelarGrupo.current?.focus(), 0);
  };

  const cerrarEditor = () => {
    setEditando(false);
    window.setTimeout(() => botonEditar.current?.focus(), 0);
  };

  const accion = async (
    llamada: () => Promise<Grupo>,
    porDefecto: string,
  ): Promise<string | null> => {
    if (ocupado) return null;
    setOcupado(true);
    setErrorAccion(null);
    try {
      aplicar(await llamada());
      return null;
    } catch (err: unknown) {
      const e = leerErrorGrupo(err, porDefecto);
      setErrorAccion(e.mensaje);
      // El grupo cambió por debajo (alguien pagó, venció): se vuelve a leer.
      if (e.status === 409 || e.status === 410) recargar();
      return e.mensaje;
    } finally {
      setOcupado(false);
    }
  };

  const pagar = async (numero: number) => {
    if (!grupo || ocupado) return;
    setOcupado(true);
    setErrorAccion(null);
    let saliendo = false;
    try {
      const pago = await crearPago(grupo.reservaId, numero);
      const destino = destinoPago(pago.checkoutUrl);
      if (destino.tipo === 'interno') {
        navigate(destino.ruta);
      } else if (destino.tipo === 'externo') {
        saliendo = true;
        window.location.assign(destino.url);
      } else {
        setErrorAccion('El enlace de pago recibido no es válido. Probá de nuevo más tarde.');
      }
    } catch (err: unknown) {
      const e = leerErrorApi(err, 'No pudimos iniciar el pago de tu parte.');
      setErrorAccion(
        e.status === 403 ? 'Esta parte ya no es tuya. Actualizamos el grupo.' : e.mensaje,
      );
      if (e.status === 409 || e.status === 403) recargar();
    } finally {
      if (!saliendo) setOcupado(false);
    }
  };

  if (!grupo) {
    return (
      <section aria-labelledby="panel-grupo" className={cn('flex flex-col gap-3', CARD)}>
        <h2 id="panel-grupo" className="text-secondary text-lg font-bold">
          {titulo}
        </h2>
        {cargando && (
          <p role="status" className="text-secondary/70 flex items-center gap-2">
            <span aria-hidden className="material-symbols-outlined animate-spin text-[20px]">
              progress_activity
            </span>
            Cargando el pago en grupo...
          </p>
        )}
        {error && !cargando && (
          <>
            <ErrorInline>{error.mensaje}</ErrorInline>
            <button type="button" onClick={recargar} className={cn(BOTON_BORDE, FOCO, 'w-fit')}>
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                refresh
              </span>
              Reintentar
            </button>
          </>
        )}
      </section>
    );
  }

  const estado = estadoGrupoTexto(grupo);
  const abierto = grupo.estado === 'ABIERTO' && grupo.segundosRestantes > 0;
  const cerrado = grupo.estado === 'CANCELADO' || grupo.estado === 'VENCIDO';
  const porcentaje = Math.round((grupo.partesPagadas / Math.max(1, grupo.cantidadPartes)) * 100);

  return (
    <div className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      <section aria-labelledby="panel-grupo" className={cn('flex flex-col gap-4', CARD)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="panel-grupo" className="text-secondary text-lg font-bold">
              {titulo}
            </h2>
            <p className="text-secondary/70 text-sm">
              {progresoGrupo(grupo)} ·{' '}
              <span className="text-primary font-bold tabular-nums">
                {formatMonto(grupo.montoPagado)}
              </span>{' '}
              de <span className="tabular-nums">{formatMonto(grupo.montoTotal)}</span>
            </p>
          </div>
          {(grupo.estado === 'ABIERTO' || grupo.estado === 'COMPLETO') && (
            <PlazoGrupo segundosRestantes={grupo.segundosRestantes} leidoEn={leidoEn} />
          )}
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]"
          role="progressbar"
          aria-label="Partes pagadas"
          aria-valuemin={0}
          aria-valuemax={grupo.cantidadPartes}
          aria-valuenow={grupo.partesPagadas}
          aria-valuetext={progresoGrupo(grupo)}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all motion-reduce:transition-none',
              estado.tono === 'error' ? 'bg-red-300' : 'bg-primary',
            )}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <div role="status" className={cn('flex gap-3 rounded-xl border p-3', TONO[estado.tono])}>
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[22px]">
            {ICONO_ESTADO[estado.tono]}
          </span>
          <div>
            <p className="font-bold">{estado.titulo}</p>
            <p className="text-sm">{estado.detalle}</p>
          </div>
        </div>
        {abierto && grupo.enlaceToken && <EnlaceGrupo token={grupo.enlaceToken} />}
        {error && <ErrorInline>{error.mensaje}</ErrorInline>}
        {errorAccion && <ErrorInline>{errorAccion}</ErrorInline>}
        <PartesGrupo
          grupo={grupo}
          ocupado={ocupado}
          onPagar={(n) => void pagar(n)}
          onLiberar={(n) =>
            void accion(() => liberarParte(grupo.reservaId, n), 'No pudimos liberar la parte.')
          }
        />
        {grupo.soyOrganizador && abierto && (
          <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4">
            {editando ? (
              <EditorMontos
                grupo={grupo}
                ocupado={ocupado}
                onCerrar={cerrarEditor}
                onGuardar={async (pedido: EditarPartesRequest) => {
                  const e = await accion(
                    () => editarPartes(grupo.reservaId, pedido),
                    'No pudimos guardar los montos.',
                  );
                  if (!e) cerrarEditor();
                  return e;
                }}
              />
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {grupo.puedeEditarMontos && (
                  <button
                    ref={botonEditar}
                    type="button"
                    onClick={() => setEditando(true)}
                    disabled={ocupado}
                    className={cn(BOTON_BORDE, FOCO)}
                  >
                    <span aria-hidden className="material-symbols-outlined text-[20px]">
                      edit
                    </span>
                    Cambiar los montos
                  </button>
                )}
                {!confirmandoCancelar && (
                  <button
                    ref={botonCancelarGrupo}
                    type="button"
                    onClick={() => setConfirmandoCancelar(true)}
                    disabled={ocupado}
                    className={cn(
                      'text-alert flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-semibold hover:bg-red-50 disabled:opacity-50',
                      FOCO,
                    )}
                  >
                    Cancelar el pago en grupo
                  </button>
                )}
              </div>
            )}
            {confirmandoCancelar && (
              <div
                role="alertdialog"
                aria-modal="false"
                aria-labelledby="cancelar-grupo-titulo"
                aria-describedby="cancelar-grupo-detalle"
                className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && !ocupado) cerrarConfirmacion();
                }}
              >
                <p id="cancelar-grupo-titulo" className="font-bold text-red-700">
                  ¿Cancelar el pago en grupo?
                </p>
                <p id="cancelar-grupo-detalle" className="text-sm text-red-700">
                  Se libera el viaje y se devuelve cada parte ya pagada. El carrito no vuelve: para
                  viajar hay que armarlo de nuevo.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    ref={botonConfirmar}
                    type="button"
                    disabled={ocupado}
                    aria-busy={ocupado}
                    onClick={() => {
                      void accion(
                        () => cancelarGrupo(grupo.reservaId),
                        'No pudimos cancelar el grupo.',
                      ).then(() => setConfirmandoCancelar(false));
                    }}
                    className={cn(
                      'bg-alert flex min-h-11 items-center justify-center rounded-xl px-5 font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
                      FOCO,
                    )}
                  >
                    {ocupado ? 'Cancelando...' : 'Sí, cancelar todo'}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={cerrarConfirmacion}
                    className={cn(BOTON_BORDE, FOCO, 'min-h-11 bg-white')}
                  >
                    No, volver
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {cerrado && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              to="/"
              className={cn(
                'bg-primary hover:bg-primary/90 flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 font-bold text-white transition-colors',
                FOCO,
              )}
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                flight
              </span>
              Buscar vuelos
            </Link>
            <Link to="/hoteles" className={cn(BOTON_BORDE, FOCO)}>
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                hotel
              </span>
              Buscar hoteles
            </Link>
          </div>
        )}
        {grupo.estado === 'CONFIRMADO' && grupo.soyOrganizador && (
          <Link
            to={rutaMisReservas(Boolean(grupo.viaje.vuelo))}
            className={cn(BOTON_LLENO, FOCO, 'w-fit')}
          >
            Ver mis reservas
          </Link>
        )}
      </section>
      <ViajeGrupo viaje={grupo.viaje} />
    </div>
  );
};
