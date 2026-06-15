'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, getApiUrl } from '@/lib/auth';

interface LoginFormProps {
  onForgotPassword?: () => void;
}

export default function LoginForm({ onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [deactivatedEmail, setDeactivatedEmail] = useState<string | null>(null);
  const [reactivationSent, setReactivationSent] = useState(false);
  const [reactivationLoading, setReactivationLoading] = useState(false);

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDeactivatedEmail(null);
    setReactivationSent(false);
    setLoading(true);

    try {
      const data = await login(email, password);
      const STAFF_ROLES = ['SuperAdmin', 'Administrador', 'Moderador'];
      const isStaff = STAFF_ROLES.includes(data?.user?.role_name || '');
      const defaultRedirect = isStaff ? '/dashboard' : '/recoleccion/puntos';
      router.push(redirectUrl || defaultRedirect);
    } catch (err: unknown) {
      console.error('Error en login:', err);
      const code = (err as { code?: string })?.code;
      if (code === 'ACCOUNT_DEACTIVATED') {
        setDeactivatedEmail((err as { email?: string })?.email || email);
      } else {
        setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReactivation = async () => {
    if (!deactivatedEmail) return;
    setReactivationLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/account/request-reactivation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: deactivatedEmail }),
      });
      if (res.ok) {
        setReactivationSent(true);
      }
    } catch {
      setError('Error al solicitar reactivacion');
    } finally {
      setReactivationLoading(false);
    }
  };

  const handleDevLogin = async (devEmail: string, devPassword: string) => {
    setError('');
    setDeactivatedEmail(null);
    setReactivationSent(false);
    setLoading(true);
    try {
      const data = await login(devEmail, devPassword);
      const STAFF_ROLES = ['SuperAdmin', 'Administrador', 'Moderador'];
      const isStaff = STAFF_ROLES.includes(data?.user?.role_name || '');
      const defaultRedirect = isStaff ? '/dashboard' : '/recoleccion/puntos';
      router.push(redirectUrl || defaultRedirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)', color: 'var(--error)' }}
        >
          {error}
        </div>
      )}

      {deactivatedEmail && !reactivationSent && (
        <div
          className="rounded-xl px-4 py-4 space-y-3 text-sm"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', color: 'var(--warning)' }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="font-medium">Tu cuenta está desactivada</p>
          </div>
          <p className="text-secondary">Puedes solicitar la reactivación por email.</p>
          <button
            type="button"
            onClick={handleRequestReactivation}
            disabled={reactivationLoading}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition eco-btn-green disabled:opacity-50"
          >
            {reactivationLoading ? 'Enviando...' : 'Enviar email de reactivación'}
          </button>
        </div>
      )}

      {reactivationSent && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--accent-light)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p>Revisa tu correo. Te enviamos un enlace de reactivación.</p>
        </div>
      )}

      {/* Email */}
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
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="eco-input w-full pl-10 pr-4 py-3 rounded-xl outline-none transition text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            placeholder="you@example.com"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium mb-2 text-label">
          Contraseña
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="eco-input w-full pl-10 pr-12 py-3 rounded-xl outline-none transition text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition hover:opacity-80 text-secondary"
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Forgot password */}
      <div className="text-right -mt-1">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium transition hover:opacity-80 text-accent"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition eco-btn-green disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>

      {/* Separator */}
      <div className="relative flex items-center">
        <div className="flex-1" style={{ borderTop: '1px solid var(--border-input)' }} />
        <span className="px-3 text-xs text-secondary">o</span>
        <div className="flex-1" style={{ borderTop: '1px solid var(--border-input)' }} />
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <a
          href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
          className="font-medium transition hover:opacity-80 text-accent"
        >
          Regístrate aquí
        </a>
      </p>

      {/* DEV quick login */}
      {process.env.NODE_ENV === 'development' && (
        <div className="pt-1 space-y-2">
          <div className="relative flex items-center">
            <div className="flex-1" style={{ borderTop: '1px dashed var(--warning-border)' }} />
            <span className="px-2 text-xs font-medium" style={{ color: 'var(--warning)' }}>DEV</span>
            <div className="flex-1" style={{ borderTop: '1px dashed var(--warning-border)' }} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDevLogin('test@example.com', 'test123')}
              className="dev-btn flex-1 py-2 px-3 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--warning-border)', color: 'var(--warning)', background: 'var(--warning-bg)' }}
            >
              Iniciar como Test
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDevLogin('admin@example.com', 'admin123')}
              className="dev-btn flex-1 py-2 px-3 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--warning-border)', color: 'var(--warning)', background: 'var(--warning-bg)' }}
            >
              Iniciar como Admin
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .eco-input::placeholder { color: var(--placeholder); }
        .eco-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .eco-btn-green { background: var(--accent); }
        .eco-btn-green:hover:not(:disabled) { background: var(--accent-hover); }

        .dev-btn {
          transition: color 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .dev-btn:hover:not(:disabled) {
          background: rgba(245, 158, 11, 0.18) !important;
          border-color: rgba(245, 158, 11, 0.8) !important;
          color: #fcd34d !important;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12), 0 4px 14px rgba(245, 158, 11, 0.18);
          transform: translateY(-1px);
        }
        .dev-btn:active:not(:disabled) {
          transform: translateY(0px);
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
        }
      `}</style>
    </form>
  );
}
