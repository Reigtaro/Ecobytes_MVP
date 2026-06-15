// Helpers
export type ISODateString = string;

// Roles, Permisos, Usuarios
export interface Role {
  id: number;
  name: string;
  description: string | null;
  sessionTimeout: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  menu: string;
  submenu: string;
  menuOrder: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role_id: number | null;
  role_name: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}
