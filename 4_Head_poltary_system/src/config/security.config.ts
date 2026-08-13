const parseOrigins = (raw?: string): string[] =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const ALLOWED_ORIGINS = new Set(parseOrigins(process.env.FRONTEND_URLS));

const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export const SecurityConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    legacyHeaders: false,
    standardHeaders: true,
  },

  cors: {
    credentials: true,
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);

      if (
        process.env.NODE_ENV !== 'production' &&
        localhostPattern.test(origin)
      ) {
        return callback(null, true);
      }

      callback(new Error(`CORS blocked: ${origin} not allowed`));
    },
  },

  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  },

  validation: {
    maxStringLength: 1000,
    maxArrayLength: 100,
  },
};
