import { NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/goals',
  '/activities',
  '/analytics',
  '/settings',
];

// Routes only for unauthenticated users
const authRoutes = [
  '/login',
  '/signup',
];

export function middleware(request) {
  const token = request.cookies.get('auth_token')?.value;
  const pathname = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some(
    route => pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some(
    route => pathname.startsWith(route)
  );

  // Not authenticated trying to access protected route
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(
      new URL('/login', request.url)
    );
  }

  // Authenticated user trying to access login/signup
  if (isAuthRoute && token) {
    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
