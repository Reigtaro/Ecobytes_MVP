'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';
import AppFooter from '@/components/AppFooter';

// ─── Hook de animación al hacer scroll ──────────────────────────────────────
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

function AnimatedSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isInView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Hero con canvas de partículas ───────────────────────────────────────────
function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 130;
    const CONNECT_DIST = 130;
    const REPEL_DIST = 120;
    const REPEL_STRENGTH = 4;
    const DAMPING = 0.93;
    const MIN_SPEED = 0.25;
    const CURSOR_LINE_DIST = 150;

    interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; }

    const particles: P[] = Array.from({ length: COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.4 + MIN_SPEED;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 1.6 + 0.4,
        a: Math.random() * 0.45 + 0.25,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--particle-rgb').trim() || '61, 82, 160';

      const { x: mx, y: my } = mouseRef.current;
      const hasMouse = mx !== -9999;

      for (const p of particles) {
        if (hasMouse) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPEL_DIST && dist > 0) {
            const force = ((REPEL_DIST - dist) / REPEL_DIST) * REPEL_STRENGTH;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.vx = p.vx * DAMPING + (Math.random() - 0.5) * 0.04;
        p.vy = p.vy * DAMPING + (Math.random() - 0.5) * 0.04;

        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd < MIN_SPEED && spd > 0) {
          p.vx = (p.vx / spd) * MIN_SPEED;
          p.vy = (p.vy / spd) * MIN_SPEED;
        }
        if (spd > 3) {
          p.vx = (p.vx / spd) * 3;
          p.vy = (p.vy / spd) * 3;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0)            { p.x = 0;             p.vx = Math.abs(p.vx); }
        if (p.x > canvas.width) { p.x = canvas.width;  p.vx = -Math.abs(p.vx); }
        if (p.y < 0)            { p.y = 0;             p.vy = Math.abs(p.vy); }
        if (p.y > canvas.height){ p.y = canvas.height; p.vy = -Math.abs(p.vy); }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${p.a * 0.7})`;
        ctx.fill();
      }

      // Líneas de conexión entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${rgb},${(1 - d / CONNECT_DIST) * 0.18})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Líneas desde el cursor hacia las partículas cercanas
      if (hasMouse) {
        for (const p of particles) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CURSOR_LINE_DIST) {
            const opacity = (1 - d / CURSOR_LINE_DIST) * 0.4;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${rgb},${opacity})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom
      ) {
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      } else {
        mouseRef.current = { x: -9999, y: -9999 };
      }
    };

    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <section className="relative flex h-screen min-h-[640px] items-center justify-center overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Resplandor radial */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(var(--particle-rgb),0.06) 0%, transparent 70%)' }} />
      {/* Degradado inferior */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/70 to-transparent" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-subtle dark:bg-accent/10 px-4 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span className="text-xs font-medium uppercase tracking-widest text-accent dark:text-accent-light">
            Plataforma e-waste · Chile · Ley REP
          </span>
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl">
          Gestión inteligente de{' '}
          <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
            residuos electrónicos
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 dark:text-secondary sm:text-xl">
          Plataforma digital para la reutilización y reciclaje responsable de e-waste.
          Conectamos empresas, centros de acopio y procesos de trazabilidad en un solo lugar.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-lg bg-accent px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-hover sm:w-auto"
          >
            Comenzar ahora
          </Link>
          <Link
            href="/recoleccion/puntos"
            className="w-full rounded-lg border border-border bg-white/80 dark:bg-surface/80 px-8 py-3.5 text-base font-semibold text-slate-700 dark:text-secondary backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent-subtle/50 dark:hover:bg-accent/10 sm:w-auto"
          >
            Ver puntos de recolección
          </Link>
        </div>
      </div>

      {/* Indicador de scroll
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-slate-400 dark:text-secondary">
        <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
        <div className="h-8 w-px animate-pulse bg-gradient-to-b from-accent/60 to-transparent" />
      </div>*/}
    </section>
  );
}

// Animación de conteo progresivo (stats)
function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let startTime: number | null = null;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [active, target, duration]);

  return count;
}

function StatCard({ value, suffix, label, description, delay, loading }: {
  value: number;
  suffix: string;
  label: string;
  description: string;
  delay: number;
  loading: boolean;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useCountUp(value, 2200, isInView && !loading);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center transition-all duration-700 ease-out"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(28px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {loading ? (
        <div className="mb-2 h-14 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="mb-2 bg-gradient-to-br from-accent to-accent-light bg-clip-text text-5xl font-bold text-transparent sm:text-6xl">
          {count.toLocaleString('es-CL')}{suffix}
        </div>
      )}
      <div className="mb-1 text-base font-semibold text-foreground">{label}</div>
      <div className="max-w-[190px] text-sm text-secondary">{description}</div>
    </div>
  );
}

type CollectionPointSummary = { commune?: string | null; region?: string | null };

function StatsSection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalPoints: 0, totalCommunes: 0, regionalCoverage: 0 });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/collection-points`)
      .then(r => r.json())
      .then((points: CollectionPointSummary[]) => {
        const communes = new Set(points.map(p => p.commune).filter(Boolean));
        const regions  = new Set(points.map(p => p.region).filter(Boolean));
        setData({
          totalPoints:      points.length,
          totalCommunes:    communes.size,
          regionalCoverage: Math.round((regions.size / 16) * 100),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    {
      value: data.totalPoints,
      suffix: '',
      label: 'Puntos registrados',
      description: 'Centros de recolección RAEE georeferenciados en todo Chile',
      delay: 0,
    },
    {
      value: data.totalCommunes,
      suffix: '',
      label: 'Comunas validadas',
      description: 'Comunas con al menos un punto de recolección RAEE activo',
      delay: 150,
    },
    {
      value: data.regionalCoverage,
      suffix: '%',
      label: 'Cobertura Ley REP',
      description: 'De las 16 regiones de Chile con red de recolección habilitada',
      delay: 300,
    },
  ];

  return (
    <section className="border-y border-border bg-background py-24">
      <div className="mx-auto max-w-7xl px-4">
        <AnimatedSection>
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Red nacional de recolección RAEE
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-secondary">
              Datos en tiempo real de los puntos de recolección de residuos electrónicos validados en la plataforma.
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          {stats.map(stat => (
            <StatCard key={stat.label} {...stat} loading={loading} />
          ))}
        </div>

        <AnimatedSection delay={500}>
          <div className="mt-14 flex items-center justify-center gap-2 text-sm text-muted">
            <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Datos sincronizados desde el Ministerio del Medio Ambiente · puntoslimpios.mma.gob.cl</span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// Sección de funcionalidades
function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Puntos de Recolección',
      description: 'Red de centros de acopio georeferenciados para facilitar la entrega de residuos electrónicos.',
      accent: 'emerald',
    },
    {
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'Cumplimiento Normativo',
      description: 'Facilita el cumplimiento de la Ley REP (Responsabilidad Extendida del Productor) en Chile.',
      accent: 'yellow',
    },
  ];

  const accentMap: Record<string, { ring: string; text: string; bg: string }> = {
    emerald:{ ring: 'hover:border-emerald-400/50 dark:hover:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/10' },
    yellow: { ring: 'hover:border-yellow-400/50 dark:hover:border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-500/10' },
  };

  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-4">
        <AnimatedSection>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Lo que ofrece EcoBytes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-secondary">
              Herramientas disponibles para la gestión responsable de residuos electrónicos.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-16 mx-auto max-w-2xl grid gap-6 sm:grid-cols-2">
          {features.map((f, i) => {
            const a = accentMap[f.accent];
            return (
              <AnimatedSection key={f.title} delay={i * 80}>
                <div className={`flex flex-col items-center rounded-xl border border-border bg-white dark:bg-surface p-6 text-center transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${a.ring}`}>
                  <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${a.bg}`}>
                    <div className={a.text}>{f.icon}</div>
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-secondary">{f.description}</p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Preguntas frecuentes ─────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    {
      q: '¿Qué tipos de residuos electrónicos puedo registrar?',
      a: 'Puedes registrar cualquier dispositivo electrónico en desuso: computadores, laptops, tablets, teléfonos celulares, impresoras, monitores, teclados, cables y periféricos en general. El sistema permite clasificarlos por categoría y estado.',
    },
    {
      q: '¿Cómo funciona la trazabilidad de los equipos?',
      a: 'Cada equipo registrado recibe un identificador único. Desde su ingreso al sistema puedes seguir cada etapa: recolección, clasificación, desmontaje, reciclaje o reutilización. Todos los eventos quedan registrados con fecha, responsable y ubicación.',
    },
    {
      q: '¿La plataforma ayuda con el cumplimiento de la Ley REP?',
      a: 'Sí, EcoBytes está diseñada para facilitar el cumplimiento de la Ley 20.920 (Ley REP) en Chile. Genera los reportes necesarios para acreditar la gestión de residuos electrónicos ante las autoridades competentes.',
    },
    {
      q: '¿Puedo integrar múltiples puntos de recolección?',
      a: 'Absolutamente. La plataforma permite gestionar una red de centros de acopio distribuidos geográficamente. Cada punto puede tener sus propios operadores y capacidades de almacenamiento.',
    },
    {
      q: '¿Cómo se calculan las métricas de impacto ambiental?',
      a: 'Las métricas se calculan usando factores de conversión estándar: kilogramos de material recuperado, kilogramos de CO₂ evitado, litros de agua ahorrada, entre otros. Los valores se actualizan automáticamente con cada proceso completado.',
    },
    {
      q: '¿Mis datos están seguros en la plataforma?',
      a: 'Sí, toda la información se transmite con encriptación SSL y se almacena en servidores seguros. Los accesos están controlados por roles y permisos, garantizando que cada usuario solo vea la información que le corresponde.',
    },
  ];

  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-3xl px-4">
        <AnimatedSection>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Preguntas frecuentes</h2>
            <p className="mx-auto mt-4 text-secondary">Resolvemos tus dudas sobre la plataforma EcoBytes.</p>
          </div>
        </AnimatedSection>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, i) => (
            <AnimatedSection key={i} delay={i * 50}>
              <div className="overflow-hidden rounded-lg border border-border bg-white dark:bg-surface">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-foreground">{faq.q}</span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 text-muted transition-transform ${open === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open === i && (
                  <div className="px-6 pb-4">
                    <p className="text-secondary">{faq.a}</p>
                  </div>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <PublicLayout showFooter={false}>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <FAQSection />
      <AppFooter />
    </PublicLayout>
  );
}
