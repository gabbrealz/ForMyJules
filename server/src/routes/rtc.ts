import { Router } from 'express';
import * as rtcController from '../controllers/rtc';
import { requireAuth } from '../middlewares/auth';
import { iceServersLimiter } from '../middlewares/rate-limit';

const router = Router();

// Open to every approved role, guests included: they can join the photobooth too.

// GET /api/rtc/ice-servers
// -> { iceServers: [{ urls }], relayAvailable: boolean }
// Free STUN servers only: pass straight to RTCPeerConnection and try a direct connection first.
router.get('/ice-servers', requireAuth, iceServersLimiter, rtcController.getIceServers);

// GET /api/rtc/relay-servers
// -> { iceServers: [{ urls, username, credential }] }   (TURN; empty when not configured)
// The fallback, for a browser whose direct connection failed. Add these to the ones above.
router.get('/relay-servers', requireAuth, iceServersLimiter, rtcController.getRelayServers);

export default router;
