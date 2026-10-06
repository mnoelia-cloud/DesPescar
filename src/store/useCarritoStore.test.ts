import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Carrito } from '@/features/cart/cart.types';
import * as carritoService from '@/features/cart/services/carritoService';
import { useCarritoStore } from './useCarritoStore';
import { useFlightStore } from './useFlightStore';

vi.mock('@/features/cart/services/carritoService', () => ({
  obtenerCarrito: vi.fn(),
  agregarEstadia: vi.fn(),
  quitarEstadia: vi.fn(),
  quitarVuelo: vi.fn(),
  cargarTitulares: vi.fn(),
  cargarPasajeros: vi.fn(),
}));

const carritoDe = (idCarrito: number): Carrito => ({
  idCarrito,
  creadorId: idCarrito,
  estadoGeneral: 'INICIADA',
  segundosRestantes: 600,
  montoTotal: 1000,
  moneda: 'ARS',
  cantidadItems: 1,
  datosCompletos: false,
  vuelo: null,
  estadias: [],
  asientos: [],
});

/** Promesa que se resuelve desde el test, para simular una respuesta lenta. */
const diferida = <T>() => {
  let resolver!: (v: T) => void;
  const promesa = new Promise<T>((r) => (resolver = r));
  return { promesa, resolver };
};

