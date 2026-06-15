import { Router } from 'express';
import prisma from '../db/prisma';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();

// ─── GET /reports/activity — protegido ───────────────────────────────────────

router.get(
  '/activity',
  authenticateToken,
  requirePermission('reportes.cumplimiento.ver'),
  async (_req, res) => {
    try {
      const [totalCenters, totalSearches, bySource, byType, byRegion] = await Promise.all([
        prisma.collectionPoint.count(),
        prisma.searchLog.count(),
        prisma.collectionPoint.groupBy({
          by: ['source'],
          _count: { _all: true },
        }),
        prisma.collectionPoint.groupBy({
          by: ['type'],
          _count: { _all: true },
          orderBy: { _count: { type: 'desc' } },
        }),
        prisma.collectionPoint.groupBy({
          by: ['region'],
          _count: { _all: true },
          orderBy: { region: 'asc' },
        }),
      ]);

      const mmaCount    = bySource.find(s => s.source === 'mma')?._count._all    ?? 0;
      const manualCount = bySource.find(s => s.source === 'manual')?._count._all ?? 0;

      res.json({
        totalCenters,
        totalSearches,
        mmaCount,
        manualCount,
        byType:   byType.map(r => ({ type: r.type ?? 'Sin tipo', count: r._count._all })),
        byRegion: byRegion.map(r => ({ region: r.region ?? 'Sin región', count: r._count._all })),
      });
    } catch (error) {
      console.error('Error getting activity report:', error);
      res.status(500).json({ error: 'Error al obtener el reporte de actividad' });
    }
  }
);

export default router;
