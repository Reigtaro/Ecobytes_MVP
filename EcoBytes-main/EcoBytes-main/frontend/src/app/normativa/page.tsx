'use client';

import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';

const SECTIONS = [
  {
    title: '¿Qué es la Ley REP?',
    content:
      'La Ley N° 20.920, conocida como Ley REP (Responsabilidad Extendida del Productor), establece que los fabricantes, importadores y distribuidores de productos prioritarios son responsables de gestionar los residuos generados al final de la vida útil de sus productos. Fue promulgada en 2016 y su reglamento para aparatos eléctricos y electrónicos entró en vigor progresivamente.',
  },
  {
    title: 'Productos prioritarios',
    content:
      'La ley define seis categorías de productos prioritarios: aceites lubricantes, aparatos eléctricos y electrónicos (RAEE), baterías, envases y embalajes, neumáticos, y pilas. EcoBytes se enfoca en la gestión de RAEE: computadores, celulares, electrodomésticos y equipos industriales.',
  },
  {
    title: 'Obligaciones de los productores',
    content:
      'Los productores deben adherirse a un Sistema de Gestión (SdG) o actuar de forma individual. Deben cumplir metas de recolección y valorización fijadas por el Ministerio del Medio Ambiente, reportar anualmente ante la Superintendencia del Medio Ambiente (SMA) y garantizar la correcta disposición de los residuos.',
  },
  {
    title: 'Rol de los gestores y recicladores',
    content:
      'Los gestores autorizados reciben, transportan, almacenan y valorizan los residuos. Deben contar con autorización sanitaria y ambiental. Los recicladores de base pueden participar en la cadena formal a través de los SdG, accediendo a capacitación y reconocimiento oficial.',
  },
  {
    title: 'Fiscalización y sanciones',
    content:
      'La Superintendencia del Medio Ambiente (SMA) es el organismo fiscalizador. El incumplimiento de las metas puede resultar en multas de hasta 10.000 UTA (~$7.400 millones de pesos). EcoBytes facilita la trazabilidad y los reportes necesarios para acreditar el cumplimiento ante la SMA.',
  },
  {
    title: 'Más información',
    content:
      'Puedes consultar el texto completo de la ley, sus reglamentos y las metas vigentes en el sitio oficial del Ministerio del Medio Ambiente y en el portal de la Superintendencia del Medio Ambiente.',
  },
];

export default function NormativaPage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-white dark:bg-background">
        {/* Hero */}
        <div className="bg-accent dark:bg-accent">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <span className="inline-block text-4xl mb-4">⚖️</span>
            <h1 className="text-3xl font-bold text-white mb-3">Normativa REP</h1>
            <p className="text-accent-light text-lg max-w-2xl mx-auto">
              Ley N° 20.920 — Responsabilidad Extendida del Productor en Chile
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="space-y-10">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                  {section.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* External links */}
          <div className="mt-12 p-6 rounded-xl border border-accent/30 dark:border-accent/30 bg-accent-subtle dark:bg-accent/10">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Recursos oficiales
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-500 dark:text-slate-400">
                  Ministerio del Medio Ambiente —{' '}
                </span>
                <span className="text-accent dark:text-accent-light font-medium">
                  mma.gob.cl
                </span>
              </li>
              <li>
                <span className="text-slate-500 dark:text-slate-400">
                  Superintendencia del Medio Ambiente —{' '}
                </span>
                <span className="text-accent dark:text-accent-light font-medium">
                  sma.gob.cl
                </span>
              </li>
              <li>
                <span className="text-slate-500 dark:text-slate-400">
                  Ley 20.920 en BCN —{' '}
                </span>
                <span className="text-accent dark:text-accent-light font-medium">
                  bcn.cl
                </span>
              </li>
            </ul>
          </div>

          {/* Back link */}
          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent dark:hover:text-accent-light transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
