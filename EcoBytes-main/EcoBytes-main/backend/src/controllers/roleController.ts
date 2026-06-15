import { Request, Response } from 'express';
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  roleExistsByName,
  countUsersByRole
} from '../db/roleModel';

// GET /roles - Listar todos los roles (con búsqueda opcional)
export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const roles = await getAllRoles(search);
    res.json(roles);
  } catch (error) {
    console.error('Error listando roles:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /roles/:id - Obtener rol por ID
export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const result = await getRoleById(id);

    if (!result) {
      res.status(404).json({ message: 'Rol no encontrado' });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Error obteniendo rol:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// POST /roles - Crear rol
export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, permissions, sessionTimeout } = req.body;

    if (!name) {
      res.status(400).json({ message: 'El nombre es requerido' });
      return;
    }

    const exists = await roleExistsByName(name);
    if (exists) {
      res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
      return;
    }

    const roleId = await createRole(name, description || null, permissions || [], sessionTimeout ?? 15);

    res.status(201).json({
      message: 'Rol creado exitosamente',
      id: roleId
    });
  } catch (error) {
    console.error('Error creando rol:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /roles/:id - Actualizar rol
export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, active, permissions, sessionTimeout } = req.body;

    if (!name) {
      res.status(400).json({ message: 'El nombre es requerido' });
      return;
    }

    const role = await getRoleById(id);
    if (!role) {
      res.status(404).json({ message: 'Rol no encontrado' });
      return;
    }

    if (role.role.name === 'SuperAdmin') {
      res.status(403).json({ message: 'El rol SuperAdmin no puede ser modificado' });
      return;
    }

    const exists = await roleExistsByName(name, id);
    if (exists) {
      res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
      return;
    }

    await updateRole(id, name, description || null, active ?? true, permissions || [], sessionTimeout);

    res.json({ message: 'Rol actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// DELETE /roles/:id - Eliminar rol
export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    const role = await getRoleById(id);
    if (!role) {
      res.status(404).json({ message: 'Rol no encontrado' });
      return;
    }

    if (role.role.name === 'SuperAdmin') {
      res.status(403).json({ message: 'El rol SuperAdmin no puede ser eliminado' });
      return;
    }

    // Verificar si el rol tiene usuarios asignados
    const usersCount = await countUsersByRole(id);
    if (usersCount > 0) {
      res.status(400).json({
        message: `No se puede eliminar el rol porque tiene ${usersCount} usuario${usersCount > 1 ? 's' : ''} asignado${usersCount > 1 ? 's' : ''}`
      });
      return;
    }

    await deleteRole(id);
    res.json({ message: 'Rol eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando rol:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /roles/permissions - Listar todos los permisos
export const listPermissions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const permissions = await getAllPermissions();
    res.json(permissions);
  } catch (error) {
    console.error('Error listando permisos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// GET /roles/:id/users-count - Contar usuarios con rol asignado
export const getUsersCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const count = await countUsersByRole(id);
    res.json({ count });
  } catch (error) {
    console.error('Error contando usuarios por rol:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
