import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ACTIVITY_SERVICE_URL =
  process.env.ACTIVITY_SERVICE_URL ||
  'http://localhost:8081';

async function handler(request, { params }) {
  const { path } = await params;
  const pathString = Array.isArray(path)
    ? path.join('/')
    : path;

  // Get search params if any (for GET requests with query)
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';

  const url = `${ACTIVITY_SERVICE_URL}/api/v1/${pathString}${queryString}`;
  
  console.log('[Tracker API Request]', {
    method: request.method,
    path: pathString,
    url: url,
    serviceUrl: ACTIVITY_SERVICE_URL,
    timestamp: new Date().toISOString(),
  });

  try {
    // Read JWT from httpOnly cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = request.method !== 'GET'
      ? await request.text()
      : undefined;

    console.log('[Tracker API Before Fetch]', {
      method: request.method,
      url: url,
      hasToken: !!token,
      tokenLength: token?.length,
    });

    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body || undefined,
    });

    console.log('[Tracker API Response]', {
      status: response.status,
      statusText: response.statusText,
      url: url,
      timestamp: new Date().toISOString(),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });

  } catch (error) {
    console.error('[Tracker API Error]', {
      url,
      message: error.message,
      error: error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    console.error('[Tracker API Error Details]', error);
    return NextResponse.json(
      { 
        message: 'Failed to reach tracker service',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
