'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { getStoredUser, getMe, logout, User } from '@/lib/auth';
import UserAvatar from '@/components/UserAvatar';
import AppFooter from '@/components/AppFooter';

const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Puntos de Recolección', href: '/recoleccion/puntos' },
  { label: 'Normativa REP', href: '/normativa' },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg text-text-muted dark:text-text-muted hover:text-accent dark:hover:text-accent hover:bg-accent/10 transition-all duration-200 hover:scale-110 active:scale-95"
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-accent/10 rounded-xl p-2 transition-all duration-200 hover:shadow-sm group"
      >
        <div className="text-right hidden sm:block">
          <div className="text-sm font-semibold text-text-primary dark:text-text-primary">{user.name}</div>
          <div className="text-xs font-medium text-accent dark:text-accent uppercase tracking-wider">
            {user.role_name || 'Usuario'}
          </div>
        </div>
        <div className="ring-2 ring-transparent group-hover:ring-accent/40 rounded-full transition-all duration-200">
          <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={30} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-surface rounded-xl shadow-xl shadow-slate-200/80 dark:shadow-black/40 border border-green-900/30 dark:border-white/[0.08] py-1.5 z-50 animate-[fadeSlideDown_0.15s_ease-out]">
          <button
            onClick={() => { setIsOpen(false); router.push('/dashboard'); }}
            className="w-full px-4 py-2.5 text-left text-sm text-text-secondary dark:text-text-secondary hover:bg-accent-subtle dark:hover:bg-accent/10 hover:text-accent dark:hover:text-accent flex items-center gap-2.5 transition-colors duration-150 group/item"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover/item:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ir al Dashboard
          </button>
          <button
            onClick={() => { setIsOpen(false); router.push('/dashboard/perfil'); }}
            className="w-full px-4 py-2.5 text-left text-sm text-text-secondary dark:text-text-secondary hover:bg-accent-subtle dark:hover:bg-accent/10 hover:text-accent dark:hover:text-accent flex items-center gap-2.5 transition-colors duration-150 group/item"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover/item:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mi Perfil
          </button>
          <hr className="my-1.5 border-accent/20 dark:border-white/[0.07]" />
          <button
            onClick={() => { setIsOpen(false); onLogout(); }}
            className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}

interface PublicLayoutContentProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

