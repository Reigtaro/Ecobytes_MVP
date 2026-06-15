import { Router } from 'express';
import prisma from '../db/prisma';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/requirePermission';
import { syncCollectionPoints } from '../services/collectionPointsSync';
import { devLog } from '../utils/logger';

const router = Router();

// ─── GET / — público ──────────────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  try {
    const points = await prisma.collectionPoint.findMany({
      select: {
        id:        true,
        name:      true,
        address:   true,
        city:      true,
        region:    true,
        commune:   true,
        latitude:  true,
        longitude: true,
        type:      true,
        materials: true,
        contact:   true,
        website:   true,
        source:    true,
        syncedAt:  true,
      },
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    });

    devLog(`Collection points fetched: ${points.length}`);
    res.json(points.map(p => ({
      ...p,
      latitude:  Number(p.latitude),
      longitude: Number(p.longitude),
    })));
  } catch (error) {
    console.error('Error fetching collection points:', error);
    res.status(500).json({ error: 'Error al obtener los puntos de recolección' });
  }
});

// ─── GET /nearest — público, retorna los N puntos más cercanos con distancia exacta ──

const VALID_MATERIALS = ['metal', 'phone', 'power_bank'];

router.get('/nearest', async (req, res) => {
  try {
    const lat    = parseFloat(req.query.lat as string);
    const lng    = parseFloat(req.query.lng as string);
    const limit  = Math.min(parseInt((req.query.limit as string) || '3', 10), 20);
    const material = req.query.material as string | undefined;
    const region   = req.query.region   as string | undefined;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'lat y lng son requeridos y deben ser números' });
      return;
    }
    if (material && !VALID_MATERIALS.includes(material)) {
      res.status(400).json({ error: 'Material inválido' });
      return;
    }

    const whereParts: string[] = [];
    const params: (number | string)[] = [lng, lat];

    if (material) {
      whereParts.push(`materials LIKE ?`);
      params.push(`%"${material}"%`);
    }
    if (region) {
      whereParts.push(`region = ?`);
      params.push(region);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    params.push(limit);

    const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint; distanceKm: number }>>(
      `SELECT id,
         ST_Distance_Sphere(POINT(longitude, latitude), POINT(?, ?)) / 1000 AS distanceKm
       FROM collection_points
       ${whereClause}
       ORDER BY distanceKm ASC
       LIMIT ?`,
      ...params
    );

    res.json(rows.map(r => ({ id: Number(r.id), distanceKm: Number(r.distanceKm) })));
  } catch (error) {
    console.error('Error en /nearest:', error);
    res.status(500).json({ error: 'Error al calcular puntos cercanos' });
  }
});

// ─── GET /:id/distance — público, distancia exacta a un punto específico ──────

router.get('/:id/distance', async (req, res) => {
  try {
    const id  = parseInt(req.params.id, 10);
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(id) || isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'id, lat y lng son requeridos' });
      return;
    }

    const rows = await prisma.$queryRaw<Array<{ distanceKm: number }>>`
      SELECT ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat})) / 1000 AS distanceKm
      FROM collection_points
      WHERE id = ${id}
    `;

    if (!rows.length) {
      res.status(404).json({ error: 'Punto no encontrado' });
      return;
    }

    res.json({ distanceKm: Number(rows[0].distanceKm) });
  } catch (error) {
    console.error('Error en /:id/distance:', error);
    res.status(500).json({ error: 'Error al calcular distancia' });
  }
});

// ─── POST /log-search — público, registra búsqueda ───────────────────────────

router.post('/log-search', async (req, res) => {
  try {
    const query = req.body?.query?.toString().slice(0, 255) ?? null;
    await prisma.searchLog.create({ data: { query } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ─── PATCH /:id — protegido, edita un punto manualmente ──────────────────────

router.patch(
  '/:id',
  authenticateToken,
  requirePermission('recoleccion.puntos.gestionar'),
  async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const ALLOWED_FIELDS = ['name', 'address', 'city', 'region', 'commune', 'type', 'contact', 'website', 'materials'];
    const update: Record<string, string | null> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in req.body) {
        const val = req.body[field];
        update[field] = typeof val === 'string' && val.trim() !== '' ? val.trim() : null;
      }
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: 'No se enviaron campos para actualizar' });
      return;
    }

    try {
      const existing = await prisma.collectionPoint.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Punto no encontrado' });
        return;
      }

      const updated = await prisma.collectionPoint.update({
        where: { id },
        data: { ...update, editedAt: new Date() },
      });

      devLog(`[CollectionPoints] Punto #${id} editado manualmente`);
      res.json({ ...updated, latitude: Number(updated.latitude), longitude: Number(updated.longitude) });
    } catch (error) {
      console.error('Error al editar punto:', error);
      res.status(500).json({ error: 'Error al actualizar el punto' });
    }
  }
);

// ─── POST /sync — protegido, dispara sync manual ──────────────────────────────

router.post(
  '/sync',
  authenticateToken,
  requirePermission('recoleccion.puntos.gestionar'),
  async (_req, res) => {
    try {
      const result = await syncCollectionPoints();
      res.json(result);
    } catch (error) {
      console.error('Error en sincronización MMA:', error);
      res.status(500).json({
        ok:    false,
        error: error instanceof Error ? error.message : 'Error desconocido en sincronización',
      });
    }
  }
);

export default router;
