import { api } from '@/config/api';
import type { OrdenPagoInput } from '../mercadoPago';
import { debeConciliar, ordenPendiente, ultimoPago } from '../pagos';
import type { ConfigPagos, EstadoPago, Pago, ResultadoOrden, RetornoPago } from '../payments.types';

const BASE = '/api/payments';

/** Crea (o reutiliza, D19) el pago del carrito o, con parteNumero, el de esa parte del grupo (CB4). El monto lo pone el servidor. */
export const crearPago = async (reservationId: number, parteNumero?: number): Promise<Pago> => {
  const res = await api.post<Pago>(
    BASE,
    parteNumero ? { reservationId, parteNumero } : { reservationId },
  );
  return res.data;
};

export const obtenerPago = async (id: string): Promise<Pago> => {
  const res = await api.get<Pago>(`${BASE}/${encodeURIComponent(id)}`);
  return res.data;
};

export const pagosDeReserva = async (reservaId: number): Promise<Pago[]> => {
  const res = await api.get<Pago[]>(`${BASE}/reservation/${reservaId}`);
  return res.data;
};

/** Solo con el proveedor mock. */
export const simularPago = async (id: string, aprobado: boolean): Promise<Pago> => {
  const res = await api.post<Pago>(`${BASE}/${encodeURIComponent(id)}/simulacion`, { aprobado });
  return res.data;
};

/** Proveedor activo y, con Mercado Pago (Orders), la public key para MercadoPago.js. */
export const configPagos = async (): Promise<ConfigPagos> => {
  const res = await api.get<ConfigPagos>(`${BASE}/config`);
  return res.data;
};

/** Solo con Mercado Pago (Orders): cobra el pago con el token de tarjeta del Brick. */
export const cobrarConOrden = async (
  id: string,
  orden: OrdenPagoInput,
): Promise<ResultadoOrden> => {
  const res = await api.post<ResultadoOrden>(`${BASE}/${encodeURIComponent(id)}/orden`, orden);
  return res.data;
};

/** Solo con Mercado Pago: confirma el pago con el payment_id (Checkout Pro) o el id de la orden (Orders). */
export const conciliarPago = async (id: string, mpPaymentId: string): Promise<Pago> => {
  const res = await api.post<Pago>(`${BASE}/${encodeURIComponent(id)}/conciliacion`, {
    mpPaymentId,
  });
  return res.data;
};

/**
 * El pago al que apunta la vuelta de la pasarela. Con las páginas propias (mock y Mercado Pago
 * Orders), el último de la reserva (o de la parte, si la URL la trae), releyendo la orden si quedó
 * en proceso; con Checkout Pro concilia con el payment_id mientras el pago siga pendiente (D16)
 * y, si no se puede, devuelve el estado guardado. null si la reserva no tiene pagos.
 */
export const leerPagoDeRetorno = async (
  retorno: RetornoPago,
  estadoPrevio: EstadoPago | null,
): Promise<Pago | null> => {
  if (retorno.tipo === 'mock') {
    const pago = ultimoPago(await pagosDeReserva(retorno.reservaId), retorno.parte ?? undefined);
    const orden = pago ? ordenPendiente(pago) : null;
    if (pago && orden) {
      try {
        return await conciliarPago(pago.id, orden);
      } catch {
        // Si Mercado Pago todavía no la resolvió, se muestra el estado guardado.
      }
    }
    return pago;
  }
  if (debeConciliar(estadoPrevio, retorno.mpPaymentId)) {
    try {
      return await conciliarPago(retorno.pagoId, retorno.mpPaymentId ?? '');
    } catch {
      // Si MP todavía no lo informa o no corresponde, se muestra el estado guardado.
    }
  }
  return obtenerPago(retorno.pagoId);
};
