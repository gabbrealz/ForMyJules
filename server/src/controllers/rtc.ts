import type { RequestHandler } from 'express';
import * as rtcService from '../services/rtc';

export const getIceServers: RequestHandler = async (_req, res) => {
  res.set('Cache-Control', 'no-store'); // contains TURN credentials
  res.json({ iceServers: await rtcService.getIceServers() });
};
