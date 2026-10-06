import { api } from '@/config/api';
import type {
  AgregarEstadiaRequest,
  Carrito,
  ContactoInput,
  IniciarVueloRequest,
  IniciarVueloResponse,
  PasajeroRequest,
  TitularRequest,
} from '../cart.types';

const BASE = '/api/bookings';

/** 204 (sin carrito, o carrito que quedó vacío) se devuelve como null. */
const carritoONull = (status: number, data: Carrito | '' | undefined): Carrito | null =>
  status === 204 || !data ? null : data;

export const obtenerCarrito = async (): Promise<Carrito | null> => {
  const res = await api.get<Carrito | ''>(`${BASE}/carrito`);
  return carritoONull(res.status, res.data);
};

export const agregarEstadia = async (pedido: AgregarEstadiaRequest): Promise<Carrito> => {
  const res = await api.post<Carrito>(`${BASE}/carrito/estadias`, pedido);
  return res.data;
};

export const quitarEstadia = async (estadiaId: number): Promise<Carrito | null> => {
  const res = await api.delete<Carrito | ''>(`${BASE}/carrito/estadias/${estadiaId}`);
  return carritoONull(res.status, res.data);
};

export const quitarVuelo = async (): Promise<Carrito | null> => {
  const res = await api.delete<Carrito | ''>(`${BASE}/carrito/vuelo`);
  return carritoONull(res.status, res.data);
};

/** Agrega el vuelo al carrito activo (o crea uno). 409 CARRITO_YA_TIENE_VUELO si ya tiene. */
export const iniciarVuelo = async (pedido: IniciarVueloRequest): Promise<IniciarVueloResponse> => {
  const res = await api.post<IniciarVueloResponse>(`${BASE}/init`, pedido);
  return res.data;
};

export const cargarPasajeros = async (
  id: number,
  pasajeros: PasajeroRequest[],
  contacto?: ContactoInput,
): Promise<void> => {
  await api.put(`${BASE}/${id}/passengers`, {
    pasajeros,
    ...(contacto && {
      contactoEmail: contacto.email.trim(),
      contactoTelefono: contacto.telefono.trim(),
    }),
  });
};

export const cargarTitulares = async (
  id: number,
  titulares: TitularRequest[],
): Promise<Carrito> => {
  const res = await api.put<Carrito>(`${BASE}/${id}/titulares`, titulares);
  return res.data;
};

/** Una reserva del usuario (carrito o pagada). */
export const obtenerReserva = async (id: number): Promise<Carrito> => {
  const res = await api.get<Carrito>(`${BASE}/${id}`);
  return res.data;
};
