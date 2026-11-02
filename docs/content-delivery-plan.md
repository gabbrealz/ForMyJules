# Content-Delivery Plan: Private Photos & Scrapbook Assets on Free Tiers

**Stack:** Node + Express (Render) · React + TypeScript (Vercel) · MongoDB Atlas free (512 MB) · Cloudinary free (25 credits/month)
**Goals:** keep images private to authenticated users, preserve Cloudinary credits, lazy loading with placeholders, no credit card, and support a Canva-style scrapbook that mixes photos and PNG assets.

## 1. Core idea

Cloudinary credits are spent on storage, bandwidth, and transformations.

- Storage counts the main assets **plus a cached copy of every derived (transformed) asset**.
- Bandwidth and transformations are measured over a **rolling 30-day window**.
- A transformation is counted when a *new* derived asset is generated; repeat requests for the same URL are not counted again.

Strategy:

1. Do all image processing in the browser, so Cloudinary performs **zero transformations** and never creates derived assets.
2. Store exactly two assets per image: the **full image** (original bytes, or a lossy WebP if compressed) and a **small thumbnail**.
3. Serve both as signed `authenticated` assets with **stable URLs**, so the browser cache does most of the delivery work.
4. Keep placeholders and layouts in MongoDB, so they cost no credits.

---

## 2. Assets and the compression rules

Each image produces two assets:

| Asset | Content | When | Used for |
|---|---|---|---|
| `full` | The **original file, unchanged**, or a **lossy WebP at 85% quality** if compressed | Always | Lightbox, download, large scrapbook elements |
| `thumb` | Lossy WebP at 85%, 400 px long edge (~25–35 KB) | Always | Grid, small scrapbook elements |

### When compression happens

Compression is **optional** (a toggle at upload time, per upload with per-file override, last choice remembered, default Off). It becomes **mandatory** in these cases:

| Condition | Why | Result |
|---|---|---|
| Source file larger than **9 MB** | Cloudinary's free plan rejects files over 10 MB (10,485,760 bytes); 9 MB leaves headroom | Compress to lossy WebP q85 |
| Image larger than **25 megapixels** (e.g. 48 MP phone photos) | Cloudinary's free plan has a 25 MP cap, and WebP re-encoding doesn't reduce pixel count | Downscale to ≤ 24 MP, then compress |
| Compressed result still larger than 9 MB | Rare, e.g. huge noisy images | Downscale in steps (about ×0.85 per step) and re-encode until it fits |
| Format browsers can't display, e.g. **HEIC/HEIF** | Chrome and Firefox can't show it, and Cloudinary would serve the raw file | Convert to lossy WebP q85 |

The UI shows *why* compression is locked on, and shows the real result size (original vs compressed) before uploading.

### What "compress" means

Decode the image, apply the orientation, and re-encode as **lossy WebP at 85% quality**. This applies to **both JPEG and PNG** sources, at the original dimensions unless a downscale is forced above. Transparency is preserved (lossy WebP supports an alpha channel), so PNG stickers keep their transparent edges.

### What "not compressed" means

The original file's bytes are uploaded **unchanged**, with no WebP conversion. This is bit-exact to the source and keeps the original format (JPEG, PNG, WebP, or GIF).

| Input format | Not compressed | Compressed |
|---|---|---|
| JPEG, PNG | Stored as-is | Lossy WebP q85 |
| WebP | Stored as-is | Re-encoded at q85 (only worthwhile if over 9 MB) |
| HEIC/HEIF | Not allowed (always converted) | Lossy WebP q85 |
| GIF (animated) | Stored as-is, must be ≤ 9 MB | Not offered (canvas encoding would drop the animation) |
| Anything else | Rejected | Rejected |

### Trade-offs to know

- **Compression is lossy and not reversible.** Re-encoding a JPEG as WebP q85 adds a second round of loss. It is usually visually close, but it is not exact. As-is storage is the only bit-exact option.
- **As-is files keep their EXIF**, including GPS location. Compressed copies strip it. Images are only reachable by signed URL, but a downloaded original carries its metadata, so be careful when sharing it.
- **Color:** compressed copies are converted to sRGB. As-is files keep their original color profile.

---

## 3. Architecture

```
UPLOAD (browser does the work)
 file → read type/size/megapixels/EXIF date
      → compress? (user choice, or forced by the rules in section 2)
          yes → decode → [downscale if forced] → lossy WebP q85  → full
          no  → original bytes                                     → full
      → decode → 400 px lossy WebP q85 → thumb, plus thumbhash
   1. ask Express for signed upload params (your auth)
   2. upload full + thumb straight to Cloudinary, type: authenticated   ← Render never touches bytes
   3. POST metadata → MongoDB

VIEW
 React (Vercel) → GET /api/photos?cursor=… → Express → Mongo
        ← page of ~40: {id, w, h, thumbhash, signed thumbUrl, signed fullUrl}
 <img src=signedUrl> → browser cache → Cloudinary CDN → (miss) Cloudinary storage
```

