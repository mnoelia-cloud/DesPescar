import { describe, expect, it } from 'vitest';
import type { Carrito, EstadiaCarrito, PasajeroInput, VueloCarrito } from './cart.types';
import {
  estadoBarraPago,
  esperaParaReconsultar,
  armarPasajeros,
  armarTitulares,
  cantidadEnCarrito,
  capacidadSuficiente,
  carritoAbierto,
  contactoInicial,
  enGrupo,
  estadoAsientos,
  faltantes,
  formatCuentaRegresiva,
  leerErrorApi,
  normalizarDocumento,
  opcionesCantidad,
  pasajerosIniciales,
  pasajerosVisibles,
  puedePagar,
  segundosHasta,
  urgencia,
  validarContacto,
  validarFechaNacimiento,
  validarPasajero,
  validarTitular,
} from './carrito';

const vuelo = (cambios: Partial<VueloCarrito> = {}): VueloCarrito => ({
  flightIds: ['ida', 'vuelta'],
  fareIds: ['f1', 'f2'],
  cantidadPasajeros: 2,
  precioPorPasajero: 240000,
  subtotal: 480000,
  salida: '2026-10-19T08:00:00',
  tarifas: 'Light',
  pasajerosCargados: false,
  ...cambios,
});

const estadia = (cambios: Partial<EstadiaCarrito> = {}): EstadiaCarrito => ({
  id: 3,
  hotelId: 'h1',
  hotelNombre: 'Sheraton Córdoba',
  ciudad: 'Córdoba',
  tipoHabitacionId: 't1',
  tipoHabitacionNombre: 'Doble estándar',
  checkIn: '2026-11-10',
  checkOut: '2026-11-12',
  noches: 2,
  cantidadHabitaciones: 2,
  huespedes: 3,
  precioTotal: 580000,
  moneda: 'ARS',
  horaCheckIn: '14:00:00',
  zonaHoraria: 'America/Argentina/Buenos_Aires',
  politicaCancelacion: [{ horasAntes: 24, porcentajeReembolso: 100 }],
  titularNombre: null,
  titularDni: null,
  titularTelefono: null,
  estado: 'ACTIVA',
  ...cambios,
});

const carrito = (cambios: Partial<Carrito> = {}): Carrito => ({
  idCarrito: 12,
  creadorId: 7,
  estadoGeneral: 'INICIADA',
  segundosRestantes: 812,
  montoTotal: 1060000,
  moneda: 'ARS',
  cantidadItems: 2,
  datosCompletos: false,
  vuelo: vuelo(),
  estadias: [estadia()],
  asientos: [],
  ...cambios,
});

describe('cuenta regresiva', () => {
  it('formatea minutos y segundos', () => {
    expect(formatCuentaRegresiva(812)).toBe('13:32');
    expect(formatCuentaRegresiva(65)).toBe('01:05');
    expect(formatCuentaRegresiva(0)).toBe('00:00');
    expect(formatCuentaRegresiva(-5)).toBe('00:00');
  });

  it('calcula lo que falta redondeando hacia arriba y nunca negativo', () => {
    expect(segundosHasta(10_000, 1_500)).toBe(9);
    expect(segundosHasta(10_000, 12_000)).toBe(0);
  });

  it('avisa en los últimos tres minutos', () => {
    expect(urgencia(181)).toBe('normal');
    expect(urgencia(180)).toBe('aviso');
    expect(urgencia(0)).toBe('vencido');
  });
});

