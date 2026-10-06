import { api } from '@/config/api';

/** Script oficial de Google Identity Services: solo se carga desde este origen. */
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

interface CredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill';
      width?: number;
      locale?: string;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

/** Client id público de Google, o null si el back no lo tiene configurado. */
export const obtenerClientIdGoogle = async (): Promise<string | null> => {
  const { data } = await api.get<{ clientId: string | null }>('/api/auth/google/config');
  return data.clientId || null;
};

/** Cambia el ID token de Google por los tokens propios de la app. */
export const ingresarConGoogle = async (credential: string): Promise<LoginTokens> => {
  const { data } = await api.post<LoginTokens>('/api/auth/google', { credential });
  return data;
};

let cargaScript: Promise<GoogleAccountsId> | null = null;

/** Carga el script de Google una sola vez y devuelve `google.accounts.id`. */
export const cargarGoogleIdentity = (): Promise<GoogleAccountsId> => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (cargaScript) return cargaScript;

  cargaScript = new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error('Google Identity no disponible'));
    };
    script.onerror = () => {
      cargaScript = null;
      reject(new Error('No se pudo cargar el script de Google'));
    };
    document.head.appendChild(script);
  });
  return cargaScript;
};
