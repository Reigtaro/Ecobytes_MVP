// Detectar si la app está en red local (no localhost)
const isLocalNetwork = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
};

export const getApiUrl = () => {
  // En red local, siempre usar hostname dinámico (ignorar env var)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback para SSR o localhost
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

// Guardar tokens en localStorage (para red local donde cookies no funcionan)
const saveTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
};

// Guardar timestamp de expiracion de sesion en localStorage
export const saveSessionExpiry = (minutes: number) => {
  if (typeof window !== 'undefined') {
    const expiresAt = Date.now() + minutes * 60_000;
    localStorage.setItem('sessionExpiresAt', expiresAt.toString());
  }
};

// Verificar si la sesion expiro segun el timestamp guardado
const isSessionExpired = (): boolean => {
  if (typeof window === 'undefined') return false;
  const expiresAt = localStorage.getItem('sessionExpiresAt');
  if (!expiresAt) return false; // Sin timestamp, no podemos determinar expiracion
  return Date.now() > parseInt(expiresAt, 10);
};

// Limpiar toda la sesion (tokens, usuario, expiracion)
const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiresAt');
  }
};

// Guardar usuario en localStorage
const saveUser = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

// Obtener usuario de localStorage (verifica expiracion de sesion)
export const getStoredUser = (): User | null => {
  if (typeof window !== 'undefined') {
    // Si la sesion expiro, limpiar todo y retornar null
    if (isSessionExpired()) {
      clearSession();
      return null;
    }

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
};

// Obtener token de localStorage
export const getAccessToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

// Helper para hacer fetch con autenticación
const authFetch = async (url: string, options: RequestInit = {}) => {
  const headersInit: Record<string, string> = {};

  // Copiar headers existentes
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headersInit[key] = value;
      });
    } else if (typeof options.headers === 'object') {
      Object.assign(headersInit, options.headers);
    }
  }

  // Siempre incluir el token si esta disponible
  const token = getAccessToken();
  if (token) {
    headersInit['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers: headersInit,
    credentials: isLocalNetwork() ? 'omit' : 'include',
  });
};

export interface User {
  id: number;
  email: string;
  name: string;
  active?: boolean;
  role_name: string | null;
  session_timeout: number;
  permissions: string[];
  avatar_url?: string | null;
}

export interface AuthResponse {
  message: string;
  user?: User;
}

// Detectar timezone del usuario
const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Santiago'; // Fallback para Chile
  }
};

export async function register(email: string, password: string, name: string): Promise<{ message: string; email: string }> {
  const timezone = getUserTimezone();

  const response = await fetch(`${getApiUrl()}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: isLocalNetwork() ? 'omit' : 'include',
    body: JSON.stringify({ email, password, name, timezone }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Error al registrar usuario') as Error & { code?: string };
    error.code = data.code;
    throw error;
  }

  return data;
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  const response = await fetch(`${getApiUrl()}/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: isLocalNetwork() ? 'omit' : 'include',
    body: JSON.stringify({ email, code }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al verificar codigo');
  }

  if (data.tokens) {
    saveTokens(data.tokens.accessToken, data.tokens.refreshToken);
  }

  if (data.user) {
    const userWithDefaults: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role_name: data.user.role_name || null,
      session_timeout: data.user.session_timeout || 60,
      permissions: data.user.permissions || []
    };
    saveUser(userWithDefaults);
    saveSessionExpiry(userWithDefaults.session_timeout);
  }

  return data;
}

export async function resendCode(email: string): Promise<{ message: string }> {
  const response = await fetch(`${getApiUrl()}/auth/resend-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: isLocalNetwork() ? 'omit' : 'include',
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al reenviar codigo');
  }

  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const apiUrl = getApiUrl();
  const localNet = isLocalNetwork();
  const timezone = getUserTimezone();

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // En red local no usar credentials para evitar problema con iOS Safari
    credentials: localNet ? 'omit' : 'include',
    body: JSON.stringify({ email, password, timezone }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Error al iniciar sesión') as Error & { code?: string; email?: string };
    error.code = data.code;
    error.email = data.email;
    throw error;
  }

  // Guardar tokens en localStorage (siempre, para consistencia con register)
  if (data.tokens) {
    saveTokens(data.tokens.accessToken, data.tokens.refreshToken);
  }

  // SIEMPRE guardar usuario en localStorage para que el frontend pueda accederlo
  if (data.user) {
    const userWithDefaults: User = {
      ...data.user,
      role_name: data.user.role_name || null,
      session_timeout: data.user.session_timeout || 15,
      permissions: data.user.permissions || []
    };
    saveUser(userWithDefaults);
    saveSessionExpiry(userWithDefaults.session_timeout);
  }

  return data;
}

export async function logout(reason: 'manual' | 'timeout' = 'manual'): Promise<void> {
  try {
    await authFetch(`${getApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  } catch {
    // Ignorar errores de logout en red local
  }
  // Limpiar toda la sesion (tokens, usuario, expiracion)
  clearSession();
}

export async function refreshToken(): Promise<AuthResponse> {
  // En red local, enviar refresh token en el body
  const storedRefreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

  const response = await authFetch(`${getApiUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: isLocalNetwork() && storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al renovar token');
  }

  // Si estamos en red local y recibimos nuevos tokens, guardarlos
  if (isLocalNetwork() && data.tokens) {
    saveTokens(data.tokens.accessToken, data.tokens.refreshToken);
  }

  return data;
}

export async function getMe(): Promise<{ user: User }> {
  const response = await authFetch(`${getApiUrl()}/auth/me`, {
    method: 'GET',
  });

  if (!response.ok) {
    // Si falla la verificación con backend, limpiar toda la sesion
    clearSession();

    // También limpiar la cookie httpOnly llamando al endpoint de logout
    // Esto evita que el middleware redirija away de /login por cookie stale
    try {
      await fetch(`${getApiUrl()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: isLocalNetwork() ? 'omit' : 'include',
      });
    } catch {
      // Ignorar errores de logout
    }

    let msg = 'No autenticado';
    try {
      const data = await response.json();
      msg = data.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await response.json();

  // Actualizar usuario almacenado con datos frescos del backend
  if (data.user) {
    saveUser(data.user);
  }

  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const response = await authFetch(`${getApiUrl()}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al cambiar la contraseña');
  }

  return data;
}

export async function uploadAvatar(file: File): Promise<{ avatar_url: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await authFetch(`${getApiUrl()}/auth/avatar`, {
    method: 'PATCH',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al subir el avatar');

  // Actualizar avatar_url en el usuario almacenado
  const stored = getStoredUser();
  if (stored) saveUser({ ...stored, avatar_url: data.avatar_url });

  return data;
}

export async function deleteAvatar(): Promise<void> {
  const response = await authFetch(`${getApiUrl()}/auth/avatar`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al eliminar el avatar');

  const stored = getStoredUser();
  if (stored) saveUser({ ...stored, avatar_url: null });
}

/** Construye la URL completa del avatar dado el path relativo. Devuelve null si no hay avatar. */
export function getAvatarUrl(avatarPath?: string | null): string | null {
  if (!avatarPath) return null;
  return `${getApiUrl()}${avatarPath}`;
}
