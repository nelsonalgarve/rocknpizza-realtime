import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('authenticated')?.value === 'true';

  const isCommandesPage = request.nextUrl.pathname.startsWith('/commandes');
  const isLoginPage = request.nextUrl.pathname === '/';

  if (!isAuthenticated && isCommandesPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/commandes', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/commandes/:path*'],
};
