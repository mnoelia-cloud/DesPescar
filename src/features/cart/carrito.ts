import axios from 'axios';
import type {
  Carrito,
  ErrorApi,
  EstadiaCarrito,
  ContactoInput,
  Genero,
  PasajeroInput,
  PasajeroRequest,
  TipoDocumento,
  TitularInput,
  TitularRequest,
  VueloCarrito,
} from './cart.types';

export const MAX_HABITACIONES = 10;
const AVISO_SEGUNDOS = 180;

// ---------- cuenta regresiva ----------

/** "13:32". Nunca negativo. */
export const formatCuentaRegresiva = (segundos: number) => {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Segundos enteros que faltan para venceEn (ms), redondeando hacia arriba. */
export const segundosHasta = (venceEn: number, ahora: number) =>
  Math.max(0, Math.ceil((venceEn - ahora) / 1000));

/** Espera mínima para volver a consultar un carrito que llegó ya vencido (evita un bucle de 1 s). */
const ESPERA_MINIMA_VENCIDO = 5000;

/**
 * Cuánto esperar (ms) para volver a pedir el carrito: un segundo después de que venza. Si el
 * servidor lo devolvió ya vencido, al menos 5 segundos.
 */
export const esperaParaReconsultar = (venceEn: number, ahora: number) => {
  const falta = venceEn - ahora;
  return falta > 0 ? falta + 1000 : ESPERA_MINIMA_VENCIDO;
};

export type Urgencia = 'normal' | 'aviso' | 'vencido';

export const urgencia = (segundos: number): Urgencia =>
  segundos <= 0 ? 'vencido' : segundos <= AVISO_SEGUNDOS ? 'aviso' : 'normal';

// ---------- estado del carrito ----------

/** Carrito que todavía ocupa lugares: armándose, listo para pagar o esperando a los pagadores del grupo. */
export const carritoAbierto = (c: Carrito) =>
  (c.estadoGeneral === 'INICIADA' ||
    c.estadoGeneral === 'PENDIENTE_PAGO' ||
    c.estadoGeneral === 'ESPERANDO_PAGADORES') &&
  c.segundosRestantes > 0;

/** Se está pagando en grupo (D-b17): congelado, se muestra el panel del grupo. */
export const enGrupo = (c: Carrito) => c.estadoGeneral === 'ESPERANDO_PAGADORES';

/** Lo que muestra el ícono del Nav. */
export const cantidadEnCarrito = (c: Carrito | null) =>
  c && carritoAbierto(c) ? c.cantidadItems : 0;

export const estadiasActivas = (c: Carrito): EstadiaCarrito[] =>
  c.estadias.filter((e) => e.estado === 'ACTIVA');

/** Pasos que faltan para poder pagar, en el orden en que aparecen en la página. */
export const faltantes = (c: Carrito): string[] => {
  const lista: string[] = [];
  if (c.vuelo && !c.vuelo.pasajerosCargados) lista.push('Datos de los pasajeros');
  if (estadiasActivas(c).some((e) => !e.titularNombre)) lista.push('Titular de cada estadía');
  return lista;
};

export const puedePagar = (c: Carrito) =>
  c.estadoGeneral === 'PENDIENTE_PAGO' &&
  c.datosCompletos &&
  c.segundosRestantes > 0 &&
  c.montoTotal > 0;

/** Texto de ayuda y estado del botón Pagar de la barra fija. */
export const estadoBarraPago = (
  c: Carrito,
  { pagando, editando, vencido }: { pagando: boolean; editando: boolean; vencido: boolean },
): { habilitado: boolean; ayuda: string } => {
  if (vencido || c.estadoGeneral === 'EXPIRADA' || c.segundosRestantes <= 0) {
    return { habilitado: false, ayuda: 'Tu carrito venció' };
  }
  if (enGrupo(c)) return { habilitado: false, ayuda: 'Pago en grupo en curso' };
  const pendientes = faltantes(c);
  if (pendientes.length > 0) {
    return { habilitado: false, ayuda: `Falta: ${pendientes.join(' y ').toLowerCase()}` };
  }
  if (editando) return { habilitado: false, ayuda: 'Guardá o cancelá los cambios para pagar' };
  if (!puedePagar(c)) return { habilitado: false, ayuda: 'Revisando el carrito…' };
  return {
    habilitado: !pagando,
    ayuda: `${c.cantidadItems} ${c.cantidadItems === 1 ? 'ítem' : 'ítems'} · ARS`,
  };
};

// ---------- pasajeros ----------

/** D25: sin pasajeros cargados se muestra "Pasajero N" (nunca el UUID del asiento). */
export const pasajerosVisibles = (c: Carrito): { nombre: string; asiento: string | null }[] => {
  if (!c.vuelo) return [];
  if (c.vuelo.pasajerosCargados) {
    return c.asientos.map((a, i) => ({
      nombre: a.nombrePasajero ?? `Pasajero ${i + 1}`,
      asiento: a.asientoIda,
    }));
  }
  return Array.from({ length: c.vuelo.cantidadPasajeros }, (_, i) => ({
    nombre: `Pasajero ${i + 1}`,
    asiento: null,
  }));
};

/** Valores iniciales del formulario: los pasajeros ya cargados (PUT repetido reemplaza) o vacíos. */
/** La plataforma opera vuelos nacionales: DNI y nacionalidad argentina son lo más común (se pueden cambiar). */
export const NACIONALIDAD_PREDETERMINADA = 'Argentina';

export const pasajerosIniciales = (c: Carrito): PasajeroInput[] => {
  const cantidad = c.vuelo?.cantidadPasajeros ?? 0;
  return Array.from({ length: cantidad }, (_, i) => {
    const a = c.vuelo?.pasajerosCargados ? c.asientos[i] : undefined;
    return {
      nombreCompleto: a?.nombrePasajero ?? '',
      tipoDocumento: a?.tipoDocumento ?? 'DNI',
      dniPasaporte: a?.dniPasaporte ?? '',
      fechaNacimiento: a?.fechaNacimiento ?? '',
      genero: a?.genero ?? '',
      nacionalidad: a?.nacionalidad ?? NACIONALIDAD_PREDETERMINADA,
    };
  });
};

const DOCUMENTO = /^[A-Za-z0-9.\- ]{6,20}$/;

const DNI = /^\d{7,8}$/;
const PASAPORTE = /^[A-Za-z0-9]{6,20}$/;
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const EDAD_MAXIMA = 120;

/** El DNI se escribe con o sin puntos ("30.111.222"): se guarda solo con números. */
export const normalizarDocumento = (tipo: PasajeroInput['tipoDocumento'], valor: string) =>
  tipo === 'DNI' ? valor.replace(/[.\s]/g, '') : valor.trim().toUpperCase();

/** null si la fecha de nacimiento sirve; si no, el mensaje para el pasajero. */
export const validarFechaNacimiento = (valor: string, hoy = new Date()): string | null => {
  const m = FECHA.exec(valor);
  if (!m) return 'Ingresá la fecha de nacimiento.';
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(anio, mes - 1, dia);
  if (f.getFullYear() !== anio || f.getMonth() !== mes - 1 || f.getDate() !== dia)
    return 'La fecha de nacimiento no es válida.';
  if (f > hoy) return 'La fecha de nacimiento no puede ser futura.';
  if (anio < hoy.getFullYear() - EDAD_MAXIMA) return 'La fecha de nacimiento no es válida.';
  return null;
};

export const validarPasajero = (
  p: PasajeroInput,
  hoy = new Date(),
): Partial<Record<keyof PasajeroInput, string>> => {
  const errores: Partial<Record<keyof PasajeroInput, string>> = {};
  const nombre = p.nombreCompleto.trim();
  if (nombre.length < 2 || nombre.length > 100)
    errores.nombreCompleto = 'Ingresá el nombre completo.';
  if (p.tipoDocumento !== 'DNI' && p.tipoDocumento !== 'PASAPORTE') {
    errores.tipoDocumento = 'Elegí el tipo de documento.';
    if (!DOCUMENTO.test(p.dniPasaporte.trim()))
      errores.dniPasaporte = 'Ingresá un DNI o pasaporte válido.';
  } else if (p.tipoDocumento === 'DNI') {
    if (!DNI.test(normalizarDocumento('DNI', p.dniPasaporte)))
      errores.dniPasaporte = 'Ingresá un DNI válido (7 u 8 números).';
  } else if (!PASAPORTE.test(normalizarDocumento('PASAPORTE', p.dniPasaporte))) {
    errores.dniPasaporte = 'Ingresá un número de pasaporte válido (6 a 20 letras o números).';
  }
  const fecha = validarFechaNacimiento(p.fechaNacimiento, hoy);
  if (fecha) errores.fechaNacimiento = fecha;
  if (p.genero !== 'F' && p.genero !== 'M' && p.genero !== 'X')
    errores.genero = 'Elegí una opción.';
  if (!p.nacionalidad.trim()) errores.nacionalidad = 'Elegí la nacionalidad.';
  return errores;
};

// ---------- contacto de quien compra ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^[0-9+()\-\s]{6,30}$/;

/** El contacto ya guardado en el carrito o, si no hay, el correo de la cuenta. */
export const contactoInicial = (c: Carrito, emailCuenta: string): ContactoInput => ({
  email: c.contactoEmail ?? emailCuenta,
  telefono: c.contactoTelefono ?? '',
});

export const validarContacto = (c: ContactoInput): Partial<Record<keyof ContactoInput, string>> => {
  const errores: Partial<Record<keyof ContactoInput, string>> = {};
  const email = c.email.trim();
  if (!EMAIL.test(email) || email.length > 120) errores.email = 'Ingresá un correo válido.';
  if (!TELEFONO.test(c.telefono.trim())) errores.telefono = 'Ingresá un teléfono válido.';
  return errores;
};

/**
 * Asientos guardados en useFlightStore frente al vuelo del carrito: 'otroVuelo' si se eligieron
 * para otro vuelo (o no hay), 'faltan' si no alcanzan para todos los pasajeros.
 */
export const estadoAsientos = (
  v: VueloCarrito,
  vueloElegido: string | null,
  asientos: string[],
): 'ok' | 'faltan' | 'otroVuelo' => {
  if (!vueloElegido || vueloElegido !== v.flightIds[0]) return 'otroVuelo';
  return asientos.length === v.cantidadPasajeros ? 'ok' : 'faltan';
};

/** Cuerpo de PUT /{id}/passengers. El precio lo calcula el servidor (D1). */
export const armarPasajeros = (
  form: PasajeroInput[],
  asientos: string[],
  v: VueloCarrito,
): PasajeroRequest[] | null => {
  if (form.length !== v.cantidadPasajeros || asientos.length !== form.length) return null;
  if (form.some((p) => !p.tipoDocumento || !p.genero)) return null;
  return form.map((p, i) => ({
    nombreCompleto: p.nombreCompleto.trim(),
    tipoDocumento: p.tipoDocumento as TipoDocumento,
    dniPasaporte: normalizarDocumento(p.tipoDocumento, p.dniPasaporte),
    fechaNacimiento: p.fechaNacimiento,
    genero: p.genero as Genero,
    nacionalidad: p.nacionalidad.trim(),
    asientoIda: asientos[i],
    asientoVuelta: null,
    tarifaId: v.fareIds[0],
    tarifaNombre: v.tarifas,
  }));
};

// ---------- titulares ----------

export const validarTitular = (t: TitularInput): Partial<Record<keyof TitularInput, string>> => {
  const errores: Partial<Record<keyof TitularInput, string>> = {};
  const nombre = t.nombre.trim();
  if (nombre.length < 2 || nombre.length > 100) errores.nombre = 'Ingresá el nombre del titular.';
  if (!DOCUMENTO.test(t.dni.trim())) errores.dni = 'Ingresá un DNI o pasaporte válido.';
  const tel = t.telefono.trim();
  if (!/^[+0-9 ()-]{6,30}$/.test(tel) || tel.replace(/\D/g, '').length < 6) {
    errores.telefono = 'Ingresá un teléfono con código de área.';
  }
  return errores;
};

/** Cuerpo de PUT /{id}/titulares: uno por cada estadía activa. */
export const armarTitulares = (
  c: Carrito,
  form: Record<number, TitularInput | undefined>,
): TitularRequest[] =>
  estadiasActivas(c).map((e) => {
    const t = form[e.id] ?? { nombre: '', dni: '', telefono: '' };
    return {
      estadiaId: e.id,
      nombre: t.nombre.trim(),
      dni: t.dni.trim(),
      telefono: t.telefono.trim(),
    };
  });

// ---------- habitaciones ----------

/** Cantidades de habitaciones que se pueden pedir: de las necesarias a las libres (tope 10). */
export const opcionesCantidad = (necesarias: number | null, libres: number | null): number[] => {
  const desde = Math.max(1, necesarias ?? 1);
  const hasta = Math.min(MAX_HABITACIONES, libres ?? desde);
  return hasta < desde ? [] : Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
};

export const capacidadSuficiente = (huespedes: number, capacidad: number, cantidad: number) =>
  huespedes <= capacidad * cantidad;

// ---------- errores ----------

interface CuerpoError {
  codigo?: unknown;
  mensaje?: unknown;
  message?: unknown;
  error?: unknown;
}

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

/**
 * Normaliza los errores de los tres formatos (D24): reservation {codigo, mensaje}, payment
 * {error, message} y hotel {error}. Sin cuerpo, usa un mensaje por estado.
 */
export const leerErrorApi = (err: unknown, porDefecto: string): ErrorApi => {
  if (!axios.isAxiosError(err)) return { status: null, codigo: null, mensaje: porDefecto };
  if (!err.response) {
    return {
      status: null,
      codigo: null,
      mensaje: 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
    };
  }
  const { status, data } = err.response;
  const cuerpo: CuerpoError = typeof data === 'object' && data !== null ? data : {};
  const mensaje = texto(cuerpo.mensaje) ?? texto(cuerpo.message) ?? texto(cuerpo.error);
  // 410: el carrito venció. Cualquier llamada del carrito puede responderlo.
  if (status === 410) {
    return {
      status,
      codigo: texto(cuerpo.codigo) ?? 'CARRITO_EXPIRADO',
      mensaje: texto(cuerpo.mensaje) ?? 'Tu carrito venció. Armalo de nuevo para seguir.',
    };
  }
  // 401/403 pueden venir de Spring en inglés ({error:"Unauthorized"}): solo se respeta `mensaje`.
  if (status === 401 || status === 403) {
    return {
      status,
      codigo: texto(cuerpo.codigo),
      mensaje:
        texto(cuerpo.mensaje) ??
        (status === 401
          ? 'Tu sesión venció. Iniciá sesión de nuevo para seguir.'
          : 'No tenés permiso para hacer esta acción.'),
    };
  }
  if (status >= 502 && status <= 504 && !texto(cuerpo.mensaje)) {
    return {
      status,
      codigo: texto(cuerpo.codigo),
      mensaje: 'El servicio no está respondiendo. Probá de nuevo en unos minutos.',
    };
  }
  return { status, codigo: texto(cuerpo.codigo), mensaje: mensaje ?? porDefecto };
};
