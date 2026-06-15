import prisma from '../db/prisma';
import { devLog } from '../utils/logger';

// ─── Tipos de la API del MMA ──────────────────────────────────────────────────

interface MMAPoint {
  lat: string;
  lng: string;
  status: string;
  owner: string | null;
  type: string;
  address_type: string | null;
  address_name: string | null;
  address_number: string | null;
  manager: string | null;
  region: { id: number; abbreviation: string; name: string } | null;
  commune: { id: number; name: string } | null;
  materials: string[];
}

export interface SyncResult {
  ok: boolean;
  synced: number;
  totalInDB: number;
  fromMMA: number;
  filtered: number;
  syncedAt: string;
  error?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RAEE_MATERIALS = new Set(['metal', 'phone', 'power_bank']);

const MMA_BASE_URL = 'https://puntoslimpios.mma.gob.cl/api/points/geo';

// Centro activo: solo Región Metropolitana
// Para expandir a todo Chile, descomentar los tres centros de abajo y comentar el de Santiago
const MMA_CENTERS = [
  { lat: -33.4569, lng: -70.6483, distance: 50 }, // Santiago RM (~50 km cubre toda la región urbana)

  // Cobertura nacional completa (3 centros norte→sur):
  // { lat: -20.5, lng: -69.8, distance: 900 },  // Norte: Arica → Atacama
  // { lat: -34.0, lng: -71.0, distance: 700 },  // Centro: Coquimbo → Biobío
  // { lat: -46.0, lng: -72.5, distance: 1100 }, // Sur: Araucanía → Magallanes
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchMMARegion(lat: number, lng: number, distance: number): Promise<MMAPoint[]> {
  const url = `${MMA_BASE_URL}?lat=${lat}&lng=${lng}&distance=${distance}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EcoBytes/1.0 (plataforma-raee-chile)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`MMA API respondió ${res.status} para centro (${lat},${lng})`);
  return res.json() as Promise<MMAPoint[]>;
}

function mapMMAPoint(p: MMAPoint, syncedAt: Date) {
  const raeeMats = p.materials.filter(m => RAEE_MATERIALS.has(m));
  if (raeeMats.length === 0) return null;

  const parts = [p.address_type, p.address_name, p.address_number].filter(Boolean);
  const address = parts.length > 0
    ? parts.join(' ').replace(/\s+/g, ' ').trim()
    : 'Dirección no disponible';

  const name = p.manager || p.owner || 'Punto de Recolección RAEE';
  const type = p.type.toLowerCase() === 'pl' ? 'Punto Limpio' : 'Punto Verde';

  return {
    name:      name.substring(0, 200),
    address:   address.substring(0, 400),
    city:      p.commune?.name ?? null,
    region:    p.region?.name ?? null,
    commune:   p.commune?.name ?? null,
    latitude:  parseFloat(p.lat),
    longitude: parseFloat(p.lng),
    type,
    materials: JSON.stringify(raeeMats),
    contact:   null,
    website:   null,
    source:    'mma' as const,
    syncedAt,
  };
}

// ─── Función principal de sincronización ─────────────────────────────────────

export async function syncCollectionPoints(): Promise<SyncResult> {
  const syncedAt = new Date();
  devLog('[Sync] Iniciando sincronización con API del MMA...');

  const rawResults = await Promise.all(
    MMA_CENTERS.map(c => fetchMMARegion(c.lat, c.lng, c.distance))
  );

  // Deduplicar por coordenadas
  const seen = new Map<string, MMAPoint>();
  for (const batch of rawResults) {
    for (const point of batch) {
      const key = `${parseFloat(point.lat).toFixed(6)},${parseFloat(point.lng).toFixed(6)}`;
      if (!seen.has(key)) seen.set(key, point);
    }
  }
  devLog(`[Sync] Puntos únicos recibidos del MMA: ${seen.size}`);

  // Filtrar solo RAEE
  const toInsert = [];
  for (const raw of seen.values()) {
    const mapped = mapMMAPoint(raw, syncedAt);
    if (mapped) toInsert.push(mapped);
  }
  devLog(`[Sync] Puntos RAEE (metal/phone/power_bank): ${toInsert.length}`);

  // Obtener coords de puntos editados manualmente (no se sobreescriben)
  const editedPoints = await prisma.collectionPoint.findMany({
    where: { editedAt: { not: null } },
    select: { latitude: true, longitude: true },
  });
  const editedCoords = new Set(
    editedPoints.map(p => `${Number(p.latitude).toFixed(6)},${Number(p.longitude).toFixed(6)}`)
  );
  const safeInsert = toInsert.filter(p => {
    const key = `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
    return !editedCoords.has(key);
  });
  devLog(`[Sync] Puntos protegidos por edición manual: ${toInsert.length - safeInsert.length}`);

  // Reemplazar puntos MMA no editados (manuales y editados no se tocan)
  await prisma.$transaction([
    prisma.collectionPoint.deleteMany({ where: { source: 'mma', editedAt: null } }),
    prisma.collectionPoint.createMany({ data: safeInsert }),
  ]);

  const totalInDB = await prisma.collectionPoint.count();
  devLog(`[Sync] Completada. Total en BD: ${totalInDB}`);

  return {
    ok:       true,
    synced:   toInsert.length,
    totalInDB,
    fromMMA:  seen.size,
    filtered: seen.size - toInsert.length,
    syncedAt: syncedAt.toISOString(),
  };
}
