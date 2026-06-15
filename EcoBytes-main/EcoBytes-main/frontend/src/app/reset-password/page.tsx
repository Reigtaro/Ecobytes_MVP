'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PublicLayout from '@/components/PublicLayout';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Error al restablecer la contraseña');
        return;
      }

      setSuccess(data.message || 'Contraseña actualizada exitosamente.');
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Error al conectar con el servidor. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          Enlace inválido. Por favor solicita uno nuevo desde la página de inicio de sesión.
        </div>
        <button
          onClick={() => router.push('/login')}
          className="text-sm text-accent hover:text-accent-light font-medium transition-colors"
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          {success}
          <p className="mt-1 text-xs opacity-80">Redirigiendo al inicio de sesión...</p>
        </div>
      )}

      {!success && (
        <>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
              Ingresa tu nueva contraseña para <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
            </p>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-accent/20 bg-white dark:bg-input text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirmar contraseña
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 dark:border-accent/20 bg-white dark:bg-input text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
              placeholder="Repite tu nueva contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-accent to-accent-hover text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 focus:ring-4 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            {loading ? 'Actualizando...' : 'Restablecer Contraseña'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-accent dark:text-accent-light hover:text-accent dark:hover:text-accent-light font-medium transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </div>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <PublicLayout showFooter={false}>
      <div className="flex-1 flex items-center justify-center bg-gradient-to-r from-accent to-accent-hover dark:from-background dark:to-surface">
        <div className="max-w-md w-full relative z-10 px-4 py-10">
          <div className="card-bg rounded-2xl p-8" style={{ boxShadow: '0 35px 60px -10px rgba(0, 0, 0, 0.7), 0 20px 30px -5px rgba(0, 0, 0, 0.5)' }}>
            <div className="text-center mb-8">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Nueva</h1>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">Contraseña</h2>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Crea tu nueva contraseña</p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600" />
              </div>
            </div>
            <Suspense fallback={<div className="h-48 flex items-center justify-center text-gray-500">Cargando...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
