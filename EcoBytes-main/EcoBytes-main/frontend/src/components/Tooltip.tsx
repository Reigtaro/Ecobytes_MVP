'use client';

import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;

  side?: Side;
  offset?: number;
  delay?: number;
  disabled?: boolean;

  duration?: number;
  autoFlip?: boolean;
  boundaryPadding?: number;

  // opcional para personalizar el estilo del tooltip desde fuera
  bubbleClassName?: string;
};

export default function Tooltip({
  content,
  children,
  className,
  side = 'top',
  offset = 6,
  delay = 0,
  disabled = false,
  duration = 260,
  autoFlip = true,
  boundaryPadding = 8,
  bubbleClassName,
}: TooltipProps) {
  const id = useId();

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const [resolvedSide, setResolvedSide] = useState<Side>(side);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const clearTimers = () => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  };

  const requestOpen = () => {
    setMounted(true);
    setPendingOpen(true);
  };

  const show = () => {
    if (disabled) return;

    clearTimers();
    if (delay <= 0) return requestOpen();

    showTimer.current = window.setTimeout(() => requestOpen(), delay);
  };

  const hide = () => {
    clearTimers();
    setPendingOpen(false);
    setOpen(false);

    hideTimer.current = window.setTimeout(() => {
      setMounted(false);
    }, duration);
  };

  useEffect(() => () => clearTimers(), []);

  const compute = () => {
    const t = triggerRef.current;
    const b = bubbleRef.current;
    if (!t || !b) return;

    const rect = t.getBoundingClientRect();
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;

    const pad = boundaryPadding;

    const spaceTop = rect.top;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    let s: Side = side;

    if (autoFlip) {
      if (side === 'bottom' && spaceBottom < bh + offset + pad) s = 'top';
      else if (side === 'top' && spaceTop < bh + offset + pad) s = 'bottom';
      else if (side === 'left' && spaceLeft < bw + offset + pad) s = 'right';
      else if (side === 'right' && spaceRight < bw + offset + pad) s = 'left';
    }

    let left = 0;
    let top = 0;

    if (s === 'top') {
      left = rect.left + rect.width / 2 - bw / 2;
      top = rect.top - offset - bh;
    } else if (s === 'bottom') {
      left = rect.left + rect.width / 2 - bw / 2;
      top = rect.bottom + offset;
    } else if (s === 'left') {
      left = rect.left - offset - bw;
      top = rect.top + rect.height / 2 - bh / 2;
    } else {
      left = rect.right + offset;
      top = rect.top + rect.height / 2 - bh / 2;
    }

    left = Math.max(pad, Math.min(left, window.innerWidth - pad - bw));
    top = Math.max(pad, Math.min(top, window.innerHeight - pad - bh));

    setResolvedSide(s);
    setPos({ top, left });
  };

  useEffect(() => {
    if (!mounted || !pendingOpen) return;

    const raf = window.requestAnimationFrame(() => {
      compute();
      setOpen(true);
      setPendingOpen(false);
    });

    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, pendingOpen, side, offset, boundaryPadding, autoFlip]);

  useEffect(() => {
    if (!open) return;

    const on = () => requestAnimationFrame(compute);

    window.addEventListener('scroll', on, true);
    window.addEventListener('resize', on);

    return () => {
      window.removeEventListener('scroll', on, true);
      window.removeEventListener('resize', on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, side, offset, boundaryPadding, autoFlip]);

  const from =
    resolvedSide === 'top'
      ? 'translate-y-2'
      : resolvedSide === 'bottom'
        ? '-translate-y-2'
        : resolvedSide === 'left'
          ? 'translate-x-2'
          : '-translate-x-2';

  return (
    <span
      ref={triggerRef}
      className={['inline-flex', className].filter(Boolean).join(' ')}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {mounted &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            className="pointer-events-none fixed z-[999999]"
            style={{ top: pos.top, left: pos.left }}
            aria-hidden={!open}
          >
            {/* La burbuja ahora es DIV (válido para contenido con <div>, <p>, etc.) */}
            <div
              ref={bubbleRef}
              className={[
                // base
                'inline-block rounded-md bg-gray-900/95 text-white shadow-lg',
                'px-3 py-2 text-xs leading-5',
                // soporte multi-línea y ancho razonable
                'max-w-[360px] whitespace-normal text-left',
                // animación
                'transition-[opacity,transform] ease-out',
                open ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${from}`,
                // opcional
                bubbleClassName ?? '',
              ].join(' ')}
              style={{ transitionDuration: `${duration}ms` }}
            >
              {content}
            </div>
          </span>,
          document.body
        )}
    </span>
  );
}
