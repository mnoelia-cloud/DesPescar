import { Button } from '@/components/ui/Button';
import { useEffect, useRef, useState } from 'react';
import { cargarGoogleIdentity, obtenerClientIdGoogle } from '../google';

const AVISO_NO_DISPONIBLE =
  'Todavía no se puede ingresar con Google ni con Apple: usá tu correo y contraseña.';

interface GoogleSignInProps {
  onCredential: (credential: string) => void;
}

/**
 * Botón "Continuar con Google". Si el back tiene el client id configurado, se muestra el botón
 * oficial de Google (que devuelve el ID token); si no, los botones solo avisan que no está disponible.
 */
export const GoogleSignIn = ({ onCredential }: GoogleSignInProps) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'no-disponible'>('cargando');
  const [aviso, setAviso] = useState(false);
  // El callback de Google se registra una vez; con el ref siempre llama a la versión actual
  const alRecibir = useRef(onCredential);
  useEffect(() => {
    alRecibir.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let activo = true;
    const preparar = async () => {
      try {
        const clientId = await obtenerClientIdGoogle();
        if (!clientId) throw new Error('sin client id');
        const google = await cargarGoogleIdentity();
        if (!activo || !contenedor.current) return;
        google.initialize({
          client_id: clientId,
          callback: ({ credential }) => alRecibir.current(credential),
        });
        google.renderButton(contenedor.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(400, contenedor.current.clientWidth || 400),
          locale: 'es',
        });
        setEstado('listo');
      } catch {
        if (activo) setEstado('no-disponible');
      }
    };
    void preparar();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        ref={contenedor}
        className={estado === 'listo' ? 'flex w-full justify-center' : 'hidden'}
      />
      {estado !== 'listo' && (
        <Button
          type="button"
          variant="secondary"
          className="h-12 border-2"
          disabled={estado === 'cargando'}
          onClick={() => setAviso(true)}
        >
          <i className="fa-brands fa-google"></i> Continuar con Google
        </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        className="h-12 border-2"
        onClick={() => setAviso(true)}
      >
        <i className="fa-brands fa-apple"></i> Continuar con Apple
      </Button>
      {aviso && (
        <p className="text-center text-[14px] text-gray-600" role="status">
          {estado === 'listo'
            ? 'Todavía no se puede ingresar con Apple: usá Google o tu correo y contraseña.'
            : AVISO_NO_DISPONIBLE}
        </p>
      )}
    </div>
  );
};
