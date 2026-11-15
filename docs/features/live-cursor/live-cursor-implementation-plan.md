# Live Cursor Tracking: Implementation Plan

Element-anchored live cursors for a two-person personal site (Node + Express, WebSockets, responsive layout).

---

## 1. Goals and non-goals

**Goals**

- See your partner's cursor moving live, pointing at the *same content* even when your layouts differ (desktop vs. phone).
- Smooth motion that never looks choppy, even on a jittery connection.
- Tiny bandwidth, low battery use, and graceful degradation when anything goes wrong.
- Distinct geometric cursor per person (triangle, diamond, circle, square).

**Non-goals**

- Persistence, history, or replay.
- More than a handful of simultaneous users (see "Scaling notes").
- Cursor chat, drawing, or other collaboration features (possible later).

---

## 2. Architecture overview

```
 Browser A                      Express + ws                    Browser B
 ─────────                      ────────────                    ─────────
 pointermove ─┐                                                 ┌─ render loop (rAF)
 scroll      ─┼─► measure() ─► throttle (~30 Hz) ─► WS ─► validate ─► relay ─► WS ─► lerp ─► DOM
 pointerleave ┘   anchor + page fallback              clamp, rate-limit            targetPx() each frame
```

Key decisions:

| Concern | Decision | Why |
|---|---|---|
| Transport | Plain `ws` on the existing HTTP server | No need for Socket.IO's rooms or fallbacks with two users |
| Coordinates | Anchor-relative fractions, plus page-level fractions as fallback | Same content on both screens; degrades gracefully |
| Sending | Throttled to ~30 Hz via `requestAnimationFrame` gate | Low bandwidth, no flooding |
| Receiving | Keep `target`, lerp `current` toward it every frame | Smooth despite network jitter |
| Rendering | Fixed overlay, `translate3d`, inline SVG | GPU-friendly, no layout cost |
| Auth | `express-session` cookie (reused on WS upgrade) + `Origin` allowlist | Only users with `partner` role can connect; one login covers HTTP and WebSocket |

---

## 3. Coordinate strategy (element anchoring)

### 3.1 How it works

Each cursor position is sent as **two** coordinate sets:

1. **Anchored:** `a` (anchor name) plus `x`, `y` as fractions of that element's bounding box.
2. **Fallback:** `fx`, `fy` as fractions of the whole document.

The receiver tries the anchor first. If the anchor does not exist or is hidden (zero size, e.g. `display: none` on mobile), it uses the page-level fallback.

### 3.2 Tagging anchors

You do **not** need to tag everything. Tag the 5 to 10 major regions; untagged areas use the fallback.

```html
<header data-anchor="hero">...</header>
<section id="about"   data-anchor="about">...</section>
<section id="gallery" data-anchor="gallery">...</section>
<section id="timeline" data-anchor="timeline">...</section>
<footer data-anchor="footer">...</footer>
```

Guidelines:

- Anchor names must be stable, unique, and match `/^[a-z0-9_-]{1,32}$/i`. Never generate them from DOM paths.
- Smaller is more accurate. Cards, image blocks, and sections beat one giant `<main>`.
- If a section has an `id` already, reuse it as the anchor name.
- Nested anchors are fine: the sender uses the *closest* one under the pointer.

---

## 4. Wire protocol

All messages are JSON. Keep them tiny.

**Client → Server**

```jsonc
{ "t": "m", "a": "gallery", "x": 0.4123, "y": 0.2231, "fx": 0.4, "fy": 0.7 }  // move
{ "t": "leave" }                                                              // pointer left / tab hidden
```

`a` is `null` when the pointer is not over any anchor.

**Server → Client**

```jsonc
{ "t": "snap", "peers": [ { "id": 2, "user": { "name": "partner", "color": "#3a86ff", "shape": "diamond" }, "pos": { ... } | null } ] }
{ "t": "join", "id": 2, "user": { ... } }
{ "t": "m", "id": 2, "a": "gallery", "x": 0.41, "y": 0.22, "fx": 0.4, "fy": 0.7 }
{ "t": "leave", "id": 2 }      // also sent when a peer disconnects
```

Typical move message is about 70 bytes. At 30 Hz that is roughly 2 KB/s per sender.

---

## 5. Throttling: how it works

