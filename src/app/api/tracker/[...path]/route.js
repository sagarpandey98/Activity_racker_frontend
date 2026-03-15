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

    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: body || undefined,
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });

  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to reach tracker service' },
      { status: 503 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
