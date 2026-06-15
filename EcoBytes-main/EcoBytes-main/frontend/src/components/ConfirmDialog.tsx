'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  loading = false
}: ConfirmDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const variantConfig = {
    danger: {
      glowColor: 'bg-red-500/20',
      ringColor: 'border-red-900/50',
      spinnerStroke: '#ef4444',
      iconColor: 'text-red-500',
      iconGlow: 'bg-red-500/50',
      iconDropShadow: 'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]',
      titleColor: 'text-red-400',
      timerBg: 'bg-red-900/30',
      timerBorder: 'border-red-700/50',
      dotColor: 'bg-red-500',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      buttonRing: 'focus:ring-red-500',
      icon: (
        <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    warning: {
      glowColor: 'bg-amber-500/20',
      ringColor: 'border-amber-900/50',
      spinnerStroke: '#f59e0b',
      iconColor: 'text-amber-500',
      iconGlow: 'bg-amber-500/50',
      iconDropShadow: 'drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]',
      titleColor: 'text-amber-400',
      timerBg: 'bg-amber-900/30',
      timerBorder: 'border-amber-700/50',
      dotColor: 'bg-amber-500',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      buttonRing: 'focus:ring-amber-400',
      icon: (
        <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      glowColor: 'bg-accent/20',
      ringColor: 'border-accent/50',
      spinnerStroke: '#66BB6A',
      iconColor: 'text-accent-light',
      iconGlow: 'bg-accent/50',
      iconDropShadow: 'drop-shadow-[0_0_15px_rgba(102,187,106,0.8)]',
      titleColor: 'text-accent-light',
      timerBg: 'bg-accent/20',
      timerBorder: 'border-accent/50',
      dotColor: 'bg-accent-light',
      buttonBg: 'bg-accent hover:bg-accent-hover',
      buttonRing: 'focus:ring-accent',
      icon: (
        <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    }
  };

  const config = variantConfig[variant];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay con gradiente y blur como el modal de análisis */}
        <Dialog.Overlay
          className="fixed inset-0 z-[9998] bg-gradient-to-br from-gray-900/95 via-gray-900/98 to-black/95 backdrop-blur-md data-[state=open]:animate-fadeIn"
        />

        <Dialog.Content
          ref={contentRef}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            contentRef.current?.focus();
          }}
          className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     focus:outline-none data-[state=open]:animate-scaleIn"
        >
          <div className="flex flex-col items-center justify-center text-center px-8 max-w-lg">
            {/* Contenedor del icono animado */}
            <div className="relative mb-8">
              {/* Anillo de resplandor exterior */}
              <div
                className={`absolute inset-0 rounded-full blur-xl animate-pulse ${config.glowColor}`}
                style={{ width: '160px', height: '160px', margin: '-20px' }}
              />

              {/* Contenedor principal del icono */}
              <div className="relative w-32 h-32">
                {/* Círculo de fondo */}
                <div className={`absolute inset-0 rounded-full border-4 ${config.ringColor}`} />

                {/* Anillo animado o estático según el estado de carga */}
                {loading ? (
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin"
                    style={{ animationDuration: '2s' }}
                    viewBox="0 0 128 128"
                  >
                    <defs>
                      <linearGradient id={`spinnerGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={config.spinnerStroke} />
                        <stop offset="50%" stopColor={config.spinnerStroke} />
                        <stop offset="100%" stopColor={config.spinnerStroke} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="none"
                      stroke={`url(#spinnerGradient-${variant})`}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="280 100"
                    />
                  </svg>
                ) : (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="none"
                      stroke={config.spinnerStroke}
                      strokeWidth="6"
                      strokeLinecap="round"
                      className="opacity-80"
                    />
                  </svg>
                )}

                {/* Icono interior con resplandor */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className={`absolute inset-0 blur-md ${config.iconGlow} rounded-full scale-150`} />
                    <div className={`relative ${config.iconColor} ${config.iconDropShadow}`}>
                      {config.icon}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenido de texto */}
            <div className="space-y-3">
              <Dialog.Title className={`text-2xl font-bold ${config.titleColor}`}>
                {title}
              </Dialog.Title>

              <Dialog.Description className="text-base text-gray-400 max-w-sm">
                {description}
              </Dialog.Description>
            </div>

            {/* Indicador de estado */}
            <div className={`mt-8 px-6 py-3 rounded-2xl border ${config.timerBg} ${config.timerBorder}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${config.dotColor} ${loading ? 'animate-pulse' : ''}`} />
                <span className={`text-sm font-medium ${config.titleColor}`}>
                  {loading ? 'Procesando...' : 'Confirmar acción'}
                </span>
              </div>
            </div>

            {/* Botones */}
            <div className="mt-8 flex gap-4 w-full max-w-xs">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold
                            border border-gray-600 text-gray-300
                            bg-gray-800/60 hover:bg-gray-700/80
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900
                            disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
              </Dialog.Close>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-white
                           transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
                           disabled:opacity-50 disabled:cursor-not-allowed
                           ${config.buttonBg} ${config.buttonRing}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Eliminando...
                  </span>
                ) : confirmText}
              </button>
            </div>

            {/* Mensaje de advertencia inferior */}
            <p className="mt-6 text-xs text-gray-600">
              Esta acción no se puede deshacer
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
