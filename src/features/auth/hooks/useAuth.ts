import { useState } from 'react';
import type { errorAuth, InterfaceAuth } from '../auth.types';
import { useLocation, useNavigate } from 'react-router';
import { useAuthStore } from '@/store/useAuthStore';
import { api, gatewayBaseUrl } from '@/config/api';
import axios from 'axios';
import { getPostLoginPath } from '../postLoginPath';
import { ingresarConGoogle, type LoginTokens } from '../google';

const SIN_CONEXION = 'No pudimos conectar con el servidor. Probá de nuevo en unos segundos.';

/** Convierte cualquier fallo de la API en algo que el formulario pueda mostrar. */
const errorParaMostrar = (err: unknown): errorAuth => {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
    const data = err.response.data as Partial<errorAuth>;
    if (data.message || data.errors) return { ...data, message: data.message ?? '' } as errorAuth;
  }
  return { status: 0, message: SIN_CONEXION, errors: undefined, timestapm: '' };
};

export const useAuth = () => {
  const [errorAuth, setErrAuth] = useState<errorAuth>();
  const navigate = useNavigate();
  const location = useLocation();

  const executeRegister = async (datos: InterfaceAuth) => {
    setErrAuth(undefined);

    try {
      const res = await api.post(`${gatewayBaseUrl}/api/auth/register`, datos);
      // Quien llegó desde una página protegida (por ejemplo una invitación) vuelve ahí al iniciar sesión.
      // El login muestra el aviso de cuenta creada y deja el correo cargado.
      const estadoPrevio = (location.state ?? {}) as Record<string, unknown>;
      navigate('/login', { state: { ...estadoPrevio, cuentaCreada: datos.email } });
      return res.data;
    } catch (err: unknown) {
      setErrAuth(errorParaMostrar(err));
    }
  };

  const currentUser = async () => {
    try {
      const res = await api.get(`${gatewayBaseUrl}/api/users/me`);
      const dataJson = await res.data;
      return dataJson;
    } catch (err: unknown) {
      console.error('Error al obtener el usuario actual', err);
      throw err;
    }
  };

  /** Con los tokens ya emitidos: guarda la sesión, trae el usuario y lo lleva a donde iba. */
  const terminarIngreso = async (tokens: LoginTokens) => {
    useAuthStore.setState({ tokens });
    const userData = await currentUser();
    const { login } = useAuthStore.getState();
    login(tokens, userData);
    navigate(getPostLoginPath(location.state, userData.role), { replace: true });
    return tokens;
  };

  const executeLogin = async (datos: InterfaceAuth) => {
    setErrAuth(undefined);

    try {
      const res = await api.post(`${gatewayBaseUrl}/api/auth/login`, datos);
      return await terminarIngreso(res.data as LoginTokens);
    } catch (err: unknown) {
      setErrAuth(errorParaMostrar(err));
    }
  };

  /** Ingreso con el ID token que devuelve el botón de Google. */
  const executeGoogleLogin = async (credential: string) => {
    setErrAuth(undefined);

    try {
      return await terminarIngreso(await ingresarConGoogle(credential));
    } catch (err: unknown) {
      setErrAuth(errorParaMostrar(err));
    }
  };

  const clearFieldError = (fieldError: keyof Required<errorAuth>['errors']) => {
    if (!errorAuth?.errors) return;

    setErrAuth((prev) => {
      if (!prev || !prev.errors) return prev;

      const updateErrors = { ...prev.errors };
      delete updateErrors[fieldError];

      return {
        ...prev,
        errors: updateErrors,
      };
    });
  };

  return {
    executeRegister,
    executeLogin,
    executeGoogleLogin,
    currentUser,
    errorAuth,
    setErrAuth,
    clearFieldError,
  };
};
