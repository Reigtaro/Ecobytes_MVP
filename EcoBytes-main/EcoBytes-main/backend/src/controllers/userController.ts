import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  emailExists
} from '../db/adminUserModel';
import { getRoleById } from '../db/roleModel';

// GET /users - Listar todos los usuarios
export const list = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    // Transformar al formato esperado por el frontend
    const transformed = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role_id: u.roleId,
      role_name: u.role?.name || null,
      active: u.active,
      created_at: u.createdAt,
      updated_at: u.updatedAt
    }));
    res.json(transformed);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /users/:id - Obtener usuario por ID
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role_id: user.roleId,
      role_name: user.role?.name || null,
      active: user.active,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// POST /users - Crear usuario
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role_id, active } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: 'Email, password y nombre son requeridos' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (role_id) {
      const targetRole = await getRoleById(parseInt(role_id));
      if (targetRole?.role.name === 'SuperAdmin') {
        res.status(403).json({ message: 'No se puede asignar el rol SuperAdmin' });
        return;
      }
    }

    const exists = await emailExists(email);
    if (exists) {
      res.status(409).json({ message: 'El email ya está registrado' });
      return;
    }

    const userId = await createUser(email, password, name, role_id || null, active ?? true);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      id: userId
    });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /users/:id - Actualizar usuario
export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { email, password, name, role_id, active } = req.body;

    if (!email || !name) {
      res.status(400).json({ message: 'Email y nombre son requeridos' });
      return;
    }

    if (password && password.length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Proteger al usuario SuperAdmin
    if (user.role?.name === 'SuperAdmin') {
      res.status(403).json({ message: 'El usuario SuperAdmin no puede ser modificado' });
      return;
    }

    // Prevenir que un usuario cambie su propio rol
    if (req.user?.userId === id) {
      const incomingRoleId = role_id ? parseInt(role_id) : null;
      const currentRoleId = user.roleId ?? null;
      if (incomingRoleId !== currentRoleId) {
        res.status(403).json({ message: 'No puedes cambiar tu propio rol' });
        return;
      }
    }

    // Prevenir asignación del rol SuperAdmin
    if (role_id) {
      const targetRole = await getRoleById(parseInt(role_id));
      if (targetRole?.role.name === 'SuperAdmin') {
        res.status(403).json({ message: 'No se puede asignar el rol SuperAdmin' });
        return;
      }
    }

    const exists = await emailExists(email, id);
    if (exists) {
      res.status(409).json({ message: 'El email ya está registrado' });
      return;
    }

    await updateUser(id, email, name, role_id || null, active ?? true, password || undefined);

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// DELETE /users/:id - Eliminar usuario
export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (req.user?.userId === id) {
      res.status(403).json({ message: 'No puedes eliminar tu propia cuenta' });
      return;
    }

    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    if (user.role?.name === 'SuperAdmin') {
      res.status(403).json({ message: 'El usuario SuperAdmin no puede ser eliminado' });
      return;
    }

    await deleteUser(id);
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
