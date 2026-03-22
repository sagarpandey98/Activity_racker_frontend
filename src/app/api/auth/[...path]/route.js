import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL ||
  'http://localhost:8082';

async function handler(request, { params }) {
  const { path } = await params;
  const pathString = Array.isArray(path)
    ? path.join('/')
    : path;

  const pathMap = {
    'send-otp':    '/dcc/sendotp',
    'verify-otp':  '/dcc/verify-otp',
    'login':       '/dcc/login',
    'signup':      '/dcc/signup',
    'profile':     '/dcc/profile',
  };

  const mappedPath = pathMap[pathString];
  if (!mappedPath) {
    return NextResponse.json(
      { message: `Unknown auth path: ${pathString}` },
      { status: 404 }
    );
  }

  const url = `${USER_SERVICE_URL}${mappedPath}`;

  try {
    const body = request.method !== 'GET'
      ? await request.text()
      : undefined;

    // Get token from cookie and add as Authorization header
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: body || undefined,
    });

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    // If login/verify-otp returns a token, set httpOnly cookie
    const tokenFromBody =
      data.token ||
      data.accessToken ||
      data.data?.token;

    if (tokenFromBody) {
      const token = tokenFromBody;
      nextResponse.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour (matches User Service)
        path: '/',
      });
    }

    return nextResponse;

  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to reach auth service' },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
