import { config } from '../config';
import { iceServersSchema, type IceServer } from '../validators/rtc';

// ICE servers for the multiplayer photobooth's WebRTC preview (plan section 5).
//
// Two tiers, cheapest first, so the paid-for-by-bandwidth one is only touched when it is needed:
// 1. STUN: free. Lets two browsers find their public addresses and connect directly, which works
//    on most home networks. Handed out to everyone, straight away.
// 2. TURN (Metered Open Relay, free tier: 20 GB/month of relayed traffic; check the current
//    allowance at https://metered.ca/tools/openrelay/): a relay for the networks that block direct
//    connections. A browser asks for it only after a direct connection has failed, so most sessions
//    never request credentials, never allocate a relay, and use none of the allowance.
const CACHE_TTL_MS = 10 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;

const STUN: IceServer[] = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'stun:stun.l.google.com:19302' },
];

let cached: { iceServers: IceServer[]; fetchedAt: number } | null = null;
let inFlight: Promise<void> | null = null;
let retryNotBefore = 0;

const isTurn = (server: IceServer): boolean =>
  [server.urls].flat().some((url) => /^turns?:/i.test(url));

/** Free servers that need no credentials. */
export function getStunServers(): IceServer[] {
  return STUN;
}

/** Whether TURN credentials can be asked for at all. Lets a browser skip the fallback it can't use. */
export function isRelayConfigured(): boolean {
  return Boolean(config.rtc.meteredAppName && config.rtc.meteredApiKey);
}

async function refresh(appName: string, apiKey: string): Promise<void> {
  const url = new URL(`https://${appName}.metered.live/api/v1/turn/credentials`);
  url.searchParams.set('apiKey', apiKey);

  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  // Only the status goes into errors: the URL contains the API key.
  if (!response.ok) throw new Error(`Metered responded with HTTP ${response.status}`);

  const parsed = iceServersSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Unexpected response from Metered (not an iceServers list)');

  // Only the relay entries: the browser already has STUN, and a TURN list without any is useless.
  const relays = parsed.data.filter(isTurn);
  if (relays.length === 0) throw new Error('Metered returned no TURN servers');

  cached = { iceServers: relays, fetchedAt: Date.now() };
}

/**
 * TURN servers with credentials, cached and shared by all callers. Always resolves: falls back to
 * the last good answer, then to an empty list (the browser then simply has no relay to try).
 */
export async function getRelayServers(): Promise<IceServer[]> {
  const { meteredAppName, meteredApiKey } = config.rtc;
  if (!meteredAppName || !meteredApiKey) return [];

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

  return cached?.iceServers ?? [];
}
