'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getMe, logout, User } from '@/lib/auth';
import { hasRouteAccess } from '@/lib/permissions';
import Sidebar from '@/components/Sidebar';
import UserAvatar from '@/components/UserAvatar';
import { ToastProvider } from '@/components/Toast';
import { useTheme } from '@/contexts/ThemeContext';

const MOBILE_BREAKPOINT = 1024; // lg breakpoint
const STAFF_ROLES = ['SuperAdmin', 'Administrador', 'Moderador'];

// Botón de toggle de tema
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      )}
    </button>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [isStaff, setIsStaff] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        const roleName = data.user.role_name || '';
        if (!STAFF_ROLES.includes(roleName)) {
          // Usuarios normales solo pueden acceder a /dashboard/perfil
          if (!pathname?.startsWith('/dashboard/perfil')) {
            router.push('/recoleccion/puntos');
            return;
          }
          setIsStaff(false);
        }
        setUser(data.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Verificar permisos cuando cambia la ruta o el usuario
  useEffect(() => {
    if (user && pathname) {
      // Usuarios no-staff solo pueden estar en /dashboard/perfil
      if (!STAFF_ROLES.includes(user.role_name || '')) {
        if (!pathname.startsWith('/dashboard/perfil')) {
          router.push('/recoleccion/puntos');
        } else {
          setAuthorized(true);
        }
        return;
      }
      // Staff: verificar permisos por ruta
      const permissions = user.permissions || [];
      const hasAccess = hasRouteAccess(pathname, permissions);
      if (!hasAccess) {
        setAuthorized(false);
        router.push('/forbidden');
      } else {
        setAuthorized(true);
      }
    }
  }, [pathname, user, router]);

  // Responsive: colapsar/descolapsar según el ancho de pantalla
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (isMobile) {
        setSidebarCollapsed(true);
      } else {
        if (!userCollapsed) {
          setSidebarCollapsed(false);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userCollapsed]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout('manual');
    router.push('/login');
  };

  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (!isMobile) {
      setUserCollapsed(newCollapsed);
    }
  };

  if (loading || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium tracking-wide">Cargando...</p>
        </div>
      </div>
    );
  }

  const permissions = user?.permissions || [];

  return (
    <ToastProvider>
      <style>{`
        header {
          --accent:          #00A87A;
          --accent-hover:    #008F68;
          --accent-subtle:   rgba(0, 168, 122, 0.08);
          --accent-light:    rgba(0, 168, 122, 0.6);
          --accent-bg:       rgba(0, 168, 122, 0.10);
          --accent-bg-muted: rgba(0, 168, 122, 0.06);
        }
        .dark header {
          --accent:       #2DDBA8;
          --accent-hover: #22C496;
        }
      `}</style>
      <div className="min-h-screen flex bg-background">
        {isStaff && <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} permissions={permissions} />}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 glass bg-white/80 dark:bg-background/85 border-b border-black/[0.06] dark:border-white/[0.06]">
            {/* Identificador del sistema */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors group"
                title="Ir al Inicio"
              >
                <svg
                  className="w-5 h-5 text-zinc-400 dark:text-zinc-500 group-hover:text-accent dark:group-hover:text-accent transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent/10 to-accent/10 dark:from-accent/20 dark:to-accent/20 rounded-lg border border-accent/20 dark:border-accent/30">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                <span className="text-sm font-semibold bg-gradient-to-r from-accent to-accent-light dark:from-accent dark:to-accent-light bg-clip-text text-transparent tracking-wide">
                  EcoBytes
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] rounded-lg p-2 transition-colors"
                >
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{user?.name}</div>
                    <div className="text-xs font-medium text-accent dark:text-accent uppercase tracking-wide">
                      {user?.role_name || 'Usuario'}
                    </div>
                  </div>
                  <UserAvatar
                    name={user?.name}
                    avatarUrl={user?.avatar_url}
                    size={36}
                    className="ring-2 ring-accent/20"
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-2xl py-1.5 z-50 overflow-hidden card-bg border border-black/[0.07] dark:border-white/[0.08]">
                    <button
                      onClick={() => { setShowUserMenu(false); router.push('/dashboard/perfil'); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] flex items-center gap-2.5 transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi Perfil
                    </button>
                    <hr className="my-1 border-black/[0.05] dark:border-white/[0.06]" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 overflow-auto">
            {children}
          </main>
        </div>
      </div>

    </ToastProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>;
}
