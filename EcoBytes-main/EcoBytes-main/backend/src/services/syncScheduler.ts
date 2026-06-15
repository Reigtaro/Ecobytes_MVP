import cron from 'node-cron';
import { syncCollectionPoints } from './collectionPointsSync';
import { devLog } from '../utils/logger';

// Expresión cron configurable via variable de entorno
// Por defecto: lunes a las 3:00 AM (semanal)
// Ejemplos:
//   "0 3 * * 1"    → cada lunes a las 3:00 AM  (semanal, recomendado)
//   "0 3 * * *"    → todos los días a las 3:00 AM
//   "0 */12 * * *" → cada 12 horas
const SYNC_SCHEDULE = process.env.COLLECTION_POINTS_SYNC_SCHEDULE || '0 3 * * 1';

let isRunning = false;

export function startSyncScheduler(): void {
  if (!cron.validate(SYNC_SCHEDULE)) {
    console.error(`[SyncScheduler] Expresión cron inválida: "${SYNC_SCHEDULE}". El scheduler no iniciará.`);
    return;
  }

  cron.schedule(SYNC_SCHEDULE, async () => {
    if (isRunning) {
      devLog('[SyncScheduler] Sync ya en curso, omitiendo esta ejecución.');
      return;
    }

    isRunning = true;
    devLog(`[SyncScheduler] Iniciando sync automática (${new Date().toISOString()})...`);

    try {
      const result = await syncCollectionPoints();
      console.log(
        `[SyncScheduler] ✓ Sync completada: ${result.synced.toLocaleString()} puntos RAEE ` +
        `| Total en BD: ${result.totalInDB.toLocaleString()} ` +
        `| ${result.syncedAt}`
      );
    } catch (error) {
      console.error('[SyncScheduler] ✗ Error en sync automática:', error);
    } finally {
      isRunning = false;
    }
  }, {
    timezone: 'America/Santiago',
  });

  console.log(`[SyncScheduler] Scheduler iniciado → "${SYNC_SCHEDULE}" (zona: America/Santiago)`);
}
