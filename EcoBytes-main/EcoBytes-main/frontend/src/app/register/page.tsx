'use client';

import { useState, useEffect, Suspense } from 'react';
import RegisterForm from '@/components/RegisterForm';
import PublicLayout from '@/components/PublicLayout';

export default function RegisterPage() {
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    }
  }, []);

  return (
    <PublicLayout showFooter={false}>
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden py-8 bg-background">
      {/* Radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--login-glow)' }}
      />

      {/* Floating eco icon — Recycling triangle (top area) */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ top: '4%', right: '24%', opacity: 0.12 }}
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
        style={{ top: '35%', left: '2%', opacity: 0.11 }}
      >
        <svg width="90" height="90" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--accent-light)' }} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
        </svg>
      </div>

      {/* Floating eco icon — Location pin (bottom right) */}
      <div
        className="absolute pointer-events-none select-none"
        style={{ bottom: '5%', right: '5%', opacity: 0.12 }}
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-gradient-to-br from-accent to-accent-hover">
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

        {/* Card */}
        <div
          className="rounded-2xl p-7 bg-surface"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Crear Cuenta</h2>
            <p className="text-sm mt-1 text-secondary">Regístrate para gestionar residuos responsablemente</p>
          </div>
          <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted">Cargando...</div>}>
            <RegisterForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6 leading-relaxed text-secondary">
          Al registrarte, aceptas contribuir a la reducción de residuos<br />electrónicos y la protección del medio ambiente.
        </p>
      </div>
    </div>
    </PublicLayout>
  );
}
