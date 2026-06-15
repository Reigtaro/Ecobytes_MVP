'use client';

import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';

export default function UnauthorizedPage() {
  return (
    <PublicLayout>
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#09090b]">
      <div className="text-center">
        <div className="mb-6">
          <svg className="w-24 h-24 mx-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-2">401</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">No Autenticado</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Necesitas iniciar sesión para acceder a esta página.
          Tu sesión puede haber expirado.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Iniciar Sesión
        </Link>
      </div>
    </div>
    </PublicLayout>
  );
}
