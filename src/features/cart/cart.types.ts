import type { TramoCancelacion } from '@/features/hotels/hotels.types';

/** estadoGeneral de reservation-service (contrato C4). */
export type EstadoCarrito =
  'INICIADA' | 'PENDIENTE_PAGO' | 'ESPERANDO_PAGADORES' | 'CONFIRMADA' | 'EXPIRADA' | 'CANCELADA';

export interface VueloCarrito {
  flightIds: string[];
  fareIds: string[];
  cantidadPasajeros: number;
  precioPorPasajero: number;
  subtotal: number;
  /** Fecha y hora local del primer tramo, sin zona ("2026-10-19T08:00:00"). */
  salida: string;
  tarifas: string;
  pasajerosCargados: boolean;
}

export interface EstadiaCarrito {
  id: number;
  hotelId: string;
  hotelNombre: string;
  ciudad: string;
  tipoHabitacionId: string;
  tipoHabitacionNombre: string;
  checkIn: string;
  checkOut: string;
  noches: number;
  cantidadHabitaciones: number;
  huespedes: number;
  precioTotal: number;
  moneda: string;
  horaCheckIn: string;
  zonaHoraria: string;
  politicaCancelacion: TramoCancelacion[];
  titularNombre: string | null;
  titularDni: string | null;
  titularTelefono: string | null;
  estado: 'ACTIVA' | 'CANCELADA';
}

/** Un pasajero cargado. asientoIda es el número visible ("1A"). */
export interface AsientoCarrito {
  asientoIda: string | null;
  asientoVuelta: string | null;
  pagadorId: number;
  precioCobrado: number;
  estadoPago: string;
  nombrePasajero: string | null;
  dniPasaporte: string | null;
  tipoDocumento?: TipoDocumento | null;
  /** 'YYYY-MM-DD'. */
  fechaNacimiento?: string | null;
  genero?: Genero | null;
  nacionalidad?: string | null;
  tarifaNombre: string | null;
}

/** ReservationResponse: el carrito y, una vez pagado, la reserva. */
export interface Carrito {
  idCarrito: number;
  creadorId: number;
  estadoGeneral: EstadoCarrito;
  segundosRestantes: number;
  montoTotal: number;
  moneda: string;
  cantidadItems: number;
  datosCompletos: boolean;
  vuelo: VueloCarrito | null;
  estadias: EstadiaCarrito[];
  asientos: AsientoCarrito[];
  /** Contacto de quien compra (null hasta que se carga). */
  contactoEmail?: string | null;
  contactoTelefono?: string | null;
  creadoEn?: string | null;
  /** Solo en reservas canceladas. */
  motivoCancelacion?: string | null;
  /** Si la canceló su dueño: cuándo, cuánto se devuelve y si el reembolso todavía no salió. */
  canceladaEn?: string | null;
  montoReembolsado?: number | null;
  reembolsoPendiente?: boolean | null;
  /** Se pagó entre varios: el reembolso vuelve a cada pagador en proporción. */
  pagoEnGrupo?: boolean | null;
}

export interface AgregarEstadiaRequest {
  hotelId: string;
  tipoHabitacionId: string;
  checkIn: string;
  checkOut: string;
  cantidadHabitaciones: number;
  huespedes: number;
}

export interface IniciarVueloRequest {
  flightIds: string[];
  cantidadPasajeros: number;
  paymentType: 'SINGLE_PAYMENT';
  baggageIds: string[];
  hotelId: null;
  packageId: null;
}

export interface IniciarVueloResponse {
  bookingId: number;
  status: EstadoCarrito;
  paymentType: string;
}

export type TipoDocumento = 'DNI' | 'PASAPORTE';
/** Como figura en el DNI argentino: F, M o X. */
export type Genero = 'F' | 'M' | 'X';

/** Lo que pide una aerolínea de cada pasajero para emitir el pasaje. */
export interface PasajeroInput {
  nombreCompleto: string;
  tipoDocumento: TipoDocumento | '';
  dniPasaporte: string;
  /** 'YYYY-MM-DD' (lo que da <input type="date">). */
  fechaNacimiento: string;
  genero: Genero | '';
  nacionalidad: string;
}

/** Contacto de quien compra. */
export interface ContactoInput {
  email: string;
  telefono: string;
}

/** Cuerpo de PUT /{id}/passengers: asientoIda es el UUID del asiento bloqueado. */
export interface PasajeroRequest extends Omit<PasajeroInput, 'tipoDocumento' | 'genero'> {
  tipoDocumento: TipoDocumento;
  genero: Genero;
  asientoIda: string;
  asientoVuelta: null;
  tarifaId: string;
  tarifaNombre: string;
}

export interface TitularInput {
  nombre: string;
  dni: string;
  telefono: string;
}

export interface TitularRequest extends TitularInput {
  estadiaId: number;
}

/** Error de cualquier servicio, normalizado. */
export interface ErrorApi {
  status: number | null;
  codigo: string | null;
  mensaje: string;
}
