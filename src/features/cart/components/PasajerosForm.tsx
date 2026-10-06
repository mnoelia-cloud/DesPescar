import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react';
import { Link } from 'react-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useCarritoStore } from '@/store/useCarritoStore';
import { useFlightStore } from '@/store/useFlightStore';
import { cn } from '@/utils/cn';
import { NACIONALIDADES } from '@/utils/countries';
import type { Carrito, ContactoInput, PasajeroInput, VueloCarrito } from '../cart.types';
import {
  armarPasajeros,
  contactoInicial,
  estadoAsientos,
  pasajerosIniciales,
  validarContacto,
  validarPasajero,
} from '../carrito';
import { useFocoFormulario } from '../hooks/useFocoFormulario';
import { useCarritoUi } from './carritoUi';
import { BOTON_BORDE, BOTON_LLENO, CARD, FOCO } from './estilos';

export const inputClass =
  'focus:border-secondary focus:ring-secondary/20 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-secondary outline-none focus:ring-2 aria-invalid:border-alert';

type Errores = Partial<Record<keyof PasajeroInput, string>>;
type ErroresContacto = Partial<Record<keyof ContactoInput, string>>;

/** Hoy en hora local ('YYYY-MM-DD'): toISOString usa UTC y de noche daría el día siguiente. */
const hoyLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const Aviso = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
    {children}
  </p>
);

/** Estado "listo" de un formulario: check verde y botón para cambiar. */
export const DatosCargados = ({
  texto,
  accion,
  onCambiar,
  botonRef,
  seccionRef,
}: {
  texto: string;
  accion: string;
  onCambiar?: () => void;
  botonRef?: Ref<HTMLButtonElement>;
  seccionRef?: Ref<HTMLElement>;
}) => (
  <section
    ref={seccionRef}
    tabIndex={-1}
    aria-label={texto}
    className={cn(
      'flex flex-col gap-3 outline-none sm:flex-row sm:items-center sm:justify-between',
      CARD,
    )}
  >
    <div className="flex items-center gap-2">
      <span aria-hidden className="material-symbols-outlined text-success">
        check_circle
      </span>
      <p className="text-secondary font-semibold">{texto}</p>
    </div>
    {onCambiar && (
      <button ref={botonRef} type="button" className={cn(BOTON_BORDE, FOCO)} onClick={onCambiar}>
        <span aria-hidden className="material-symbols-outlined text-[20px]">
          edit
        </span>
        {accion}
      </button>
    )}
  </section>
);

/** Campo de texto con su error asociado por aria-describedby. */
export const Campo = ({
  id,
  label,
  error,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) => (
  <div className="text-secondary flex flex-col gap-1 text-sm font-medium">
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass}
      {...input}
    />
    {error && (
      <span id={`${id}-error`} className="text-alert text-xs">
        {error}
      </span>
    )}
  </div>
);

/** Lista desplegable con el mismo aspecto y la misma accesibilidad que Campo. */
export const CampoSelect = ({
  id,
  label,
  error,
  children,
  ...select
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="text-secondary flex flex-col gap-1 text-sm font-medium">
    <label htmlFor={id}>{label}</label>
    <select
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass}
      {...select}
    >
      {children}
    </select>
    {error && (
      <span id={`${id}-error`} className="text-alert text-xs">
        {error}
      </span>
    )}
  </div>
);

/**
 * Datos de los pasajeros (D26: antes en Booking.tsx). Asientos de useFlightStore, en orden.
 * Un PUT repetido reemplaza los pasajeros, así que una vez cargados se pueden cambiar.
 */