Three layers keep traffic low without hurting feel:

1. **Capture is free.** `pointermove` just stores the latest measurement in `pending`. No network work happens per event (these can fire at 100+ Hz on some devices).
2. **Send is gated.** The `requestAnimationFrame` loop sends at most once per `SEND_INTERVAL_MS` (33 ms, about 30 Hz). Only the newest value is sent; intermediate ones are discarded.
3. **Send only on change.** If the new position is within `MIN_DELTA` of the last sent one, nothing is sent. An idle cursor costs zero bytes.

Server-side backstop: messages arriving faster than 15 ms apart per connection are dropped, and `maxPayload` caps frame size.

Also pause when hidden: `visibilitychange` sends `leave` and the pending value is cleared, so background tabs stay quiet.

---

## 6. Interpolation: how it works

Network updates arrive at roughly 30 Hz and unevenly. Rendering them directly looks choppy, so each remote cursor has two positions:

- **target:** the latest message (resolved to pixels each frame)
- **current:** what is drawn

Each frame, `current` moves a fraction of the way toward `target`:

```
alpha = 1 - exp(-dt / tau)
current += (target - current) * alpha
```

Why this form instead of a fixed `0.25`:

- It is **frame-rate independent**: 60 Hz and 144 Hz displays feel identical.
- `tau` (`SMOOTHING_TAU_MS`) is intuitive: roughly the time to cover about 63% of the remaining distance.
- Tune it: **50 ms** feels responsive, **80 ms** is a good default, **120 ms+** feels floaty.

Because the target is recomputed from the anchor **every frame**, scrolling and resizing keep the cursor pinned to the correct content, and the lerp also hides the jump when a cursor crosses between anchored and fallback modes.

Special cases handled:

- **First position or reappearing after `leave`:** snap, do not glide in from a stale location.
- **Long frame gaps** (tab was backgrounded): `dt` is clamped to 100 ms.
- **`prefers-reduced-motion`:** lerp is skipped; cursors snap to targets.

---

## 7. Edge cases checklist

| Situation | Behavior |
|---|---|
| Anchor missing or hidden on the receiver | Falls back to `fx`/`fy` page-level coordinates |
| Pointer over no anchor | `a: null`, sends page-level only |
| Scroll without moving the pointer | `scroll` handler re-measures via `elementFromPoint` |
| Window resize / layout reflow | Handled automatically: pixels recomputed each frame |
| Touch devices | `pointermove` fires only while touching; `pointerup`/`pointercancel` send `leave` |
| Mouse leaves the browser window | `pointerleave` on `<html>` sends `leave` |
| Tab hidden | `leave` sent, sending paused |
| Server restart / network drop | Reconnect with exponential backoff and jitter; snapshot repopulates peers |
| Same person on two devices | Each connection gets its own id and cursor (same color and shape) |
| Remote cursor off-screen | Currently clipped by the overlay (see enhancements) |
| Bad or hostile messages | Validated, clamped, rate-limited, size-limited on the server |

---

## 8. Implementation phases

Stack: Node + Express API on Render (web service), `express-session` for auth, `ws` attached to the same HTTP server.

**Ground rules for this stack**

- **One origin.** Serve the site and the API from the same Express service (or put both under one custom domain). That keeps the session cookie `SameSite=Lax` and avoids third-party-cookie blocking (Safari especially). Splitting the frontend onto a different domain means `SameSite=None`, CORS with credentials, and flaky cookies.
- **Render terminates TLS.** Express sees plain HTTP, so set `app.set('trust proxy', 1)` or `secure` cookies will never be issued.
- **Bind to `process.env.PORT`** on `0.0.0.0`. Render injects the port.
- **Sessions must survive restarts.** Render restarts and redeploys wipe process memory, and `MemoryStore` would log you both out each time. Use a real store (`connect-pg-simple` with Render Postgres, or `connect-redis` with Render Key Value). `MemoryStore` is fine for local dev only.
- **Same session for HTTP and WebSocket.** The upgrade handler runs the same `sessionParser`, so one login covers both. No tokens in URLs.

---

