'use client';

import { useState, useEffect, useMemo } from 'react';
import SubHeader from '@/components/SubHeader';
import { getApiUrl, authFetch } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import ExcelJS from 'exceljs';
import { CHART_COLORS, SOURCE_COLORS, MATERIAL_COLORS, EXCEL_COLORS } from '@/lib/colors';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface CollectionPoint {
  id: number;
  name: string;
  address: string;
  city: string | null;
  region: string | null;
  commune: string | null;
  type: string | null;
  materials: string | null;
  contact: string | null;
  website: string | null;
  source: string;
  syncedAt: string | null;
  editedAt: string | null;
  createdAt?: string;
}

// ─── Modal de edición ──────────────────────────────────────────────────────────

const POINT_TYPES = ['Punto Limpio', 'Punto Verde'];
const ALL_MATERIALS = [
  { key: 'metal',      label: '⚙️ Metal' },
  { key: 'phone',      label: '📱 Celulares' },
  { key: 'power_bank', label: '🔋 Pilas/Baterías' },
];

interface EditForm {
  name: string;
  address: string;
  city: string;
  region: string;
  commune: string;
  type: string;
  contact: string;
  website: string;
  materials: string[];
}

function EditModal({ point, onClose, onSaved }: {
  point: CollectionPoint;
  onClose: () => void;
  onSaved: (updated: CollectionPoint) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    name:      point.name ?? '',
    address:   point.address ?? '',
    city:      point.city ?? '',
    region:    point.region ?? '',
    commune:   point.commune ?? '',
    type:      point.type ?? '',
    contact:   point.contact ?? '',
    website:   point.website ?? '',
    materials: parseMaterials(point.materials),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const set = (field: keyof EditForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const toggleMaterial = (key: string) =>
    setForm(f => ({
      ...f,
      materials: f.materials.includes(key)
        ? f.materials.filter(m => m !== key)
        : [...f.materials, key],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('El nombre es obligatorio'); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await authFetch(`${getApiUrl()}/collection-points/${point.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          materials: JSON.stringify(form.materials),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al guardar');
      }
      const updated = await res.json();
      onSaved(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg card-bg rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Editar punto de reciclaje</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Los cambios sobreviven a la sincronización con el MMA</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {[
            { label: 'Nombre *',   field: 'name'    as const, placeholder: 'Nombre del punto' },
            { label: 'Dirección',  field: 'address' as const, placeholder: 'Calle y número' },
            { label: 'Ciudad',     field: 'city'    as const, placeholder: 'Ciudad' },
            { label: 'Región',     field: 'region'  as const, placeholder: 'Región' },
            { label: 'Comuna',     field: 'commune' as const, placeholder: 'Comuna' },
            { label: 'Contacto',   field: 'contact' as const, placeholder: 'Teléfono o email' },
            { label: 'Sitio web',  field: 'website' as const, placeholder: 'https://...' },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</label>
              <input
                type="text"
                value={form[field]}
                onChange={e => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50"
              />
            </div>
          ))}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Tipo de punto</label>
            <select
              value={form.type}
              onChange={e => set('type', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">Sin especificar</option>
              {POINT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Materiales */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Materiales RAEE</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_MATERIALS.map(({ key, label }) => {
                const active = form.materials.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleMaterial(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      active
                        ? 'bg-accent text-white border-accent shadow-sm'
                        : 'bg-zinc-50 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08] hover:border-accent dark:hover:border-accent/50'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {err && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">{err}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-black/[0.06] dark:border-white/[0.06]">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] rounded-lg transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Funciones auxiliares ──────────────────────────────────────────────────────

const MATERIAL_META: Record<string, { label: string; icon: string; cls: string }> = {
  metal:      { label: 'Metal',          icon: '⚙️',  cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 border border-slate-200 dark:border-slate-600/40' },
  phone:      { label: 'Celulares',      icon: '📱',  cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-200 dark:border-violet-500/25' },
  power_bank: { label: 'Pilas/Baterías', icon: '🔋',  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25' },
};

function parseMaterials(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// ─── Paleta de colores para gráficos — importada de @/lib/colors ──────────────

// ─── Tooltip personalizado para torta ─────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { pct: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 truncate max-w-[180px]">{name}</p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Puntos: <span className="font-bold text-zinc-900 dark:text-zinc-100">{value.toLocaleString('es-CL')}</span>
      </p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Participación: <span className="font-bold text-accent">{p.pct}%</span>
      </p>
    </div>
  );
}

// ─── Sector activo elevado para la torta ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveSlice(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g
      className="pie-active-slice"
      style={{
        filter: `drop-shadow(0 0 14px ${fill}bb)`,
        transformOrigin: `${cx}px ${cy}px`,
      }}
    >
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 3}
        outerRadius={outerRadius + 5}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
    </g>
  );
}

// ─── Tooltip personalizado para barras ────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { pct: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 truncate max-w-[200px]">{label}</p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Puntos: <span className="font-bold text-zinc-900 dark:text-zinc-100">{payload[0].value.toLocaleString('es-CL')}</span>
      </p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Participación: <span className="font-bold text-accent">{payload[0].payload.pct}%</span>
      </p>
    </div>
  );
}

// ─── Exportación Excel ─────────────────────────────────────────────────────────

async function downloadExcel(points: CollectionPoint[], allPoints: CollectionPoint[], filters: {
  region: string; material: string; source: string; search: string;
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'EcoBytes';
  wb.created  = new Date();
  wb.modified = new Date();

  const { TEAL, TEAL_LT, SLATE, SLATE_M, SLATE_L, WHITE, AMBER, AMBER_L, BLUE, BLUE_L, SKY_LT, ROW_ALT, BORDER } = EXCEL_COLORS;

  const thin: ExcelJS.Border = { style: 'thin', color: { argb: BORDER } };
  const thinAll = { top: thin, bottom: thin, left: thin, right: thin };

  const dateStr = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HOJA 1 — PORTADA / RESUMEN
  // ══════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('Resumen');
  ws1.properties.defaultRowHeight = 18;
  ws1.views = [{ showGridLines: false }];

  // Anchos de columna
  [45, 50].forEach((w, i) => { ws1.getColumn(i + 1).width = w; });

  // Banda de encabezado
  ws1.mergeCells('A1:B1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = 'EcoBytes — Reporte de Puntos de Reciclaje RAEE';
  titleCell.font  = { bold: true, size: 16, color: { argb: WHITE } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 36;

  ws1.mergeCells('A2:B2');
  const subCell = ws1.getCell('A2');
  subCell.value = `Generado el ${dateStr} · EcoBytes Chile`;
  subCell.font  = { size: 10, color: { argb: WHITE }, italic: true };
  subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(2).height = 22;

  ws1.addRow([]);

  // Helper para agregar una fila de resumen
  const addInfo = (label: string, value: string | number, alt = false) => {
    const row = ws1.addRow([label, value]);
    row.height = 20;
    const lCell = row.getCell(1);
    const vCell = row.getCell(2);
    lCell.font = { bold: true, size: 10, color: { argb: SLATE } };
    vCell.font = { size: 10, color: { argb: SLATE_M } };
    lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? ROW_ALT : WHITE } };
    vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? ROW_ALT : WHITE } };
    lCell.border = thinAll;
    vCell.border = thinAll;
    lCell.alignment = { vertical: 'middle' };
    vCell.alignment = { vertical: 'middle' };
  };

  // Section: Información del reporte
  ws1.mergeCells(`A4:B4`);
  const sec1 = ws1.getCell('A4');
  sec1.value = 'INFORMACIÓN DEL REPORTE';
  sec1.font  = { bold: true, size: 10, color: { argb: WHITE } };
  sec1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_M } };
  sec1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(4).height = 22;

  addInfo('Fecha de generación', dateStr, false);
  addInfo('Sistema', 'EcoBytes · Módulo de Reportes', true);
  addInfo('Normativa aplicable', 'Ley REP 20.920 · Ministerio del Medio Ambiente', false);
  addInfo('Fuente de datos', 'API MMA Chile (puntoslimpios.mma.gob.cl) + Ingreso Manual', true);

  ws1.addRow([]);

  // Section: Estadísticas generales
  ws1.mergeCells(`A10:B10`);
  const sec2 = ws1.getCell('A10');
  sec2.value = 'ESTADÍSTICAS GENERALES';
  sec2.font  = { bold: true, size: 10, color: { argb: WHITE } };
  sec2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  sec2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(10).height = 22;

  const mmaCount    = allPoints.filter(p => p.source === 'mma').length;
  const manualCount = allPoints.filter(p => p.source === 'manual').length;
  const metalCount  = allPoints.filter(p => parseMaterials(p.materials).includes('metal')).length;
  const phoneCount  = allPoints.filter(p => parseMaterials(p.materials).includes('phone')).length;
  const battCount   = allPoints.filter(p => parseMaterials(p.materials).includes('power_bank')).length;

  addInfo('Total de puntos registrados', allPoints.length, false);
  addInfo('Puntos desde MMA Chile', `${mmaCount} (${allPoints.length > 0 ? Math.round((mmaCount / allPoints.length) * 100) : 0}%)`, true);
  addInfo('Puntos ingresados manualmente', `${manualCount} (${allPoints.length > 0 ? Math.round((manualCount / allPoints.length) * 100) : 0}%)`, false);
  addInfo('Puntos con residuos Metal', metalCount.toString(), true);
  addInfo('Puntos con residuos Celulares', phoneCount.toString(), false);
  addInfo('Puntos con residuos Pilas/Baterías', battCount.toString(), true);

  ws1.addRow([]);

  // Section: Filtros aplicados
  ws1.mergeCells(`A18:B18`);
  const sec3 = ws1.getCell('A18');
  sec3.value = 'FILTROS APLICADOS EN ESTE REPORTE';
  sec3.font  = { bold: true, size: 10, color: { argb: WHITE } };
  sec3.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_M } };
  sec3.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(18).height = 22;

  addInfo('Región', filters.region || 'Todas', false);
  addInfo('Material RAEE', filters.material ? (MATERIAL_META[filters.material]?.label ?? filters.material) : 'Todos', true);
  addInfo('Fuente', filters.source === 'mma' ? 'MMA Chile' : filters.source === 'manual' ? 'Manual' : 'Todas', false);
  addInfo('Búsqueda de texto', filters.search.trim() || '(sin filtro)', true);
  addInfo('Registros exportados', points.length, false);

  // ══════════════════════════════════════════════════════════════════════════
  // HOJA 2 — DATOS DETALLADOS
  // ══════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('Puntos de Reciclaje');
  ws2.properties.defaultRowHeight = 18;
  ws2.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];

  // Definición de columnas
  const cols: { header: string; key: string; width: number }[] = [
    { header: 'N°',               key: 'num',       width: 6  },
    { header: 'Nombre del Punto', key: 'name',      width: 38 },
    { header: 'Dirección',        key: 'address',   width: 40 },
    { header: 'Comuna',           key: 'commune',   width: 20 },
    { header: 'Ciudad',           key: 'city',      width: 20 },
    { header: 'Región',           key: 'region',    width: 28 },
    { header: 'Tipo de Punto',    key: 'type',      width: 16 },
    { header: 'Materiales RAEE',  key: 'materials', width: 30 },
    { header: 'Fuente',           key: 'source',    width: 14 },
  ];

  cols.forEach((c, i) => { ws2.getColumn(i + 1).width = c.width; });

  // Fila de título
  ws2.mergeCells(`A1:${String.fromCharCode(64 + cols.length)}1`);
  const ws2Title = ws2.getCell('A1');
  ws2Title.value = `Puntos de Reciclaje RAEE · ${points.length.toLocaleString('es-CL')} registros · Generado ${dateStr}`;
  ws2Title.font  = { bold: true, size: 11, color: { argb: WHITE } };
  ws2Title.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  ws2Title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(1).height = 28;

  // Fila de encabezados
  const headerRow = ws2.getRow(2);
  headerRow.height = 24;
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font  = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: false };
    cell.border = { ...thinAll, bottom: { style: 'medium', color: { argb: TEAL } } };
  });

  // Filas de datos
  points.forEach((p, idx) => {
    const isAlt   = idx % 2 === 1;
    const bgColor = isAlt ? ROW_ALT : WHITE;
    const mats    = parseMaterials(p.materials).map(m => MATERIAL_META[m]?.label ?? m).join(' | ');
    const sourceLabel = p.source === 'mma' ? 'MMA Chile' : 'Manual';

    const row = ws2.addRow([
      idx + 1,
      p.name,
      p.address,
      p.commune ?? '',
      p.city ?? '',
      p.region ?? '',
      p.type ?? '',
      mats || 'Sin materiales RAEE',
      sourceLabel,
    ]);
    row.height = 17;

    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.border = thinAll;
      cell.font   = { size: 10, color: { argb: colNum === 1 ? SLATE_M : SLATE } };
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'center' : 'left', wrapText: false };

      // Color de la celda según la fuente del punto
      if (colNum === 9) {
        if (p.source === 'mma') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_L } };
          cell.font = { size: 10, bold: true, color: { argb: BLUE } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_L } };
          cell.font = { size: 10, bold: true, color: { argb: AMBER } };
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Estilo de la columna N°
      if (colNum === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? SKY_LT : TEAL_LT } };
        cell.font = { size: 9, color: { argb: SLATE_M } };
      }
    });
  });

  // Fila de pie de tabla
  const footerRow = ws2.addRow(['', `Total: ${points.length.toLocaleString('es-CL')} puntos exportados`, '', '', '', '', '', '', '']);
  footerRow.height = 20;
  ws2.mergeCells(`B${footerRow.number}:H${footerRow.number}`);
  footerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_L } };
    cell.font = { size: 9, italic: true, color: { argb: SLATE_M } };
    cell.border = { top: { style: 'medium', color: { argb: SLATE_M } } };
  });
  footerRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  // ── Descarga del archivo ─────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `EcoBytes_Reporte_Puntos_RAEE_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function ReportePuntosPage() {
  const [points, setPoints]       = useState<CollectionPoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activePieSrc, setActivePieSrc] = useState(-1);
  const [activePieMat, setActivePieMat] = useState(-1);

  // Edición
  const [editingPoint, setEditingPoint] = useState<CollectionPoint | null>(null);
  const canEdit = useMemo(() => {
    const user = getStoredUser();
    return user?.permissions?.includes('recoleccion.puntos.gestionar') ?? false;
  }, []);

  // Filtros
  const [filterRegion,   setFilterRegion]   = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterSource,   setFilterSource]   = useState('');
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await authFetch(`${getApiUrl()}/collection-points`);
        if (!res.ok) throw new Error('Error al obtener los puntos');
        const data = await res.json();
        setPoints(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, []);

  const regions = useMemo(() => {
    const set = new Set(points.map(p => p.region).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [points]);

  const filtered = useMemo(() => {
    let list = points;
    if (filterRegion)   list = list.filter(p => p.region === filterRegion);
    if (filterSource)   list = list.filter(p => p.source === filterSource);
    if (filterMaterial) list = list.filter(p => parseMaterials(p.materials).includes(filterMaterial));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.commune?.toLowerCase().includes(q)) ||
        (p.city?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [points, filterRegion, filterSource, filterMaterial, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setFilterRegion('');
    setFilterMaterial('');
    setFilterSource('');
    setSearch('');
    setPage(1);
  };

  const hasFilters = filterRegion || filterMaterial || filterSource || search.trim();

  const handlePointSaved = (updated: CollectionPoint) => {
    setPoints(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    setEditingPoint(null);
  };

  // Conteos para las tarjetas de estadísticas
  const mmaCount    = points.filter(p => p.source === 'mma').length;
  const manualCount = points.filter(p => p.source === 'manual').length;
  const editedCount = points.filter(p => p.editedAt !== null).length;

  return (
    <>
    {editingPoint && (
      <EditModal
        point={editingPoint}
        onClose={() => setEditingPoint(null)}
        onSaved={handlePointSaved}
      />
    )}
    <style>{`
      @keyframes pieSliceIn {
        0%   { transform: scale(0.94); opacity: 0.5; }
        60%  { transform: scale(1.02); opacity: 1;   }
        100% { transform: scale(1);   opacity: 1;   }
      }
      .pie-active-slice {
        animation: pieSliceIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
    `}</style>
    <div className="space-y-5">
      <SubHeader
        title="Puntos de Reciclaje"
        breadcrumbs={[{ label: 'Reportes' }]}
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        actions={
          !loading && points.length > 0 ? (
            <button
              onClick={() => downloadExcel(filtered, points, {
                region: filterRegion, material: filterMaterial,
                source: filterSource, search,
              })}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-btn-header hover:bg-btn-header-hover text-white transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar Excel
            </button>
          ) : null
        }
      />

      {/* Tarjetas de estadísticas */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total registrados', value: points.length,  color: 'text-accent',    bg: '' },
            { label: 'Filtrados',         value: filtered.length, color: 'text-indigo-600 dark:text-indigo-400', bg: '' },
            { label: 'Desde MMA Chile',   value: mmaCount,        color: 'text-blue-600 dark:text-blue-400',    bg: '' },
            { label: 'Ingresados manual', value: manualCount,     color: 'text-amber-600 dark:text-amber-400',  bg: '' },
            { label: 'Editados manual',   value: editedCount,     color: 'text-violet-600 dark:text-violet-400', bg: '' },
          ].map(stat => (
            <div key={stat.label}
              className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] p-4 flex flex-col gap-1"
            >
              <span className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value.toLocaleString('es-CL')}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {!loading && !error && (
        <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Búsqueda de texto */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Buscar</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Nombre, dirección, comuna…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50"
                />
              </div>
            </div>

            {/* Filtro por región */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Región</label>
              <select
                value={filterRegion}
                onChange={e => { setFilterRegion(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Todas las regiones</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Filtro por material */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Material RAEE</label>
              <select
                value={filterMaterial}
                onChange={e => { setFilterMaterial(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Todos los materiales</option>
                <option value="metal">⚙️ Metal</option>
                <option value="phone">📱 Celulares</option>
                <option value="power_bank">🔋 Pilas/Baterías</option>
              </select>
            </div>

            {/* Filtro por fuente */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Fuente</label>
              <select
                value={filterSource}
                onChange={e => { setFilterSource(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Todas las fuentes</option>
                <option value="mma">MMA Chile</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* Limpiar filtros */}
            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabla de datos */}
      <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16">
            <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Cargando puntos de reciclaje…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No se encontraron puntos con los filtros aplicados.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.05] dark:border-white/[0.06]">
                    {['Nombre', 'Dirección', 'Comuna', 'Región', 'Tipo de Residuos', 'Tipo de Punto', 'Fuente'].map(h => (
                      <th key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                    {canEdit && <th className="px-4 py-3 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                  {paginated.map(point => {
                    const materials = parseMaterials(point.materials);
                    return (
                      <tr key={point.id}
                        className="hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px]">
                          <span className="line-clamp-2 leading-snug">{point.name}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-[220px]">
                          <span className="line-clamp-2 leading-snug">{point.address}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {point.commune ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap max-w-[160px]">
                          <span className="truncate block">{point.region ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}</span>
                        </td>
                        <td className="px-4 py-3">
                          {materials.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {materials.map(m => {
                                const meta = MATERIAL_META[m];
                                return meta ? (
                                  <span key={m}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}
                                  >
                                    <span>{meta.icon}</span>
                                    {meta.label}
                                  </span>
                                ) : (
                                  <span key={m}
                                    className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700/40 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-600/40"
                                  >
                                    {m}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600 text-xs">Sin materiales RAEE</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {point.type ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                              {point.type}
                            </span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {point.source === 'mma' ? (
                              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent-subtle dark:bg-accent/10 text-accent border border-accent/30 dark:border-accent/20">
                                MMA Chile
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                                Manual
                              </span>
                            )}
                            {point.editedAt && (
                              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20">
                                ✏️ Editado
                              </span>
                            )}
                          </div>
                        </td>
                        {canEdit && (
                          <td className="px-2 py-3">
                            <button
                              onClick={() => setEditingPoint(point)}
                              title="Editar punto"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-accent hover:bg-accent-subtle dark:hover:bg-accent/10 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-black/[0.04] dark:border-white/[0.05]">
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length.toLocaleString('es-CL')} puntos
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) {
                      p = i + 1;
                    } else if (page <= 3) {
                      p = i + 1;
                    } else if (page >= totalPages - 2) {
                      p = totalPages - 4 + i;
                    } else {
                      p = page - 2 + i;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          p === page
                            ? 'bg-accent text-white'
                            : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-zinc-700 dark:hover:text-zinc-200'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Gráficos ─────────────────────────────────────────────────────── */}
      {!loading && !error && points.length > 0 && (() => {
        const total   = points.length;
        const mmaC    = points.filter(p => p.source === 'mma').length;
        const manualC = points.filter(p => p.source === 'manual').length;
        const metalC  = points.filter(p => parseMaterials(p.materials).includes('metal')).length;
        const phoneC  = points.filter(p => parseMaterials(p.materials).includes('phone')).length;
        const battC   = points.filter(p => parseMaterials(p.materials).includes('power_bank')).length;
        const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

        // Agrupación por región para el gráfico de barras
        const byRegion = Object.entries(
          points.reduce<Record<string, number>>((acc, p) => {
            const r = p.region ?? 'Sin región';
            acc[r] = (acc[r] ?? 0) + 1;
            return acc;
          }, {})
        )
          .map(([name, count]) => ({
            name: name.replace('Región de ', '').replace('Región del ', '').replace('Metropolitana de ', 'RM · '),
            value: count,
            pct: pct(count),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Torta: origen de los puntos */}
              <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Origen de los puntos</h3>
                </div>
                <div className="p-4">
                  {(() => {
                    const srcData   = [
                      { name: 'MMA Chile',      value: mmaC,    pct: pct(mmaC) },
                      { name: 'Ingreso Manual', value: manualC, pct: pct(manualC) },
                    ];
                    return (
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={290}>
                          <PieChart onMouseLeave={() => setActivePieSrc(-1)}>
                            <Pie
                              data={srcData}
                              cx="50%" cy="50%"
                              innerRadius={76} outerRadius={112}
                              paddingAngle={4}
                              activeIndex={activePieSrc}
                              activeShape={ActiveSlice}
                              onMouseEnter={(_, i) => setActivePieSrc(i)}
                              onMouseLeave={() => setActivePieSrc(-1)}
                              dataKey="value"
                              strokeWidth={0}
                              animationDuration={900}
                              animationEasing="ease-in-out"
                            >
                              {SOURCE_COLORS.map((c, i) => (
                                <Cell key={i} fill={c} stroke="transparent" style={{ cursor: 'pointer' }} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center transition-all duration-200">
                            {activePieSrc === -1 ? (
                              <>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">{total.toLocaleString('es-CL')}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Total puntos</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xl font-bold tabular-nums leading-none" style={{ color: SOURCE_COLORS[activePieSrc] }}>{srcData[activePieSrc]?.value.toLocaleString('es-CL')}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: SOURCE_COLORS[activePieSrc] }}>{srcData[activePieSrc]?.name}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{srcData[activePieSrc]?.pct}% del total</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex justify-center gap-6 mt-1">
                    {[{ label: 'MMA Chile', color: SOURCE_COLORS[0] }, { label: 'Ingreso Manual', color: SOURCE_COLORS[1] }].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Torta: materiales RAEE */}
              <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Puntos por material RAEE</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Un punto puede aceptar múltiples materiales</p>
                </div>
                <div className="p-4">
                  {(() => {
                    const matData   = [
                      { name: 'Metal',          value: metalC, pct: pct(metalC) },
                      { name: 'Celulares',      value: phoneC, pct: pct(phoneC) },
                      { name: 'Pilas/Baterías', value: battC,  pct: pct(battC)  },
                    ];
                    return (
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={290}>
                          <PieChart onMouseLeave={() => setActivePieMat(-1)}>
                            <Pie
                              data={matData}
                              cx="50%" cy="50%"
                              innerRadius={76} outerRadius={112}
                              paddingAngle={3}
                              activeIndex={activePieMat}
                              activeShape={ActiveSlice}
                              onMouseEnter={(_, i) => setActivePieMat(i)}
                              onMouseLeave={() => setActivePieMat(-1)}
                              dataKey="value"
                              strokeWidth={0}
                              animationDuration={900}
                              animationEasing="ease-in-out"
                            >
                              {MATERIAL_COLORS.map((c, i) => (
                                <Cell key={i} fill={c} stroke="transparent" style={{ cursor: 'pointer' }} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center transition-all duration-200">
                            {activePieMat === -1 ? (
                              <>
                                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">{total.toLocaleString('es-CL')}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Total puntos</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xl font-bold tabular-nums leading-none" style={{ color: MATERIAL_COLORS[activePieMat] }}>{matData[activePieMat]?.value.toLocaleString('es-CL')}</p>
                                <p className="text-xs font-semibold mt-0.5" style={{ color: MATERIAL_COLORS[activePieMat] }}>{matData[activePieMat]?.name}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{matData[activePieMat]?.pct}% del total</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex justify-center gap-5 mt-1">
                    {[
                      { label: '⚙️ Metal',          color: MATERIAL_COLORS[0] },
                      { label: '📱 Celulares',      color: MATERIAL_COLORS[1] },
                      { label: '🔋 Pilas/Baterías', color: MATERIAL_COLORS[2] },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Barras: top 10 regiones */}
            <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Puntos por región</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Top 10 regiones con más puntos de reciclaje</p>
              </div>
              <div className="p-4 pt-5">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byRegion} margin={{ top: 4, right: 16, left: 0, bottom: 60 }} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={36} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(13,148,136,0.06)', radius: 6 }} />
                    <Legend verticalAlign="top" align="right"
                      formatter={() => 'Puntos registrados'}
                      wrapperStyle={{ fontSize: 12, color: '#64748b', paddingBottom: 8 }} />
                    <Bar dataKey="value" name="Puntos" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {byRegion.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        );
      })()}
    </div>
    </>
  );
}
