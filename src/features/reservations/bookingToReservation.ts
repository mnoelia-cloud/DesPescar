import { differenceInMinutes, format, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Carrito } from '@/features/cart/cart.types';
import type { FlightById } from '@/features/flights/flights.types';
import type { EstadiaCarrito } from '@/features/cart/cart.types';
import type { EstadoReserva, FlightReservation, HotelBooking } from './reservations.types';

/** Foto de cada destino (en /public); el resto usa la imagen de la marca. */
const THUMBNAIL_BY_IATA: Record<string, string> = {
  BRC: '/bariloche.jpg',
  USH: '/ushuaia.jpg',
  COR: '/cordoba.jpg',
  MDZ: '/mendoza.jpg',
  SLA: '/salta.jpg',
  FTE: '/calafate.jpg',
  IGR: '/iguazu.jpg',
};

/** Foto de cada ciudad para las estadías (la clave va sin tildes y en minúsculas). */
const THUMBNAIL_BY_CITY: Record<string, string> = {
  bariloche: '/bariloche.jpg',
  'san carlos de bariloche': '/bariloche.jpg',
  ushuaia: '/ushuaia.jpg',
  cordoba: '/cordoba.jpg',
  mendoza: '/mendoza.jpg',
  salta: '/salta.jpg',
  'el calafate': '/calafate.jpg',
  calafate: '/calafate.jpg',
  'puerto iguazu': '/iguazu.jpg',
  iguazu: '/iguazu.jpg',
};

const sinTildes = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const thumbnailDeCiudad = (ciudad: string) =>
  THUMBNAIL_BY_CITY[sinTildes(ciudad)] ?? '/despescar.webp';

const fecha = (iso: string) => format(parseISO(iso), "d 'de' MMMM yyyy", { locale: es });
const hora = (iso: string) => format(parseISO(iso), 'HH:mm');

const duracion = (salida: Date, llegada: Date) => {
  const minutos = Math.max(0, differenceInMinutes(llegada, salida));
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
};

const ultimo = (momentos: Date[]) =>
  momentos.length ? new Date(Math.max(...momentos.map((m) => m.getTime()))) : null;

/** El final del último check-out (a las 23:59:59 de ese día). */
const finDeEstadia = (e: EstadiaCarrito) => parseISO(`${e.checkOut}T23:59:59`);

/**
 * Cuándo termina el vuelo de la reserva: la última llegada (o la salida, si no se pudo leer ningún
 * tramo). Sin vuelo, el final del último check-out. Cada estadía tiene además su propio estado.
 */
const finDelViaje = (reserva: Carrito, vuelos: (FlightById | undefined)[]): Date | null => {
  if (reserva.vuelo) {
    const llegadas = vuelos.filter((v) => v !== undefined).map((v) => parseISO(v.arrivalTime));
    return ultimo(llegadas) ?? parseISO(reserva.vuelo.salida);
  }
  return ultimo(reserva.estadias.map(finDeEstadia));
};

const estadoDeEstadia = (
  e: EstadiaCarrito,
  reservaCancelada: boolean,
  ahora: Date,
): EstadoReserva => {
  if (reservaCancelada || e.estado === 'CANCELADA') return 'cancelled';
  return finDeEstadia(e) < ahora ? 'completed' : 'upcoming';
};

/**
 * Convierte una reserva de reservation-service (GET /api/bookings/mias) a lo que muestra "Mis
 * reservas". vuelos: los tramos de reserva.vuelo.flightIds, en ese orden (undefined si no se pudo
 * leer alguno de flight-service).
 */
