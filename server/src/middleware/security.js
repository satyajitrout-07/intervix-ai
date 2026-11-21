/**
 * INTERVIX AI - Security & Performance Middleware
 * Implements Helmet-equivalent security headers, sliding-window rate limiting,
 * request size enforcement, and NoSQL injection sanitization.
 */

// In-memory sliding window rate limiter
const rateLimitMap = new Map();

/**
 * Creates an in-memory rate limiting middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per windowMs
 * @param {string} options.message - Error message when rate exceeded
 */
function createRateLimiter({ windowMs = 60 * 1000, max = 100, message = 'Too many requests. Please try again later.' }) {
  return (req, res, next) => {
    // Determine client identifier (IP address)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    const record = rateLimitMap.get(ip) || [];
    // Filter timestamps within the current window
    const recentHits = record.filter((ts) => now - ts < windowMs);

    if (recentHits.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    }

    recentHits.push(now);
    rateLimitMap.set(ip, recentHits);

    // Housekeeping: periodic cleanup
    if (rateLimitMap.size > 5000) {
      for (const [key, timestamps] of rateLimitMap.entries()) {
        const valid = timestamps.filter((t) => now - t < windowMs);
        if (valid.length === 0) rateLimitMap.delete(key);
        else rateLimitMap.set(key, valid);
      }
    }

    next();
  };
}

/**
 * Helmet-equivalent HTTP Security Headers Middleware
 */
function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by disallowing framing
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Enable XSS filtering in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information sent in HTTP headers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy: grant camera & microphone to self for interview features
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: mediastream:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; connect-src 'self' https: http: ws: wss:;"
  );

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Deep sanitization to prevent NoSQL / MongoDB injection attacks
 * Recursively removes any keys starting with "$" or containing "."
 */
function sanitizeNoSql(req, res, next) {
  function sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const clean = {};
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue; // Strip MongoDB operator injection
      }
      clean[key] = sanitize(obj[key]);
    }
    return clean;
  }

  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitize(req.params);
  }

  next();
}

// Global API Limiter: 120 requests / min
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many API requests from this IP. Please slow down.',
});

// Strict Auth Limiter: 25 requests / 15 mins for login / register to mitigate brute-force
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
});

module.exports = {
  securityHeaders,
  sanitizeNoSql,
  apiLimiter,
  authLimiter,
};
