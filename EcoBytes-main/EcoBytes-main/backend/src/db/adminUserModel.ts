import prisma from './prisma';
import bcryptjs from 'bcryptjs';

// Obtener todos los usuarios con su rol
export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });
};

// Obtener usuario por ID
export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: { name: true }
      }
    }
  });
};

// Crear usuario
export const createUser = async (
  email: string,
  password: string,
  name: string,
  roleId: number | null,
  active: boolean = true
) => {
  const hashedPassword = await bcryptjs.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      roleId,
      active
    }
  });
  return user.id;
};

// Actualizar usuario
export const updateUser = async (
  id: number,
  email: string,
  name: string,
  roleId: number | null,
  active: boolean,
  password?: string
) => {
  const data: {
    email: string;
    name: string;
    roleId: number | null;
    active: boolean;
    password?: string;
  } = { email, name, roleId, active };

  if (password) {
    data.password = await bcryptjs.hash(password, 10);
  }

  await prisma.user.update({
    where: { id },
    data
  });
};

// Eliminar usuario
export const deleteUser = async (id: number) => {
  await prisma.user.delete({ where: { id } });
};

// Verificar si existe un email
export const emailExists = async (email: string, excludeId?: number) => {
  const user = await prisma.user.findFirst({
    where: {
      email,
      ...(excludeId ? { NOT: { id: excludeId } } : {})
    }
  });
  return !!user;
};
