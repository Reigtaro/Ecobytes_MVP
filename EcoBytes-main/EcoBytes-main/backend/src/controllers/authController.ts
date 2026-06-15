import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { findUserByEmail, findUserById, createUser } from '../db/userModel';
import prisma from '../db/prisma';
import { sendVerificationCode, sendPasswordResetEmail } from '../services/emailService';

// Validar que los secretos JWT estén configurados
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es requerido en las variables de entorno');
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET es requerido en las variables de entorno');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

interface TokenPayload {
  userId: number;
  email: string;
}

const generateTokens = (payload: TokenPayload) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
  return { accessToken, refreshToken };
};

// Helper para opciones de cookies (sin sameSite en desarrollo para evitar problemas cross-origin)
const getCookieOptions = (maxAge: number) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const options: {
    httpOnly: boolean;
    secure: boolean;
    maxAge: number;
    sameSite?: 'lax' | 'strict' | 'none';
  } = {
    httpOnly: true,
    secure: isProduction,
    maxAge
  };

  if (isProduction) {
    options.sameSite = 'lax';
  }

  return options;
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, timezone } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email y password son requeridos' });
      return;
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconocida';
    const user = await findUserByEmail(email);

    if (!user) {
      console.log(`[AUTH] Login fallido | Email: ${email} (no existe) | IP: ${ip} | ${new Date().toISOString()}`);
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    const isValidPassword = await bcryptjs.compare(password, user.password);

    if (!isValidPassword) {
      console.log(`[AUTH] Login fallido | Email: ${email} (password incorrecto) | IP: ${ip} | ${new Date().toISOString()}`);
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    if (!user.active) {
      console.log(`[AUTH] Login bloqueado | Email: ${email} (cuenta desactivada) | IP: ${ip} | ${new Date().toISOString()}`);
      res.status(403).json({
        message: 'Tu cuenta esta desactivada',
        code: 'ACCOUNT_DEACTIVATED',
        email: user.email,
      });
      return;
    }

    // Actualizar timezone del usuario si se proporciona
    if (timezone && typeof timezone === 'string') {
      await prisma.user.update({
        where: { id: user.id },
        data: { timezone },
      });
    }

    const payload: TokenPayload = { userId: user.id, email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);

    // Configurar cookies httpOnly
    res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    // Extraer permisos del rol del usuario
    let permissions = user.role?.permissions?.map(rp => rp.permission.name) || [];



    console.log(`[AUTH] Login exitoso | Usuario: ${user.email} (ID: ${user.id}) | Rol: ${user.role?.name || 'externo'} | IP: ${ip} | ${new Date().toISOString()}`);

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        active: user.active,
        role_name: user.role?.name || null,
        session_timeout: user.role?.sessionTimeout || 15,
        permissions
      },
      // Tokens en body para clientes que no soportan cookies (iOS Safari en red local)
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, timezone } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: 'Email, password y nombre son requeridos' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser && !existingUser.active) {
      res.status(409).json({
        message: 'Este email tiene una cuenta desactivada. Inicia sesion para reactivarla.',
        code: 'ACCOUNT_DEACTIVATED_REGISTER',
      });
      return;
    }

    if (existingUser) {
      res.status(409).json({ message: 'El email ya está registrado' });
      return;
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    // Generar codigo de 6 digitos
    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcryptjs.hash(code, 10);

    // Borrar verificaciones pendientes anteriores del mismo email
    await prisma.pendingVerification.deleteMany({ where: { email } });

    // Crear registro de verificacion pendiente
    await prisma.pendingVerification.create({
      data: {
        email,
        hashedCode,
        name,
        hashedPassword,
        timezone: timezone || null,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
      },
    });

    // Enviar codigo por email
    await sendVerificationCode(email, code);

    res.status(200).json({
      message: 'Codigo de verificacion enviado',
      email,
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ message: 'Email y codigo son requeridos' });
      return;
    }

    // Buscar verificacion pendiente mas reciente no expirada
    const pending = await prisma.pendingVerification.findFirst({
      where: {
        email,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      res.status(400).json({ message: 'Codigo expirado o no existe registro pendiente' });
      return;
    }

    if (pending.attempts >= 5) {
      res.status(429).json({ message: 'Demasiados intentos. Solicita un nuevo codigo' });
      return;
    }

    const isValidCode = await bcryptjs.compare(code, pending.hashedCode);

    if (!isValidCode) {
      await prisma.pendingVerification.update({
        where: { id: pending.id },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ message: 'Codigo incorrecto' });
      return;
    }

    // Verificar que el email no fue registrado mientras tanto (race condition)
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      await prisma.pendingVerification.deleteMany({ where: { email } });
      res.status(409).json({ message: 'El email ya está registrado' });
      return;
    }

    // Buscar el rol "Usuario" para asignarlo automáticamente
    const defaultRole = await prisma.role.findUnique({ where: { name: 'Usuario' } });

    // Crear usuario con los datos guardados
    const userId = await createUser(email, pending.hashedPassword, pending.name, pending.timezone || undefined, defaultRole?.id ?? null);

    // Limpiar verificaciones pendientes
    await prisma.pendingVerification.deleteMany({ where: { email } });

    // Generar tokens y cookies
    const payload: TokenPayload = { userId, email };
    const { accessToken, refreshToken } = generateTokens(payload);

    res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: userId,
        email,
        name: pending.name,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Error en verificacion de email:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const resendCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email es requerido' });
      return;
    }

    // Buscar verificacion pendiente mas reciente (sin importar expiracion)
    const pending = await prisma.pendingVerification.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!pending) {
      res.status(400).json({ message: 'No hay registro pendiente para este email' });
      return;
    }

    // Generar nuevo codigo
    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcryptjs.hash(code, 10);

    // Actualizar registro con nuevo codigo, reset intentos y nueva expiracion
    await prisma.pendingVerification.update({
      where: { id: pending.id },
      data: {
        hashedCode,
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Enviar nuevo codigo por email
    await sendVerificationCode(email, code);

    res.status(200).json({ message: 'Nuevo codigo enviado' });
  } catch (error) {
    console.error('Error al reenviar codigo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    // Aceptar refresh token de cookie, body, o Authorization header
    let refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
    const authHeader = req.headers.authorization;
    if (!refreshToken && authHeader?.startsWith('Bearer ')) {
      refreshToken = authHeader.substring(7);
    }

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token no proporcionado' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;
    const user = await findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    if (!user.active) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.status(403).json({
        message: 'Tu cuenta esta desactivada',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    const payload: TokenPayload = { userId: user.id, email: user.email };
    const tokens = generateTokens(payload);

    res.cookie('accessToken', tokens.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.json({
      message: 'Token renovado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      // Tokens en body para clientes que no soportan cookies (iOS Safari en red local)
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    console.error('Error en refresh:', error);
    res.status(401).json({ message: 'Refresh token inválido o expirado' });
  }
};

export const logout = (req: Request, res: Response): void => {
  const reason = req.body?.reason || 'manual';
  // Intentar identificar al usuario desde el token (sin fallar si no hay)
  let userInfo = 'desconocido';
  try {
    let token = req.cookies?.accessToken;
    const authHeader = req.headers.authorization;
    if (!token && authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (token) {
      const decoded = jwt.decode(token) as TokenPayload | null;
      if (decoded) {
        userInfo = `${decoded.email} (ID: ${decoded.userId})`;
      }
    }
  } catch { /* ignorar */ }

  const label = reason === 'timeout' ? 'Sesion expirada (timeout)' : 'Logout manual';
  console.log(`[AUTH] ${label} | Usuario: ${userInfo} | ${new Date().toISOString()}`);

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logout exitoso' });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    // Aceptar token de cookie o de Authorization header
    let accessToken = req.cookies.accessToken;
    const authHeader = req.headers.authorization;
    if (!accessToken && authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (!accessToken) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET) as TokenPayload;
    const user = await findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    if (!user.active) {
      res.status(403).json({
        message: 'Tu cuenta esta desactivada',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    // Extraer nombres de permisos del rol del usuario
    let permissions = user.role?.permissions?.map(rp => rp.permission.name) || [];



    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        active: user.active,
        role_name: user.role?.name || null,
        session_timeout: user.role?.sessionTimeout || 15,
        permissions,
        avatar_url: user.avatarUrl || null,
      }
    });
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No se envió ningún archivo' });
      return;
    }

    const userId = req.user.userId;

    // Eliminar avatar anterior si existe
    const avatarsDir = path.join(__dirname, '../../public/avatars');
    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    for (const ext of extensions) {
      const oldPath = path.join(avatarsDir, `${userId}.${ext}`);
      if (fs.existsSync(oldPath) && oldPath !== req.file.path) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarPath = `/avatars/${req.file.filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatarPath },
    });

    res.json({ avatar_url: avatarPath });
  } catch (err) {
    console.error('Error al subir avatar:', err);
    res.status(500).json({ message: 'Error al subir el avatar' });
  }
};

export const deleteAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    const userId = req.user.userId;
    const user = await findUserById(userId);

    if (user?.avatarUrl) {
      const filePath = path.join(__dirname, '../../public', user.avatarUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    res.json({ message: 'Avatar eliminado' });
  } catch (err) {
    console.error('Error al eliminar avatar:', err);
    res.status(500).json({ message: 'Error al eliminar el avatar' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'El email es requerido' });
      return;
    }

    // Siempre responder igual para no revelar si el email existe
    const genericResponse = { message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.' };

    const user = await findUserByEmail(email);
    if (!user || !user.active) {
      res.json(genericResponse);
      return;
    }

    // Invalidar tokens anteriores de reset para este usuario
    await prisma.accountActionToken.updateMany({
      where: { userId: user.id, action: 'RESET_PASSWORD', usedAt: null },
      data: { usedAt: new Date() },
    });

    // Generar token seguro
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcryptjs.hash(rawToken, 10);

    await prisma.accountActionToken.create({
      data: {
        userId: user.id,
        email: user.email,
        hashedToken,
        action: 'RESET_PASSWORD',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    res.json(genericResponse);
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      res.status(400).json({ message: 'Email, token y nueva contraseña son requeridos' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    // Buscar token válido no usado y no expirado
    const tokenRecord = await prisma.accountActionToken.findFirst({
      where: {
        email,
        action: 'RESET_PASSWORD',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      res.status(400).json({ message: 'El enlace de recuperación no es válido o ha expirado' });
      return;
    }

    const isValidToken = await bcryptjs.compare(token, tokenRecord.hashedToken);
    if (!isValidToken) {
      res.status(400).json({ message: 'El enlace de recuperación no es válido o ha expirado' });
      return;
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Actualizar contraseña y marcar token como usado en una transacción
    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.accountActionToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // Aceptar token de cookie o de Authorization header
    let accessToken = req.cookies.accessToken;
    const authHeader = req.headers.authorization;
    if (!accessToken && authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (!accessToken) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET) as TokenPayload;
    const user = await findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'La contraseña actual y nueva son requeridas' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const isValidPassword = await bcryptjs.compare(currentPassword, user.password);

    if (!isValidPassword) {
      res.status(400).json({ message: 'La contraseña actual es incorrecta' });
      return;
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch {
    res.status(401).json({ message: 'Error al cambiar la contraseña' });
  }
};
