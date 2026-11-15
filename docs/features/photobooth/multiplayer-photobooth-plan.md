# Multiplayer Photobooth: Plan

Nothing is built yet. Numbers marked _starting value_ are untested guesses that Phase 0 replaces with measurements.

## 1. Summary

- Before step 1, the person chooses **Solo** or **With others**. Solo is today's photobooth, unchanged.
- **With others** joins the one shared session (up to **4 people**). The first person in is the **leader**.
- Everyone sees each other's **live preview** (WebRTC, small and fast), shares one **countdown**, and ends up with one final image built from **full-quality stills**.
- WebSocket carries signalling, session state, the countdown and the stills. WebRTC carries only the preview video.

## 2. User flow

1. **Mode choice** (before step 1): Solo or With others.
2. **With others:** the person joins the shared session. A lobby shows who is present and who is the leader. Join order is kept, because it decides layering.
3. **Step 1, layout:** chosen by the leader. Everyone sees the choice live and cannot change it.
4. **Step 2, experience:** configured by the leader (everyone else sees it read-only):
   - scene mode: **one scene** or **separate cells** (section 3)
   - countdown interval
   - background removal (always on in one-scene mode)
   - filter, **shared by everyone**
5. **Step 3, photos:** shared countdown and live previews. The leader starts and stops, and decides whether the group retakes.
6. **Step 4, frame:** the leader picks the frame colour. The final image is built and shared with everyone. Anyone allowed to save (`partner` or `admin`) can save it to the gallery, once. Anyone can download it.
7. After saving, the group goes back to step 1 for another round.

**Session rules**

| Situation | Behaviour |
|---|---|
| Leader | Always the earliest-joined person still present. Owns configuration and retakes. |
| Leader leaves | The next-joined person becomes leader. A round in progress stops and is retaken. |
| Someone else leaves mid-round | The round stops. The remaining people can continue or retake (leader decides). |
| Someone joins mid-round | They wait in the lobby until the next round. |
| Fifth person | Refused with "session is full". |
| Everyone leaves | The session resets. |

## 3. Scene modes

| | One scene | Separate cells |
|---|---|---|
| Live preview | One preview: everyone's cutouts layered over a background | Split screen: one tile per person |
| Background removal | Required | Leader's choice |
| Final image, per slot | All people layered in one picture | The slot is split between people (2 people side by side, 3 in columns, 4 in a 2x2 grid), each still cropped to its cell |
| Layer order | **First to join at the back**, each later person on top | Not applicable |

The frame, its colour and the layout keep their current size and behaviour in both modes.

## 4. Architecture

```
Each client: camera -> segmenter -> cutout renderer
   |-- full-res stills ------------> WebSocket --> Render (Node + ws) --> leader
   '-- packed-alpha preview --> WebRTC, one connection per pair of people (STUN/TURN)

WebSocket (Render): session state, WebRTC signalling, clock sync, countdown, stills
WebRTC: preview video only, peer to peer, never through Render
TURN: Metered Open Relay, fallback for networks that block peer to peer
```

## 5. Server (Render, `ws`)

- **One in-memory session**, no rooms or codes.
- **Auth:** run the existing `express-session` middleware on the WebSocket upgrade and reject unapproved users. Also check `Origin`, because `cors` doesn't cover WebSockets. Cross-site cookie settings from `API.md` apply.
- **State:** the server owns the full session state (participants in join order, leader, config, round status, version number) and broadcasts all of it on every change. Clients never patch it.
- **Limits:** validate every message. Cap payload size (stills are binary frames) and message rate per connection. Turn off `permessage-deflate`. Send heartbeats so idle connections stay open.
- **ICE endpoint:** `GET /api/rtc/ice-servers` (logged-in users only) returns STUN plus TURN credentials fetched from Metered Open Relay. The Metered API key lives only in a Render env var. Check Open Relay's current free allowance and rate limits.
- **Render free tier:** it spins down when idle, which drops every open socket and makes the first connection slow. Check current terms and consider a paid instance if this gets in the way.
- **Privacy:** stills are relayed in memory and never stored or logged.

## 6. Shared countdown

- **Clock sync:** clients estimate their offset from the server with repeated ping/pong over the WebSocket, using the lowest-RTT sample. Target accuracy: under ~50 ms.
- **Timeline:** when the leader starts, the server picks a start time slightly in the future (_starting value_: 1.5 s) and broadcasts it with the interval. Each shot's capture time is start + n x interval. Every client **derives the countdown number locally** from the synced clock, so there are no per-second messages.
- **Capture:** each client captures its own still on the first video frame at or after the capture time.
- **Stop:** the server records the stop time, and every client discards shots scheduled after it. The server decides the cut-off, so everyone agrees on which shots exist.
- **Hidden tabs** throttle video callbacks and can miss a capture. Warn the person and retake that shot.

## 7. Live preview (WebRTC)