describe('estado del carrito', () => {
  it('cuenta ítems solo de un carrito vigente', () => {
    expect(cantidadEnCarrito(null)).toBe(0);
    expect(cantidadEnCarrito(carrito())).toBe(2);
    expect(cantidadEnCarrito(carrito({ estadoGeneral: 'PENDIENTE_PAGO' }))).toBe(2);
    expect(cantidadEnCarrito(carrito({ estadoGeneral: 'CONFIRMADA' }))).toBe(0);
    expect(cantidadEnCarrito(carrito({ segundosRestantes: 0 }))).toBe(0);
  });

  it('lista lo que falta cargar', () => {
    expect(faltantes(carrito())).toEqual(['Datos de los pasajeros', 'Titular de cada estadía']);
    const completo = carrito({
      vuelo: vuelo({ pasajerosCargados: true }),
      estadias: [estadia({ titularNombre: 'Ana Pérez' }), estadia({ id: 4, estado: 'CANCELADA' })],
    });
    expect(faltantes(completo)).toEqual([]);
    expect(faltantes(carrito({ vuelo: null }))).toEqual(['Titular de cada estadía']);
  });

  it('solo se paga con datos completos, en PENDIENTE_PAGO y antes de vencer', () => {
    const listo = carrito({ estadoGeneral: 'PENDIENTE_PAGO', datosCompletos: true });
    expect(puedePagar(listo)).toBe(true);
    expect(puedePagar({ ...listo, estadoGeneral: 'INICIADA' })).toBe(false);
    expect(puedePagar({ ...listo, datosCompletos: false })).toBe(false);
    expect(puedePagar({ ...listo, segundosRestantes: 0 })).toBe(false);
    expect(puedePagar({ ...listo, montoTotal: 0 })).toBe(false);
  });

  it('un carrito esperando pagadores sigue abierto: cuenta ítems, está en grupo y no se puede pagar entero', () => {
    const c = carrito({
      estadoGeneral: 'ESPERANDO_PAGADORES',
      segundosRestantes: 86100,
      cantidadItems: 2,
    });
    expect(carritoAbierto(c)).toBe(true);
    expect(enGrupo(c)).toBe(true);
    expect(cantidadEnCarrito(c)).toBe(2);
    expect(puedePagar(c)).toBe(false);
    expect(estadoBarraPago(c, { pagando: false, editando: false, vencido: false })).toEqual({
      habilitado: false,
      ayuda: 'Pago en grupo en curso',
    });
    expect(carritoAbierto(carrito({ estadoGeneral: 'CONFIRMADA' }))).toBe(false);
    expect(enGrupo(carrito())).toBe(false);
  });
});

