'use client';

import { useEffect, useState } from 'react';
import { getMe, User } from '@/lib/auth';
import {
  IconIdCard,
  IconMail,
  IconUser,
} from "@/components/SvgIconProps";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(me => setUser(me.user))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Bienvenido, {user ? user.name : '…'}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-0.5">Panel de control · EcoBytes</p>
      </div>

      {/* Tarjetas de información del usuario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card-bg rounded-xl border border-black/[0.06] dark:border-white/[0.07] p-4 flex items-center gap-3">
          <div className="shrink-0 rounded-lg p-2.5 bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/15">
            <IconIdCard className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">ID de Usuario</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{user?.id ?? '—'}</p>
          </div>
        </div>

        <div className="card-bg rounded-xl border border-black/[0.06] dark:border-white/[0.07] p-4 flex items-center gap-3">
          <div className="shrink-0 rounded-lg p-2.5 bg-accent/10 text-accent border border-accent/15">
            <IconMail className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Email</p>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{user?.email ?? '—'}</p>
          </div>
        </div>

        <div className="card-bg rounded-xl border border-black/[0.06] dark:border-white/[0.07] p-4 flex items-center gap-3">
          <div className="shrink-0 rounded-lg p-2.5 bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/15">
            <IconUser className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Nombre</p>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{user?.name ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Módulos próximamente */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Registro de Equipos', description: 'Gestión de dispositivos electrónicos registrados', color: 'emerald' },
          { label: 'Reciclajes Completados', description: 'Historial de procesos de reciclaje finalizados', color: 'teal' },
          { label: 'Puntos de Recolección', description: 'Red de centros de acopio disponibles', color: 'cyan' },
          { label: 'Trazabilidad', description: 'Seguimiento del ciclo de vida de los residuos', color: 'blue' },
          { label: 'Reportes', description: 'Métricas e informes de impacto ambiental', color: 'violet' },
          { label: 'Configuración', description: 'Parámetros y ajustes del sistema', color: 'zinc' },
        ].map((module) => (
          <div
            key={module.label}
            className="card-bg rounded-xl border border-black/[0.06] dark:border-white/[0.07] p-5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{module.label}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.06]">
                Próximamente
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">{module.description}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-accent/20 dark:border-accent/15 bg-accent-subtle/60 dark:bg-accent/[0.06]">
        <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
        <p className="text-xs text-accent">
          Sesión activa · Usa el menú lateral para navegar por los módulos.
        </p>
      </div>
    </div>
  );
}
