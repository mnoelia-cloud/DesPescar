import { create } from 'zustand';
import type {
  AgregarEstadiaRequest,
  Carrito,
  ErrorApi,
  ContactoInput,
  PasajeroRequest,
  TitularRequest,
} from '@/features/cart/cart.types';
import { carritoAbierto, leerErrorApi } from '@/features/cart/carrito';
import * as carritoService from '@/features/cart/services/carritoService';
import { useFlightStore } from './useFlightStore';

type Resultado = { ok: true } | { ok: false; error: ErrorApi };

interface CarritoState {
  carrito: Carrito | null;
  /** Momento (ms) en que vence el carrito, calculado al recibirlo con segundosRestantes. */
  venceEn: number | null;
  /** Ya se consultó GET /carrito al menos una vez en esta sesión. */
  cargado: boolean;
  cargando: boolean;
  error: string | null;
  /**
   * El carrito venció: el servidor respondió 410 o el carrito vigente desapareció al llegar su
   * vencimiento. /carrito lo muestra como aviso. Lo borran un carrito nuevo y limpiar().
   */
  expirado: boolean;
  /** Guarda un carrito recibido de cualquier endpoint (o null si quedó vacío). */
  setCarrito: (carrito: Carrito | null) => void;
  recargar: () => Promise<void>;
  agregarEstadia: (pedido: AgregarEstadiaRequest) => Promise<Resultado>;
  quitarEstadia: (estadiaId: number) => Promise<Resultado>;
  quitarVuelo: () => Promise<Resultado>;
  cargarTitulares: (titulares: TitularRequest[]) => Promise<Resultado>;
  /** PUT de pasajeros (responde sin cuerpo) y después el carrito actualizado. */
  cargarPasajeros: (pasajeros: PasajeroRequest[], contacto?: ContactoInput) => Promise<Resultado>;
  limpiar: () => void;
}

const SESION_CAMBIADA: ErrorApi = {
  status: null,
  codigo: 'SESION_CAMBIADA',
  mensaje: 'Tu sesión cambió. Volvé a intentarlo.',
};

/**
 * Margen para decidir que un carrito que desapareció venció (reloj del navegador contra el del
 * servidor, erratas 12). Si desaparece mucho antes de su vencimiento es que se pagó o se cerró.
 */
const MARGEN_VENCIMIENTO_MS = 15_000;

const vencimiento = (c: Carrito | null) => (c ? Date.now() + c.segundosRestantes * 1000 : null);

/**
 * Carrito del usuario (D25): vive en memoria, sin persistir, y se recarga con GET /carrito.
 * Lo usan el ícono del Nav, el detalle del hotel, el flujo de vuelos y /carrito.
 */
export const useCarritoStore = create<CarritoState>()((set, get) => {
  /**
   * Sube con cada limpiar() (cierre de sesión o cambio de usuario). Una respuesta que llega con
   * otra generación es de la sesión anterior y se descarta.
   */
  let generacion = 0;

  /** Marca el vencimiento y olvida los asientos elegidos: el servidor ya los liberó. */
  const marcarVencido = () => {
    set({ carrito: null, venceEn: null, cargado: true, error: null, expirado: true });
    useFlightStore.getState().limpiarCompra();
  };

  const esVencimiento = (err: unknown) => leerErrorApi(err, '').status === 410;

  const accion = async (
    llamada: () => Promise<Carrito | null>,
    porDefecto: string,
  ): Promise<Resultado> => {
    const g = generacion;
    try {
      const carrito = await llamada();
      if (g !== generacion) return { ok: false, error: SESION_CAMBIADA };
      get().setCarrito(carrito);
      return { ok: true };
    } catch (err: unknown) {
      if (g !== generacion) return { ok: false, error: SESION_CAMBIADA };
      if (esVencimiento(err)) {
        marcarVencido();
        void get().recargar();
      }
      return { ok: false, error: leerErrorApi(err, porDefecto) };
    }
  };

  return {
    carrito: null,
    venceEn: null,
    cargado: false,
    cargando: false,
    error: null,
    expirado: false,
    setCarrito: (carrito) =>
      set({
        carrito,
        venceEn: vencimiento(carrito),
        cargado: true,
        error: null,
        ...(carrito ? { expirado: false } : {}),
      }),
    recargar: async () => {
      const g = generacion;
      set({ cargando: true, error: null });
      try {
        const { carrito: previo, venceEn } = get();
        const carrito = await carritoService.obtenerCarrito();
        if (g !== generacion) return;
        const vencio =
          carrito === null &&
          previo !== null &&
          carritoAbierto(previo) &&
          venceEn !== null &&
          Date.now() >= venceEn - MARGEN_VENCIMIENTO_MS;
        if (vencio) marcarVencido();
        else get().setCarrito(carrito);
      } catch (err: unknown) {
        if (g !== generacion) return;
        if (esVencimiento(err)) marcarVencido();
        else set({ error: leerErrorApi(err, 'No pudimos cargar tu carrito.').mensaje });
      } finally {
        if (g === generacion) set({ cargando: false });
      }
    },
    agregarEstadia: (pedido) =>
      accion(() => carritoService.agregarEstadia(pedido), 'No pudimos agregar la estadía.'),
    quitarEstadia: (estadiaId) =>
      accion(() => carritoService.quitarEstadia(estadiaId), 'No pudimos quitar la estadía.'),
    quitarVuelo: () => accion(() => carritoService.quitarVuelo(), 'No pudimos quitar el vuelo.'),
    cargarTitulares: async (titulares) => {
      const c = get().carrito;
      if (!c)
        return { ok: false, error: { status: null, codigo: null, mensaje: 'No hay carrito.' } };
      return accion(
        () => carritoService.cargarTitulares(c.idCarrito, titulares),
        'No pudimos guardar los titulares.',
      );
    },
    cargarPasajeros: async (pasajeros, contacto) => {
      const c = get().carrito;
      if (!c)
        return { ok: false, error: { status: null, codigo: null, mensaje: 'No hay carrito.' } };
      return accion(async () => {
        await carritoService.cargarPasajeros(c.idCarrito, pasajeros, contacto);
        return carritoService.obtenerCarrito();
      }, 'No pudimos guardar los pasajeros.');
    },
    limpiar: () => {
      generacion += 1;
      set({
        carrito: null,
        venceEn: null,
        cargado: false,
        cargando: false,
        error: null,
        expirado: false,
      });
    },
  };
});
