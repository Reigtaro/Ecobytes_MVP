// components/SvgIconProps.tsx
import React from "react";

export type SvgIconProps = {
  children: React.ReactNode;
  className?: string;
};

export function SvgIcon({ children, className }: SvgIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Iconos exportados
export const IconIdCard = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <path d="M4 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
    <path d="M8 10h8" />
    <path d="M8 14h6" />
  </SvgIcon>
);

export const IconMail = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <path d="M4 6h16v12H4z" />
    <path d="m4 7 8 6 8-6" />
  </SvgIcon>
);

export const IconUser = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="8" r="4" />
  </SvgIcon>
);

export const IconUpload = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 20h16" />
  </SvgIcon>
);

export const IconScan = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <path d="M4 7V6a2 2 0 0 1 2-2h1" />
    <path d="M20 7V6a2 2 0 0 0-2-2h-1" />
    <path d="M4 17v1a2 2 0 0 0 2 2h1" />
    <path d="M20 17v1a2 2 0 0 1-2 2h-1" />
    <path d="M7 12h10" />
  </SvgIcon>
);

export const IconClockAlert = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l3 2" />
    <path d="M12 2v2" />
  </SvgIcon>
);

export const IconShieldCheck = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <path d="M12 2l7 4v6c0 5-3 9-7 10C8 21 5 17 5 12V6l7-4z" />
    <path d="M9 12l2 2 4-4" />
  </SvgIcon>
);

export const IconClock = (props?: { className?: string }) => (
  <SvgIcon className={props?.className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l3 2" />
  </SvgIcon>
);