describe('pasajeros', () => {
  it('sin pasajeros cargados muestra "Pasajero N" y nunca el UUID del asiento', () => {
    expect(pasajerosVisibles(carrito())).toEqual([
      { nombre: 'Pasajero 1', asiento: null },
      { nombre: 'Pasajero 2', asiento: null },
    ]);
  });

  it('con pasajeros cargados muestra el nombre y el número de asiento', () => {
    const c = carrito({
      vuelo: vuelo({ pasajerosCargados: true, cantidadPasajeros: 1 }),
      asientos: [
        {
          asientoIda: '1A',
          asientoVuelta: null,
          pagadorId: 7,
          precioCobrado: 240000,
          estadoPago: 'PENDIENTE',
          nombrePasajero: 'Ana Pérez',
          dniPasaporte: '30111222',
          tarifaNombre: 'Light',
        },
      ],
    });
    expect(pasajerosVisibles(c)).toEqual([{ nombre: 'Ana Pérez', asiento: '1A' }]);
  });

  it('el formulario arranca con los pasajeros ya cargados o vacío', () => {
    const vacio = {
      nombreCompleto: '',
      tipoDocumento: 'DNI',
      dniPasaporte: '',
      fechaNacimiento: '',
      genero: '',
      nacionalidad: 'Argentina',
    };
    expect(pasajerosIniciales(carrito())).toEqual([vacio, vacio]);
    const cargado = carrito({
      vuelo: vuelo({ pasajerosCargados: true, cantidadPasajeros: 1 }),
      asientos: [
        {
          asientoIda: '1A',
          asientoVuelta: null,
          pagadorId: 7,
          precioCobrado: 240000,
          estadoPago: 'PENDIENTE',
          nombrePasajero: 'Ana Pérez',
          dniPasaporte: 'AB123456',
          tipoDocumento: 'PASAPORTE',
          fechaNacimiento: '1990-05-17',
          genero: 'X',
          nacionalidad: 'Uruguay',
          tarifaNombre: 'Light',
        },
      ],
    });
    expect(pasajerosIniciales(cargado)).toEqual([
      {
        nombreCompleto: 'Ana Pérez',
        tipoDocumento: 'PASAPORTE',
        dniPasaporte: 'AB123456',
        fechaNacimiento: '1990-05-17',
        genero: 'X',
        nacionalidad: 'Uruguay',
      },
    ]);
  });

  const HOY = new Date(2026, 9, 5); // 5/10/2026
  const completo = (cambios: Partial<PasajeroInput> = {}): PasajeroInput => ({
    nombreCompleto: 'Ana Pérez',
    tipoDocumento: 'DNI',
    dniPasaporte: '30111222',
    fechaNacimiento: '1990-05-17',
    genero: 'F',
    nacionalidad: 'Argentina',
    ...cambios,
  });

  it('un pasajero con todos los datos es válido (el DNI admite puntos)', () => {
    expect(validarPasajero(completo(), HOY)).toEqual({});
    expect(validarPasajero(completo({ dniPasaporte: '30.111.222' }), HOY)).toEqual({});
  });

  it('pide cada dato que falta con su mensaje', () => {
    const vacio = completo({
      nombreCompleto: ' ',
      tipoDocumento: '',
      dniPasaporte: '12',
      fechaNacimiento: '',
      genero: '',
      nacionalidad: ' ',
    });
    expect(validarPasajero(vacio, HOY)).toEqual({
      nombreCompleto: 'Ingresá el nombre completo.',
      tipoDocumento: 'Elegí el tipo de documento.',
      dniPasaporte: 'Ingresá un DNI o pasaporte válido.',
      fechaNacimiento: 'Ingresá la fecha de nacimiento.',
      genero: 'Elegí una opción.',
      nacionalidad: 'Elegí la nacionalidad.',
    });
  });

  it('el documento se valida según su tipo', () => {
    expect(validarPasajero(completo({ dniPasaporte: 'AB123456' }), HOY).dniPasaporte).toBe(
      'Ingresá un DNI válido (7 u 8 números).',
    );
    expect(validarPasajero(completo({ dniPasaporte: '123456' }), HOY).dniPasaporte).toBe(
      'Ingresá un DNI válido (7 u 8 números).',
    );
    const pasaporte = completo({ tipoDocumento: 'PASAPORTE', dniPasaporte: 'AB123456' });
    expect(validarPasajero(pasaporte, HOY)).toEqual({});
    expect(
      validarPasajero(completo({ tipoDocumento: 'PASAPORTE', dniPasaporte: 'A1' }), HOY)
        .dniPasaporte,
    ).toBe('Ingresá un número de pasaporte válido (6 a 20 letras o números).');
  });

  it('normaliza el documento: el DNI sin puntos y el pasaporte en mayúsculas', () => {
    expect(normalizarDocumento('DNI', ' 30.111.222 ')).toBe('30111222');
    expect(normalizarDocumento('PASAPORTE', ' ab123456 ')).toBe('AB123456');
  });

  it('valida la fecha de nacimiento', () => {
    expect(validarFechaNacimiento('1990-05-17', HOY)).toBeNull();
    expect(validarFechaNacimiento('2026-10-05', HOY)).toBeNull(); // nació hoy
    expect(validarFechaNacimiento('2026-10-06', HOY)).toBe(
      'La fecha de nacimiento no puede ser futura.',
    );
    expect(validarFechaNacimiento('2026-02-30', HOY)).toBe('La fecha de nacimiento no es válida.');
    expect(validarFechaNacimiento('1850-01-01', HOY)).toBe('La fecha de nacimiento no es válida.');
    expect(validarFechaNacimiento('17/05/1990', HOY)).toBe('Ingresá la fecha de nacimiento.');
  });

  it('arma el pedido con un asiento por pasajero y la tarifa de ida, sin precio', () => {
    const form = [
      completo({ nombreCompleto: ' Ana Pérez ', dniPasaporte: '30.111.222' }),
      completo({
        nombreCompleto: 'Luis Gómez',
        tipoDocumento: 'PASAPORTE',
        dniPasaporte: 'ab123456',
        fechaNacimiento: '1985-01-02',
        genero: 'M',
        nacionalidad: 'Uruguay',
      }),
    ];
    expect(armarPasajeros(form, ['s1', 's2'], vuelo())).toEqual([
      {
        nombreCompleto: 'Ana Pérez',
        tipoDocumento: 'DNI',
        dniPasaporte: '30111222',
        fechaNacimiento: '1990-05-17',
        genero: 'F',
        nacionalidad: 'Argentina',
        asientoIda: 's1',
        asientoVuelta: null,
        tarifaId: 'f1',
        tarifaNombre: 'Light',
      },
      {
        nombreCompleto: 'Luis Gómez',
        tipoDocumento: 'PASAPORTE',
        dniPasaporte: 'AB123456',
        fechaNacimiento: '1985-01-02',
        genero: 'M',
        nacionalidad: 'Uruguay',
        asientoIda: 's2',
        asientoVuelta: null,
        tarifaId: 'f1',
        tarifaNombre: 'Light',
      },
    ]);
    expect(armarPasajeros(form, ['s1'], vuelo())).toBeNull();
    expect(
      armarPasajeros([completo({ genero: '' }), completo()], ['s1', 's2'], vuelo()),
    ).toBeNull();
  });

  it('el contacto arranca con el guardado o con el correo de la cuenta, y se valida', () => {
    expect(contactoInicial(carrito(), 'cuenta@correo.com')).toEqual({
      email: 'cuenta@correo.com',
      telefono: '',
    });
    expect(
      contactoInicial(
        carrito({ contactoEmail: 'otro@correo.com', contactoTelefono: '+54 11 5555-1234' }),
        'cuenta@correo.com',
      ),
    ).toEqual({ email: 'otro@correo.com', telefono: '+54 11 5555-1234' });
    expect(validarContacto({ email: 'ana@correo.com', telefono: '+54 11 5555-1234' })).toEqual({});
    expect(validarContacto({ email: 'ana@', telefono: '12' })).toEqual({
      email: 'Ingresá un correo válido.',
      telefono: 'Ingresá un teléfono válido.',
    });
  });

  it('sabe si los asientos guardados sirven para el vuelo del carrito', () => {
    expect(estadoAsientos(vuelo(), 'ida', ['s1', 's2'])).toBe('ok');
    expect(estadoAsientos(vuelo(), 'ida', ['s1'])).toBe('faltan');
    expect(estadoAsientos(vuelo(), 'otro', ['s1', 's2'])).toBe('otroVuelo');
    expect(estadoAsientos(vuelo(), null, [])).toBe('otroVuelo');
  });
});

