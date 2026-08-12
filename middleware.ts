import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function normalizeHost(host: string): string {
  return host.replace(/:\d+$/, '').toLowerCase();
}

function getCanonicalHost(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) {
    return null;
  }

  try {
    return new URL(configuredUrl).host.toLowerCase();
  } catch {
    return null;
  }
}

function getAlternateHost(canonicalHost: string): string | null {
  if (canonicalHost.startsWith('www.')) {
    return canonicalHost.slice(4);
  }

  return `www.${canonicalHost}`;
}

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const canonicalHost = getCanonicalHost();
  if (!canonicalHost) {
    return NextResponse.next();
  }

  const requestHostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!requestHostHeader) {
    return NextResponse.next();
  }

  const requestHost = normalizeHost(requestHostHeader);
  const alternateHost = getAlternateHost(canonicalHost);

  // Redirect only the direct canonical variants and leave preview/service hosts untouched.
  if (!alternateHost || requestHost !== alternateHost) {
    return NextResponse.next();
  }

  const targetUrl = request.nextUrl.clone();
  targetUrl.host = canonicalHost;
  targetUrl.protocol = request.headers.get('x-forwarded-proto') || 'https';

  return NextResponse.redirect(targetUrl, 308);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
