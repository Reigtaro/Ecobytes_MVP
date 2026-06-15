import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET es requerido en las variables de entorno');
}

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    permissions?: string[];
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Buscar token en cookies o en Authorization header
  let accessToken = req.cookies.accessToken;

  if (!accessToken) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
  }

  if (!accessToken) {
    res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    return;
  }

  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET) as { userId: number; email: string };

    // Verificar que el usuario sigue activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { active: true },
    });

    if (!user || !user.active) {
      res.status(403).json({ message: 'Tu cuenta esta desactivada', code: 'ACCOUNT_DEACTIVATED' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if ((error as any)?.name === 'JsonWebTokenError' || (error as any)?.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token inválido o expirado' });
    } else {
      res.status(401).json({ message: 'Token inválido o expirado' });
    }
  }
};

// Middleware de autenticación opcional: popula req.user si hay token válido,
// pero si no hay token o es inválido simplemente llama next() sin error (usuario guest).
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let accessToken = req.cookies.accessToken;

  if (!accessToken) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
  }

  // Sin token: continuar como guest
  if (!accessToken) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET) as { userId: number; email: string };

    // Verificar que el usuario sigue activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { active: true },
    });

    if (user && user.active) {
      req.user = decoded;
    }
    // Si el usuario está inactivo, simplemente no poblamos req.user (guest)
  } catch {
    // Token inválido o expirado: continuar como guest sin error
  }

  next();
};