describe('titulares', () => {
  it('valida nombre, documento y teléfono', () => {
    expect(validarTitular({ nombre: '', dni: '1', telefono: 'abc' })).toEqual({
      nombre: 'Ingresá el nombre del titular.',
      dni: 'Ingresá un DNI o pasaporte válido.',
      telefono: 'Ingresá un teléfono con código de área.',
    });
    expect(
      validarTitular({ nombre: 'Ana Pérez', dni: '30111222', telefono: '+54 11 5555-5555' }),
    ).toEqual({});
  });

  it('arma un titular por cada estadía activa', () => {
    const c = carrito({ estadias: [estadia(), estadia({ id: 4, estado: 'CANCELADA' })] });
    const form = { 3: { nombre: ' Ana Pérez ', dni: '30111222', telefono: '+54 11 5555-5555' } };
    expect(armarTitulares(c, form)).toEqual([
      { estadiaId: 3, nombre: 'Ana Pérez', dni: '30111222', telefono: '+54 11 5555-5555' },
    ]);
  });
});

describe('habitaciones', () => {
  it('ofrece desde las necesarias hasta las libres, con tope 10', () => {
    expect(opcionesCantidad(2, 4)).toEqual([2, 3, 4]);
    expect(opcionesCantidad(1, 30)).toHaveLength(10);
    expect(opcionesCantidad(3, 2)).toEqual([]);
    expect(opcionesCantidad(null, null)).toEqual([1]);
  });

  it('valida que entren los huéspedes', () => {
    expect(capacidadSuficiente(3, 2, 2)).toBe(true);
    expect(capacidadSuficiente(5, 2, 2)).toBe(false);
  });
});

