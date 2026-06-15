'use client';

import { useState, useEffect } from 'react';
import SubHeader from '@/components/SubHeader';
import { getApiUrl, authFetch } from '@/lib/api';
import ExcelJS from 'exceljs';
import { CHART_COLORS, SOURCE_COLORS, EXCEL_COLORS } from '@/lib/colors';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ActivityData {
  totalCenters:  number;
  totalSearches: number;
  mmaCount:      number;
  manualCount:   number;
  byType:   { type: string;   count: number }[];
  byRegion: { region: string; count: number }[];
}

// ─── Exportación Excel ─────────────────────────────────────────────────────────

async function downloadExcel(data: ActivityData) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'EcoBytes';
  wb.created  = new Date();
  wb.modified = new Date();

  const { TEAL, TEAL_LT, SLATE, SLATE_M, SLATE_L, WHITE, INDIGO, INDIGO_L, ROW_ALT, BORDER } = EXCEL_COLORS;

  const thin: ExcelJS.Border = { style: 'thin', color: { argb: BORDER } };
  const thinAll = { top: thin, bottom: thin, left: thin, right: thin };

  const dateStr = new Date().toLocaleDateString('es-CL', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const pct = (val: number) =>
    data.totalCenters > 0 ? Math.round((val / data.totalCenters) * 100) : 0;

  // ── Hoja 1: Resumen general ──────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Resumen');
  ws1.properties.defaultRowHeight = 18;
  ws1.views = [{ showGridLines: false }];
  [42, 48].forEach((w, i) => { ws1.getColumn(i + 1).width = w; });

  // Encabezado principal
  ws1.mergeCells('A1:B1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = 'EcoBytes — Reporte de Actividad del Sistema';
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

  /* Agrega una fila de datos con estilo alternado */
  const addInfo = (label: string, value: string | number, alt = false) => {
    const row = ws1.addRow([label, value]);
    row.height = 20;
    const lCell = row.getCell(1);
    const vCell = row.getCell(2);
    lCell.font = { bold: true, size: 10, color: { argb: SLATE } };
    vCell.font = { size: 10, color: { argb: SLATE_M } };
    const bg = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: alt ? ROW_ALT : WHITE } };
    lCell.fill = bg;
    vCell.fill = bg;
    lCell.border = thinAll;
    vCell.border = thinAll;
    lCell.alignment = { vertical: 'middle' };
    vCell.alignment = { vertical: 'middle' };
  };

  /* Agrega una fila de sección (encabezado de bloque) */
  const addSection = (
  title: string,
  rowNum: number,
  color: string
) => {
    ws1.mergeCells(`A${rowNum}:B${rowNum}`);
    const cell = ws1.getCell(`A${rowNum}`);
    cell.value = title;
    cell.font  = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws1.getRow(rowNum).height = 22;
  };

  // Sección: información del reporte
  addSection('INFORMACIÓN DEL REPORTE', 4, SLATE_M);
  addInfo('Fecha de generación', dateStr, false);
  addInfo('Sistema', 'EcoBytes · Módulo de Reportes', true);
  addInfo('Normativa aplicable', 'Ley REP 20.920 · Ministerio del Medio Ambiente', false);
  addInfo('Fuente de datos', 'API MMA Chile + Seguimiento de búsquedas interno', true);

  ws1.addRow([]);

  // Sección: estadísticas generales
  addSection('ESTADÍSTICAS GENERALES', 10, TEAL);
  addInfo('Total de centros registrados', data.totalCenters, false);
  addInfo('Búsquedas realizadas', data.totalSearches, true);
  addInfo('Centros desde MMA Chile', `${data.mmaCount} (${pct(data.mmaCount)}%)`, false);
  addInfo('Centros ingresados manualmente', `${data.manualCount} (${pct(data.manualCount)}%)`, true);

  // ── Hoja 2: Distribución por tipo de punto ───────────────────────────────
  const ws2 = wb.addWorksheet('Por Tipo de Punto');
  ws2.properties.defaultRowHeight = 18;
  ws2.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];
  [36, 18, 14].forEach((w, i) => { ws2.getColumn(i + 1).width = w; });

  // Título
  ws2.mergeCells('A1:C1');
  const ws2Title = ws2.getCell('A1');
  ws2Title.value = `Distribución por Tipo de Punto · Generado ${dateStr}`;
  ws2Title.font  = { bold: true, size: 11, color: { argb: WHITE } };
  ws2Title.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  ws2Title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(1).height = 28;

  // Encabezados
  const ws2Header = ws2.getRow(2);
  ws2Header.height = 24;
  ['Tipo de Punto', 'Centros', '% del Total'].forEach((h, i) => {
    const cell = ws2Header.getCell(i + 1);
    cell.value = h;
    cell.font  = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
    cell.border = { ...thinAll, bottom: { style: 'medium', color: { argb: TEAL } } };
  });

  // Filas de datos
  data.byType.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    const bg    = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isAlt ? ROW_ALT : WHITE } };
    const r = ws2.addRow([row.type, row.count, `${pct(row.count)}%`]);
    r.height = 17;
    r.eachCell((cell, col) => {
      cell.fill   = bg;
      cell.border = thinAll;
      cell.font   = { size: 10, color: { argb: SLATE } };
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
    });
  });

  // Fila de total
  const ws2Footer = ws2.addRow(['Total', data.totalCenters, '100%']);
  ws2Footer.height = 20;
  ws2Footer.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LT } };
    cell.font   = { bold: true, size: 10, color: { argb: TEAL } };
    cell.border = { ...thinAll, top: { style: 'medium', color: { argb: TEAL } } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws2Footer.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // ── Hoja 3: Distribución por región ─────────────────────────────────────
  const ws3 = wb.addWorksheet('Por Región');
  ws3.properties.defaultRowHeight = 18;
  ws3.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];
  [40, 18, 14].forEach((w, i) => { ws3.getColumn(i + 1).width = w; });

  // Título
  ws3.mergeCells('A1:C1');
  const ws3Title = ws3.getCell('A1');
  ws3Title.value = `Distribución por Región · Generado ${dateStr}`;
  ws3Title.font  = { bold: true, size: 11, color: { argb: WHITE } };
  ws3Title.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
  ws3Title.alignment = { vertical: 'middle', horizontal: 'center' };
  ws3.getRow(1).height = 28;

  // Encabezados
  const ws3Header = ws3.getRow(2);
  ws3Header.height = 24;
  ['Región', 'Centros', '% del Total'].forEach((h, i) => {
    const cell = ws3Header.getCell(i + 1);
    cell.value = h;
    cell.font  = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center' };
    cell.border = { ...thinAll, bottom: { style: 'medium', color: { argb: INDIGO } } };
  });

  // Filas de datos (ordenadas de mayor a menor)
  const sortedRegions = [...data.byRegion].sort((a, b) => b.count - a.count);
  sortedRegions.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    const bg    = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isAlt ? INDIGO_L : WHITE } };
    const r = ws3.addRow([row.region, row.count, `${pct(row.count)}%`]);
    r.height = 17;
    r.eachCell((cell, col) => {
      cell.fill   = bg;
      cell.border = thinAll;
      cell.font   = { size: 10, color: { argb: SLATE } };
      cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
    });
  });

  // Fila de total
  const ws3Footer = ws3.addRow(['Total', data.totalCenters, '100%']);
  ws3Footer.height = 20;
  ws3Footer.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_L } };
    cell.font   = { bold: true, size: 10, color: { argb: SLATE } };
    cell.border = { ...thinAll, top: { style: 'medium', color: { argb: SLATE_M } } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws3Footer.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Descarga del archivo
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `EcoBytes_Reporte_Actividad_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Paleta de colores para gráficos — importada de @/lib/colors ──────────────

// ─── Sector activo con sombra y expansión suave ────────────────────────────────

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
        Centros: <span className="font-bold text-zinc-900 dark:text-zinc-100">{payload[0].value.toLocaleString('es-CL')}</span>
      </p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Participación: <span className="font-bold text-accent">{payload[0].payload.pct}%</span>
      </p>
    </div>
  );
}

// ─── Tarjeta de estadística ────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none mb-1">
          {value.toLocaleString('es-CL')}
        </p>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
        {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function ReporteActividadPage() {
  const [data,            setData]            = useState<ActivityData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [activePieType,   setActivePieType]   = useState(-1);
  const [activePieRegion, setActivePieRegion] = useState(-1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch(`${getApiUrl()}/reports/activity`);
        if (!res.ok) throw new Error('Error al obtener los datos de actividad');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
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
        title="Actividad del Sistema"
        breadcrumbs={[{ label: 'Reportes' }]}
        icon={
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        }
        actions={
          !loading && data ? (
            <button
              onClick={() => downloadExcel(data)}
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

      {loading ? (
        <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] flex items-center justify-center gap-3 py-16">
          <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Cargando datos de actividad…</span>
        </div>
      ) : error ? (
        <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] flex flex-col items-center justify-center gap-2 py-16">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Centros registrados"
              value={data.totalCenters}
              sub="Total en la plataforma"
              color="bg-accent-subtle dark:bg-accent/10"
              icon={
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              }
            />
            <StatCard
              label="Búsquedas realizadas"
              value={data.totalSearches}
              sub="Desde activación del tracking"
              color="bg-indigo-50 dark:bg-indigo-500/10"
              icon={
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              }
            />
            <StatCard
              label="Desde MMA Chile"
              value={data.mmaCount}
              sub={`${data.totalCenters > 0 ? Math.round((data.mmaCount / data.totalCenters) * 100) : 0}% del total`}
              color="bg-blue-50 dark:bg-blue-500/10"
              icon={
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              }
            />
            <StatCard
              label="Ingresados manualmente"
              value={data.manualCount}
              sub={`${data.totalCenters > 0 ? Math.round((data.manualCount / data.totalCenters) * 100) : 0}% del total`}
              color="bg-amber-50 dark:bg-amber-500/10"
              icon={
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tabla por tipo */}
            <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Centros por tipo de punto</h3>
              </div>
              {data.byType.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Sin datos disponibles</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/[0.04] dark:border-white/[0.05]">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Tipo de Punto</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Centros</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                    {data.byType.map(row => (
                      <tr key={row.type} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                            <span className="text-zinc-700 dark:text-zinc-300 font-medium">{row.type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400 tabular-nums font-medium">
                          {row.count.toLocaleString('es-CL')}
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-400 dark:text-zinc-500 tabular-nums text-xs">
                          {data.totalCenters > 0 ? Math.round((row.count / data.totalCenters) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Tabla por región */}
            <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Centros por región</h3>
              </div>
              {data.byRegion.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Sin datos disponibles</p>
              ) : (
                <div className="overflow-y-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-black/[0.04] dark:border-white/[0.05] bg-white dark:bg-zinc-900">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Región</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Centros</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
                      {data.byRegion.map((row, i) => {
                        const pct = data.totalCenters > 0 ? (row.count / data.totalCenters) * 100 : 0;
                        return (
                          <tr key={row.region} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-1.5 h-5 rounded-full flex-shrink-0"
                                  style={{ background: `hsl(${170 + i * 12}, 60%, ${40 + (i % 3) * 8}%)` }}
                                />
                                <span className="text-zinc-700 dark:text-zinc-300 truncate">{row.region}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400 tabular-nums font-medium">
                              {row.count.toLocaleString('es-CL')}
                            </td>
                            <td className="px-5 py-3 text-right min-w-[70px]">
                              <div className="flex items-center justify-end gap-2">
                                <div className="flex-1 max-w-[50px] h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700/50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-accent"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="text-zinc-400 dark:text-zinc-500 tabular-nums text-xs w-8 text-right">
                                  {Math.round(pct)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Gráficos ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Torta: distribución por tipo */}
            <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Distribución por tipo de punto</h3>
              </div>
              <div className="p-4">
                {data.byType.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-8">Sin datos disponibles</p>
                ) : (
                  <>
                    {/* Overlay central con info del segmento activo */}
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart onMouseLeave={() => setActivePieType(-1)}>
                          <Pie
                            data={data.byType.map(r => ({
                              name: r.type,
                              value: r.count,
                              pct: data.totalCenters > 0 ? Math.round((r.count / data.totalCenters) * 100) : 0,
                            }))}
                            cx="50%" cy="50%"
                            innerRadius={76} outerRadius={112}
                            paddingAngle={3}
                            activeIndex={activePieType}
                            activeShape={ActiveSlice}
                            onMouseEnter={(_, i) => setActivePieType(i)}
                            onMouseLeave={() => setActivePieType(-1)}
                            dataKey="value"
                            strokeWidth={0}
                            animationDuration={900}
                            animationEasing="ease-in-out"
                          >
                            {data.byType.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} style={{ cursor: 'pointer' }} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Info en el centro del donut */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center transition-all duration-200">
                          {activePieType === -1 ? (
                            <>
                              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">{data.totalCenters.toLocaleString('es-CL')}</p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Total centros</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-bold tabular-nums leading-none" style={{ color: CHART_COLORS[activePieType % CHART_COLORS.length] }}>{data.byType[activePieType]?.count.toLocaleString('es-CL')}</p>
                              <p className="text-xs font-semibold" style={{ color: CHART_COLORS[activePieType % CHART_COLORS.length] }}>{data.byType[activePieType]?.type}</p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{data.byType[activePieType] ? Math.round((data.byType[activePieType].count / data.totalCenters) * 100) : 0}% del total</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                      {data.byType.map((r, i) => (
                        <div key={r.type} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {r.type}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Torta: origen MMA vs Manual */}
            <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Origen de los centros</h3>
              </div>
              <div className="p-4">
                {(() => {
                  const srcData = [
                    { name: 'MMA Chile',      value: data.mmaCount,    pct: data.totalCenters > 0 ? Math.round((data.mmaCount    / data.totalCenters) * 100) : 0 },
                    { name: 'Ingreso Manual', value: data.manualCount, pct: data.totalCenters > 0 ? Math.round((data.manualCount / data.totalCenters) * 100) : 0 },
                  ];
                  return (
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={290}>
                        <PieChart onMouseLeave={() => setActivePieRegion(-1)}>
                          <Pie
                            data={srcData}
                            cx="50%" cy="50%"
                            innerRadius={76} outerRadius={112}
                            paddingAngle={4}
                            activeIndex={activePieRegion}
                            activeShape={ActiveSlice}
                            onMouseEnter={(_, i) => setActivePieRegion(i)}
                            onMouseLeave={() => setActivePieRegion(-1)}
                            dataKey="value"
                            animationDuration={900}
                            animationEasing="ease-in-out"
                            strokeWidth={0}
                          >
                            {SOURCE_COLORS.map((c, i) => <Cell key={i} fill={c} style={{ cursor: 'pointer' }} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center transition-all duration-200">
                          {activePieRegion === -1 ? (
                            <>
                              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums leading-none">{data.totalCenters.toLocaleString('es-CL')}</p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Total centros</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xl font-bold tabular-nums leading-none" style={{ color: SOURCE_COLORS[activePieRegion] }}>{srcData[activePieRegion]?.value.toLocaleString('es-CL')}</p>
                              <p className="text-xs font-semibold" style={{ color: SOURCE_COLORS[activePieRegion] }}>{srcData[activePieRegion]?.name}</p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{srcData[activePieRegion]?.pct}% del total</p>
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

          </div>

          {/* Barras: centros por región (top 10) */}
          <div className="card-bg rounded-xl border border-black/[0.05] dark:border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.05]">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Centros por región</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Top 10 regiones con más centros registrados</p>
            </div>
            <div className="p-4 pt-5">
              {data.byRegion.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">Sin datos disponibles</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[...data.byRegion]
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10)
                      .map(r => ({
                        name: r.region.replace('Región de ', '').replace('Región del ', '').replace('Metropolitana de ', 'RM · '),
                        value: r.count,
                        pct: data.totalCenters > 0 ? Math.round((r.count / data.totalCenters) * 100) : 0,
                      }))}
                    margin={{ top: 4, right: 16, left: 0, bottom: 60 }}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }}
                      angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={36} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(13,148,136,0.06)', radius: 6 }} />
                    <Legend
                      verticalAlign="top" align="right"
                      formatter={() => 'Centros registrados'}
                      wrapperStyle={{ fontSize: 12, color: '#64748b', paddingBottom: 8 }}
                    />
                    <Bar dataKey="value" name="Centros" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {[...data.byRegion]
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 10)
                        .map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Nota aclaratoria */}
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Las búsquedas se registran a partir de la activación del módulo de tracking. Los datos de centros se sincronizan con el MMA Chile.
          </p>
        </>
      ) : null}
    </div>
    </>
  );
}
