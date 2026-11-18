import { Router } from 'express';
import * as rtcController from '../controllers/rtc';
import { requireAuth } from '../middlewares/auth';
import { iceServersLimiter } from '../middlewares/rate-limit';

const router = Router();

// Open to every approved role, guests included: they can join the photobooth too.

// GET /api/rtc/ice-servers
// -> { iceServers: [{ urls, username?, credential? }] }  (pass straight to RTCPeerConnection)
// STUN plus TURN when Metered is configured, STUN only otherwise.
router.get('/ice-servers', requireAuth, iceServersLimiter, rtcController.getIceServers);

export default router;
