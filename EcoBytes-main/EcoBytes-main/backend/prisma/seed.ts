/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Permisos por módulo
// Estructura: { name: 'menu.submenu.accion', menu, submenu, menuOrder }
// ---------------------------------------------------------------------------
const permissionsData = [
  // ── 1. Seguridad – Usuarios ──────────────────────────────────────────────
  { name: 'seguridad.usuarios.ver',      description: 'Ver usuarios',             menu: 'Seguridad',    submenu: 'Usuarios',       menuOrder: 1 },
  { name: 'seguridad.usuarios.crear',    description: 'Crear usuarios',           menu: 'Seguridad',    submenu: 'Usuarios',       menuOrder: 1 },
  { name: 'seguridad.usuarios.editar',   description: 'Editar usuarios',          menu: 'Seguridad',    submenu: 'Usuarios',       menuOrder: 1 },
  { name: 'seguridad.usuarios.eliminar', description: 'Eliminar usuarios',        menu: 'Seguridad',    submenu: 'Usuarios',       menuOrder: 1 },

  // ── 1. Seguridad – Roles ─────────────────────────────────────────────────
  { name: 'seguridad.roles.ver',         description: 'Ver roles',                menu: 'Seguridad',    submenu: 'Roles',          menuOrder: 1 },
  { name: 'seguridad.roles.crear',       description: 'Crear roles',              menu: 'Seguridad',    submenu: 'Roles',          menuOrder: 1 },
  { name: 'seguridad.roles.editar',      description: 'Editar roles',             menu: 'Seguridad',    submenu: 'Roles',          menuOrder: 1 },
  { name: 'seguridad.roles.eliminar',    description: 'Eliminar roles',           menu: 'Seguridad',    submenu: 'Roles',          menuOrder: 1 },

  // ── 2. Recolección – Puntos ──────────────────────────────────────────────
  { name: 'recoleccion.puntos.ver',      description: 'Ver puntos de recolección', menu: 'Recolección', submenu: 'Puntos',         menuOrder: 2 },
  { name: 'recoleccion.puntos.gestionar', description: 'Crear y editar puntos de recolección', menu: 'Recolección', submenu: 'Puntos', menuOrder: 2 },

  // ── 3. Reportes – Cumplimiento ───────────────────────────────────────────
  { name: 'reportes.cumplimiento.ver',       description: 'Ver reportes',         menu: 'Reportes',     submenu: 'Cumplimiento',   menuOrder: 3 },
  { name: 'reportes.cumplimiento.generar',   description: 'Generar reportes',     menu: 'Reportes',     submenu: 'Cumplimiento',   menuOrder: 3 },
  { name: 'reportes.cumplimiento.exportar',  description: 'Exportar reportes',    menu: 'Reportes',     submenu: 'Cumplimiento',   menuOrder: 3 },

  // ── 4. Dashboard – Métricas ──────────────────────────────────────────────
  { name: 'dashboard.metricas.ver',      description: 'Ver métricas e impacto ambiental', menu: 'Dashboard', submenu: 'Métricas', menuOrder: 4 },
];

// ---------------------------------------------------------------------------
// Mapa de permisos por rol
// ---------------------------------------------------------------------------
const ROLE_PERMISSIONS: Record<string, string[]> = {
  // SuperAdmin: todos los permisos (se asignan dinámicamente al final)
  SuperAdmin: [], // placeholder — se rellena con allPermissions

  Administrador: [
    // Seguridad completa (protección de SuperAdmin se aplica en código)
    'seguridad.usuarios.ver', 'seguridad.usuarios.crear', 'seguridad.usuarios.editar', 'seguridad.usuarios.eliminar',
    'seguridad.roles.ver', 'seguridad.roles.crear', 'seguridad.roles.editar', 'seguridad.roles.eliminar',
    // Recolección completa
    'recoleccion.puntos.ver', 'recoleccion.puntos.gestionar',
    // Reportes completo
    'reportes.cumplimiento.ver', 'reportes.cumplimiento.generar', 'reportes.cumplimiento.exportar',
    // Dashboard
    'dashboard.metricas.ver',
  ],

  Moderador: [
    // Sin acceso a seguridad
    // Recolección: ver y gestionar
    'recoleccion.puntos.ver', 'recoleccion.puntos.gestionar',
    // Reportes: ver y generar (no exportar)
    'reportes.cumplimiento.ver', 'reportes.cumplimiento.generar',
    // Dashboard
    'dashboard.metricas.ver',
  ],

  Usuario: [
    // Acceso mínimo — el dashboard no es accesible para este rol
    'recoleccion.puntos.ver',
  ],
};