- **Connections:** a full mesh, one connection per pair of people (up to 3 per person with 4 people). Use the standard "perfect negotiation" pattern, with the earlier-joined person as the polite peer.
- **Transparency:** WebRTC video has no alpha channel, so each frame is a **packed image**: colour (premultiplied over black) on the left, the mask as grayscale on the right, with a black gap between. Colour and mask travel in the same frame, so they can't drift apart. Panel sizes are multiples of 16 px and 4:3.
- **Receiving:** a shader reads both panels and draws the cutout over the background using premultiplied alpha. Do not un-premultiply, because it creates halos on soft edges.
- **Removal off:** send plain video instead.
- **Mirroring:** send unmirrored, mirror on display, so the preview matches the saved photo.
- **Cost:** packing is one extra shader pass on the existing renderer, and encoding runs in the browser's video encoder off the main thread.

**Quality** is a balance. The preview is for posing, so it favours smoothness and low latency over sharpness. The final image never uses it.

| Tier | Per-panel size | Frame rate | Max bitrate |
|---|---|---|---|
| High | 448x336 | 20 fps | ~700 kbps |
| Medium | 320x240 | 15 fps | ~350 kbps |
| Low | 192x144 | 12 fps | ~150 kbps |

_All starting values._ With 3 or 4 people, **start one tier lower**, because each person uploads to up to three others. The sender checks connection stats every couple of seconds and **steps down fast, up slowly**. Limits are set on the sender with `setParameters` (`maxBitrate`, `maxFramerate`) and `contentHint = "motion"`.

**Failure:** if one person's connection can't be established, their tile shows a placeholder. The countdown, stills and final image don't depend on the preview, so the round still works.

## 8. Stills and the final image

- **Capture:** at each shot, every client takes a **lossless still** (PNG or lossless WebP, with alpha when background removal is on) from its **full-resolution** camera or cutout, using the existing crop-to-4:3-and-mirror logic.
- **Exchange:** stills are sent over the WebSocket **to the leader only**, with acknowledgements and retries. Sending them only to the leader keeps traffic small with four people. A person with four stills sends 4 files instead of receiving 12.
- **Composition:** the leader's client builds each slot (one scene or split cells, by section 3), then reuses the existing `renderFrame` for the frame, colour, shadow and download. It **encodes the final image once**.
- **Sharing:** the leader sends the final image back to the others over the WebSocket, so anyone can download it, and anyone allowed to save can. After a save, the server tells everyone, so it is saved only once.
- **If the leader leaves before composing,** the round is retaken (stills live only in the leader's memory).

**Keeping quality**

- Stills come from the full-resolution source, never from the preview.
- No lossy step between capture and the final image: lossless stills, one final encode.
- Mirror once, at capture.
- Two limits remain, and neither is caused by multiplayer. The existing frame draws 560x420 cells and `uploadPhoto` caps the long edge at 2048 px and re-encodes as WebP at quality 0.8. Cutout edges are only as sharp as the 256 px segmentation model.

## 9. Changes to existing code

| Area | Change |
|---|---|
| New mode choice | A screen before step 1: Solo or With others |
| `Photobooth.tsx` | In group mode, step, layout and config come from the session, not local state. Non-leaders get read-only controls. |
| `configure-experience-step.tsx` | Add the scene mode option. Filter and background removal come from the leader. |
| `take-photos-step.tsx` | Shared timeline replaces the local countdown. Preview becomes one scene or a split of tiles. |
| `cutout-renderer.ts` | Add packed output, and a layered (multi-cutout) draw for one-scene previews. |
| `pick-frame-step.tsx` / `render-frame.ts` | Accept composed slots. Show "saved" state from the session. |
| Server | New `sockets/` handlers for the session, plus the ICE endpoint |
| New client feature | Session socket, peer connections, clock sync, still transfer, compositor |

## 10. Phases

Each phase can be tested with two or more browser windows. WebRTC comes last so the product works without it.

0. **Measure:** packed alpha over WebRTC between two tabs, still file sizes (PNG vs lossless WebP), clock-sync accuracy on your Render instance, CPU with segmentation plus packing. Replace the starting values above.
1. **Session and presence:** authenticated WebSocket, join order, leader, the 4-person cap, mode choice screen, lobby.
2. **Synced configuration:** the leader's step 1 and 2 choices appear live for everyone.
3. **Clock sync and countdown:** shared timeline, capture at the agreed time, stop cut-off, readiness before start.
4. **Stills and composition:** transfer to the leader, composing both modes, final image shared, single save.
5. **WebRTC preview:** plain video first (with the Metered TURN endpoint), then packed alpha, then the one-scene and split previews, then graceful failure.
6. **Adaptation and robustness:** quality tiers from stats, reconnect, hidden-tab handling, leader hand-over.
7. **Hardening:** rate and size limits, message validation tests, privacy check.

## 11. Risks

- **Four-person mesh load:** each person encodes once but uploads to up to three peers and decodes three streams. If it's too heavy in Phase 0, lower the tiers or cap the session at three.
- **TURN usage:** relayed traffic multiplies in a mesh. Check Open Relay's free allowance against a realistic session.
- **Render:** spin-down and bandwidth limits (section 5).
- **Safari:** test WebRTC and canvas capture early.

## 12. Other Notes

- The leader also picks the frame colour in step 4.
- People who join mid-round wait for the next round.
- In separate-cells mode, background removal is optional and set by the leader.