---

## 4. Upload flow

### User-facing options

- **Compress (lossy WebP, 85%):** toggle, default Off. Locked On when a mandatory rule applies, with the reason shown.
- **Live size readout:** when On, encode first and show the measured result ("2.1 MB → 0.9 MB"); when Off, show the original size and the storage remaining.

### Pipeline

1. **Inspect** the file: type, byte size, pixel dimensions (from the decoded bitmap), and the EXIF capture date (read it with `exifr` *before* any re-encoding).
2. **Decide** whether compression is on, using the rules in section 2.
3. **Produce `full`:** either the original `File` as-is, or decode → optional downscale → `@jsquash/webp` encode at quality 85.
4. **Produce `thumb`:** decode (`createImageBitmap` applies orientation), downscale to 400 px, encode lossy WebP q85.
5. **Compute a ThumbHash** (~25–30 bytes) from a ≤100 px version.
6. **Sign and upload** both files, then save metadata.

Why `@jsquash/webp` (libwebp compiled to WebAssembly) instead of plain canvas: Safari can't encode WebP through canvas and silently returns PNG, so a canvas-based "WebP" there can be mislabeled. The WASM encoder behaves the same in every browser. Run it in a Web Worker so large images don't freeze the page. Check the package's `EncodeOptions` for the exact name of the quality option.

### Signing and auth

- The browser calls `POST /api/uploads/sign` with the normal login session and **no request body**. Express always signs **both** variants (`full` and `thumb`), because every image needs exactly those two assets, so there is nothing for the client to choose. It picks a random UUID and signs each upload's params (`public_id`, `type: authenticated`, `overwrite: false`, `timestamp`) with the API secret. The response is `{ id, cloudName, apiKey, uploads: { full: {...}, thumb: {...} } }`.
- Only admins and partners can call the sign endpoint (guests are view-only), and it returns `507 storage_full` when the storage guard trips (section 9).
- The browser never holds the Cloudinary API secret. Cloudinary recomputes the signature and rejects any mismatch.
- Every param sent (except `file` and `api_key`) must be signed with identical values. If you add a param later, add it on both sides.
- Don't use an unsigned upload preset: anyone who finds its name could upload to your account and burn your storage.
- Add a rate limit on the sign endpoint and a storage cap (section 9).
- Public IDs: `photos/{id}/full` and `photos/{id}/thumb`. Don't put a file extension in the public ID; Cloudinary keeps the uploaded format, so as-is files are delivered in their original format.

### Save metadata only after both uploads succeed

`POST /api/photos` with the fields in section 5. If the insert fails, log the public IDs for cleanup.

---

## 5. Data model and retrieval

### MongoDB document (~0.5 KB)

`id`, `kind` (`photo` | `photobooth` | `graphic` | `sticker`; defaults to `sticker` when `hasAlpha`, otherwise `photo`, unless the client sends one), `w`, `h` (stored dimensions, orientation applied), `origW`, `origH`, `thumbhash`, `hasAlpha`, `compressed` (boolean), `fullFormat` (`jpeg` | `png` | `webp` | `gif`), `origBytes`, `fullBytes`, `thumbBytes`, `takenAt`, `createdAt`, `owner`. **Not** signed URLs. Node rebuilds the public IDs from `id` and signs them at response time.

### Listing

- The browser requests **one page per call** (`GET /api/photos?cursor=…`, about 40 items).
- The list can be filtered with `kind=photo|photobooth|graphic|sticker`.
- Express reads the page from Mongo and returns, per item: `id`, `kind`, `w`, `h`, `thumbhash`, `hasAlpha`, `takenAt`, `createdAt`, `canEdit`, `thumbUrl`, `fullUrl`. (`canEdit` is true for admins and partners and tells the UI whether to show edit and delete buttons.)
- Signing is a local hash computation with the API secret, so signing 400 URLs is effectively free, with no Cloudinary API call and no credit cost.
- Optional: return `fullUrl` only from `GET /api/photos/:id/full` when the lightbox opens, to keep large-image URLs out of list responses.

---

## 6. Signed, authenticated delivery

- Upload with `type: "authenticated"`. Those assets are reachable only through signed URLs, which are available on free plans.
- **Keep signed URLs deterministic:** the same asset must always produce the same URL, with no timestamps or expiry parameters, or the browser cache stops working.
- Trade-off: a leaked URL stays valid. A single signature can't be revoked; you can move the asset to a new public ID or rotate the API secret (which breaks every existing signed URL). For two people's private photos with random IDs, this is acceptable.
- Time-limited tokens are a separate feature that I haven't confirmed is available on the free plan, so don't depend on them.
- URLs are requested with no transformation parameters, so Cloudinary should serve the uploaded bytes unchanged. Confirm in testing that the delivered size matches the uploaded size.

