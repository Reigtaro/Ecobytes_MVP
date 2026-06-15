import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { login, register, verifyEmail, resendCode, refresh, logout, me, changePassword, uploadAvatar, deleteAvatar, forgotPassword, resetPassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

// Multer — almacenamiento de avatares
const avatarsDir = path.join(__dirname, '../../public/avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = (req as any).user?.userId ?? 'unknown';
    cb(null, `${userId}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF o WEBP'));
  },
});

const router = Router();

// Rate limiter para login: 5 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: { message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para registro: 3 registros por IP cada hora
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros
  message: { message: 'Demasiados registros desde esta IP. Intente nuevamente en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para verificacion: 10 intentos por IP cada 15 minutos
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos de verificacion. Intente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para reenvio: 3 reenvios por IP cada 15 minutos
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'Demasiados reenvios. Intente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para recuperacion de contraseña: 3 solicitudes por IP cada 15 minutos
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'Demasiadas solicitudes. Intente en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /auth/register - Iniciar registro (envia codigo de verificacion)
router.post('/register', registerLimiter, register);

// POST /auth/verify-email - Verificar codigo y crear usuario
router.post('/verify-email', verifyLimiter, verifyEmail);

// POST /auth/resend-code - Reenviar codigo de verificacion
router.post('/resend-code', resendLimiter, resendCode);

// POST /auth/login - Iniciar sesión
router.post('/login', loginLimiter, login);

// POST /auth/refresh - Renovar token
router.post('/refresh', refresh);

// POST /auth/logout - Cerrar sesión
router.post('/logout', logout);

// GET /auth/me - Obtener usuario actual (protegido)
router.get('/me', authenticateToken, me);

// POST /auth/forgot-password - Solicitar recuperacion de contraseña
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

// POST /auth/reset-password - Restablecer contraseña con token
router.post('/reset-password', resetPassword);

// POST /auth/change-password - Cambiar contraseña (protegido)
router.post('/change-password', authenticateToken, changePassword);

// PATCH /auth/avatar - Subir/actualizar foto de perfil
router.patch('/avatar', authenticateToken, avatarUpload.single('avatar'), uploadAvatar);

// DELETE /auth/avatar - Eliminar foto de perfil
router.delete('/avatar', authenticateToken, deleteAvatar);

export default router;
