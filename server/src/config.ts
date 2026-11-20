const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

// Optional string env var. Unset or empty means "not configured".
const optional = (name: string): string | undefined => process.env[name] || undefined;

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

// Browser origins allowed to call the API (CORS) and to open the WebSocket. Comma separated.
// Compared exactly, so include the scheme and port: https://app.vercel.app, https://localhost:5173.
const allowedOrigins = required('ALLOWED_ORIGINS')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Dev only: also accept any origin on a private network, so a phone or another computer
// on the LAN can open the dev server without listing its changing address.
// Opt-in, and ignored in production even if set.
const allowLanOrigins = !isProd && process.env.ALLOW_LAN_ORIGINS === 'true';

const isPrivateHost = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '[::1]' ||
  hostname.endsWith('.local') ||
  /^(127|10)\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

/** The one origin rule, shared by CORS and the WebSocket upgrade. `origin` is the Origin header. */
export function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (!allowLanOrigins) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return (protocol === 'http:' || protocol === 'https:') && isPrivateHost(hostname);
  } catch {
    return false; // e.g. the literal "null" some sandboxed pages send
  }
}

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
  allowedOrigins,
  allowLanOrigins,
  mongoUri: required('MONGODB_URI'),
  sessionSecret: required('SESSION_SECRET'),
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days

  cloudinary: {
    cloudName: required('CLOUDINARY_CLOUD_NAME'),
    apiKey: required('CLOUDINARY_API_KEY'),
    apiSecret: required('CLOUDINARY_API_SECRET'), // never sent to the browser
  },

  // Metered Open Relay (free TURN for the multiplayer photobooth preview). Both values are
  // optional: without them the ICE endpoint hands out STUN only, which works on most home
  // networks but not on ones that block peer-to-peer. The API key never leaves the server.
  rtc: {
    meteredAppName: optional('METERED_APP_NAME'), // the "<app>" in https://<app>.metered.live
    meteredApiKey: optional('METERED_API_KEY'),
  },

  storage: {
    // 25 free credits, 5 reserved for bandwidth => ~20 GB for storage (plan section 8).
    budgetBytes: positiveNumber('STORAGE_BUDGET_BYTES', 20 * 1024 ** 3),
    // Refuse new uploads once usage reaches this share of the budget (plan section 9).
    guardRatio: 0.9,
  },
};
