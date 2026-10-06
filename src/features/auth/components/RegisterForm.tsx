import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { GoogleSignIn } from './GoogleSignIn';
import type { errorAuth, InterfaceAuth } from '../auth.types';

export const RegisterForm = () => {
  const { executeRegister, executeGoogleLogin, errorAuth, setErrAuth, clearFieldError } = useAuth();
  const location = useLocation();

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!formData.get('terminos')) {
      setErrAuth({
        status: 0,
        message: 'Tenés que aceptar los términos y condiciones para crear la cuenta.',
        errors: undefined,
        timestapm: '',
      });
      return;
    }
    formData.delete('terminos');
    const data = Object.fromEntries(formData) as unknown as InterfaceAuth;
    await executeRegister(data);
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
      <h2 className="text-secondary text-xl font-bold">Crear cuenta</h2>
      <div className="flex w-full flex-col gap-4">
        {!errorAuth?.errors && errorAuth?.message && (
          <h3 className="text-alert flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined">error</span> {errorAuth?.message}
          </h3>
        )}
        <Input
          label="Nombre"
          name="firstName"
          type="text"
          icon="id_card"
          className="border-secondary focus-within:bg-primary h-15 border-2 bg-white"
          fontColor="text-black"
          focusColor="text-white"
          error={errorAuth?.errors ? errorAuth.errors.firstName : ''}
          onChange={handleInputChange}
        ></Input>
        <Input
          label="Apellido"
          name="lastName"
          type="text"
          icon="id_card"
          className="border-secondary focus-within:bg-primary h-15 border-2 bg-white"
          fontColor="text-black"
          focusColor="text-white"
          error={errorAuth?.errors ? errorAuth.errors.lastName : ''}
          onChange={handleInputChange}
        ></Input>
        <Input
          label="Correo Electrónico"
          name="email"
          icon="email"
          type="email"
          className="border-secondary focus-within:bg-primary h-15 border-2 bg-white"
          fontColor="text-black"
          focusColor="text-white"
          error={errorAuth?.errors ? errorAuth.errors.email : ''}
          onChange={handleInputChange}
        ></Input>
        <Input
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          icon="password"
          type="password"
          className="border-secondary focus-within:bg-primary h-15 border-2 bg-white"
          fontColor="text-black"
          focusColor="text-white"
          error={errorAuth?.errors ? errorAuth.errors.password : ''}
          onChange={handleInputChange}
        ></Input>
        <div className="flex w-full flex-row justify-between gap-2">
          <label className="font-semibold text-[#1A2B4C]" htmlFor="check_terms">
            ¿Aceptas los términos y condiciones?
          </label>
          <input
            id="check_terms"
            name="terminos"
            className="accent-secondary w-4 rounded-xl border border-black/20 p-2"
            type="checkbox"
          />
        </div>
        <Button type="submit" className="h-12 border-2">
          Registrarse
        </Button>
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-sm font-semibold">O</p>
        <GoogleSignIn onCredential={(credential) => void executeGoogleLogin(credential)} />
      </div>
      <div className="flex flex-col items-center gap-4 text-[#df6a17]">
        <Link to="/login" state={location.state}>
          <h3 className="cursor-pointer font-medium">¿Ya tienes cuenta? Inicia Sesión</h3>
        </Link>
      </div>
    </form>
  );
};
