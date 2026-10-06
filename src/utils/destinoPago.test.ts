import { describe, expect, it } from 'vitest';
import { destinoPago } from './destinoPago';

describe('destinoPago', () => {
  it('el mock se abre dentro del front', () => {
    expect(destinoPago('/pago/simulado?pago=abc')).toEqual({
      tipo: 'interno',
      ruta: '/pago/simulado?pago=abc',
    });
  });

  it('la pagina de tarjeta de Mercado Pago (Orders) se abre dentro del front', () => {
    expect(destinoPago('/pago/mercadopago?pago=abc')).toEqual({
      tipo: 'interno',
      ruta: '/pago/mercadopago?pago=abc',
    });
  });

  it('Mercado Pago Checkout Pro se abre como pagina externa', () => {
    const url = 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1';
    expect(destinoPago(url)).toEqual({ tipo: 'externo', url });
  });

  it.each([
    null,
    undefined,
    '',
    'https://evil.com/pagar',
    '//evil.com/pago/simulado',
    '/\\evil.com/pago/simulado',
    'javascript:alert(1)',
    'data:text/html,x',
  ])('cualquier otra cosa es invalida (%s)', (url) =>
    expect(destinoPago(url)).toEqual({ tipo: 'invalido' }),
  );
});