describe('useCarritoStore', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useCarritoStore.getState().limpiar();
  });

  it('recargar guarda el carrito recibido', async () => {
    vi.mocked(carritoService.obtenerCarrito).mockResolvedValue(carritoDe(1));
    await useCarritoStore.getState().recargar();
    const s = useCarritoStore.getState();
    expect(s.carrito?.idCarrito).toBe(1);
    expect(s.cargado).toBe(true);
    expect(s.cargando).toBe(false);
  });

  it('descarta la respuesta de un GET que termina después de limpiar (cierre de sesión)', async () => {
    const lenta = diferida<Carrito | null>();
    vi.mocked(carritoService.obtenerCarrito).mockReturnValueOnce(lenta.promesa);
    const pedido = useCarritoStore.getState().recargar();
    useCarritoStore.getState().limpiar();
    lenta.resolver(carritoDe(1));
    await pedido;
    const s = useCarritoStore.getState();
    expect(s.carrito).toBeNull();
    expect(s.cargado).toBe(false);
    expect(s.cargando).toBe(false);
  });

  it('el carrito de otro usuario no pisa al nuevo aunque llegue después', async () => {
    const deA = diferida<Carrito | null>();
    vi.mocked(carritoService.obtenerCarrito)
      .mockReturnValueOnce(deA.promesa)
      .mockResolvedValueOnce(carritoDe(2));
    const pedidoA = useCarritoStore.getState().recargar();
    useCarritoStore.getState().limpiar();
    await useCarritoStore.getState().recargar();
    deA.resolver(carritoDe(1));
    await pedidoA;
    expect(useCarritoStore.getState().carrito?.idCarrito).toBe(2);
  });

  it('descarta el error de un GET viejo', async () => {
    const lenta = diferida<Carrito | null>();
    vi.mocked(carritoService.obtenerCarrito).mockReturnValueOnce(
      lenta.promesa.then(() => Promise.reject(new Error('red'))),
    );
    const pedido = useCarritoStore.getState().recargar();
    useCarritoStore.getState().limpiar();
    lenta.resolver(null);
    await pedido;
    expect(useCarritoStore.getState().error).toBeNull();
  });

  it('una acción que termina después de limpiar no guarda el carrito', async () => {
    const lenta = diferida<Carrito | null>();
    vi.mocked(carritoService.quitarVuelo).mockReturnValueOnce(lenta.promesa);
    const accion = useCarritoStore.getState().quitarVuelo();
    useCarritoStore.getState().limpiar();
    lenta.resolver(carritoDe(1));
    const r = await accion;
    expect(r.ok).toBe(false);
    expect(useCarritoStore.getState().carrito).toBeNull();
  });

  describe('expirado', () => {
    const error410 = {
      isAxiosError: true,
      message: 'Gone',
      response: { status: 410, data: { codigo: 'CARRITO_EXPIRADO', mensaje: 'Venció.' } },
    };

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-05T12:00:00Z'));
      useFlightStore.setState({ selectedSeats: ['asiento-1'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('una acción con 410 marca el carrito vencido, lo recarga y olvida los asientos', async () => {
      useCarritoStore.getState().setCarrito(carritoDe(1));
      vi.mocked(carritoService.quitarVuelo).mockRejectedValueOnce(error410);
      vi.mocked(carritoService.obtenerCarrito).mockResolvedValueOnce(null);
      const r = await useCarritoStore.getState().quitarVuelo();
      expect(r.ok).toBe(false);
      const s = useCarritoStore.getState();
      expect(s.expirado).toBe(true);
      expect(s.carrito).toBeNull();
      expect(carritoService.obtenerCarrito).toHaveBeenCalledTimes(1);
      expect(useFlightStore.getState().selectedSeats).toEqual([]);
    });

    it('cargar pasajeros guarda el carrito actualizado y un 410 lo marca vencido', async () => {
      useCarritoStore.getState().setCarrito(carritoDe(1));
      vi.mocked(carritoService.cargarPasajeros).mockResolvedValueOnce(undefined);
      vi.mocked(carritoService.obtenerCarrito).mockResolvedValueOnce({
        ...carritoDe(1),
        montoTotal: 2000,
      });
      const pasajeros = [
        {
          nombreCompleto: 'Ana Pérez',
          tipoDocumento: 'DNI' as const,
          dniPasaporte: '30111222',
          fechaNacimiento: '1990-05-17',
          genero: 'F' as const,
          nacionalidad: 'Argentina',
          asientoIda: 'a1',
          asientoVuelta: null,
          tarifaId: 'f1',
          tarifaNombre: 'Light',
        },
      ];
      const contacto = { email: 'ana@correo.com', telefono: '+54 11 5555-1234' };
      expect((await useCarritoStore.getState().cargarPasajeros(pasajeros, contacto)).ok).toBe(true);
      expect(carritoService.cargarPasajeros).toHaveBeenCalledWith(1, pasajeros, contacto);
      expect(useCarritoStore.getState().carrito?.montoTotal).toBe(2000);

      vi.mocked(carritoService.cargarPasajeros).mockRejectedValueOnce(error410);
      vi.mocked(carritoService.obtenerCarrito).mockResolvedValueOnce(null);
      const r = await useCarritoStore.getState().cargarPasajeros(pasajeros, contacto);
      expect(r.ok).toBe(false);
      expect(useCarritoStore.getState().expirado).toBe(true);
    });

    it('recargar con 410 marca el carrito vencido', async () => {
      useCarritoStore.getState().setCarrito(carritoDe(1));
      vi.mocked(carritoService.obtenerCarrito).mockRejectedValueOnce(error410);
      await useCarritoStore.getState().recargar();
      const s = useCarritoStore.getState();
      expect(s.expirado).toBe(true);
      expect(s.carrito).toBeNull();
      expect(s.error).toBeNull();
      expect(useFlightStore.getState().selectedSeats).toEqual([]);
    });

    it('un carrito vigente que desaparece al llegar su vencimiento se marca vencido', async () => {
      useCarritoStore.getState().setCarrito(carritoDe(1));
      vi.setSystemTime(Date.now() + 600_000);
      vi.mocked(carritoService.obtenerCarrito).mockResolvedValueOnce(null);
      await useCarritoStore.getState().recargar();
      expect(useCarritoStore.getState().expirado).toBe(true);
      expect(useFlightStore.getState().selectedSeats).toEqual([]);
    });

    it('si desaparece mucho antes de vencer (se pagó) no se marca vencido', async () => {
      useCarritoStore.getState().setCarrito(carritoDe(1));
      vi.mocked(carritoService.obtenerCarrito).mockResolvedValueOnce(null);
      await useCarritoStore.getState().recargar();
      expect(useCarritoStore.getState().expirado).toBe(false);
      expect(useFlightStore.getState().selectedSeats).toEqual(['asiento-1']);
    });

    it('vaciar el carrito quitando ítems no lo marca vencido', async () => {
      useCarritoStore.getState().setCarrito(carritoDe(1));
      vi.mocked(carritoService.quitarEstadia).mockResolvedValueOnce(null);
      await useCarritoStore.getState().quitarEstadia(3);
      expect(useCarritoStore.getState().expirado).toBe(false);
    });

    it('sin carrito previo, un 204 no es un vencimiento', async () => {
      vi.mocked(carritoService.obtenerCarrito).mockResolvedValueOnce(null);
      await useCarritoStore.getState().recargar();
      expect(useCarritoStore.getState().expirado).toBe(false);
    });

    it('un carrito nuevo o limpiar borran la marca', async () => {
      vi.mocked(carritoService.obtenerCarrito).mockRejectedValueOnce(error410);
      await useCarritoStore.getState().recargar();
      useCarritoStore.getState().setCarrito(carritoDe(2));
      expect(useCarritoStore.getState().expirado).toBe(false);
      vi.mocked(carritoService.obtenerCarrito).mockRejectedValueOnce(error410);
      await useCarritoStore.getState().recargar();
      useCarritoStore.getState().limpiar();
      expect(useCarritoStore.getState().expirado).toBe(false);
    });
  });
});
