const DEV_FALLBACK_SITE_URL = 'http://localhost:3000';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    try {
      const parsed = new URL(configured);
      return trimTrailingSlash(parsed.toString());
    } catch {
      throw new Error('NEXT_PUBLIC_SITE_URL must be a valid absolute URL. Example: https://beokbg.com');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL is required in production to generate correct SEO URLs.');
  }

  return DEV_FALLBACK_SITE_URL;
}

export function getSiteMetadataBase(): URL {
  return new URL(getSiteUrl());
}