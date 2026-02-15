import type { Handle } from '@sveltejs/kit';

/**
 * Content Security Policy headers
 * 
 * Note: 'unsafe-inline' is required for:
 * - Theme script in app.html (injected before hydration)
 * - View Transitions API usage
 * 
 * In production, consider using nonce-based CSP
 */
export const handle: Handle = async ({ event, resolve }) => {
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
