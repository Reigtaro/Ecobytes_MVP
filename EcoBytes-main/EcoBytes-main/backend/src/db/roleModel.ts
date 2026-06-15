import prisma from './prisma';

// Obtener todos los roles (con búsqueda opcional)
export const getAllRoles = async (search?: string) => {
  return prisma.role.findMany({
    where: search ? {
      name: {
        contains: search
      }
    } : undefined,
    orderBy: { name: 'asc' }
  });
};

// Obtener rol por ID con sus permisos
export const getRoleById = async (id: number) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        select: { permissionId: true }
      }
    }
  });

  if (!role) return null;

  return {
    role: {
      id: role.id,
      name: role.name,
      description: role.description,
      sessionTimeout: role.sessionTimeout,
      active: role.active,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    },
    permissions: role.permissions.map(p => p.permissionId)
  };
};

// Crear rol
export const createRole = async (
  name: string,
  description: string | null,
  permissionIds: number[],
  sessionTimeout: number = 15
) => {
  const role = await prisma.role.create({
    data: {
      name,
      description,
      sessionTimeout,
      permissions: {
        create: permissionIds.map(permissionId => ({ permissionId }))
      }
    }
  });
  return role.id;
};

// Actualizar rol
export const updateRole = async (
  id: number,
  name: string,
  description: string | null,
  active: boolean,
  permissionIds: number[],
  sessionTimeout?: number
) => {
  // Eliminar permisos actuales y agregar nuevos
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        active,
        ...(sessionTimeout !== undefined && { sessionTimeout }),
        permissions: {
          create: permissionIds.map(permissionId => ({ permissionId }))
        }
      }
    })
  ]);
};

// Eliminar rol
export const deleteRole = async (id: number) => {
  await prisma.role.delete({ where: { id } });
};

// Obtener todos los permisos (ordenados por menuOrder para coincidir con el sidebar)
export const getAllPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: [{ menuOrder: 'asc' }, { submenu: 'asc' }, { name: 'asc' }]
  });
};

// Verificar si existe un rol con el mismo nombre
export const roleExistsByName = async (name: string, excludeId?: number) => {
  const role = await prisma.role.findFirst({
    where: {
      name,
      ...(excludeId ? { NOT: { id: excludeId } } : {})
    }
  });
  return !!role;
};

// Contar usuarios asignados a un rol
export const countUsersByRole = async (roleId: number) => {
  return prisma.user.count({
    where: { roleId }
  });
};
