// ─── Paleta de colores centralizada ─────────────────────────────────────────
// Constantes JS/TS para usar donde CSS variables no aplican (recharts, ExcelJS, SVG attributes)

// Gráficos recharts — paleta ordenada para series de datos
export const CHART_COLORS = [
  '#66BB6A', // accent-light (verde marca)
  '#818CF8', // indigo-400
  '#FBBF24', // amber-400
  '#38BDF8', // sky-400
  '#34D399', // emerald-400
  '#A78BFA', // violet-400
  '#FB923C', // orange-400
  '#22D3EE', // cyan-400
  '#F472B6', // pink-400
  '#A3E635', // lime-400
  '#F87171', // red-400
  '#C084FC', // purple-400
] as const;

// Torta: desglose por fuente (MMA vs manual)
export const SOURCE_COLORS = ['#66BB6A', '#FB923C'] as const; // accent-light, orange-400

// Torta: desglose por material (metal, celulares, pilas)
export const MATERIAL_COLORS = ['#38BDF8', '#A78BFA', '#FCD34D'] as const; // sky-400, violet-400, amber-300

// ─── Paleta Excel (ARGB sin #, ExcelJS antepone FF de opacidad) ──────────────
export const EXCEL_COLORS = {
  TEAL:     '2E7D32', // accent (verde marca)
  TEAL_LT:  'E8F5E9', // accent-subtle
  SLATE:    '1E293B', // slate-800
  SLATE_M:  '475569', // slate-600
  SLATE_L:  'F8FAFC', // slate-50
  WHITE:    'FFFFFF',
  INDIGO:   '4338CA', // indigo-700
  INDIGO_L: 'E0E7FF', // indigo-100
  AMBER:    'D97706', // amber-600
  AMBER_L:  'FEF3C7', // amber-100
  BLUE:     '2563EB', // blue-600
  BLUE_L:   'DBEAFE', // blue-100
  SKY_LT:   'E0F2FE', // sky-100
  ROW_ALT:  'F1F8F1', // accent-subtle tint
  BORDER:   'FFE2E8F0', // slate-200 (ARGB completo con prefijo de opacidad)
} as const;
