import { getAccessToken } from './auth';
import type { Role, Permission, User } from "./types";

// Re-exportar tipos para que puedan importarse desde api.ts
export type { Role, Permission, User };

// Detectar si estamos en red local (no localhost)
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

// Helper para hacer fetch con autenticación
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});

  // Siempre incluir el token si esta disponible
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: isLocalNetwork() ? 'omit' : 'include',
  });
};

// Roles API
export const rolesApi = {
  getAll: async (search?: string): Promise<Role[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await authFetch(`${getApiUrl()}/roles${params}`);
    if (!res.ok) throw new Error('Error al obtener roles');
    return res.json();
  },

  getById: async (id: number): Promise<{ role: Role; permissions: number[] }> => {
    const res = await authFetch(`${getApiUrl()}/roles/${id}`);
    if (!res.ok) throw new Error('Error al obtener rol');
    return res.json();
  },

  create: async (data: { name: string; description?: string; permissions: number[] }): Promise<{ id: number }> => {
    const res = await authFetch(`${getApiUrl()}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al crear rol');
    }
    return res.json();
  },

  update: async (id: number, data: { name: string; description?: string; active: boolean; permissions: number[]; sessionTimeout?: number }): Promise<void> => {
    const res = await authFetch(`${getApiUrl()}/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al actualizar rol');
    }
  },

  delete: async (id: number): Promise<void> => {
    const res = await authFetch(`${getApiUrl()}/roles/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al eliminar rol');
    }
  },

  getPermissions: async (): Promise<Permission[]> => {
    const res = await authFetch(`${getApiUrl()}/roles/permissions`);
    if (!res.ok) throw new Error('Error al obtener permisos');
    return res.json();
  },

  getUsersCount: async (id: number): Promise<{ count: number }> => {
    const res = await authFetch(`${getApiUrl()}/roles/${id}/users-count`);
    if (!res.ok) throw new Error('Error al obtener cantidad de usuarios');
    return res.json();
  },
};

// API de usuarios
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const res = await authFetch(`${getApiUrl()}/users`);
    if (!res.ok) throw new Error('Error al obtener usuarios');
    return res.json();
  },

  create: async (data: { name: string; email: string; password: string; roleId?: number }): Promise<{ id: number }> => {
    const res = await authFetch(`${getApiUrl()}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al crear usuario');
    }
    return res.json();
  },

  update: async (id: number, data: { name?: string; email?: string; roleId?: number; active?: boolean }): Promise<void> => {
    const res = await authFetch(`${getApiUrl()}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al actualizar usuario');
    }
  },

  delete: async (id: number): Promise<void> => {
    const res = await authFetch(`${getApiUrl()}/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Error al eliminar usuario');
    }
  },
};

