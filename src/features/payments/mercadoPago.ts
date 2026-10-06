/**
 * Mercado Pago Checkout API (Orders): carga de MercadoPago.js, tipos del Card Payment Brick y
 * traducción de los detalles de la orden. La tarjeta la tokeniza el Brick dentro de un iframe de
 * Mercado Pago: por nuestro código solo pasa el token.
 */

/** Único origen desde el que se carga el SDK (documentación oficial de Mercado Pago). */
export const SDK_MERCADOPAGO_URL = 'https://sdk.mercadopago.com/js/v2';

/** Lo que entrega el Brick en onSubmit (campos que usamos). */
export interface DatosBrick {
  token: string;
  payment_method_id: string;
  installments: number;
  transaction_amount?: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
}

export interface DatosAdicionalesBrick {
  paymentTypeId?: string;
}

/** Lo que viaja a POST /api/payments/{id}/orden. */
export interface OrdenPagoInput {
  token: string;
  paymentMethodId: string;
  paymentTypeId: 'credit_card' | 'debit_card' | 'prepaid_card';
  installments: number;
  payerEmail?: string;
}

export interface ControladorBrick {
  unmount: () => void;
}

export interface ConstructorBricks {
  create: (
    tipo: 'cardPayment',
    contenedorId: string,
    settings: unknown,
  ) => Promise<ControladorBrick>;
}

export interface InstanciaMercadoPago {
  bricks: () => ConstructorBricks;
}

export type ConstructorMercadoPago = new (
  publicKey: string,
  opciones?: { locale?: string },
) => InstanciaMercadoPago;

declare global {
  interface Window {
    MercadoPago?: ConstructorMercadoPago;
  }
}

const TIPOS: OrdenPagoInput['paymentTypeId'][] = ['credit_card', 'debit_card', 'prepaid_card'];

/** Convierte la salida del Brick en el cuerpo del endpoint. null si falta el token o la marca. */
export const armarOrden = (
  datos: DatosBrick,
  adicionales?: DatosAdicionalesBrick,
): OrdenPagoInput | null => {
  const token = datos.token?.trim();
  const marca = datos.payment_method_id?.trim();
  if (!token || !marca) return null;
  const tipo = adicionales?.paymentTypeId;
  const cuotas = Number(datos.installments);
  const email = datos.payer?.email?.trim();
  return {
    token,
    paymentMethodId: marca,
    paymentTypeId: TIPOS.includes(tipo as OrdenPagoInput['paymentTypeId'])
      ? (tipo as OrdenPagoInput['paymentTypeId'])
      : 'credit_card',
    installments: Number.isInteger(cuotas) && cuotas >= 1 && cuotas <= 36 ? cuotas : 1,
    ...(email ? { payerEmail: email } : {}),
  };
};

const DETALLES: Record<string, string> = {
  accredited: 'El pago fue aprobado.',
  bad_filled_card_data: 'Revisá los datos de la tarjeta: hay algún dato mal cargado.',
  invalid_card_token: 'La tarjeta no se pudo validar. Volvé a cargarla.',
  high_risk: 'El pago no pudo procesarse por seguridad. Probá con otro medio de pago.',
  rejected_by_issuer: 'El banco rechazó el pago. Probá con otra tarjeta.',
  cc_rejected_other_reason: 'El banco rechazó el pago. Probá con otra tarjeta.',
  required_call_for_authorize:
    'El banco necesita que autorices el pago. Llamá a tu banco o probá con otra tarjeta.',
  max_attempts_exceeded: 'Superaste la cantidad de intentos permitidos. Probá más tarde.',
  card_disabled:
    'La tarjeta está deshabilitada. Llamá a tu banco para activarla o usá otra tarjeta.',
  insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  card_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  amount_limit_exceeded: 'El monto supera el límite de la tarjeta.',
  invalid_installments: 'La tarjeta no acepta esa cantidad de cuotas.',
  cc_rejected_duplicated_payment: 'Ya hiciste un pago por este monto hace instantes.',
  processing_error: 'Hubo un error al procesar el pago. Probá de nuevo en unos minutos.',
  '3ds_challenge_expired': 'Se venció el tiempo para validar la tarjeta. Probá de nuevo.',
  in_process: 'El pago está en proceso. Te avisamos en cuanto se acredite.',
  pending_review_manual: 'El pago está en revisión. Te avisamos en cuanto se acredite.',
  in_review: 'El pago está en revisión. Te avisamos en cuanto se acredite.',
  pending_challenge: 'Falta validar la tarjeta con tu banco.',
};

/** Texto en castellano para el status_detail de la orden. Sin detalle conocido, un mensaje genérico. */
export const mensajeDetalleOrden = (detalle: string | null | undefined): string =>
  (detalle && DETALLES[detalle.toLowerCase()]) ?? 'El pago fue rechazado. Probá con otra tarjeta.';

/** Mensaje de error de MercadoPago.js (Brick) en castellano. */
export const mensajeErrorBrick = (error: unknown): string => {
  const causa =
    typeof error === 'object' && error !== null && 'cause' in error
      ? String((error as { cause: unknown }).cause)
      : '';
  if (causa.includes('invalid_public_key') || causa.includes('settings_empty')) {
    return 'La pasarela de pago no está bien configurada en este entorno.';
  }
  return 'No pudimos cargar el formulario de pago. Recargá la página y probá de nuevo.';
};

let carga: Promise<ConstructorMercadoPago> | null = null;

/** Carga MercadoPago.js una sola vez desde el CDN oficial y devuelve el constructor. */
export const cargarMercadoPago = (): Promise<ConstructorMercadoPago> => {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (carga) return carga;
  carga = new Promise<ConstructorMercadoPago>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_MERCADOPAGO_URL;
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) resolve(window.MercadoPago);
      else reject(new Error('MercadoPago.js no expuso el constructor.'));
    };
    script.onerror = () => {
      carga = null;
      script.remove();
      reject(new Error('No se pudo cargar MercadoPago.js.'));
    };
    document.head.appendChild(script);
  });
  return carga;
};
