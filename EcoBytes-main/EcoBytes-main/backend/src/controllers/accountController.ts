import { Request, Response } from 'express';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import prisma from '../db/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendDeactivationEmail, sendReactivationEmail } from '../services/emailService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const requestDeactivation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, active: true, roleId: true },
    });

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    if (!user.active) {
      res.status(400).json({ message: 'La cuenta ya esta desactivada' });
      return;
    }

    if (user.roleId) {
      res.status(403).json({ message: 'Los usuarios internos no pueden desactivar su cuenta' });
      return;
    }

    // Borrar tokens de desactivacion previos para este usuario
    await prisma.accountActionToken.deleteMany({
      where: { userId: user.id, action: 'DEACTIVATE' },
    });

    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcryptjs.hash(token, 10);

    await prisma.accountActionToken.create({
      data: {
        userId: user.id,
        email: user.email,
        hashedToken,
        action: 'DEACTIVATE',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      },
    });

    const confirmUrl = `${FRONTEND_URL}/cuenta/desactivar/confirmar?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendDeactivationEmail(user.email, confirmUrl);

    res.status(200).json({ message: 'Email de confirmacion enviado' });
  } catch (error) {
    console.error('Error en requestDeactivation:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const confirmDeactivation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      res.status(400).json({ message: 'Token y email son requeridos' });
      return;
    }

    // Buscar el token mas reciente no usado y no expirado
    const actionToken = await prisma.accountActionToken.findFirst({
      where: {
        email,
        action: 'DEACTIVATE',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!actionToken) {
      res.status(400).json({ message: 'Enlace invalido o expirado' });
      return;
    }

    const isValid = await bcryptjs.compare(token, actionToken.hashedToken);
    if (!isValid) {
      res.status(400).json({ message: 'Enlace invalido o expirado' });
      return;
    }

    // Transaccion: marcar token como usado + desactivar cuenta
    await prisma.$transaction([
      prisma.accountActionToken.update({
        where: { id: actionToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: actionToken.userId },
        data: { active: false },
      }),
    ]);

    res.status(200).json({ message: 'Cuenta desactivada exitosamente' });
  } catch (error) {
    console.error('Error en confirmDeactivation:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const requestReactivation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email es requerido' });
      return;
    }

    // Mensaje generico para no revelar estado de la cuenta
    const genericMessage = 'Si el email existe, recibiras instrucciones para reactivar tu cuenta';

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, active: true, roleId: true },
    });

    // No revelar si el usuario existe o no
    if (!user || user.active || user.roleId) {
      res.status(200).json({ message: genericMessage });
      return;
    }

    // Borrar tokens de reactivacion previos
    await prisma.accountActionToken.deleteMany({
      where: { userId: user.id, action: 'REACTIVATE' },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcryptjs.hash(token, 10);

    await prisma.accountActionToken.create({
      data: {
        userId: user.id,
        email: user.email,
        hashedToken,
        action: 'REACTIVATE',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    const confirmUrl = `${FRONTEND_URL}/cuenta/reactivar/confirmar?token=${token}&email=${encodeURIComponent(user.email)}`;
    await sendReactivationEmail(user.email, confirmUrl);

    res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error('Error en requestReactivation:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const confirmReactivation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      res.status(400).json({ message: 'Token y email son requeridos' });
      return;
    }

    const actionToken = await prisma.accountActionToken.findFirst({
      where: {
        email,
        action: 'REACTIVATE',
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!actionToken) {
      res.status(400).json({ message: 'Enlace invalido o expirado' });
      return;
    }

    const isValid = await bcryptjs.compare(token, actionToken.hashedToken);
    if (!isValid) {
      res.status(400).json({ message: 'Enlace invalido o expirado' });
      return;
    }

    await prisma.$transaction([
      prisma.accountActionToken.update({
        where: { id: actionToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: actionToken.userId },
        data: { active: true },
      }),
    ]);

    res.status(200).json({ message: 'Cuenta reactivada exitosamente' });
  } catch (error) {
    console.error('Error en confirmReactivation:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
