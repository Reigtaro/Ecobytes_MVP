'use client';

import { useState, useEffect, Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import PublicLayout from '@/components/PublicLayout';

export default function LoginPage() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && message) {
      setIsFlipped(false);
      setMessage('');
      setEmail('');
    }
  }, [countdown, message]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.');
      setCountdown(10);
    } catch {
      setMessage('Si el correo existe, recibirás instrucciones para recuperar tu contraseña.');
      setCountdown(10);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout showFooter={false}>
    <div
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden py-8 bg-background"
    >
      {/* Radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--login-glow)' }}
      />

      {/* Floating eco icon — Recycling triangle (top area) */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ top: '6%', left: '24%', opacity: 0.12 }}
      >
        <svg width="140" height="140" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent-light)' }} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
          <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/>
          <path d="m14 16-3 3 3 3"/>
          <path d="M8.293 13.596 7.196 9.5 3.1 10.598"/>
          <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/>
          <path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>
        </svg>
      </div>

      {/* Floating eco icon — Leaf (left side) */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ top: '40%', left: '2%', opacity: 0.11 }}
      >
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent-light)' }} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
        </svg>
      </div>

      {/* Floating eco icon — Location pin (bottom right) */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ bottom: '6%', right: '5%', opacity: 0.12 }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent-light)' }} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br from-accent to-accent-hover"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1.5 2 1.5 8 7.5 8" />
              <path d="M2 12A10 10 0 0 1 20.5 7.8" />
              <polyline points="22.5 22 22.5 16 16.5 16" />
              <path d="M22 12a10 10 0 0 1-18.5 4.2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">EcoBytes</h1>
          <p className="text-sm text-secondary">Smart Electronic Waste Recycling</p>
        </div>

        {/* Flip card */}
        <div className="perspective-1000">
          <div className={`flip-card-inner relative transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>

            {/* Front — Login */}
            <div
              className="flip-card-front rounded-2xl p-7 bg-surface"
              style={{ boxShadow: 'var(--card-shadow)' }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Bienvenido de vuelta</h2>
                <p className="text-sm mt-1 text-secondary">Inicia sesión para continuar</p>
              </div>
              <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted">Cargando...</div>}>
                <LoginForm onForgotPassword={() => setIsFlipped(true)} />
              </Suspense>
            </div>

            {/* Back — Forgot password */}
            <div
              className="flip-card-back absolute inset-0 rounded-2xl p-7 bg-surface"
              style={{ boxShadow: 'var(--card-shadow)' }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Recuperar Contraseña</h2>
                <p className="text-sm mt-1 text-secondary">Te enviaremos instrucciones por email</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                {message && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm text-accent-light"
                    style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}
                  >
                    {message}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-label">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={countdown > 0}
                      className="eco-input w-full pl-10 pr-4 py-3 rounded-xl outline-none transition text-sm disabled:opacity-50"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                {countdown > 0 ? (
                  <button
                    type="button"
                    onClick={() => { setIsFlipped(false); setMessage(''); setEmail(''); setCountdown(0); }}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition eco-btn-green"
                  >
                    Volver al inicio de sesión ({countdown}s)
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition eco-btn-green disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : 'Enviar Instrucciones'}
                  </button>
                )}

                {countdown === 0 && (
                  <p className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => setIsFlipped(false)}
                      className="font-medium transition hover:opacity-80 text-accent"
                    >
                      ← Volver al inicio de sesión
                    </button>
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6 leading-relaxed text-secondary">
          Al iniciar sesión, aceptas contribuir a la reducción de residuos<br />electrónicos y la protección del medio ambiente.
        </p>
      </div>

      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .flip-card-inner { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-card-back { transform: rotateY(180deg); }

        .eco-input::placeholder { color: var(--placeholder); }
        .eco-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .eco-btn-green {
          background: var(--accent);
        }
        .eco-btn-green:hover:not(:disabled) {
          background: var(--accent-hover);
        }
      `}</style>
    </div>
    </PublicLayout>
  );
}
