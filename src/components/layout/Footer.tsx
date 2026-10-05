import { Link } from 'react-router';
import { Marca } from './Marca';

interface ItemFooter {
  label: string;
  /** Si tiene ruta, se muestra como enlace; si no, como texto. */
  to?: string;
}

const informacion: ItemFooter[] = [
  { label: 'Sobre nosotros' },
  { label: 'Preguntas frecuentes' },
  { label: 'Términos y condiciones' },
  { label: 'Políticas de privacidad' },
];

const servicios: ItemFooter[] = [
  { label: 'Buscar vuelos', to: '/' },
  { label: 'Buscar hoteles', to: '/hoteles' },
  { label: 'Mis reservas', to: '/my-reservations' },
];

const redes = [
  { nombre: 'Facebook', icono: 'fa-facebook-f' },
  { nombre: 'Instagram', icono: 'fa-instagram' },
  { nombre: 'X', icono: 'fa-x-twitter' },
  { nombre: 'YouTube', icono: 'fa-youtube' },
];

const contacto = [
  { icono: 'call', lineas: ['0810-999-1234'] },
  { icono: 'mail', lineas: ['soporte@despescar.com'] },
  { icono: 'chat', lineas: ['Chat en vivo'] },
  {
    icono: 'schedule',
    lineas: ['Lun a Vie de 09:00 a 21:00', 'Sáb y Dom de 10:00 a 18:00'],
  },
];

const Columna = ({ titulo, items }: { titulo: string; items: ItemFooter[] }) => (
  <div className="flex flex-col gap-3">
    <h6 className="font-bold text-white">{titulo}</h6>
    <ul className="flex flex-col gap-2 text-sm text-white/70">
      {items.map(({ label, to }) => (
        <li key={label} className={to ? undefined : 'cursor-default'}>
          {to ? (
            <Link
              to={to}
              className="underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {label}
            </Link>
          ) : (
            label
          )}
        </li>
      ))}
    </ul>
  </div>
);

export const Footer = () => {
  return (
    <footer className="w-full bg-[#031636] text-white">
      <div className="mx-auto max-w-370 px-4 py-12 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Marca variante="oscuro" tamano="lg" eslogan={false} />
            <p className="max-w-xs text-sm text-white/70">
              Te acompañamos a descubrir el mundo con las mejores experiencias de viaje.
            </p>
            <div className="flex gap-3">
              {redes.map((red) => (
                <span
                  key={red.nombre}
                  role="img"
                  aria-label={red.nombre}
                  className="flex h-9 w-9 cursor-default items-center justify-center rounded-lg bg-white/10"
                >
                  <i aria-hidden="true" className={`fa-brands ${red.icono} text-sm`} />
                </span>
              ))}
            </div>
          </div>

          <Columna titulo="Información" items={informacion} />
          <Columna titulo="Servicios" items={servicios} />

          <div className="flex flex-col gap-3">
            <h6 className="font-bold text-white">Atención al cliente</h6>
            <ul className="flex flex-col gap-3 text-sm text-white/70">
              {contacto.map((c) => (
                <li key={c.icono} className="flex cursor-default items-start gap-2">
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    {c.icono}
                  </span>
                  <span className="flex flex-col">
                    {c.lineas.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/70">© 2026 Despescar. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="rounded bg-white px-2 py-1 text-[#1a1f71] italic">VISA</span>
            <span
              aria-label="Mastercard"
              className="flex items-center rounded bg-white/10 px-2 py-1.5"
            >
              <span className="h-4 w-4 rounded-full bg-red-600" />
              <span className="-ml-1.5 h-4 w-4 rounded-full bg-orange-400/90" />
            </span>
            <span className="rounded bg-[#016fd0] px-2 py-1 text-white">AMEX</span>
            <span className="rounded bg-sky-300 px-2 py-1 text-[#1a3a6b] lowercase">
              mercado pago
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
