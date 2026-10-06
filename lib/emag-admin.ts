import { NextResponse } from 'next/server';

function readBearerToken(authHeader: string | null): string {
  if (!authHeader) {
    return '';
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') {
    return '';
  }

  return token?.trim() ?? '';
}

export function isEmagAdminAuthorized(request: Request): boolean {
  const expectedToken =
    process.env.EMAG_ADMIN_TOKEN?.trim() ||
    process.env.ADMIN_ORDERS_TOKEN?.trim() ||
    '';

  if (!expectedToken) {
    return true;
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token')?.trim() ?? '';
  const headerToken = request.headers.get('x-admin-token')?.trim() ?? '';
  const bearerToken = readBearerToken(request.headers.get('authorization'));

  return queryToken === expectedToken || headerToken === expectedToken || bearerToken === expectedToken;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'unauthorized'
    },
    {
      status: 401
    }
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