### Phase 1: Shared types and scaffolding
- [ ] Strict TypeScript on server and client
- [ ] Shared module for the wire protocol: message types as discriminated unions, anchor names, user and shape types
- [ ] Runtime validation for every inbound server message, mirroring the shared types (types alone vanish at runtime)
- [ ] One constants module for tuning values (`SEND_INTERVAL_MS`, `MIN_DELTA`, `SMOOTHING_TAU_MS`, rate and size limits)
- [ ] Environment config for the server URL (client) and allowed origins (server), never hardcoded
- **Done when:** client and server compile against the same message types, and a malformed message fails validation in a unit test

### Phase 2: Server relay
- [ ] WebSocket server attached to the existing HTTP server, handling the upgrade manually
- [ ] Upgrade requires an existing authenticated `express-session` session. The relay resolves it from the cookie and rejects before upgrading if it is missing
- [ ] Enforce an `Origin` allowlist that includes the frontend origin, since WebSockets are not covered by CORS
- [ ] Identity comes from the session, never from client messages; each connection gets its own id
- [ ] Join, snapshot, leave; clamping, per-connection rate limit, `maxPayload`
- **Done when:** two clients can connect and see each other join, and a missing session or disallowed origin is rejected before upgrade

### Phase 3: Client connection layer
- [ ] Connection manager as a plain TypeScript module with typed event callbacks, connecting over `wss://`
- [ ] Thin React hook or provider that starts and stops the manager with the app lifecycle, safe under StrictMode's double mount
- [ ] Reconnect with exponential backoff and jitter; clear peers on close
- [ ] If a socket closes before ever opening, check the session through the existing auth flow: an invalid session stops retrying and hands off to auth, anything else keeps backing off
- **Done when:** restarting the server reconnects both clients automatically, and an expired session stops the retry loop

### Phase 4: Anchored measurement and throttled send
- [ ] Anchor attributes on React section components, with names from a typed constant set
- [ ] One set of pointer, scroll, and visibility listeners at the app root
- [ ] `measure()` with page-level fallback, rAF-gated throttle, send-on-change, leave events
- [ ] Define behavior when an anchored section unmounts (route change, lazy loading): the receiver falls back to page-level coordinates
- **Done when:** DevTools shows about 30 frames/s while moving and none while idle

### Phase 5: Receive, interpolate, render
- [ ] Fixed overlay mounted once by React
- [ ] Peer list in React state, changing only on join and leave
- [ ] Per-peer target and current positions kept outside React state and updated imperatively by the animation loop, so there is no re-render per message or frame
- [ ] Geometric SVG cursors by shape, target recomputed from the anchor every frame, lerp loop, idle fade, reduced-motion snap
- **Done when:** a remote cursor glides smoothly, stays pinned to content while scrolling, and React DevTools shows no re-renders during movement

### Phase 6: Tune anchors and feel
- [ ] Tag remaining sections; test desktop vs. phone side by side
- [ ] Check anchors that are hidden or reordered at mobile breakpoints
- [ ] Adjust `SMOOTHING_TAU_MS` and `SEND_INTERVAL_MS`
- [ ] Optional: pixel-based `y` for text-heavy sections
- **Done when:** pointing at an element on one screen lands on the same element on the other

---

## 9. Testing

1. **Two real devices:** desktop and phone, anchors on. Point at a specific photo or heading and confirm it matches on the other screen.
2. **DevTools device toolbar:** resize across breakpoints while the other client moves.
3. **Network throttling:** "Slow 3G" and "Offline" in DevTools; confirm smoothness and reconnect behavior.
4. **Bandwidth:** Network tab, WS frames; expect about 70 bytes per frame, at most about 30 per second.
5. **Abuse check:** send malformed JSON, huge payloads, NaN values, and fake anchor names via `wscat`; the server should ignore them without crashing.
6. **Hidden anchor:** `display: none` an anchored section on mobile and confirm the fallback is used.

---

## 10. Future enhancements

- **Edge indicators:** when the remote cursor is off-screen, pin a small arrow to the viewport edge pointing toward it.
- **Click pulses:** send `{ t: 'c' }` on `pointerdown` and animate a ripple at the remote cursor.
- **Idle states:** shrink or dim the cursor after a few seconds instead of hiding it.
- **Presence badge:** small "partner is here" indicator using the join/leave events.
- **Dead reckoning:** extrapolate short gaps using velocity (only if the lerp ever feels laggy).
