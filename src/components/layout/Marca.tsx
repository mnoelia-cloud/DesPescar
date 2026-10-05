interface MarcaProps {
  variante?: 'claro' | 'oscuro';
  tamano?: 'sm' | 'lg' | 'xl';
  /** Muestra "Vuela diferente" bajo el nombre (por defecto, si). */
  eslogan?: boolean;
}

const estilos = {
  sm: {
    gap: 'gap-2',
    img: 'h-8',
    palabra: 'text-xl',
    bajada: 'flex text-[9px]',
  },
  lg: {
    gap: 'gap-2 sm:gap-3',
    img: 'h-8 sm:h-11',
    palabra: 'text-xl sm:text-3xl',
    bajada: 'hidden sm:flex text-[9px]',
  },
  xl: {
    gap: 'gap-3 sm:gap-4',
    img: 'h-11 sm:h-14',
    palabra: 'text-2xl sm:text-4xl',
    bajada: 'flex text-[10px] sm:text-xs',
  },
};

export const Marca = ({ variante = 'claro', tamano = 'lg', eslogan = true }: MarcaProps) => {
  const oscuro = variante === 'oscuro';
  const e = estilos[tamano];

  return (
    <div className={`flex items-center ${e.gap}`}>
      <img src="/despescar-isotipo.webp" alt="" className={`${e.img} w-auto`} />
      <div className="flex flex-col items-start">
        <h3
          className={`${e.palabra} leading-none font-bold tracking-widest ${
            oscuro ? 'text-white' : 'text-secondary'
          }`}
        >
          DESPESCAR
        </h3>
        {eslogan && (
          <span
            className={`${e.bajada} text-primary mt-1.5 items-center gap-1.5 font-semibold tracking-[0.2em] uppercase`}
          >
            <span aria-hidden="true" className="bg-primary h-px w-3" />
            Vuela diferente
            <span aria-hidden="true" className="bg-primary h-px w-3" />
          </span>
        )}
      </div>
    </div>
  );
};
