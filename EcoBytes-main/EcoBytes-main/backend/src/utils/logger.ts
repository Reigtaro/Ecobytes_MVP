// Logger que solo muestra mensajes en desarrollo (NODE_ENV !== 'production')

const isDev = process.env.NODE_ENV !== 'production';

export const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

// Para logs que SIEMPRE deben aparecer (errores críticos, inicio de servidor, etc.)
export const log = console.log;
export const warn = console.warn;
export const error = console.error;

// ============================================
// Utilidades de timing para medir rendimiento
// ============================================

/**
 * Crea un timer para medir operaciones.
 * Uso:
 *   const timer = createTimer();
 *   // ... operación ...
 *   timer.log('uploadDocument', 'Archivo subido');
 */
export function createTimer() {
  const start = Date.now();
  let lastLap = start;

  return {
    /** Tiempo total desde el inicio en ms */
    elapsed: () => Date.now() - start,

    /** Tiempo desde el último lap en ms */
    lap: () => {
      const now = Date.now();
      const diff = now - lastLap;
      lastLap = now;
      return diff;
    },

    /** Log con tiempo total (solo en dev) */
    log: (tag: string, message: string) => {
      if (isDev) {
        const ms = Date.now() - start;
        console.log(`[${tag}] ${message} (${ms}ms)`);
      }
    },

    /** Log con tiempo de lap (solo en dev) */
    logLap: (tag: string, message: string) => {
      if (isDev) {
        const now = Date.now();
        const lapMs = now - lastLap;
        lastLap = now;
        console.log(`[${tag}] ${message} (+${lapMs}ms)`);
      }
    },

    /** Log final con resumen de tiempo total */
    end: (tag: string, message: string) => {
      if (isDev) {
        const ms = Date.now() - start;
        const formatted = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
        console.log(`[${tag}] ${message} | Total: ${formatted}`);
      }
    },
  };
}

/**
 * Helper para formatear bytes a string legible
 */
export function formatBytes(bytes: number | bigint): string {
  const b = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