---

## 7. Frontend: lazy loading and placeholders

- **Placeholders:** ThumbHash stored in Mongo, decoded to a canvas client-side. No Cloudinary bandwidth is used, and the placeholder appears as soon as the JSON arrives. ThumbHash supports transparency, so sticker placeholders can be transparent too.
- **No layout shift:** reserve space with CSS `aspect-ratio` from `w`/`h`.
- **Tile pattern:** hash canvas with a soft pulse, with `<img loading="lazy" decoding="async">` on top at opacity 0. Fade the image in on `onLoad`, then remove the canvas.
- **Pagination:** cursor-based, about 40 per page, with an `IntersectionObserver` sentinel for the next page. Add `@tanstack/react-virtual` if the grid grows past a few hundred DOM nodes.
- **Grid uses thumbs only.** The lightbox loads `fullUrl`. Show the already-cached thumb immediately, blown up, and fade to the full image when it loads, so opening a photo feels instant.
- **Prefetch:** at most the next image in the lightbox, or none if bandwidth is tight. The full image is the expensive asset.
- **Persisted query cache:** TanStack Query persisted to IndexedDB, so revisits render instantly from stored hashes and URLs and hit the browser cache. This also hides Render free-tier cold starts, since only the JSON call waits on Render.

### Frontend dependencies

**No Cloudinary packages in the frontend.** Uploads are plain `fetch` + `FormData`, and the backend returns finished signed URL strings. Signing authenticated URLs needs the API secret, so frontend SDKs couldn't do it anyway. Only the Express backend needs the `cloudinary` package.

Frontend packages: `@jsquash/webp` (plus its WASM files, bundled per its README), `thumbhash`, `exifr`, and `heic2any` for iPhone HEIC support.

---

## 8. Capacity and bandwidth (rough estimates; test with your own files)

Assumptions: 5 of 25 credits reserved for bandwidth, leaving ~20 GB (~20,480 MB) for storage. Per-photo storage = full image + a ~30 KB thumb. For compressed JPEGs I assume lossy WebP q85 comes out at roughly 40–70% of the JPEG's size; this is a guess, not a measurement, and varies with the image.

| Average source size | Stored as-is | Compressed (lossy WebP q85) |
|---|---|---|
| ~1 MB | ~19,900 images | ~28,000–47,600 images |
| ~2 MB | ~10,100 images | ~14,300–24,700 images |
| ~3.5 MB | ~5,800 images | ~8,300–14,300 images |

PNG screenshots and flat graphics often shrink much more than photos when converted to lossy WebP, so a PNG-heavy library will land at the high end of the compressed column or beyond. Mixed libraries land in between.

### Bandwidth (worst case, nothing cached; 2 people, 20 lightbox opens per day each)

| Average full-image size | Monthly bandwidth for lightbox opens |
|---|---|
| ~1 MB | ~1.2 GB ≈ 1.2 credits |
| ~2 MB | ~2.4 GB ≈ 2.4 credits |
| ~3.5 MB | ~4.2 GB ≈ 4.2 credits |

Add about 0.2 credits for grid thumbs. The browser cache means repeat views of the same photo cost nothing, so real usage should be lower. The key point: with no preview copy, the lightbox downloads the full image, so **bandwidth grows with file size** and your 5-credit reserve is the limit. Compressing reduces both storage and bandwidth, which is the strongest argument for leaving it On for large files. MongoDB at ~0.5 KB per image stays far below 512 MB, so Cloudinary remains the binding constraint.

---

## 9. Storage guard

Use Cloudinary's usage API (cache the result; I haven't verified the free plan's rate limit for it) so the upload endpoint rejects uploads when storage passes ~90% of your budget, and so the UI can show remaining space next to the compression toggle.

---

## 10. Scrapbook (Canva-style)

- **Store layouts, not rendered pages.** A page is a small JSON document: a list of `{assetId, x, y, w, h, rotation, z}`, typically a few KB. Reusing a sticker on 50 pages costs no extra Cloudinary storage. For a page gallery, store one small lossy WebP preview per page (~30 KB).
- **Transparency:** a PNG with alpha stored as-is keeps full fidelity; compressed, it becomes lossy WebP with alpha, usually much smaller. Detect alpha at upload to set `hasAlpha` and a default `kind` (`sticker` if it has alpha, otherwise `photo`); let the user override the kind with any of `photo`, `photobooth`, `graphic` or `sticker`, and change it later with `PATCH /api/photos/:id`. For stickers, suggest compression, since large transparent PNGs are heavy to load many times.
- **Choose the asset by on-screen size:** if an element renders at ≤ 400 px (after devicePixelRatio), use `thumb`; otherwise use `full`. Both URLs are stable, so both stay cached.
- **Decoded size matters more than file size.** A 2048 × 1536 image takes about 12 MB of memory once decoded, so 30 large photos on one page can freeze a phone. Using thumbs for small elements helps, and so does capping the editor's working size.
- **Canvas export needs CORS.** If you use Konva or Fabric and want "export page as image", load images with `crossOrigin="anonymous"`, or the canvas becomes tainted and `toDataURL` fails. I haven't verified that Cloudinary sends the right CORS headers for authenticated assets, so check `Access-Control-Allow-Origin` in DevTools early.
- **Autosave with a debounce:** one `PATCH` about 1–2 seconds after the last edit, so you don't hammer Render's free tier.

