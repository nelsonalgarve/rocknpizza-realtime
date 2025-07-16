// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('authenticated')?.value === 'true';

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/';
  const isRootPage = pathname === '/';

  // Si l'utilisateur n'est pas authentifié et tente d'accéder à une page protégée
  if (!isLoggedIn && !isLoginPage && !isRootPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Si l'utilisateur est authentifié et essaie d'accéder à la page login ou racine, redirige vers /commandes
  if (isLoggedIn && (isLoginPage || isRootPage)) {
    return NextResponse.redirect(new URL('/commandes', request.url));
  }

  return NextResponse.next();
}

// Optionnel : ne pas exécuter le middleware sur les fichiers statiques ou API
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|api).*)'],
};
