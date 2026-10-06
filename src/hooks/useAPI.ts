import { useState, useEffect } from 'react';
import type { Airport, RutaBuscada } from '../types/Interfaces';
import type { MetadataSearch, Flight, FlightById } from '@/features/flights/flights.types';
import { api, NATIONAL_COUNTRY } from '@/config/api';

export const useAeropuerto = () => {
  const [aeropuertos, setAero] = useState<Airport[]>([]);

  useEffect(() => {
    let activo = true;
    let reintento: number | undefined;

    // Si el servicio de vuelos está reiniciando, el primer pedido falla: se reintenta
    // (2 s, 4 s, 8 s, 16 s) en lugar de dejar el buscador sin aeropuertos hasta recargar.
    const fetchAeropuertos = async (intento: number) => {
      try {
        const res = await api.get<Airport[]>('/api/airports');
        if (activo) {
          setAero(res.data.filter((airport) => airport.country === NATIONAL_COUNTRY));
        }
      } catch {
        if (activo && intento < 4) {
          reintento = window.setTimeout(
            () => void fetchAeropuertos(intento + 1),
            2000 * 2 ** intento,
          );
        } else if (activo) {
          console.error('No se pudieron cargar los aeropuertos.');
        }
      }
    };

    void fetchAeropuertos(0);
    return () => {
      activo = false;
      window.clearTimeout(reintento);
    };
  }, []);

  return {
    aeropuertos,
  };
};

export const useVuelos = (filtros?: RutaBuscada) => {
  const [departureFlights, setDepartureFlights] = useState<Flight[]>([]);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [metadatos, setMetadatos] = useState<MetadataSearch | null>(null);
  // Arranca cargando si ya hay una búsqueda armada: evita mostrar un instante "0 vuelos encontrados".
  const [isLoading, setIsLoading] = useState(() =>
    Boolean(filtros?.origin && filtros.destination && filtros.departureDate && filtros.passengers),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tieneFiltrosNecesarios = Boolean(
      filtros?.origin && filtros.destination && filtros.departureDate && filtros.passengers,
    );

    if (!tieneFiltrosNecesarios) {
      return;
    }

    let activo = true;

    const fetchVuelos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          origin: (filtros?.origin ?? '').toUpperCase(),
          destination: (filtros?.destination ?? '').toUpperCase(),
          departureDate: filtros?.departureDate ?? '',
          ...(filtros?.returnDate && { returnDate: filtros.returnDate }),
          passengers: String(filtros?.passengers ?? 1),
        });

        const res = await api.get(`/api/flights/search?${params.toString()}`);
        if (!activo) return;
        setDepartureFlights(res.data.departureFlights || []);
        setReturnFlights(res.data.returnFlights || []);
        setMetadatos(res.data.metadata || null);
      } catch {
        if (!activo) return;
        console.log('ERROR');
        setError('Ocurrió un error al buscar los vuelos');
        setDepartureFlights([]);
      } finally {
        if (activo) setIsLoading(false);
      }
    };

    fetchVuelos();

    return () => {
      activo = false;
    };
  }, [
    filtros?.origin,
    filtros?.destination,
    filtros?.departureDate,
    filtros?.returnDate,
    filtros?.passengers,
  ]);

  return { departureFlights, returnFlights, metadatos, isLoading, error };
};

export const useFlightId = (id: string) => {
  const [flightById, setFlightById] = useState<FlightById>();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    let activo = true;

    const fetchFlightById = async () => {
      setIsLoading(true);
      setError('');

      try {
        const res = await api.get(`/api/flights/${id}`);
        if (activo) setFlightById(res.data);
      } catch {
        if (activo) setError('Ocurrio un error al buscar el vuelo por ID.');
      } finally {
        if (activo) setIsLoading(false);
      }
    };

    fetchFlightById();

    return () => {
      activo = false;
    };
  }, [id]);

  return {
    flightById: id ? flightById : undefined,
    error: id ? error : '',
    isLoading: id ? isLoading : false,
  };
};

export const useSearchAirportByCode = (code: string) => {
  const [airport, setAirport] = useState<Airport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    let activo = true;

    const fetchAirport = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/airports/code/${code}`);
        if (activo) setAirport(res.data);
      } catch {
        if (activo) setError('Ocurrio un error al tratar de buscar el Aeropuerto.');
      } finally {
        if (activo) setIsLoading(false);
      }
    };

    fetchAirport();

    return () => {
      activo = false;
    };
  }, [code]);

  return {
    airport,
    isLoading,
    error,
  };
};