---

## 11. What to skip, and why

- **Proxying images through Render:** defeats the CDN, adds bandwidth and cold starts, and Cloudinary still bills the bandwidth.
- **Vercel image optimization:** adds usage limits for no gain.
- **A Cloudflare or other CDN in front:** needs a domain you pay for, which breaks the no-cost rule. The browser cache already does this job for two users.
- **Cloudinary transformations** (on-demand or eager): they cost credits and add derived-asset storage. Everything is pre-generated in the browser instead.
- **A separate preview copy:** keeping Cloudinary to two assets per image saves storage. The cost is that the lightbox downloads the full image.
- **`f_auto`, `w_auto`, `dpr_auto`:** can create several cached variants per image, and AVIF output has its own size-based counting rules.

---

## 12. Watch-outs

- **HEIC:** can't be stored as-is, because Chrome and Firefox can't display it. It is always converted, using `heic2any` to decode first.
- **EXIF:** as-is files keep GPS and other metadata. Compressed files lose it; the capture date is saved in Mongo either way.
- **Concurrency:** decoding and encoding large images uses a lot of memory (a 12 MP bitmap is ~48 MB decoded). Run 2–3 uploads at a time and show progress.
- **Animated GIFs:** stored as-is only, and must fit under 9 MB.
- **Orphaned uploads:** if the Mongo insert fails after a successful upload, assets consume storage. Log public IDs and write a cleanup script.
- **Verify caching:** in DevTools, check that responses carry long `Cache-Control` headers and that reloads show "from disk cache". I haven't confirmed Cloudinary's default headers.
- **Render free tier:** spins down when idle, so the first API call after a quiet period is slow. Check Render's current free-tier terms.
- **Plan limits can change:** re-check Cloudinary's 10 MB and 25 MP free-plan limits before relying on them.

---

## 13. Build checklist

1. Cloudinary: create the account; note cloud name, API key, secret. Don't use unsigned presets.
2. **Measure first:** take 5–10 of your real files (JPEGs and PNGs), compress each with `@jsquash/webp` at quality 85, and record original size, compressed size, and encode time. This replaces my 40–70% guess in section 8.
3. Backend: add the `cloudinary` package and `CLOUDINARY_*` env vars on Render; add `POST /api/uploads/sign` (no body; always signs `full` and `thumb`), `POST /api/photos`, and `GET /api/photos` (cursor pagination, signs thumb and full URLs).
4. Mongo: photos collection with an index for cursor pagination (`createdAt`/`_id`).
5. Frontend: upload form with the compression toggle and live size readout; the forced-compression rules from section 2; worker-based encoder; photo grid with ThumbHash tiles; lightbox with thumb-first fade; persisted query cache.
6. Test one JPEG, one PNG with transparency, and one file over 9 MB end to end. In the Cloudinary dashboard, check storage used and **zero transformations**, and confirm the delivered file size matches the uploaded size.
7. Add the rate limit and storage cap on the sign endpoint.
8. Scrapbook: layout JSON model, size-based asset selection, CORS check before building export.

---

## Sources

- [Cloudinary billing and plans](https://cloudinary.com/documentation/billing_and_plans)
- [How transformations are counted](https://cloudinary.com/documentation/transformation_counts)
- [Control access to media](https://www.Cloudinary.com/documentation/control_access_to_media)
- [On-the-fly image manipulations secured with signed URLs](https://cloudinary.com/blog/on_the_fly_image_manipulations_secured_with_signed_urls)
- [Cloudinary support: free plan limits (10 MB, 25 MP)](https://support.cloudinary.com/hc/en-us/community/posts/4404675331218-Images-above-1mb-causing-an-error)
- [Cloudinary support: exact 10 MB limit in bytes](https://support.cloudinary.com/hc/en-us/community/posts/4414506299154-Uploading-GIFs-from-Zapier)
- [Safari canvas WebP encoding limitation](https://dev.to/harshit_katheria/ask-canvas-for-a-webp-in-safari-and-you-silently-get-a-png-5hn6)
- [@jsquash/webp (libwebp WASM)](https://www.npmjs.com/package/@jsquash/webp)
