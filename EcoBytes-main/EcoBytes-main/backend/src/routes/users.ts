import { Router } from 'express';
import { list, getById, create, update, remove } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /users - Listar usuarios
router.get('/', requirePermission('seguridad.usuarios.ver'), list);

// GET /users/:id - Obtener usuario
router.get('/:id', requirePermission('seguridad.usuarios.ver'), getById);

// POST /users - Crear usuario
router.post('/', requirePermission('seguridad.usuarios.crear'), create);

// PUT /users/:id - Actualizar usuario
router.put('/:id', requirePermission('seguridad.usuarios.editar'), update);

// DELETE /users/:id - Eliminar usuario
router.delete('/:id', requirePermission('seguridad.usuarios.eliminar'), remove);

export default router;
