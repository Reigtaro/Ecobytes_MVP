import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/foro'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar si es una ruta pública
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Obtener el token de las cookies
  const accessToken = request.cookies.get('accessToken')?.value;

  // Detectar si es acceso desde red local (no localhost).
  // En red local, el token está en localStorage (no accesible desde el proxy),
  // por lo que se permite el acceso y el cliente verifica la autenticación.
  const host = request.headers.get('host') || '';
  const isLocalNetwork = !host.startsWith('localhost') && !host.startsWith('127.0.0.1');

  // Si no hay token y la ruta es protegida
  if (!accessToken && !isPublicPath) {
    // En red local, permitir acceso (el cliente verificará con localStorage)
    if (isLocalNetwork) {
      return NextResponse.next();
    }
    // En localhost, redirigir al login con parámetro redirect para volver después
    const loginUrl = new URL('/login', request.url);
    // Solo agregar redirect si no es la ruta por defecto del dashboard
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Si hay token y está en login o register, redirigir al destino correspondiente
  if (accessToken && (pathname === '/login' || pathname === '/register')) {
    // Respetar el parámetro redirect si existe (solo rutas internas)
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    let targetPath = '/dashboard';

    // Solo permitir redirects a rutas internas (que comiencen con /)
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      targetPath = redirectParam;
    }

    const redirectUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)'],
};