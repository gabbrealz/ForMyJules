**Adding a feature later (pet game, etc.):** write a `SocketFeature` with a `name`, optional `roles`, and `onConnect`, `onMessage` and `onClose` handlers. Then add it to `featureList` in `sockets/index.ts`.

**Behaviour to know**
- **Message envelope:** every message carries `f: 'cursor'`, which the plan didn't have. This is what lets later features share one socket.
- **Auth:** the upgrade reuses your session cookie and re-checks the user in MongoDB. It also checks the `Origin`, connection caps and a per-connection rate limit.
- **Roles:** only `admin` and `partner` get cursors; guests can connect but see nothing.
- **Role changes:** a role is only checked at connect time. Call `disconnectUser(id)` from your admin routes after demoting or deleting someone.

## Client-side instructions

1. **Types:** copy `live-cursor.types.ts` into `features/live-cursor/types.ts`.
2. **Connection:** connect to `wss://<render-host>/ws` with a plain `WebSocket`. The session cookie goes along automatically, because your cookie settings are already `SameSite=None` for the cross-site setup.
3. **Reconnect:** use exponential backoff with jitter, and clear peers on close. If the socket closes before ever opening, call `/api/auth/me`. A 401 means stop retrying and go to login. Also stop on close code `4401`.
4. **Envelope:** send `{ f: 'cursor', t: 'm', a, x, y, fx, fy }` and `{ f: 'cursor', t: 'leave' }`. Ignore any incoming message whose `f` isn't `'cursor'`, and route by `f` so later features can share the socket.
5. **Sending:** follow plan phase 4.
   - Use `pointermove` and `scroll` listeners that store the latest position.
   - Run a `requestAnimationFrame` gate at 33 ms, and skip sending below `MIN_DELTA`.
   - Send `leave` on `pointerleave`, `pointerup`, `pointercancel` and `visibilitychange`.
6. **Anchors:** tag sections with `data-anchor`, using names that match `/^[a-z0-9_-]{1,32}$/i`. Send `a: null` with only `fx` and `fy` when the pointer is over no anchor.
7. **Receiving:**
   - `snap` replaces the peer list.
   - `join` adds a peer and `leave` removes it.
   - `m` updates the peer's target. Snap the cursor to it on the first position or after a `leave`.
8. **Rendering:** follow plan phase 5.
   - Mount one fixed overlay and keep the peer list in React state.
   - Keep positions in refs and move cursors imperatively in a rAF loop. Resolve the target from the anchor each frame, and fall back to `fx`/`fy` if the anchor is missing or has zero size.
   - Use `alpha = 1 - exp(-dt/80ms)` with `dt` clamped to 100 ms, and skip smoothing under `prefers-reduced-motion`.
   - Draw the cursor with the SVG `shape` and `color` from `user`, and show `user.name` as a label.