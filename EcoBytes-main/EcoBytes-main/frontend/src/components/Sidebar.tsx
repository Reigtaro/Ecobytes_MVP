'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SubSubMenuItem {
  label: string;
  href: string;
  permissionKey: string | string[];
}

interface SubMenuItem {
  label: string;
  href?: string;
  permissionKey: string | string[];
  children?: SubSubMenuItem[];
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  subItems: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  // 1. Recolección
  {
    label: 'Recolección',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    subItems: [
      { label: 'Puntos', href: '/recoleccion/puntos', permissionKey: 'recoleccion.puntos.ver' },
    ],
  },

  // 2. Reportes
  {
    label: 'Reportes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    subItems: [
      { label: 'Puntos de Reciclaje', href: '/dashboard/reportes/puntos',    permissionKey: 'reportes.cumplimiento.ver' },
      { label: 'Actividad',           href: '/dashboard/reportes/actividad', permissionKey: 'reportes.cumplimiento.ver' },
    ],
  },

  // 3. Seguridad (admin)
  {
    label: 'Seguridad',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    subItems: [
      { label: 'Usuarios', href: '/dashboard/seguridad/usuarios', permissionKey: 'seguridad.usuarios.ver' },
      { label: 'Roles', href: '/dashboard/seguridad/roles', permissionKey: 'seguridad.roles.ver' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  permissions: string[];
}

const hasSubmenuPermission = (permissionKey: string | string[], permissions: string[]): boolean => {
  const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  return keys.some(key => permissions.some(p => p.startsWith(key)));
};

export default function Sidebar({ collapsed, onToggle, permissions }: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const [hoveredMenu, setHoveredMenu] = useState<number | null>(null);
  const pathname = usePathname();

  const filteredMenuItems = menuItems
    .map(menu => ({
      ...menu,
      subItems: menu.subItems
        .map(sub => {
          if (sub.children) {
            const filteredChildren = sub.children.filter(child =>
              hasSubmenuPermission(child.permissionKey, permissions)
            );
            if (filteredChildren.length === 0) return null;
            return { ...sub, children: filteredChildren };
          }
          return hasSubmenuPermission(sub.permissionKey, permissions) ? sub : null;
        })
        .filter((sub): sub is SubMenuItem => sub !== null)
    }))
    .filter(menu => menu.subItems.length > 0);

  const isSubItemActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveChild = (children?: SubSubMenuItem[]) => {
    if (!children) return false;
    return children.some(child => isSubItemActive(child.href));
  };

  const hasActiveSubItem = (subItems: SubMenuItem[]) => {
    return subItems.some(sub =>
      isSubItemActive(sub.href) || hasActiveChild(sub.children)
    );
  };

  useEffect(() => {
    const newOpenMenus: Record<number, boolean> = {};
    const newOpenSubMenus: Record<string, boolean> = {};

    filteredMenuItems.forEach((item, index) => {
      const isActive = hasActiveSubItem(item.subItems);
      newOpenMenus[index] = isActive;

      if (isActive) {
        item.subItems.forEach((sub, subIndex) => {
          if (sub.children && hasActiveChild(sub.children)) {
            newOpenSubMenus[`${index}-${subIndex}`] = true;
          }
        });
      }
    });

    setOpenMenus(newOpenMenus);
    setOpenSubMenus(newOpenSubMenus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSubMenu = (menuIndex: number, subIndex: number) => {
    const key = `${menuIndex}-${subIndex}`;
    setOpenSubMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMenu = (index: number) => {
    if (collapsed) return;
    setOpenMenus(prev => {
      const isCurrentlyOpen = prev[index];
      const newState: Record<number, boolean> = {};
      if (!isCurrentlyOpen) newState[index] = true;
      return newState;
    });
  };

  const isDashboardActive = pathname === '/dashboard';

  return (
    <aside
      className={`${collapsed ? 'w-[72px]' : 'w-64'} min-h-screen flex flex-col transition-all duration-300 ease-in-out relative`}
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Logotipo */}
      <div
        className="h-[72px] flex items-center justify-center overflow-hidden px-4"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoNight.png"
          alt="DraftFlow"
          className={`h-14 w-auto transition-all duration-300 ${collapsed ? 'opacity-0 scale-90 absolute' : 'opacity-100 scale-100'}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoGlobo.png"
          alt="DraftFlow"
          className={`h-10 w-auto transition-all duration-300 ${collapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 absolute'}`}
        />
      </div>

      {/* Botón de colapso */}
      <div className="px-3 pt-3">
        <button
          onClick={onToggle}
          className="w-full p-2 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 text-zinc-400 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

        {/* Enlace al Dashboard */}
        <div className="relative mb-1 group">
          <Link
            href="/dashboard"
            className={`flex items-center ${collapsed ? 'justify-center' : ''} gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 border ${
              isDashboardActive
                ? 'border-accent/20 text-accent-light'
                : 'border-transparent text-zinc-400 hover:text-zinc-100'
            }`}
            style={isDashboardActive
              ? { background: 'var(--accent-bg)' }
              : undefined
            }
            onMouseEnter={e => {
              if (!isDashboardActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={e => {
              if (!isDashboardActive) e.currentTarget.style.background = '';
            }}
          >
            <svg className={`${collapsed ? 'w-6 h-6' : 'w-4.5 h-4.5'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            {!collapsed && <span className="text-[13px] font-medium">Dashboard</span>}
          </Link>

          {/* Tooltip en modo colapsado */}
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <div className="py-1.5 px-3 rounded-lg shadow-2xl whitespace-nowrap text-sm font-medium text-zinc-100"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                Dashboard
              </div>
            </div>
          )}
        </div>

        {/* Divisor de sección */}
        {!collapsed && (
          <div className="mb-2 mt-1 mx-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
        )}

        {/* Ítems del menú */}
        <ul className="space-y-0.5">
          {filteredMenuItems.map((item, index) => (
            <li
              key={index}
              className="relative"
              onMouseEnter={() => collapsed && setHoveredMenu(index)}
              onMouseLeave={() => collapsed && setHoveredMenu(null)}
            >
              <button
                onClick={() => toggleMenu(index)}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg transition-all duration-150 border ${
                  hasActiveSubItem(item.subItems)
                    ? 'border-accent/20 text-accent-light'
                    : openMenus[index]
                    ? 'border-transparent text-zinc-300'
                    : 'border-transparent text-zinc-400 hover:text-zinc-100'
                }`}
                style={
                  hasActiveSubItem(item.subItems)
                    ? { background: 'var(--accent-bg)' }
                    : openMenus[index]
                    ? { background: 'rgba(255,255,255,0.04)' }
                    : undefined
                }
                onMouseEnter={e => {
                  if (!hasActiveSubItem(item.subItems) && !openMenus[index]) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!hasActiveSubItem(item.subItems) && !openMenus[index]) {
                    e.currentTarget.style.background = '';
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 ${collapsed ? '[&>svg]:w-6 [&>svg]:h-6' : '[&>svg]:w-4 [&>svg]:h-4'}`}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
                </div>
                {!collapsed && (
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 text-zinc-500 ${openMenus[index] ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Sub-ítems expandibles */}
              {!collapsed && (
                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: openMenus[index] ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <ul className={`mt-1 ml-4 pl-3 border-l space-y-0.5 ${hasActiveSubItem(item.subItems) ? 'border-accent/25' : 'border-white/[0.06]'}`}>
                      {item.subItems.map((subItem, subIndex) => {
                        const isActive = isSubItemActive(subItem.href);
                        const hasChildren = subItem.children && subItem.children.length > 0;
                        const isChildActive = hasActiveChild(subItem.children);
                        const subMenuKey = `${index}-${subIndex}`;
                        const isSubMenuOpen = openSubMenus[subMenuKey];

                        if (hasChildren) {
                          return (
                            <li key={subIndex}>
                              <button
                                onClick={() => toggleSubMenu(index, subIndex)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                                  isChildActive
                                    ? 'text-accent-light font-medium'
                                    : 'text-zinc-500 hover:text-zinc-200'
                                }`}
                                style={isChildActive ? { background: 'var(--accent-bg-muted)' } : undefined}
                                onMouseEnter={e => {
                                  if (!isChildActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                }}
                                onMouseLeave={e => {
                                  if (!isChildActive) e.currentTarget.style.background = '';
                                }}
                              >
                                <span>{subItem.label}</span>
                                <svg className={`w-3 h-3 transition-transform ${isSubMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div
                                className="grid transition-all duration-200 ease-in-out"
                                style={{ gridTemplateRows: isSubMenuOpen ? '1fr' : '0fr' }}
                              >
                                <div className="overflow-hidden">
                                  <ul className={`mt-0.5 ml-3 pl-3 border-l space-y-0.5 ${isChildActive ? 'border-accent/20' : 'border-white/[0.06]'}`}>
                                    {subItem.children!.map((child, childIndex) => {
                                      const isChildItemActive = isSubItemActive(child.href);
                                      return (
                                        <li key={childIndex}>
                                          <Link
                                            href={child.href}
                                            className={`block px-3 py-1.5 text-[12px] rounded-lg transition-colors ${
                                              isChildItemActive
                                                ? 'text-accent-light font-medium'
                                                : 'text-zinc-500 hover:text-zinc-200'
                                            }`}
                                            style={isChildItemActive ? { background: 'var(--accent-bg)' } : undefined}
                                            onMouseEnter={e => {
                                              if (!isChildItemActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                            }}
                                            onMouseLeave={e => {
                                              if (!isChildItemActive) (e.currentTarget as HTMLElement).style.background = '';
                                            }}
                                          >
                                            {child.label}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              </div>
                            </li>
                          );
                        }

                        return (
                          <li key={subIndex}>
                            <Link
                              href={subItem.href!}
                              className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                                isActive
                                  ? 'text-accent-light font-medium'
                                  : 'text-zinc-500 hover:text-zinc-200'
                              }`}
                              style={isActive ? { background: 'var(--accent-bg)' } : undefined}
                              onMouseEnter={e => {
                                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                              }}
                              onMouseLeave={e => {
                                if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
                              }}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {/* Flyout de menú para modo colapsado */}
              {collapsed && hoveredMenu === index && (
                <div className="absolute left-full top-0 z-50 pl-3">
                  <div className="absolute left-0 top-0 w-3 h-full" />
                  <div className="rounded-xl shadow-2xl py-2 min-w-52 max-h-96 overflow-y-auto"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                    <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider mb-1 ${hasActiveSubItem(item.subItems) ? 'text-accent-light' : 'text-zinc-500'}`}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {item.label}
                    </div>
                    {item.subItems.map((subItem, subIndex) => {
                      const hasChildren = subItem.children && subItem.children.length > 0;
                      const isChildActive = hasActiveChild(subItem.children);

                      if (hasChildren) {
                        return (
                          <div key={subIndex}>
                            <div className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider ${isChildActive ? 'text-accent-light' : 'text-zinc-600'}`}>
                              {subItem.label}
                            </div>
                            {subItem.children!.map((child, childIndex) => {
                              const isActive = isSubItemActive(child.href);
                              return (
                                <Link
                                  key={childIndex}
                                  href={child.href}
                                  className={`block pl-6 pr-4 py-2 text-sm transition-colors ${
                                    isActive ? 'text-accent-light font-medium' : 'text-zinc-300 hover:text-white'
                                  }`}
                                  style={isActive ? { background: 'var(--accent-bg)' } : undefined}
                                  onMouseEnter={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                                  }}
                                  onMouseLeave={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
                                  }}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        );
                      }

                      const isActive = isSubItemActive(subItem.href);
                      return (
                        <Link
                          key={subIndex}
                          href={subItem.href!}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive ? 'text-accent-light font-medium' : 'text-zinc-300 hover:text-white'
                          }`}
                          style={isActive ? { background: 'var(--accent-bg)' } : undefined}
                          onMouseEnter={e => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                          }}
                          onMouseLeave={e => {
                            if (!isActive) (e.currentTarget as HTMLElement).style.background = '';
                          }}
                        >
                          {subItem.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Pie del sidebar */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <p className="text-[12px] text-zinc-600 text-center">Desarrollado por EcoBytes Team</p>
          <p className="text-[12px] text-zinc-700 text-center mt-0.5">v1.0.0</p>
        </div>
      )}
    </aside>
  );
}
