import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth';
import {
  requestDeactivation,
  confirmDeactivation,
  requestReactivation,
  confirmReactivation,
} from '../controllers/accountController';

const router = Router();

// Rate limit solo en endpoints que envian emails (prevenir spam)
// Los endpoints de confirmacion ya estan protegidos por tokens de uso unico
const emailRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: { message: 'Demasiados intentos. Intente nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/request-deactivation', authenticateToken, emailRequestLimiter, requestDeactivation);
router.post('/confirm-deactivation', confirmDeactivation);
router.post('/request-reactivation', emailRequestLimiter, requestReactivation);
router.post('/confirm-reactivation', confirmReactivation);

export default router;
