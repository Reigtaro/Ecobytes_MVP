'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string; // Opcional — si no se provee, se renderiza solo como texto
}

interface SubHeaderProps {
  title: string;
  icon?: React.ReactNode;
  backUrl?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function SubHeader({ title, icon, breadcrumbs, actions }: SubHeaderProps) {
  return (
    <div className="flex justify-between items-center card-bg px-5 -mx-5 -mt-5 border-b border-black/[0.05] dark:border-white/[0.06] h-14">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">
            {icon}
          </span>
        )}

        {/* Breadcrumbs o título simple */}
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 min-w-0">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1.5 min-w-0">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-accent dark:hover:text-accent-light transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {crumb.label}
                  </span>
                )}
                <svg className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
            <span className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
              {title}
            </span>
          </nav>
        ) : (
          <h1 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
            {title}
          </h1>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
