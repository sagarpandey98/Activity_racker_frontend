import { NextResponse } from 'next/server';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL ||
  'http://localhost:8082';

async function handler(request, { params }) {
  const { path } = await params;
  const pathString = Array.isArray(path)
    ? path.join('/')
    : path;

  const url = `${USER_SERVICE_URL}/api/auth/${pathString}`;

  try {
    const body = request.method !== 'GET'
      ? await request.text()
      : undefined;

    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body || undefined,
    });

    const data = await response.json();

    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    // If login/verify-otp returns a token, set httpOnly cookie
    if (data.token || data.accessToken) {
      const token = data.token || data.accessToken;
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
