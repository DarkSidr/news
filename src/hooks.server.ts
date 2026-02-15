import type { Handle } from '@sveltejs/kit';
import { startDevScheduler } from '$lib/server/jobs/dev-scheduler';

startDevScheduler();

/**
 * Content Security Policy headers
 * 
 * Note: 'unsafe-inline' is required for:
 * - Theme script in app.html (injected before hydration)
 * - View Transitions API usage
 * 
 * In production, consider using nonce-based CSP
 */
import { env } from '$env/dynamic/private';

/**
 * Basic Auth check
 */
function isAuthorized(request: Request): boolean {
  const user = env.SITE_PROTECTION_USER;
  const pass = env.SITE_PROTECTION_PASSWORD;

  if (!user || !pass) {
    return true; // Protection disabled if vars not set
  }

  const auth = request.headers.get('authorization');
  if (!auth) {
    return false;
  }

  const [scheme, encoded] = auth.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
    return false;
  }

  const [u, p] = Buffer.from(encoded, 'base64').toString().split(':');
  return u === user && p === pass;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Basic Auth Protection
  if (!isAuthorized(event.request)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Restricted Area"'
      }
    });
  }

  const response = await resolve(event);

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Required for theme switcher
    "style-src 'self' 'unsafe-inline'", // Tailwind inline styles
    "img-src 'self' https: data:", // Images from any HTTPS source + data URIs
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  return response;
};