export const PasajerosForm = ({ carrito, vuelo }: { carrito: Carrito; vuelo: VueloCarrito }) => {
  const vueloElegido = useFlightStore((s) => s.selectedDepartureFlight);
  const asientos = useFlightStore((s) => s.selectedSeats);
  const cargarPasajeros = useCarritoStore((s) => s.cargarPasajeros);
  const emailCuenta = useAuthStore((s) => s.user?.email ?? '');
  const { anunciar, marcarEdicion } = useCarritoUi();
  const { formRef, botonRef, seccionRef, enfocarDespues, enfocarPrimerError } = useFocoFormulario();
  const [form, setForm] = useState<PasajeroInput[]>(() => pasajerosIniciales(carrito));
  const [editando, setEditando] = useState(false);
  const [errores, setErrores] = useState<Errores[]>([]);
  const [contacto, setContacto] = useState<ContactoInput>(() =>
    contactoInicial(carrito, emailCuenta),
  );
  const [erroresContacto, setErroresContacto] = useState<ErroresContacto>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ mensaje: string; elegirAsientos: boolean } | null>(null);

  useEffect(() => {
    marcarEdicion('pasajeros', editando);
    return () => marcarEdicion('pasajeros', false);
  }, [editando, marcarEdicion]);

  const estado = estadoAsientos(vuelo, vueloElegido, asientos);

  const cambiar = (i: number, campo: keyof PasajeroInput, valor: string) =>
    setForm((actual) => actual.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const empezarEdicion = () => {
    setForm(pasajerosIniciales(carrito));
    setContacto(contactoInicial(carrito, emailCuenta));
    setErroresContacto({});
    setErrores([]);
    setError(null);
    enfocarDespues('formulario');
    setEditando(true);
  };

  const cancelar = () => {
    enfocarDespues('cambiar');
    setEditando(false);
  };

  const enviar = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (enviando) return;
    setError(null);
    const nuevos = form.map((p) => validarPasajero(p));
    const nuevosContacto = validarContacto(contacto);
    setErrores(nuevos);
    setErroresContacto(nuevosContacto);
    if (nuevos.some((e) => Object.keys(e).length > 0) || Object.keys(nuevosContacto).length > 0) {
      enfocarPrimerError();
      return;
    }
    const pedido = armarPasajeros(form, asientos, vuelo);
    if (!pedido) {
      setError({ mensaje: 'Elegí un asiento para cada pasajero.', elegirAsientos: true });
      return;
    }
    setEnviando(true);
    const r = await cargarPasajeros(pedido, contacto);
    setEnviando(false);
    if (r.ok) {
      enfocarDespues('cambiar');
      setEditando(false);
      anunciar('Datos de los pasajeros guardados.');
    } else {
      setError({
        mensaje: r.error.mensaje,
        elegirAsientos: r.error.codigo === 'ASIENTO_NO_BLOQUEADO',
      });
    }
  };

  if (vuelo.pasajerosCargados && !editando) {
    return (
      <DatosCargados
        texto="Datos de los pasajeros cargados"
        accion="Cambiar pasajeros"
        onCambiar={estado === 'ok' ? empezarEdicion : undefined}
        botonRef={botonRef}
        seccionRef={seccionRef}
      />
    );
  }

  return (
    <section className={cn('flex flex-col gap-4', CARD)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-secondary text-lg font-bold">Datos de los pasajeros</h2>
        <p className="text-secondary/60 text-sm">
          Tal como figuran en el documento con el que van a viajar.
        </p>
      </div>
      {estado === 'otroVuelo' ? (
        <Aviso>
          No encontramos los asientos que elegiste para este vuelo. Quitá el vuelo del carrito y
          volvé a buscarlo para elegir asientos.
        </Aviso>
      ) : (
        <form ref={formRef} onSubmit={enviar} noValidate className="flex flex-col gap-4">
          {form.map((p, i) => (
            <fieldset
              key={i}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#E2E8F0] p-4"
            >
              <legend className="text-secondary px-1 font-semibold">Pasajero {i + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo
                  id={`pasajero-${i}-nombre`}
                  label="Nombre completo"
                  autoComplete={i === 0 ? 'name' : 'off'}
                  value={p.nombreCompleto}
                  maxLength={100}
                  onChange={(e) => cambiar(i, 'nombreCompleto', e.target.value)}
                  error={errores[i]?.nombreCompleto}
                />
                <Campo
                  id={`pasajero-${i}-nacimiento`}
                  label="Fecha de nacimiento"
                  type="date"
                  autoComplete={i === 0 ? 'bday' : 'off'}
                  min="1900-01-01"
                  max={hoyLocal()}
                  value={p.fechaNacimiento}
                  onChange={(e) => cambiar(i, 'fechaNacimiento', e.target.value)}
                  error={errores[i]?.fechaNacimiento}
                />
                <CampoSelect
                  id={`pasajero-${i}-tipo-documento`}
                  label="Tipo de documento"
                  value={p.tipoDocumento}
                  onChange={(e) => cambiar(i, 'tipoDocumento', e.target.value)}
                  error={errores[i]?.tipoDocumento}
                >
                  <option value="">Elegí una opción</option>
                  <option value="DNI">DNI</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </CampoSelect>
                <Campo
                  id={`pasajero-${i}-documento`}
                  label={p.tipoDocumento === 'PASAPORTE' ? 'Número de pasaporte' : 'Número de DNI'}
                  inputMode={p.tipoDocumento === 'PASAPORTE' ? 'text' : 'numeric'}
                  value={p.dniPasaporte}
                  maxLength={20}
                  onChange={(e) => cambiar(i, 'dniPasaporte', e.target.value)}
                  error={errores[i]?.dniPasaporte}
                />
                <CampoSelect
                  id={`pasajero-${i}-genero`}
                  label="Género (como figura en el documento)"
                  value={p.genero}
                  onChange={(e) => cambiar(i, 'genero', e.target.value)}
                  error={errores[i]?.genero}
                >
                  <option value="">Elegí una opción</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                  <option value="X">X (no binario)</option>
                </CampoSelect>
                <CampoSelect
                  id={`pasajero-${i}-nacionalidad`}
                  label="Nacionalidad"
                  value={p.nacionalidad}
                  onChange={(e) => cambiar(i, 'nacionalidad', e.target.value)}
                  error={errores[i]?.nacionalidad}
                >
                  <option value="">Elegí una opción</option>
                  {NACIONALIDADES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </CampoSelect>
              </div>
            </fieldset>
          ))}
          <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#E2E8F0] p-4">
            <legend className="text-secondary px-1 font-semibold">Contacto de quien compra</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo
                id="contacto-email"
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                value={contacto.email}
                maxLength={120}
                onChange={(e) => setContacto((c) => ({ ...c, email: e.target.value }))}
                error={erroresContacto.email}
              />
              <Campo
                id="contacto-telefono"
                label="Teléfono"
                type="tel"
                autoComplete="tel"
                placeholder="+54 11 5555-5555"
                value={contacto.telefono}
                maxLength={30}
                onChange={(e) => setContacto((c) => ({ ...c, telefono: e.target.value }))}
                error={erroresContacto.telefono}
              />
            </div>
          </fieldset>
          {estado === 'faltan' && (
            <Aviso>
              Tenés {asientos.length} de {vuelo.cantidadPasajeros} asientos elegidos.{' '}
              <Link to="/booking/seats" className="font-bold underline">
                Elegir asientos
              </Link>
            </Aviso>
          )}
          {error && (
            <Aviso>
              {error.mensaje}{' '}
              {error.elegirAsientos && (
                <Link to="/booking/seats" className="font-bold underline">
                  Volver a elegir asientos
                </Link>
              )}
            </Aviso>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className={cn(BOTON_LLENO, FOCO)}
              disabled={enviando || estado !== 'ok'}
              aria-busy={enviando}
            >
              {enviando ? 'Guardando...' : 'Guardar pasajeros'}
            </button>
            {editando && (
              <button
                type="button"
                className={cn(BOTON_BORDE, 'min-h-12', FOCO)}
                onClick={cancelar}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
};