describe('leerErrorApi', () => {
  const axiosError = (status: number, data: unknown) => ({
    isAxiosError: true,
    message: 'Request failed',
    response: { status, data },
  });

  it('lee el formato de reservation-service', () => {
    expect(
      leerErrorApi(
        axiosError(409, { codigo: 'CARRITO_YA_TIENE_VUELO', mensaje: 'Ya tenés un vuelo.' }),
        'x',
      ),
    ).toEqual({ status: 409, codigo: 'CARRITO_YA_TIENE_VUELO', mensaje: 'Ya tenés un vuelo.' });
  });

  it('lee el formato de payment-service y el de hotel-service', () => {
    expect(
      leerErrorApi(
        axiosError(409, { status: 409, error: 'Conflict', message: 'La reserva venció.' }),
        'x',
      ),
    ).toEqual({ status: 409, codigo: null, mensaje: 'La reserva venció.' });
    expect(leerErrorApi(axiosError(400, { error: 'Fechas inválidas.' }), 'x').mensaje).toBe(
      'Fechas inválidas.',
    );
  });

  it('410 es un carrito vencido en cualquier llamada del carrito', () => {
    expect(
      leerErrorApi(axiosError(410, { codigo: 'CARRITO_EXPIRADO', mensaje: 'Venció.' }), 'x'),
    ).toEqual({
      status: 410,
      codigo: 'CARRITO_EXPIRADO',
      mensaje: 'Venció.',
    });
    expect(leerErrorApi(axiosError(410, ''), 'x')).toEqual({
      status: 410,
      codigo: 'CARRITO_EXPIRADO',
      mensaje: 'Tu carrito venció. Armalo de nuevo para seguir.',
    });
    expect(leerErrorApi(axiosError(410, { error: 'Gone' }), 'x').codigo).toBe('CARRITO_EXPIRADO');
  });

  it('401 y 403 no muestran el texto en inglés de Spring', () => {
    expect(
      leerErrorApi(axiosError(401, { error: 'Unauthorized', message: 'x' }), 'x').mensaje,
    ).toBe('Tu sesión venció. Iniciá sesión de nuevo para seguir.');
    expect(leerErrorApi(axiosError(403, { error: 'Forbidden' }), 'x').mensaje).toBe(
      'No tenés permiso para hacer esta acción.',
    );
    expect(
      leerErrorApi(
        axiosError(403, { codigo: 'ACCESO_DENEGADO', mensaje: 'No es tu carrito.' }),
        'x',
      ),
    ).toEqual({ status: 403, codigo: 'ACCESO_DENEGADO', mensaje: 'No es tu carrito.' });
  });

  it('usa mensajes propios cuando el servicio no responde o no hay cuerpo', () => {
    expect(leerErrorApi(axiosError(503, ''), 'x').mensaje).toBe(
      'El servicio no está respondiendo. Probá de nuevo en unos minutos.',
    );
    expect(leerErrorApi({ isAxiosError: true, message: 'Network Error' }, 'x')).toEqual({
      status: null,
      codigo: null,
      mensaje: 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
    });
    expect(leerErrorApi(axiosError(409, {}), 'Por defecto').mensaje).toBe('Por defecto');
    expect(leerErrorApi(new Error('boom'), 'Por defecto').mensaje).toBe('Por defecto');
  });
});

describe('esperaParaReconsultar', () => {
  it('espera hasta el vencimiento más un segundo', () => {
    expect(esperaParaReconsultar(10_000, 4_000)).toBe(7_000);
  });

  it('si el carrito llegó ya vencido espera al menos 5 segundos', () => {
    expect(esperaParaReconsultar(4_000, 4_000)).toBe(5_000);
    expect(esperaParaReconsultar(1_000, 4_000)).toBe(5_000);
  });
});

describe('estadoBarraPago', () => {
  const listo = carrito({
    estadoGeneral: 'PENDIENTE_PAGO',
    datosCompletos: true,
    vuelo: vuelo({ pasajerosCargados: true }),
    estadias: [estadia({ titularNombre: 'Ana Pérez' })],
  });
  const opciones = { pagando: false, editando: false, vencido: false };

  it('con todo cargado habilita Pagar y muestra los ítems', () => {
    expect(estadoBarraPago(listo, opciones)).toEqual({
      habilitado: true,
      ayuda: '2 ítems · ARS',
    });
  });

  it('mientras paga no se puede volver a pagar', () => {
    expect(estadoBarraPago(listo, { ...opciones, pagando: true }).habilitado).toBe(false);
  });

  it('lista lo que falta cargar', () => {
    expect(estadoBarraPago(carrito(), opciones)).toEqual({
      habilitado: false,
      ayuda: 'Falta: datos de los pasajeros y titular de cada estadía',
    });
  });

  it('con un formulario en edición pide guardar o cancelar', () => {
    expect(estadoBarraPago(listo, { ...opciones, editando: true })).toEqual({
      habilitado: false,
      ayuda: 'Guardá o cancelá los cambios para pagar',
    });
  });

  it('vencido avisa que el carrito venció', () => {
    expect(estadoBarraPago(listo, { ...opciones, vencido: true })).toEqual({
      habilitado: false,
      ayuda: 'Tu carrito venció',
    });
    expect(estadoBarraPago({ ...listo, estadoGeneral: 'EXPIRADA' }, opciones).ayuda).toBe(
      'Tu carrito venció',
    );
  });

  it('sin faltantes pero sin poder pagar todavía, avisa que se está revisando', () => {
    expect(
      estadoBarraPago({ ...listo, estadoGeneral: 'INICIADA', datosCompletos: false }, opciones),
    ).toEqual({ habilitado: false, ayuda: 'Revisando el carrito…' });
  });
});
