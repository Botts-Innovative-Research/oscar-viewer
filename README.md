# OSCAR Viewer

OSCAR Viewer is Web App for OpenSensorHub enabling interaction and visualization with sensors and observations 
served by OpenSensorHub server instances.

## Development

Use Node.js 22.12 or newer on an even-numbered release line (22, 24, or 26+). The release and test toolchain does not support odd-numbered Node.js releases.

```sh
npm ci
npm run audit:dependencies
npm run lint
npm run test:component
npm run build
```

The production static export continues to use Next.js Webpack mode because the pinned `osh-js` source package still loads web workers through `worker-loader`. Cypress component tests use Vite and Chrome. The `osh-js` dependency is pinned directly to the immutable upstream commit and lockfile integrity hash from [osh-js PR #6](https://github.com/earocorn/osh-js/pull/6), so clean installs reproduce the reviewed MQTT MessagePort implementation without depending on a personal packaging fork. OSCAR imports only `osh-js/source/core/...`; the larger upstream source archive affects install size, not the static production output.

## Retained alarm media

Event Details uses the occupancy observation UUID as the public media identity. Before requesting a legacy MP4, the Viewer makes an authenticated request to:

```text
{sensorhub bucket endpoint}/videos/media/{event UUID}
```

A `200` response must use retained-media schema version 1 and contain exactly five independently decodable JPEGs per camera: first, 25%, middle, 75%, and last. The Viewer validates the event identity, schema, frame positions, distinct source-frame ordinals, sizes, dimensions, content types, and event-scoped asset paths before displaying anything. It accepts at most a 1 MiB catalog, eight camera sets, 12 MiB and 20 megapixels per frame, and 64 MiB and 120 megapixels of declared media per event; either frame dimension is limited to 6,000 pixels. Catalog and image response bodies are read through hard streaming byte limits, so a missing or dishonest `Content-Length` cannot make the browser buffer an unbounded response before validation.

Camera UIDs, source-frame ordinals, and source video timestamps remain visible in the gallery. The Viewer initially downloads only the selected frame for each camera, schedules at most three frame requests across the event, and downloads another frame when the operator selects it. Successfully loaded frame object URLs are reused until the event or page changes. Individual missing or undecodable images fail independently, so the other evidence stays usable.

A `404` means that the event predates retained media, so the existing `videoPaths` MP4 player is used. Authentication, server, timeout, and malformed-response failures display a warning before offering that same fallback; they are not silently treated as legacy data. Catalog and image requests have a 10-second deadline. During the backend rollback-grace period, the retained gallery is shown first and the still-available source MP4 remains available beneath it. The catalog request bypasses browser caching, while private JPEG responses may use the backend's short cache lifetime. Authenticated JPEGs are held only in memory and their object URLs are revoked when the event or page changes.

Run the focused contract and rendering tests with:

```sh
npm run test:retained-media
```
