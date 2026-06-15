import prisma from './prisma';

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });
};

export const findUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });
};

export const createUser = async (email: string, password: string, name: string, timezone?: string, roleId?: number | null) => {
  const user = await prisma.user.create({
    data: {
      email,
      password,
      name,
      ...(timezone && { timezone }),
      ...(roleId != null && { roleId }),
    }
  });
  return user.id;
};
