import { Router } from 'express';
import { list, getById, create, update, remove, listPermissions, getUsersCount } from '../controllers/roleController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /roles/permissions - Listar permisos (debe ir antes de /:id)
router.get('/permissions', requirePermission('seguridad.roles.ver'), listPermissions);

// GET /roles - Listar roles
router.get('/', requirePermission('seguridad.roles.ver'), list);

// GET /roles/:id/users-count - Contar usuarios con rol asignado (debe ir antes de /:id)
router.get('/:id/users-count', requirePermission('seguridad.roles.ver'), getUsersCount);

// GET /roles/:id - Obtener rol
router.get('/:id', requirePermission('seguridad.roles.ver'), getById);

// POST /roles - Crear rol
router.post('/', requirePermission('seguridad.roles.crear'), create);

// PUT /roles/:id - Actualizar rol
router.put('/:id', requirePermission('seguridad.roles.editar'), update);

// DELETE /roles/:id - Eliminar rol
router.delete('/:id', requirePermission('seguridad.roles.eliminar'), remove);

export default router;
