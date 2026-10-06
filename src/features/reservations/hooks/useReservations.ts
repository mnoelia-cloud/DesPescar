import { useCallback, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  estadiasDeReservas,
  separarPorPestana,
  soloVuelos,
} from '@/features/reservations/bookingToReservation';
import type { FlightReservation } from '@/features/reservations/reservations.types';
import { useMisReservasStore } from '@/features/reservations/store/useMisReservasStore';

const SIN_RESERVAS: FlightReservation[] = [];

/**
 * Único punto de acceso de la interfaz a las reservas del usuario (GET /api/bookings/mias). Las
 * vuelve a pedir cada vez que se monta una pantalla que las usa.
 */
export const useReservations = () => {
  const usuarioId = useAuthStore((state) => state.user?.id ?? null);
  const { reservas, usuarioId: dueno, cargado, error, cargar } = useMisReservasStore();

  const recargar = useCallback(
    () => (usuarioId == null ? Promise.resolve() : cargar(usuarioId)),
    [usuarioId, cargar],
  );

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const propias = dueno === usuarioId ? reservas : SIN_RESERVAS;
  const vuelos = useMemo(() => separarPorPestana(soloVuelos(propias)), [propias]);
  const hoteles = useMemo(() => separarPorPestana(estadiasDeReservas(propias)), [propias]);
  const listo = dueno === usuarioId && cargado;

  return {
    /** Mis reservas > Vuelos: las reservas que tienen vuelo, repartidas por estado. */
    vuelos,
    /** Mis reservas > Hoteles: cada estadía por separado, repartida por estado. */
    hoteles,
    all: propias,
    isLoading: !listo && !error,
    /** Solo si no hay nada para mostrar: con reservas ya cargadas, un error al refrescar no las tapa. */
    error: listo ? null : error,
    recargar,
  };
};

export const useReservation = (id: string | undefined) => {
  const { all, isLoading, error, recargar } = useReservations();
  const flight = useMemo(() => (id ? all.find((r) => r.id === id) : undefined), [id, all]);
  return { flight, isLoading, error, recargar };
};
