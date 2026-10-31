const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

// Optional numeric env var. Falls back when unset, empty, or not a positive number.
const positiveNumber = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

// If your frontend is hosted on a different site than this API (e.g. Vercel/Netlify -> Render),
// the browser only sends the session cookie cross-site with COOKIE_SAMESITE=none (requires HTTPS).
const sameSiteOptions = ['lax', 'strict', 'none'] as const;
const sameSite = sameSiteOptions.find((v) => v === process.env.COOKIE_SAMESITE) ?? 'lax';

const secureCookies = isProd || sameSite === 'none';

export const SESSION_COOKIE_NAME = 'sid';

// Used when setting the session cookie AND when clearing it (the options must match).
export const cookieOptions = {
  httpOnly: true,
  secure: secureCookies,
  sameSite,
  path: '/',
} as const;

export const config = {
  isProd,
  secureCookies,
  port: Number(process.env.PORT) || 3000,
  frontendUrl: required('FRONTEND_URL'),
  mongoUri: required('MONGODB_URI'),
  sessionSecret: required('SESSION_SECRET'),
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days

  cloudinary: {
    cloudName: required('CLOUDINARY_CLOUD_NAME'),
    apiKey: required('CLOUDINARY_API_KEY'),
    apiSecret: required('CLOUDINARY_API_SECRET'), // never sent to the browser
  },

  storage: {
    // 25 free credits, 5 reserved for bandwidth => ~20 GB for storage (plan section 8).
    budgetBytes: positiveNumber('STORAGE_BUDGET_BYTES', 20 * 1024 ** 3),
    // Refuse new uploads once usage reaches this share of the budget (plan section 9).
    guardRatio: 0.9,
  },
};
