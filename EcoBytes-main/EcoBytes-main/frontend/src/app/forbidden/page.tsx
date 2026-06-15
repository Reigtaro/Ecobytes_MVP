'use client';

import Link from 'next/link';
import PublicLayout from '@/components/PublicLayout';

export default function ForbiddenPage() {
  return (
    <PublicLayout>
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#09090b]">
      <div className="text-center">
        <div className="mb-6">
          <svg className="w-24 h-24 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-2">403</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Acceso Denegado</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          No tienes permisos para acceder a esta sección.
          Contacta al administrador si crees que esto es un error.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Inicio
        </Link>
      </div>
    </div>
    </PublicLayout>
  );
}
