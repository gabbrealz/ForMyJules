import { config } from '../config';
import { iceServersSchema, type IceServer } from '../validators/rtc';

// ICE servers for the multiplayer photobooth's WebRTC preview (plan section 5). Credentials come
// from Metered Open Relay (free tier: 20 GB/month of TURN traffic; check the current allowance
// at https://metered.ca/tools/openrelay/). Cached like the Cloudinary usage figure, so browsers
// asking for it never turn into one Metered request each.
const CACHE_TTL_MS = 10 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;

// Used when Metered is not configured or is unreachable. STUN alone lets most home networks
// connect directly; a network that blocks peer-to-peer will fail without TURN.
const STUN_ONLY: IceServer[] = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:stun.l.google.com:19302' },
];

let cached: { iceServers: IceServer[]; fetchedAt: number } | null = null;
let inFlight: Promise<void> | null = null;
let retryNotBefore = 0;

async function refresh(appName: string, apiKey: string): Promise<void> {
  const url = new URL(`https://${appName}.metered.live/api/v1/turn/credentials`);
  url.searchParams.set('apiKey', apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  // Only the status goes into errors: the URL contains the API key.
  if (!response.ok) throw new Error(`Metered responded with HTTP ${response.status}`);

  const parsed = iceServersSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Unexpected response from Metered (not an iceServers list)');

  cached = { iceServers: parsed.data, fetchedAt: Date.now() };
}

/** Always resolves: falls back to the last good answer, then to STUN only. */
export async function getIceServers(): Promise<IceServer[]> {
  const { meteredAppName, meteredApiKey } = config.rtc;
  if (!meteredAppName || !meteredApiKey) return STUN_ONLY;

  const isFresh = cached !== null && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  if (!isFresh && Date.now() >= retryNotBefore) {
    // Concurrent callers share one request.
    inFlight ??= refresh(meteredAppName, meteredApiKey).finally(() => {
      inFlight = null;
    });
    try {
      await inFlight;
    } catch (err) {
      retryNotBefore = Date.now() + RETRY_AFTER_FAILURE_MS;
      const reason = err instanceof Error ? err.message : 'unknown error';
      console.error(`Could not fetch TURN credentials; using the last known ones, if any: ${reason}`);
    }
  }

  return cached?.iceServers ?? STUN_ONLY;
}
