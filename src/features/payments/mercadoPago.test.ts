import { describe, expect, it } from 'vitest';
import {
  armarOrden,
  mensajeDetalleOrden,
  mensajeErrorBrick,
  SDK_MERCADOPAGO_URL,
} from './mercadoPago';

describe('armarOrden', () => {
  it('traduce la salida del Brick al cuerpo de /orden', () => {
    expect(
      armarOrden(
        {
          token: ' tok123 ',
          payment_method_id: 'master',
          installments: 3,
          payer: { email: 'comprador@testuser.com' },
        },
        { paymentTypeId: 'debit_card' },
      ),
    ).toEqual({
      token: 'tok123',
      paymentMethodId: 'master',
      paymentTypeId: 'debit_card',
      installments: 3,
      payerEmail: 'comprador@testuser.com',
    });
  });

  it('sin tipo conocido asume crédito, sin cuotas válidas asume 1 y no manda email vacío', () => {
    expect(armarOrden({ token: 't', payment_method_id: 'visa', installments: 0 })).toEqual({
      token: 't',
      paymentMethodId: 'visa',
      paymentTypeId: 'credit_card',
      installments: 1,
    });
    expect(
      armarOrden(
        { token: 't', payment_method_id: 'visa', installments: 99 },
        { paymentTypeId: 'x' },
      ),
    ).toMatchObject({ paymentTypeId: 'credit_card', installments: 1 });
  });

  it('sin token o sin marca no hay orden', () => {
    expect(armarOrden({ token: '', payment_method_id: 'visa', installments: 1 })).toBeNull();
    expect(armarOrden({ token: 't', payment_method_id: ' ', installments: 1 })).toBeNull();
  });
});

describe('mensajeDetalleOrden', () => {
  it.each([
    ['insufficient_amount', 'fondos suficientes'],
    ['card_insufficient_amount', 'fondos suficientes'],
    ['rejected_by_issuer', 'banco rechazó'],
    ['bad_filled_card_data', 'datos de la tarjeta'],
    ['required_call_for_authorize', 'autorices'],
    ['invalid_installments', 'cuotas'],
    ['card_disabled', 'deshabilitada'],
    ['high_risk', 'seguridad'],
    ['in_process', 'en proceso'],
    ['INSUFFICIENT_AMOUNT', 'fondos suficientes'],
  ])('%s se explica en castellano', (detalle, fragmento) =>
    expect(mensajeDetalleOrden(detalle)).toContain(fragmento),
  );

  it('un detalle desconocido o ausente da el mensaje genérico', () => {
    expect(mensajeDetalleOrden('algo_raro')).toBe('El pago fue rechazado. Probá con otra tarjeta.');
    expect(mensajeDetalleOrden(null)).toBe('El pago fue rechazado. Probá con otra tarjeta.');
    expect(mensajeDetalleOrden(undefined)).toBe('El pago fue rechazado. Probá con otra tarjeta.');
  });
});

describe('mensajeErrorBrick', () => {
  it('distingue la public key inválida del resto', () => {
    expect(mensajeErrorBrick({ cause: 'invalid_public_key' })).toContain('configurada');
    expect(mensajeErrorBrick(new Error('x'))).toContain('Recargá');
    expect(mensajeErrorBrick(null)).toContain('Recargá');
  });
});

describe('SDK_MERCADOPAGO_URL', () => {
  it('solo se carga desde el CDN oficial por https', () => {
    expect(SDK_MERCADOPAGO_URL).toBe('https://sdk.mercadopago.com/js/v2');
  });
});