export const bookingToReservation = (
  reserva: Carrito,
  vuelos: (FlightById | undefined)[],
  ahora: Date,
): FlightReservation => {
  const [ida, vuelta] = vuelos;
  const pasajeros = reserva.asientos
    .map((a) => a.nombrePasajero)
    .filter((nombre): nombre is string => Boolean(nombre));
  const asientos = reserva.asientos
    .map((a) => a.asientoIda)
    .filter((asiento): asiento is string => Boolean(asiento));
  const fin = finDelViaje(reserva, vuelos);
  const cancelada = reserva.estadoGeneral === 'CANCELADA';

  const base: FlightReservation = {
    id: String(reserva.idCarrito),
    thumbnail: (ida && THUMBNAIL_BY_IATA[ida.destinationAirport.code]) ?? '/despescar.webp',
    flightNumber: ida?.flightNumber ?? '—',
    seats: asientos.join(', '),
    reservationCode: `DSC-${reserva.idCarrito}`,
    status: cancelada ? 'cancelled' : fin && fin < ahora ? 'completed' : 'upcoming',
    passengerName: pasajeros[0] ?? reserva.estadias[0]?.titularNombre ?? undefined,
    passengers: pasajeros,
    totalPaid: reserva.montoTotal,
    hotels: reserva.estadias.map((e) => ({
      id: e.id,
      hotelId: e.hotelId,
      name: e.hotelNombre,
      city: e.ciudad,
      room: e.tipoHabitacionNombre,
      checkIn: fecha(e.checkIn),
      checkOut: fecha(e.checkOut),
      checkInTime: e.horaCheckIn ? e.horaCheckIn.slice(0, 5) : undefined,
      nights: e.noches,
      rooms: e.cantidadHabitaciones,
      guests: e.huespedes,
      price: e.precioTotal,
      holder: e.titularNombre ?? undefined,
      status: estadoDeEstadia(e, cancelada, ahora),
    })),
  };
  if (cancelada && reserva.montoReembolsado != null) {
    base.refunded = reserva.montoReembolsado;
    base.refundPending = Boolean(reserva.reembolsoPendiente);
  }
  if (reserva.pagoEnGrupo) base.groupPaid = true;
  if (!reserva.vuelo) return base;

  base.flightPrice = reserva.vuelo.subtotal;
  if (vuelta) base.returnDate = fecha(vuelta.departureTime);
  if (!ida) {
    const { salida } = reserva.vuelo;
    return {
      ...base,
      origin: { iata: '—', city: 'Origen', time: hora(salida), date: fecha(salida) },
      destination: { iata: '—', city: 'Destino', time: '' },
    };
  }
  const salida = parseISO(ida.departureTime);
  const llegada = parseISO(ida.arrivalTime);
  return {
    ...base,
    origin: {
      iata: ida.originAirport.code,
      city: ida.originAirport.city,
      time: hora(ida.departureTime),
      date: fecha(ida.departureTime),
    },
    destination: {
      iata: ida.destinationAirport.code,
      city: ida.destinationAirport.city,
      time: hora(ida.arrivalTime),
    },
    nextDayArrival: !isSameDay(salida, llegada),
    duration: duracion(salida, llegada),
  };
};

/** A dónde lleva "Ver mis reservas" después de comprar: a Hoteles si la compra no tiene vuelo. */
export const rutaMisReservas = (conVuelo: boolean) =>
  conVuelo ? '/my-reservations' : '/my-reservations?tipo=hoteles';

/** Las reservas que tienen vuelo, para Mis reservas > Vuelos. */
export const soloVuelos = (reservas: FlightReservation[]) =>
  reservas.filter((r) => r.origin !== undefined && r.destination !== undefined);

/**
 * Cada estadía por separado (Mis reservas > Hoteles), en el orden recibido: la reserva más nueva
 * primero y, dentro de cada una, sus estadías en orden.
 */
export const estadiasDeReservas = (reservas: FlightReservation[]): HotelBooking[] =>
  reservas.flatMap((r) =>
    r.hotels.map((h) => ({
      ...h,
      reservationId: r.id,
      reservationCode: r.reservationCode,
      thumbnail: thumbnailDeCiudad(h.city),
      withFlight:
        r.origin && r.destination ? `${r.origin.iata} → ${r.destination.iata}` : undefined,
      refunded: r.refunded,
      refundPending: r.refundPending,
    })),
  );

/** Las tres pestañas de "Mis reservas", cada una en el orden recibido (la más nueva primero). */
export const separarPorPestana = <T extends { status: EstadoReserva }>(items: T[]) => ({
  upcoming: items.filter((r) => r.status === 'upcoming'),
  history: items.filter((r) => r.status === 'completed'),
  cancelled: items.filter((r) => r.status === 'cancelled'),
});
