'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { register, verifyEmail, resendCode } from '@/lib/auth';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'form' | 'verify' | 'confirm'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [deactivatedEmailMessage, setDeactivatedEmailMessage] = useState(false);

  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    const pendingPlanId = sessionStorage.getItem('pendingPlanId');
    if (redirect) {
      setRedirectUrl(redirect);
    } else if (pendingPlanId) {
      setRedirectUrl(`/plan-resumen/${pendingPlanId}`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      setPendingEmail(email);
      setStep('verify');
      setResendCountdown(60);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'ACCOUNT_DEACTIVATED_REGISTER') {
        setDeactivatedEmailMessage(true);
        setError('');
      } else {
        setError(err instanceof Error ? err.message : 'Error al registrar usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || '';
        }
        setDigits(newDigits);
        const focusIndex = Math.min(pasted.length, 5);
        inputRefs.current[focusIndex]?.focus();
        return;
      }
    }
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Ingresa el código completo de 6 dígitos');
      return;
    }
    setPendingCode(code);
    setStep('confirm');
  };

  const handleConfirmCreate = async () => {
    setError('');
    setLoading(true);
    try {
      await verifyEmail(pendingEmail, pendingCode);
      sessionStorage.removeItem('pendingPlanId');
      router.push(redirectUrl || '/recoleccion/puntos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cuenta';
      setError(message);
      if (message.includes('incorrecto') || message.includes('expirado') || message.includes('intentos')) {
        setPendingCode('');
        setDigits(['', '', '', '', '', '']);
        setStep('verify');
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setError('');
    try {
      await resendCode(pendingEmail);
      setResendCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar código');
    }
  };

  const handleChangeEmail = () => {
    setStep('form');
    setError('');
    setDigits(['', '', '', '', '', '']);
    setPendingCode('');
  };

  // ─── Step 3: Confirm account creation ───
  if (step === 'confirm') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-success-500 to-success-700">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Confirmar cuenta</h3>
          <p className="text-sm text-secondary">
            Email verificado. Revisa tus datos antes de continuar.
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-error-400"
            style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}
          >
            {error}
          </div>
        )}

        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-accent to-info">
              <span className="text-white font-bold text-sm">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{name}</p>
              <p className="text-xs truncate text-secondary">{pendingEmail}</p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-accent-light"
            style={{ background: 'var(--success-bg)' }}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Email verificado correctamente
          </div>
        </div>

        <button
          onClick={handleConfirmCreate}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition eco-btn-green disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
        </button>

        <button
          type="button"
          onClick={() => { setStep('verify'); setError(''); }}
          className="w-full text-sm transition hover:opacity-80 text-muted"
        >
          Volver atrás
        </button>

        <style jsx>{`
          .eco-btn-green { background: var(--accent); }
          .eco-btn-green:hover:not(:disabled) { background: var(--accent-hover); }
        `}</style>
      </div>
    );
  }

  // ─── Step 2: Email verification code ───
  if (step === 'verify') {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-accent to-info">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Verifica tu email</h3>
          <p className="text-sm text-secondary">
            Enviamos un código de 6 dígitos a
          </p>
          <p className="text-sm font-medium text-accent">{pendingEmail}</p>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-error-400"
            style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}
          >
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="eco-digit-input w-11 h-13 text-center text-lg font-bold rounded-xl outline-none transition"
              style={{ background: 'var(--bg-input)', border: '2px solid var(--border-input)', color: 'var(--text-primary)', height: '52px' }}
              autoFocus={index === 0}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={digits.join('').length !== 6}
          className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition eco-btn-green disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </button>

        <div className="flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCountdown > 0}
            className="font-medium transition hover:opacity-80 disabled:cursor-not-allowed"
            style={{ color: resendCountdown > 0 ? 'var(--text-secondary)' : 'var(--accent)' }}
          >
            {resendCountdown > 0 ? `Reenviar código en ${resendCountdown}s` : 'Reenviar código'}
          </button>
          <button
            type="button"
            onClick={handleChangeEmail}
            className="transition hover:opacity-80 text-muted"
          >
            Cambiar email
          </button>
        </div>

        <style jsx>{`
          .eco-digit-input::placeholder { color: var(--placeholder); }
          .eco-digit-input:focus {
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 3px var(--accent-bg);
          }
          .eco-btn-green { background: var(--accent); }
          .eco-btn-green:hover:not(:disabled) { background: var(--accent-hover); }
        `}</style>
      </form>
    );
  }

  // ─── Step 1: Registration form ───
  return (
    <form onSubmit={handleSubmitForm} className="space-y-4">
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-error-400"
          style={{ background: 'var(--error-bg)', border: '1px solid var(--error-border)' }}
        >
          {error}
        </div>
      )}

      {deactivatedEmailMessage && (
        <div
          className="rounded-xl px-4 py-4 space-y-2 text-sm text-warning-400"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="font-medium">Este email tiene una cuenta desactivada</p>
          </div>
          <p className="text-secondary">Inicia sesión para solicitar reactivación.</p>
          <Link
            href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
            className="inline-block mt-1 text-sm font-medium transition hover:opacity-80 text-accent"
          >
            Ir a iniciar sesión →
          </Link>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-2 text-label">
          Nombre
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="eco-input w-full pl-10 pr-4 py-3 rounded-xl outline-none transition text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            placeholder="Tu nombre"
          />
        </div>
      </div>

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
            placeholder="tu@email.com"
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
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="eco-input w-full pl-10 pr-4 py-3 rounded-xl outline-none transition text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-sm font-medium mb-2 text-label">
          Confirmar Contraseña
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="eco-input w-full pl-10 pr-4 py-3 rounded-xl outline-none transition text-sm"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
            placeholder="Repite tu contraseña"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition eco-btn-green disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ marginTop: '8px' }}
      >
        {loading ? 'Enviando código...' : 'Crear Cuenta'}
      </button>

      {/* Separator */}
      <div className="relative flex items-center">
        <div className="flex-1" style={{ borderTop: '1px solid var(--border-input)' }} />
        <span className="px-3 text-xs text-secondary">o</span>
        <div className="flex-1" style={{ borderTop: '1px solid var(--border-input)' }} />
      </div>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link
          href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
          className="font-medium transition hover:opacity-80 text-accent"
        >
          Inicia sesión
        </Link>
      </p>

      <style jsx>{`
        .eco-input::placeholder { color: var(--placeholder); }
        .eco-input:focus {
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px var(--accent-bg);
        }
        .eco-btn-green { background: var(--accent); }
        .eco-btn-green:hover:not(:disabled) { background: var(--accent-hover); }
      `}</style>
    </form>
  );
}
