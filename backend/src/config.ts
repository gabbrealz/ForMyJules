const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const isProd = process.env.NODE_ENV === 'production';

// If your frontend is hosted on a different site than this API (e.g. Vercel/Netlify -> Render),
// the browser only sends the session cookie cross-site with COOKIE_SAMESITE=none (requires HTTPS).
const sameSiteOptions = ['lax', 'strict', 'none'] as const;
const sameSite = sameSiteOptions.find((v) => v === process.env.COOKIE_SAMESITE) ?? 'lax';

export const SESSION_COOKIE_NAME = 'sid';

// Used when setting the session cookie AND when clearing it (the options must match).
export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite,
  path: '/',
} as const;

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  mongoUri: required('MONGODB_URI'),
  sessionSecret: required('SESSION_SECRET'),
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};