// ---------------------------------------------------------------------------
// Session timeouts por rol (minutos)
// ---------------------------------------------------------------------------
const SESSION_TIMEOUTS: Record<string, number> = {
  SuperAdmin:    480, // 8 horas
  Administrador: 120, // 2 horas
  Moderador:     120, // 2 horas
  Usuario:        60, // 1 hora
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  SuperAdmin:    'Acceso irrestricto al sistema. Cuenta única e intransferible.',
  Administrador: 'Gestión completa de usuarios, roles y módulos operativos.',
  Moderador:     'Supervisión de operaciones de plataforma, reportes y puntos de recolección.',
  Usuario:       'Acceso a recursos públicos de la plataforma.',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding database...');

  // Limpiar permisos y asignaciones existentes
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  // Crear permisos
  for (const perm of permissionsData) {
    await prisma.permission.create({ data: perm });
  }
  console.log(`Permisos creados: ${permissionsData.length}`);

  const allPermissions = await prisma.permission.findMany();
  const permByName = new Map(allPermissions.map(p => [p.name, p.id]));

  // Crear o actualizar roles
  const roles: Record<string, { id: number }> = {};

  for (const roleName of ['SuperAdmin', 'Administrador', 'Moderador', 'Usuario']) {
    const permNames = roleName === 'SuperAdmin'
      ? allPermissions.map(p => p.name)
      : ROLE_PERMISSIONS[roleName];

    const permIds = permNames
      .map(n => permByName.get(n))
      .filter((id): id is number => id !== undefined);

    let role = await prisma.role.findUnique({ where: { name: roleName } });

    if (role) {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.role.update({
        where: { id: role.id },
        data: {
          description: ROLE_DESCRIPTIONS[roleName],
          sessionTimeout: SESSION_TIMEOUTS[roleName],
          active: true,
          permissions: { create: permIds.map(permissionId => ({ permissionId })) }
        }
      });
    } else {
      role = await prisma.role.create({
        data: {
          name: roleName,
          description: ROLE_DESCRIPTIONS[roleName],
          sessionTimeout: SESSION_TIMEOUTS[roleName],
          permissions: { create: permIds.map(permissionId => ({ permissionId })) }
        }
      });
    }

    roles[roleName] = { id: role.id };
    console.log(`Rol ${roleName} creado/actualizado (${permIds.length} permisos)`);
  }

  // ---------------------------------------------------------------------------
  // Usuarios de desarrollo
  // ---------------------------------------------------------------------------

  // SuperAdmin — contraseña segura, cuenta única
  const hashedSuperAdmin = await bcryptjs.hash('EcoB!t3s@SuperAdm1n#2026', 12);
  await prisma.user.upsert({
    where: { email: 'superadmin@ecobytes.cl' },
    update: { password: hashedSuperAdmin, roleId: roles['SuperAdmin'].id, active: true },
    create: {
      email: 'superadmin@ecobytes.cl',
      password: hashedSuperAdmin,
      name: 'Super Administrador',
      roleId: roles['SuperAdmin'].id,
    },
  });
  console.log('SuperAdmin: superadmin@ecobytes.cl / EcoB!t3s@SuperAdm1n#2026');

  // Administrador
  const hashedAdmin = await bcryptjs.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password: hashedAdmin, roleId: roles['Administrador'].id },
    create: {
      email: 'admin@example.com',
      password: hashedAdmin,
      name: 'Administrador',
      roleId: roles['Administrador'].id,
    },
  });
  console.log('Admin: admin@example.com / admin123');

  // Usuario de prueba
  const hashedTest = await bcryptjs.hash('test123', 10);
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: { password: hashedTest, roleId: roles['Usuario'].id },
    create: {
      email: 'test@example.com',
      password: hashedTest,
      name: 'Usuario Test',
      roleId: roles['Usuario'].id,
    },
  });
  console.log('Usuario test: test@example.com / test123');

  // ── Puntos de Recolección RAEE ────────────────────────────────────────────
  // Los puntos se sincronizan desde la API oficial del MMA Chile via syncCollectionPoints().
  // No se insertan puntos manuales en el seed; la tabla queda vacía hasta el primer sync.
  await prisma.collectionPoint.deleteMany();
  console.log('Puntos de recolección: tabla limpiada (se pobla con sync MMA).');

  console.log('\nSeed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
