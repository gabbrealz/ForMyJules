import { config } from '../config';
import { cloudinary } from '../utils/cloudinary';

// Storage guard (plan section 9). Reads Cloudinary's usage API, cached so it isn't called per request.
const CACHE_TTL_MS = 5 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;

let cached: { usedBytes: number; fetchedAt: number } | null = null;
let inFlight: Promise<void> | null = null;
let retryNotBefore = 0;

async function refreshUsage(): Promise<void> {
  const usage = await cloudinary.api.usage();

  // storage.usage is in bytes on the credit-based plans (verify once against your own account).
  const usedBytes: unknown = usage?.storage?.usage;
  if (typeof usedBytes !== 'number' || !Number.isFinite(usedBytes)) {
    throw new Error('Unexpected response from the Cloudinary usage API (storage.usage missing)');
  }
  cached = { usedBytes, fetchedAt: Date.now() };
}

async function getUsedBytes(): Promise<number | null> {
  const isFresh = cached !== null && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  if (!isFresh && Date.now() >= retryNotBefore) {
    // Concurrent callers share one request.
    inFlight ??= refreshUsage().finally(() => {
      inFlight = null;
    });
    try {
      await inFlight;
    } catch (err) {
      retryNotBefore = Date.now() + RETRY_AFTER_FAILURE_MS;
      console.error('Could not read Cloudinary usage; using the last known value, if any:', err);
    }
  }

  return cached?.usedBytes ?? null; // null = unknown
}

/** Called after a photo is saved, so the cached figure doesn't lag behind our own uploads. */
export function recordUpload(bytes: number): void {
  if (cached) cached.usedBytes += bytes;
}

export type StorageStatus = {
  usedBytes: number | null;
  budgetBytes: number;
  remainingBytes: number | null;
  usedRatio: number | null;
  uploadsAllowed: boolean;
};

export async function getStorageStatus(): Promise<StorageStatus> {
  const usedBytes = await getUsedBytes();
  const { budgetBytes, guardRatio } = config.storage;

  if (usedBytes === null) {
    // Usage unknown (API down or unexpected shape). Fail open: this is a free-tier budget guard,
    // not a security control, and Cloudinary enforces its own hard limits anyway.
    return { usedBytes: null, budgetBytes, remainingBytes: null, usedRatio: null, uploadsAllowed: true };
  }

  return {
    usedBytes,
    budgetBytes,
    remainingBytes: Math.max(0, budgetBytes - usedBytes),
    usedRatio: usedBytes / budgetBytes,
    uploadsAllowed: usedBytes < budgetBytes * guardRatio,
  };
}
