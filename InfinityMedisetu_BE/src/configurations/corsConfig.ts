// src/configurations/corsConfig.ts
import { CorsOptions } from 'cors';
import { envConfig } from '../utils/envConfig';
import logger from '../utils/logger';

/**
 * Parses allowed origins from CORS_ALLOWED_ORIGINS env var.
 * Supports comma-separated values for multiple origins.
 *
 * In development: allows localhost origins automatically.
 * In production: only explicitly listed origins are allowed.
 */
function getAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [];

  // Allowed origins from CORS_ALLOWED_ORIGINS env var (comma-separated)
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (corsOrigins) {
    corsOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((origin) => origins.push(origin));
  }

  // In development, allow common local dev ports
  if (envConfig.NODE_ENV === 'development') {
    origins.push(/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/);
  }

  return origins;
}

const allowedOrigins = getAllowedOrigins();

logger.info(
  `[CORS] Allowed origins: ${allowedOrigins.map((o) => o.toString()).join(', ') || '(none configured)'}`
);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    logger.debug(
      `[CORS] Checking origin "${origin}" against allowed list [${allowedOrigins
        .map((o) => o.toString())
        .join(', ')}] -> ${isAllowed ? 'allowed' : 'blocked'}`
    );

    if (isAllowed) {
      return callback(null, true);
    }

    logger.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-access-token',
    'X-Requested-With',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
  credentials: true,
  maxAge: 86400, // Preflight cache: 24 hours
  optionsSuccessStatus: 204,
};

export default corsOptions;