function PublicLayoutContent({ children, showHeader = true, showFooter = true }: PublicLayoutContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkUser = async () => {
      const storedUser = getStoredUser();
      if (storedUser) setUser(storedUser);

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token && !storedUser) { setUser(null); return; }

      try {
        const data = await getMe();
        setUser(data.user);
      } catch {
        setUser(null);
      }
    };

    checkUser();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const allNavLinks = mounted && user
    ? [...NAV_LINKS, { label: 'Dashboard', href: '/dashboard' }]
    : NAV_LINKS;

  return (
    <>
      {/* Keyframes globales para animaciones del navbar */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mobileSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .header-light-accent::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--accent) 30%, var(--accent-hover) 70%, transparent 100%);
          opacity: 0.5;
        }
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

      <div className="min-h-screen flex flex-col bg-background dark:bg-background">
        {showHeader && (
          <header
            className={`relative sticky top-0 z-40 transition-all duration-300 header-light-accent ${
              scrolled
                ? 'bg-header/92 dark:bg-header/90 backdrop-blur-md shadow-sm shadow-black/5 dark:shadow-black/20 border-b border-border dark:border-white/[0.06]'
                : 'bg-header/75 dark:bg-header/70 backdrop-blur-sm border-b border-border dark:border-white/[0.04]'
            }`}
          >
            <div className="mx-auto grid max-w-7xl items-center px-4 py-3 gap-4" style={{ gridTemplateColumns: 'auto 1fr auto' }}>

              {/* Logotipo */}
              <Link href="/" className="flex items-center gap-2 shrink-0 group/logo">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent/10 to-accent/10 dark:from-accent/20 dark:to-accent/20 rounded-lg border border-accent/20 dark:border-accent/30 transition-all duration-200 group-hover/logo:border-accent/60 group-hover/logo:shadow-md group-hover/logo:shadow-accent/20 group-hover/logo:scale-105">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  <span className="text-sm font-semibold bg-gradient-to-r from-accent to-accent-light dark:from-accent dark:to-accent-light bg-clip-text text-transparent tracking-wide">
                    EcoBytes
                  </span>
                </div>
              </Link>

              {/* Links de navegación — escritorio */}
              <nav className="hidden md:flex items-center gap-0.5 justify-center">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`relative group/link px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:-translate-y-px ${
                      isActive(href)
                        ? 'text-accent dark:text-accent'
                        : 'text-text-secondary dark:text-text-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {/* Fondo hover */}
                    <span className={`absolute inset-0 rounded-lg transition-all duration-200 ${
                      isActive(href)
                        ? 'bg-accent-subtle dark:bg-accent/10'
                        : 'bg-transparent group-hover/link:bg-accent-subtle/80 dark:group-hover/link:bg-white/[0.05]'
                    }`} />
                    <span className="relative">{label}</span>
                    {/* Underline animada */}
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-300 ${
                      isActive(href)
                        ? 'w-[60%] opacity-100'
                        : 'w-0 opacity-0 group-hover/link:w-[60%] group-hover/link:opacity-100'
                    }`} />
                  </Link>
                ))}

                {/* Dashboard — solo si hay sesion, con estilo destacado */}
                {mounted && user && (
                  <Link
                    href="/dashboard"
                    className={`relative ml-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 hover:-translate-y-px active:scale-95 group/dash ${
                      isActive('/dashboard')
                        ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-md shadow-accent/25'
                        : 'border border-accent/60 dark:border-accent/30 text-accent dark:text-accent hover:bg-accent-subtle dark:hover:bg-accent/10 hover:border-accent dark:hover:border-accent/70 hover:shadow-md hover:shadow-accent/20'
                    }`}
                  >
                    <svg
                      className="w-3.5 h-3.5 transition-transform duration-200 group-hover/dash:rotate-12"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                )}
              </nav>

              {/* Lado derecho */}
              <div className="flex items-center gap-1.5 shrink-0">
                <ThemeToggle />

                {mounted && user ? (
                  <UserMenu user={user} onLogout={handleLogout} />
                ) : mounted ? (
                  <div className="hidden md:flex items-center gap-2">
                    <Link
                      href="/login"
                      className="px-3.5 py-1.5 text-sm font-medium text-slate-600 dark:text-gray-300 hover:text-accent dark:hover:text-accent rounded-lg hover:bg-accent-subtle dark:hover:bg-accent/10 transition-all duration-200 hover:-translate-y-px"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      className="relative overflow-hidden px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-px active:scale-95"
                    >
                      Registrarse
                    </Link>
                  </div>
                ) : (
                  <div className="w-36 h-8 hidden md:block" />
                )}

                {/* Botón hamburguesa — móvil */}
                <button
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  className="md:hidden p-2 rounded-lg text-text-muted dark:text-text-muted hover:text-accent dark:hover:text-accent hover:bg-accent/10 transition-all duration-200 active:scale-95"
                  aria-label="Abrir menú"
                >
                  <svg
                    className={`w-5 h-5 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-90' : 'rotate-0'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    {mobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Menú móvil */}
            {mobileMenuOpen && (
              <div
                className="md:hidden border-t border-accent/20 dark:border-white/[0.06] px-4 py-3 flex flex-col gap-1"
                style={{ animation: 'mobileSlideDown 0.2s ease-out' }}
              >
                {allNavLinks.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                      isActive(href)
                        ? 'bg-accent-subtle dark:bg-accent/10 text-accent dark:text-accent border border-accent/20 dark:border-accent/20'
                        : 'text-text-secondary dark:text-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-accent-subtle/70 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {isActive(href) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    )}
                    {label}
                  </Link>
                ))}
                {mounted && !user && (
                  <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-accent/20 dark:border-white/[0.06]">
                    <Link
                      href="/login"
                      className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-text-muted hover:text-accent dark:hover:text-accent hover:bg-accent-subtle dark:hover:bg-accent/10 transition-all duration-150"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/register"
                      className="px-3.5 py-2.5 rounded-xl text-center text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 transition-all duration-150 shadow-md"
                    >
                      Registrarse
                    </Link>
                  </div>
                )}
              </div>
            )}
          </header>
        )}

        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {showFooter && <AppFooter />}
      </div>
    </>
  );
}

interface PublicLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export default function PublicLayout({ children, showHeader = true, showFooter = true }: PublicLayoutProps) {
  return (
    <PublicLayoutContent showHeader={showHeader} showFooter={showFooter}>
      {children}
    </PublicLayoutContent>
  );
}
