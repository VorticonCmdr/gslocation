# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 browser extension (Chrome and Firefox builds from one source) that spoofs Google Search location by injecting the `x-geo` header (containing a UULE-encoded lat/lng) and `accept-language` header on requests to `google.com`. It also deletes the `UULE` cookie when disabling, since Google writes that cookie to persist location state.

There is no bundler, no runtime npm dependencies, and no test suite. All JS is plain browser JavaScript (using the `chrome.*` namespace, which Firefox also supports).

## Layout and build

- `src/` — extension source. `src/manifest.json` is the shared manifest; `src/manifest.chrome.json` / `src/manifest.firefox.json` are shallow-merged over it per target.
- `scripts/build.mjs` — copies `src/` to `dist/<target>/` and writes the merged manifest. `--zip` also writes `dist/gslocation-<target>-v<version>.zip`.
- `dist/` — generated, gitignored. Never edit files there.
- `templates/` — Handlebars template sources (not shipped).
- `src/fonts/` — bundled Inter woff2 (latin + latin-ext, OFL). Don't reintroduce remote font/CSS loads.

```sh
npm run build              # both targets
npm run build:chrome       # or build:firefox
npm run package            # build + zips (what the release workflow runs)
npm run lint:firefox       # web-ext lint via npx
npm run start:firefox      # launch Firefox with the add-on via web-ext
```

Chrome uses a service worker (`background.service_worker`); Firefox uses an event page (`background.scripts`) and needs `browser_specific_settings.gecko` (id `gslocation@valentin.app`, min version 140). Firefox (127+) grants MV3 host permissions at install, but users can revoke them in about:addons; as a fallback the background opens the options page on install if they're missing, and the options page shows a "Grant access" button while they are.

## Loading the extension for development

Run `npm run build`, then:
- Chrome: `chrome://extensions` → Developer mode → "Load unpacked" → `dist/chrome`.
- Firefox: `npm run start:firefox`, or `about:debugging` → "Load Temporary Add-on" → `dist/firefox/manifest.json`.

After editing anything in `src/`, rebuild and reload the extension.

## Handlebars templates

The `.handlebars` sources must be precompiled into `src/js/*.precompiled.js` after any template change:

```sh
npm run templates   # templates/knownplaces.handlebars -> src/js/knownplaces.precompiled.js
```

The `typeahead.precompiled.js` and `locations.precompiled.js` files have no sources in the repo — treat the `.precompiled.js` files as the source of truth for those.

## Architecture

**Storage schema** (`chrome.storage.sync`):
- `settings` — active location: `{ latitude, longitude, location, name, placeId, hl, gl, regions, enabled, timestamp }`
- `knownPlaces` — array of saved places (same fields as `settings`, minus `enabled`). It's a single sync item capped at 8 KB (~30 places): always write it via `saveKnownPlaces()` in `src/js/places.js`, which compacts, enforces `options.maxplaces`, drops the oldest by `timestamp` to fit, and reports errors.
- `options` — `{ consent, contextnumber, maxplaces }`

**Key mechanisms:**
- `src/js/background.js` (service worker): owns the `declarativeNetRequest` session rules. On startup or storage change it calls `checkEnabled()` which adds/removes rule ID 1 (x-geo + accept-language headers) and rule ID 2/3 if applicable. Also manages the right-click context menu showing the N most-recently-used places (`options.contextnumber`, default 3).
- `src/js/popup.js`: the popup UI. Uses [Bloodhound/Typeahead.js](https://github.com/twitter/typeahead.js) to autocomplete place names by querying `https://www.google.com/s?tbm=map&...`. Writes to `chrome.storage.sync` which triggers the background listener.
- `src/js/options.js`: the options page UI. Manages `knownPlaces` table (rendered via `knownplaces` Handlebars template) and the `options` object.
- `src/js/locations.precompiled.js`: precompiled Handlebars template for the regions/language typeahead dropdown (powered by the hardcoded `google_sites` array in `popup.js`).

**UULE encoding** (`genUULE()` in `background.js`): multiplies lat/lng by 1e7, embeds in a proto-text format, base64-encodes it, and prefixes with `"a "`. This is the value sent as the `x-geo` request header.
