import type { EstadoCarrito } from '@/features/cart/cart.types';
import { estadoGrupoTexto } from '@/features/grupo/grupo';
import type { Grupo } from '@/features/grupo/grupo.types';
import type { EstadoPago, Pago, ResultadoPago, RetornoPago } from './payments.types';

const valor = (sp: URLSearchParams, clave: string) => {
  const v = sp.get(clave);
  return v && v !== 'null' ? v : null;
};

/** Lee /pago/resultado: ?reserva=<id> (mock) o los parámetros que agrega Mercado Pago (D16). */
export const leerRetornoPago = (sp: URLSearchParams): RetornoPago | null => {
  const pagoId = valor(sp, 'external_reference');
  if (pagoId) {
    return {
      tipo: 'mercadopago',
      pagoId,
      // Solo dígitos: si falta, es "null" o trae otra cosa, no se concilia.
      mpPaymentId: /^\d+$/.test(valor(sp, 'payment_id') ?? '') ? valor(sp, 'payment_id') : null,
      estadoMp: valor(sp, 'status') ?? valor(sp, 'collection_status'),
    };
  }
  const reservaId = Number(valor(sp, 'reserva'));
  if (!Number.isInteger(reservaId) || reservaId <= 0) return null;
  const parte = Number(valor(sp, 'parte'));
  return {
    tipo: 'mock',
    reservaId,
    parte: Number.isInteger(parte) && parte >= 1 && parte <= 10 ? parte : null,
  };
};

/** A dónde vuelve la pasarela de prueba: la reserva y, si el pago es de una parte, la parte (D-b21). */
export const urlResultado = (pago: Pick<Pago, 'reservationId' | 'parteNumero'>) =>
  `/pago/resultado?reserva=${pago.reservationId}${pago.parteNumero ? `&parte=${pago.parteNumero}` : ''}`;

/**
 * El pago más reciente de una reserva (GET /api/payments/reservation/{id} trae todos los del
 * usuario). Con `parte`, solo entre los pagos de esa parte del grupo.
 */
export const ultimoPago = (pagos: Pago[], parte?: number): Pago | null =>
  (parte === undefined ? pagos : pagos.filter((p) => p.parteNumero === parte)).reduce<Pago | null>(
    (ultimo, p) => {
      if (!ultimo) return p;
      const a = Date.parse(p.createdAt);
      const b = Date.parse(ultimo.createdAt);
      if (a !== b) return a > b ? p : ultimo;
      return p.id > ultimo.id ? p : ultimo;
    },
    null,
  );

export const carritoVigente = (estado: EstadoCarrito) =>
  estado === 'INICIADA' || estado === 'PENDIENTE_PAGO';

/** Qué mostrar según el estado del pago y el de la reserva. */
export const resultadoPago = (pago: Pago, estadoReserva: EstadoCarrito): ResultadoPago => {
  const reintentar = carritoVigente(estadoReserva);
  switch (pago.status) {
    case 'APPROVED':
      return estadoReserva === 'CONFIRMADA'
        ? {
            tono: 'exito',
            titulo: '¡Reserva confirmada!',
            detalle: 'Los lugares ya quedaron a tu nombre. Podés ver el detalle en Mis reservas.',
            seguirConsultando: false,
            reintentar: false,
          }
        : {
            tono: 'pendiente',
            titulo: 'Pago aprobado, confirmando tu reserva',
            detalle: 'Estamos tomando los lugares. Esto puede tardar unos segundos.',
            seguirConsultando: true,
            reintentar: false,
          };
    case 'REFUNDED':
      return {
        tono: 'error',
        titulo: 'No pudimos confirmar tu reserva',
        detalle:
          'Algún lugar dejó de estar disponible o el carrito cambió antes de que se acreditara el pago. Te devolvimos el dinero por el mismo medio.',
        seguirConsultando: false,
        reintentar: false,
      };
    case 'REJECTED':
      return {
        tono: 'error',
        titulo: 'El pago fue rechazado',
        detalle: reintentar
          ? 'No se te cobró nada. Podés volver al carrito e intentar de nuevo.'
          : 'No se te cobró nada. El carrito ya venció: vas a tener que armarlo de nuevo.',
        seguirConsultando: false,
        reintentar,
      };
    case 'CANCELLED':
      return {
        tono: 'error',
        titulo: 'El pago se canceló',
        detalle: 'No se te cobró nada.',
        seguirConsultando: false,
        reintentar,
      };
    default:
      return {
        tono: 'pendiente',
        titulo: 'Estamos esperando la confirmación del pago',
        detalle: 'Si ya pagaste, en unos segundos se actualiza. No cierres esta página.',
        seguirConsultando: true,
        reintentar,
      };
  }
};

const estadoGrupoDetalle = (g: Grupo) => estadoGrupoTexto(g).detalle;

