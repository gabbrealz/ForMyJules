import { z } from 'zod';

// One entry of an RTCPeerConnection `iceServers` list. Used to check what Metered sends back
// before it is passed on to browsers.
export const iceServersSchema = z
  .array(
    z.object({
      urls: z.union([z.string(), z.array(z.string())]),
      username: z.string().optional(),
      credential: z.string().optional(),
    }),
  )
  .min(1);

export type IceServer = z.infer<typeof iceServersSchema>[number];
