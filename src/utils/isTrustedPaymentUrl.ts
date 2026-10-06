// mercadopago.com, mercadopago.com.ar, sandbox.mercadopago.com.ar, www.mercadopago.com.br, etc.
const MERCADO_PAGO_HOST = /(^|\.)mercadopago\.com(\.[a-z]{2})?$/;

// Paginas del propio front a las que puede mandar payment-service (mock y Mercado Pago Orders).
const RUTAS_PROPIAS = ['/pago/simulado', '/pago/mercadopago', '/pago/resultado'];
const BASE = 'https://despescar.invalid';

/** "/pago/simulado?pago=...", "/pago/mercadopago?pago=..." o "/pago/resultado?...": ruta relativa, sin dominio ni "..". */
export const esRutaPropiaDePago = (url: string) => {
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return false;
  try {
    const { origin, pathname } = new URL(url, BASE);
    return origin === BASE && RUTAS_PROPIAS.includes(pathname) && url.startsWith(pathname);
  } catch {
    return false;
  }
};

const esMercadoPago = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && MERCADO_PAGO_HOST.test(hostname);
  } catch {
    return false;
  }
};

/**
 * Indica si la URL de checkout que devuelve el backend es de confianza: Mercado Pago por https o
 * una de las paginas de pago del propio front.
 */
export const isTrustedPaymentUrl = (url: string) => esRutaPropiaDePago(url) || esMercadoPago(url);
