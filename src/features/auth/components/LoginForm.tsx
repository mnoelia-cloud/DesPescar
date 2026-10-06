import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignIn } from './GoogleSignIn';
import type { errorAuth, InterfaceAuth } from '../auth.types';

export const LoginForm = () => {
  const { executeLogin, executeGoogleLogin, errorAuth, clearFieldError } = useAuth();
  const location = useLocation();
  // El registro manda acá el correo recién creado para mostrar el aviso y dejarlo cargado
  const cuentaCreada = (location.state as { cuentaCreada?: string } | null)?.cuentaCreada;

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData) as unknown as InterfaceAuth;
    await executeLogin(data);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;

    if (name) {
      clearFieldError(name as keyof Required<errorAuth>['errors']);
    }
  };

  return (
    <form
      noValidate
      action="submit"
      className="flex w-full max-w-100 flex-col items-center justify-center gap-6"
      onSubmit={handleSubmit}
    >
      <h2 className="text-secondary text-xl font-bold">Inicia sesión en tu cuenta</h2>
      <div className="flex w-full flex-col gap-4">
        {cuentaCreada && !errorAuth && (
          <p
            className="flex items-center gap-2 text-[14px] font-semibold text-green-700"
            role="status"
          >
            <span className="material-symbols-outlined">check_circle</span> Cuenta creada. Ingresá
            con tu contraseña.
          </p>
        )}
        {!errorAuth?.errors && errorAuth?.message && (
          <h3 className="flex shrink-0 items-center gap-2 text-[14px] text-red-400 transition-colors duration-200">
            <span className="material-symbols-outlined">error</span> {errorAuth?.message}
          </h3>
        )}
        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          icon="alternate_email"
          defaultValue={cuentaCreada ?? ''}
          className="border-secondary focus-within:bg-primary h-15 border-2 bg-white"
          fontColor="text-black"
          focusColor="text-white"
          error={errorAuth?.errors ? errorAuth.errors.email : ''}
          onChange={handleInputChange}
          required
        ></Input>
        <Input
          label="Contraseña"
          name="password"
          icon="password"
          type="password"
          autoComplete="current-password"
          className="border-secondary focus-within:bg-primary h-15 border-2 bg-white"
          fontColor="text-black"
          focusColor="text-white"
          error={errorAuth?.errors ? errorAuth.errors.password : ''}
          onChange={handleInputChange}
          required
        ></Input>
        <Button type="submit" className="h-12 border-2">
          Iniciar Sesión
        </Button>
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-sm font-semibold">O</p>
        <GoogleSignIn onCredential={(credential) => void executeGoogleLogin(credential)} />
      </div>
      <div className="flex flex-col items-center gap-4 text-[#df6a17]">
        <h3 className="cursor-pointer font-medium">¿Olvidaste tu contraseña?</h3>
        <Link to="/register" state={location.state}>
          <h3 className="cursor-pointer font-medium">¿No tienes cuenta? Registrate</h3>
        </Link>
      </div>
    </form>
  );
};