/** Qué mostrar para el pago de una parte según el pago y el grupo (null si no se pudo leer). */
export const resultadoParte = (pago: Pago, grupo: Grupo | null): ResultadoPago => {
  const estado = grupo?.estado ?? null;
  const abierto = estado === 'ABIERTO' && (grupo?.segundosRestantes ?? 0) > 0;
  const faltan = grupo ? grupo.cantidadPartes - grupo.partesPagadas : null;
  switch (pago.status) {
    case 'APPROVED':
      if (estado === 'CONFIRMADO') {
        return {
          tono: 'exito',
          titulo: '¡Reserva confirmada!',
          detalle: 'Pagaron todos. Los lugares ya quedaron a nombre del grupo.',
          seguirConsultando: false,
          reintentar: false,
        };
      }
      if (estado === 'COMPLETO') {
        return {
          tono: 'pendiente',
          titulo: 'Confirmando la reserva',
          detalle: 'Ya pagaron todos. Esto puede tardar unos segundos.',
          seguirConsultando: true,
          reintentar: false,
        };
      }
      if (estado === 'CANCELADO' || estado === 'VENCIDO') {
        return {
          tono: 'pendiente',
          titulo: 'Tu parte está paga, pero el grupo se cerró',
          detalle:
            'Estamos devolviendo tu dinero por el mismo medio. En unos minutos vas a verlo acá.',
          seguirConsultando: true,
          reintentar: false,
        };
      }
      return {
        tono: 'exito',
        titulo: 'Tu parte está paga',
        detalle:
          faltan === null
            ? 'Cuando paguen todos, la reserva se confirma sola.'
            : `${faltan === 1 ? 'Falta 1 parte' : `Faltan ${faltan} partes`}. Cuando paguen todos, la reserva se confirma sola.`,
        seguirConsultando: false,
        reintentar: false,
      };
    case 'REFUNDED':
      return {
        tono: 'error',
        titulo: 'Te devolvimos tu parte',
        detalle: grupo
          ? estadoGrupoDetalle(grupo)
          : 'El pago en grupo no se pudo completar. Te devolvimos el dinero por el mismo medio.',
        seguirConsultando: false,
        reintentar: false,
      };
    case 'REJECTED':
      return {
        tono: 'error',
        titulo: 'El pago fue rechazado',
        detalle: abierto
          ? 'No se te cobró nada. Podés volver al grupo e intentar de nuevo.'
          : 'No se te cobró nada. El pago en grupo ya no está abierto.',
        seguirConsultando: false,
        reintentar: abierto,
      };
    case 'CANCELLED':
      return {
        tono: 'error',
        titulo: 'El pago se canceló',
        detalle: 'No se te cobró nada.',
        seguirConsultando: false,
        reintentar: abierto,
      };
    default:
      return {
        tono: 'pendiente',
        titulo: 'Estamos esperando la confirmación del pago',
        detalle: 'Si ya pagaste, en unos segundos se actualiza. No cierres esta página.',
        seguirConsultando: true,
        reintentar: abierto,
      };
  }
};

/** Cada cuánto se vuelve a consultar un pago pendiente. */
export const ESPERA_CONSULTA_MS = 4000;
/** Después de este tiempo se deja de consultar solo y se ofrece actualizar a mano. */
export const ESPERA_MAXIMA_MS = 2 * 60 * 1000;

/** Si hay que programar otra consulta: el estado sigue pendiente y no se pasó el máximo. */
export const seguirConsultando = (pendiente: boolean, inicio: number, ahora: number) =>
  pendiente && ahora - inicio < ESPERA_MAXIMA_MS;

/** Concilia con Mercado Pago en cada consulta mientras el pago no tenga estado final. */
export const debeConciliar = (estado: EstadoPago | null, mpPaymentId: string | null) =>
  Boolean(mpPaymentId) && (estado === null || estado === 'PENDING' || estado === 'AUTHORIZED');

/**
 * Un pago cobrado con Mercado Pago (Orders) que quedó en proceso: su transactionId es la orden
 * (ORD...). Mientras siga pendiente, /pago/resultado relee la orden con la conciliación, sin
 * depender de que llegue el webhook (en local no hay URL pública).
 */
export const ordenPendiente = (pago: Pick<Pago, 'status' | 'transactionId'>): string | null =>
  (pago.status === 'PENDING' || pago.status === 'AUTHORIZED') &&
  pago.transactionId !== null &&
  /^ORD[A-Za-z0-9]{1,61}$/.test(pago.transactionId)
    ? pago.transactionId
    : null;

const VENTANA_LIMPIEZA_MS = 30 * 60 * 1000;

/**
 * Si al confirmarse hay que olvidar la compra de vuelos y recargar el carrito. Solo si se vio
 * el pago pasar de pendiente a aprobado en esta visita o si el pago es reciente: recargar un
 * resultado viejo no debe borrar una compra nueva.
 */
export const limpiarAlConfirmar = (vistoPendiente: boolean, creadoEn: string, ahora: number) => {
  if (vistoPendiente) return true;
  const t = Date.parse(creadoEn);
  return Number.isFinite(t) && ahora - t < VENTANA_LIMPIEZA_MS;
};

/** Texto en castellano para los errores de la pasarela de prueba (nunca el inglés de Spring). */
export const mensajePasarela = (
  fase: 'carga' | 'simulacion',
  status: number | null,
  mensaje: string,
) => {
  if (fase === 'simulacion' && status === 404) {
    return 'La pasarela de prueba no está disponible en este entorno.';
  }
  if (fase === 'carga' && (status === 403 || status === 404)) {
    return 'Este pago no existe o no es tuyo.';
  }
  return mensaje;
};
