import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { SectionContainer } from '@/components/ui/SectionContainer';
import { leerErrorApi } from '@/features/cart/carrito';
import { BOTON_BORDE, FOCO } from '@/features/cart/components/estilos';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  armarOrden,
  cargarMercadoPago,
  mensajeDetalleOrden,
  mensajeErrorBrick,
  type ControladorBrick,
  type DatosAdicionalesBrick,
  type DatosBrick,
} from '../mercadoPago';
import { mensajePasarela, urlResultado } from '../pagos';
import type { Pago } from '../payments.types';
import { cobrarConOrden, configPagos, crearPago, obtenerPago } from '../services/pagosService';

const CONTENEDOR_BRICK = 'cardPaymentBrick_container';

/**
 * Pago con tarjeta por Mercado Pago (Checkout API via Orders). Lee ?pago=<id>, muestra el pago
 * pendiente y monta el Card Payment Brick de MercadoPago.js con la public key que entrega el
 * back. El Brick tokeniza la tarjeta en un iframe de Mercado Pago: a nuestro código y a nuestro
 * servidor solo llega el token, que se manda a POST /api/payments/{id}/orden.
 */
export const PagoMercadoPagoPage = () => {
  const [sp] = useSearchParams();
  const pagoId = sp.get('pago') ?? '';
  const navigate = useNavigate();
  const [pago, setPago] = useState<Pago | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [cargando, setCargando] = useState(Boolean(pagoId));
  const [brickListo, setBrickListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(pagoId ? null : 'Falta el pago a cobrar.');
  const [aviso, setAviso] = useState<string | null>(null);
  const pagoRef = useRef<Pago | null>(null);
  const enCurso = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titulo.current?.focus();
  }, []);

  // Carga el pago y la configuración del proveedor.
  useEffect(() => {
    if (!pagoId) return;
    let activo = true;
    const cargar = async () => {
      try {
        const [p, config] = await Promise.all([obtenerPago(pagoId), configPagos()]);
        if (!activo) return;
        if (p.status !== 'PENDING') {
          navigate(urlResultado(p), { replace: true });
          return;
        }
        if (config.provider !== 'MERCADO_PAGO_ORDERS' || !config.publicKey) {
          setError('El pago con tarjeta de Mercado Pago no está disponible en este entorno.');
          return;
        }
        pagoRef.current = p;
        setPago(p);
        setPublicKey(config.publicKey);
      } catch (err: unknown) {
        if (activo) {
          const e = leerErrorApi(err, 'No encontramos este pago.');
          setError(mensajePasarela('carga', e.status, e.mensaje));
        }
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    return () => {
      activo = false;
    };
  }, [pagoId, navigate]);

  // Monta el Brick cuando hay pago y public key; lo desmonta al salir.
  const monto = pago?.amount ?? null;
  useEffect(() => {
    if (!publicKey || monto === null) return;
    let activo = true;
    let controlador: ControladorBrick | null = null;

    const cobrar = async (datos: DatosBrick, adicionales?: DatosAdicionalesBrick) => {
      const actual = pagoRef.current;
      const orden = armarOrden(datos, adicionales);
      if (!actual || enCurso.current) return;
      if (!orden) {
        setError('No pudimos validar la tarjeta. Revisá los datos y probá de nuevo.');
        return;
      }
      enCurso.current = true;
      setEnviando(true);
      setError(null);
      setAviso(null);
      try {
        const resultado = await cobrarConOrden(actual.id, orden);
        if (!activo) return;
        if (resultado.pago.status !== 'REJECTED') {
          navigate(urlResultado(resultado.pago), { replace: true });
          return;
        }
        // Rechazada: se avisa el motivo y se abre un pago nuevo para reintentar con otra tarjeta.
        setError(mensajeDetalleOrden(resultado.detalle));
        try {
          const nuevo = await crearPago(actual.reservationId, actual.parteNumero ?? undefined);
          if (!activo) return;
          pagoRef.current = nuevo;
          setPago(nuevo);
          navigate(`/pago/mercadopago?pago=${nuevo.id}`, { replace: true });
        } catch {
          if (activo) navigate(urlResultado(resultado.pago), { replace: true });
        }
      } catch (err: unknown) {
        if (!activo) return;
        const e = leerErrorApi(err, 'No pudimos procesar el pago.');
        if (e.status === 409) {
          navigate(urlResultado(actual), { replace: true });
          return;
        }
        setError(
          e.status === 502
            ? 'No pudimos hablar con Mercado Pago en este momento. No se te cobró nada: probá de nuevo.'
            : mensajePasarela('simulacion', e.status, e.mensaje),
        );
      } finally {
        if (activo) {
          enCurso.current = false;
          setEnviando(false);
        }
      }
    };

    const montar = async () => {
      try {
        const MercadoPago = await cargarMercadoPago();
        if (!activo) return;
        const mp = new MercadoPago(publicKey, { locale: 'es-AR' });
        controlador = await mp.bricks().create('cardPayment', CONTENEDOR_BRICK, {
          initialization: { amount: monto },
          customization: {
            visual: { style: { theme: 'default' } },
            paymentMethods: { minInstallments: 1, maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => {
              if (activo) setBrickListo(true);
            },
            onSubmit: (datos: DatosBrick, adicionales?: DatosAdicionalesBrick) =>
              cobrar(datos, adicionales),
            onError: (err: unknown) => {
              if (activo) setAviso(mensajeErrorBrick(err));
            },
          },
        });
        if (!activo) controlador.unmount();
      } catch (err: unknown) {
        if (activo) setError(mensajeErrorBrick(err));
      }
    };
    void montar();
    return () => {
      activo = false;
      controlador?.unmount();
    };
  }, [publicKey, monto, navigate]);

  const esParte = pago !== null && pago.parteNumero !== null;

  return (
    <SectionContainer className="max-w-xl">
      <div className="flex flex-col gap-6 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8">
        <div>
          <h1
            ref={titulo}
            tabIndex={-1}
            className="text-secondary text-xl font-bold outline-none sm:text-2xl"
          >
            Pagar con tarjeta
          </h1>
          <p className="text-secondary/60 text-sm">
            El cobro lo procesa Mercado Pago. Los datos de la tarjeta viajan cifrados a Mercado Pago
            y no se guardan en DesPescar.
          </p>
        </div>

        <div aria-live="polite" className="flex flex-col gap-3">
          {cargando && <p className="text-secondary/70">Cargando el pago...</p>}
          {!cargando && pago && !brickListo && !error && (
            <p className="text-secondary/70">Cargando el formulario de pago...</p>
          )}
          {enviando && <p className="text-secondary/70">Procesando el pago...</p>}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {aviso && !error && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{aviso}</p>
          )}
        </div>

        {pago && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-[#F8FAFC] p-4 text-sm">
            <dt className="text-secondary/60">Reserva</dt>
            <dd className="text-secondary text-right font-semibold">#{pago.reservationId}</dd>
            {esParte && (
              <>
                <dt className="text-secondary/60">Parte</dt>
                <dd className="text-secondary text-right font-semibold">
                  {pago.parteNumero} del pago en grupo
                </dd>
              </>
            )}
            <dt className="text-secondary/60">Moneda</dt>
            <dd className="text-secondary text-right font-semibold">{pago.currency}</dd>
            <dt className="text-secondary self-center font-bold">
              {esParte ? 'Tu parte' : 'Total a pagar'}
            </dt>
            <dd className="text-primary text-right text-2xl font-bold">
              {formatCurrency(pago.amount)}
            </dd>
          </dl>
        )}

        {/* Acá se monta el Card Payment Brick (formulario de tarjeta y botón Pagar). */}
        <div
          id={CONTENEDOR_BRICK}
          aria-busy={enviando}
          className={cn('min-w-0', enviando && 'pointer-events-none opacity-60')}
        />

        <Link to="/carrito" className={cn(BOTON_BORDE, FOCO, 'min-h-12 w-full')}>
          {pago ? 'Cancelar y volver al carrito' : 'Volver al carrito'}
        </Link>
      </div>
    </SectionContainer>
  );
};
