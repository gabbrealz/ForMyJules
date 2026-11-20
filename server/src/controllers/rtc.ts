import type { RequestHandler } from 'express';
import * as rtcService from '../services/rtc';

// Both answers are per-browser and short-lived (the second holds TURN credentials).

/** The free tier: STUN, plus whether a relay exists to fall back to. */
export const getIceServers: RequestHandler = (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    iceServers: rtcService.getStunServers(),
    relayAvailable: rtcService.isRelayConfigured(),
  });
};

/** The fallback: TURN credentials. A browser asks only after a direct connection has failed. */
export const getRelayServers: RequestHandler = async (_req, res) => {
  res.set('Cache-Control', 'no-store'); // contains TURN credentials
  res.json({ iceServers: await rtcService.getRelayServers() });
};
