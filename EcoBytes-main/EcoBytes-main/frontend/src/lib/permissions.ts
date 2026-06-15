// Mapa de rutas y permisos requeridos
// El usuario debe tener al menos uno de los permisos listados para acceder

export interface RoutePermission {
  path: string;
  permissions: string[]; // Se requiere al menos uno de estos permisos para acceder
}

export const routePermissions: RoutePermission[] = [
  // ── Recolección ───────────────────────────────────────────────────────────
  { path: '/dashboard/recoleccion/puntos', permissions: ['recoleccion.puntos.ver'] },

  // ── Reportes ──────────────────────────────────────────────────────────────
  { path: '/dashboard/reportes/puntos',    permissions: ['reportes.cumplimiento.ver'] },
  { path: '/dashboard/reportes/actividad', permissions: ['reportes.cumplimiento.ver'] },

  // ── Seguridad ────────────────────────────────────────────────────────────
  { path: '/dashboard/seguridad/usuarios', permissions: ['seguridad.usuarios.ver'] },
  { path: '/dashboard/seguridad/roles', permissions: ['seguridad.roles.ver'] },
];

/**
 * Verifica si el usuario tiene acceso a una ruta específica
 * @param pathname - La ruta actual
 * @param userPermissions - Lista de permisos del usuario
 * @returns true si tiene acceso, false si no
 */
export function hasRouteAccess(pathname: string, userPermissions: string[]): boolean {
  const routeConfig = routePermissions.find(route => pathname.startsWith(route.path));

  // Ruta sin restricción definida (ej. /dashboard, /dashboard/perfil)
  if (!routeConfig) {
    return true;
  }

  return routeConfig.permissions.some(requiredPerm =>
    userPermissions.some(userPerm => userPerm.startsWith(requiredPerm.replace('.ver', '').replace('.ver_propios', '')))
  );
}
