'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const TOAST_DURATION = 4000;

interface ToastData {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (title: string, options?: { description?: string; type?: ToastType }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const toastStyles: Record<ToastType, { bg: string; border: string; progressColor: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-green-500',
    progressColor: 'bg-green-500',
    icon: (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  },
  error: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-red-500',
    progressColor: 'bg-red-500',
    icon: (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    )
  },
  warning: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-amber-500',
    progressColor: 'bg-amber-500',
    icon: (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    )
  },
  info: {
    bg: 'bg-white',
    border: 'border-l-4 border-l-blue-500',
    progressColor: 'bg-blue-500',
    icon: (
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    )
  }
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((title: string, options?: { description?: string; type?: ToastType }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastData = {
      id,
      title,
      description: options?.description,
      type: options?.type || 'info'
    };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((title: string, options?: { description?: string; type?: ToastType }) => {
    addToast(title, options);
  }, [addToast]);

  const success = useCallback((title: string, description?: string) => {
    addToast(title, { description, type: 'success' });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast(title, { description, type: 'error' });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast(title, { description, type: 'warning' });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast(title, { description, type: 'info' });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={TOAST_DURATION}>
        {children}
        {toasts.map(t => {
          const styles = toastStyles[t.type];
          return (
            <ToastPrimitive.Root
              key={t.id}
              className={`${styles.bg} ${styles.border} rounded-lg shadow-lg overflow-hidden flex flex-col data-[state=open]:animate-slideIn data-[state=closed]:animate-slideOut data-[swipe=end]:animate-slideOut`}
              onOpenChange={(open) => {
                if (!open) removeToast(t.id);
              }}
            >
              <div className="p-4 flex items-start gap-3">
                {styles.icon}
                <div className="flex-1 min-w-0">
                  <ToastPrimitive.Title className="text-sm font-semibold text-gray-900">
                    {t.title}
                  </ToastPrimitive.Title>
                  {t.description && (
                    <ToastPrimitive.Description className="text-sm text-gray-500 mt-0.5">
                      {t.description}
                    </ToastPrimitive.Description>
                  )}
                </div>
                <ToastPrimitive.Close className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </ToastPrimitive.Close>
              </div>
              {/* Barra de progreso */}
              <div className="h-1 w-full bg-gray-100">
                <div
                  className={`h-full ${styles.progressColor} animate-toast-progress`}
                  style={{
                    animationDuration: `${TOAST_DURATION}ms`
                  }}
                />
              </div>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 flex flex-col gap-2 w-96 max-w-[calc(100vw-32px)] z-[100] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
