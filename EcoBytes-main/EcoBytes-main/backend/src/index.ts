import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth';
import rolesRoutes from './routes/roles';
import usersRoutes from './routes/users';
import accountRoutes from './routes/account';
import collectionPointsRouter from './routes/collectionPoints';
import reportsRouter from './routes/reports';
import { startSyncScheduler } from './services/syncScheduler';
import prisma from './db/prisma';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// CORS con whitelist de orígenes
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000']; // Default solo localhost en desarrollo

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, etc.) solo en desarrollo
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Archivos estáticos (avatares de perfil)
app.use('/avatars', express.static(path.join(__dirname, '../public/avatars')));

// Rutas
app.use('/auth', authRoutes);
app.use('/roles', rolesRoutes);
app.use('/users', usersRoutes);
app.use('/account', accountRoutes);
app.use('/collection-points', collectionPointsRouter);
app.use('/reports', reportsRouter);

// Ruta de health check con verificación de BD
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Iniciar servidor en todas las interfaces (0.0.0.0) para acceso desde red local
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend corriendo en http://0.0.0.0:${PORT}`);
  startSyncScheduler();
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Conexiones cerradas. Proceso terminado.');
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error('Cierre forzado después de 10s');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
