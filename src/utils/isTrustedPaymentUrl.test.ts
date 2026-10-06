import { describe, expect, it } from 'vitest';
import { esRutaPropiaDePago, isTrustedPaymentUrl } from './isTrustedPaymentUrl';

describe('isTrustedPaymentUrl', () => {
  it.each([
    'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1',
    'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=1',
    '/pago/simulado?pago=7f0c3a52-1d7e-4a8e-9a51-0d2f0a3b1c11',
    '/pago/mercadopago?pago=7f0c3a52-1d7e-4a8e-9a51-0d2f0a3b1c11',
    '/pago/resultado?reserva=12',
  ])('acepta %s', (url) => expect(isTrustedPaymentUrl(url)).toBe(true));

  it.each([
    'http://www.mercadopago.com.ar/checkout',
    'https://mercadopago.com.ar.evil.com/checkout',
    'https://www.mercadopago.com.ar@evil.com/',
    'javascript:alert(1)//mercadopago.com',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'DATA:text/html;base64,AAAA',
    'HTTP://www.mercadopago.com.ar/checkout',
    '',
    '//evil.com/pago/simulado',
    '/\\evil.com/pago/simulado',
    '\\\\evil.com/pago/simulado',
    '/\t/evil.com/pago/simulado',
    'https://evil.com/pago/simulado?pago=1',
    '/pago/otra-cosa',
    '/pago/simuladox',
    '/pago/mercadopagox',
    '//evil.com/pago/mercadopago',
    'https://evil.com/pago/mercadopago?pago=1',
    '/pago/simulado/../../admin',
    '/pago/simulado/%2e%2e/admin',
    '/pago/simulado/..%2f..',
    '/PAGO/SIMULADO?pago=1',
    ' /pago/simulado?pago=1',
    'pago/simulado?pago=1',
  ])('rechaza %j', (url) => expect(isTrustedPaymentUrl(url)).toBe(false));
});

describe('esRutaPropiaDePago', () => {
  it('solo acepta rutas relativas del propio front', () => {
    expect(esRutaPropiaDePago('/pago/simulado?pago=1')).toBe(true);
    expect(esRutaPropiaDePago('https://www.mercadopago.com.ar/checkout')).toBe(false);
  });
});
