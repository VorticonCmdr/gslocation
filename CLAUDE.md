# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome Manifest V3 extension that spoofs Google Search location by injecting the `x-geo` header (containing a UULE-encoded lat/lng) and `accept-language` header on requests to `google.com`. It also deletes the `UULE` cookie when disabling, since Google writes that cookie to persist location state.

There is no build system, package manager, or test suite. All JS is plain browser JavaScript loaded directly by the extension.

## Loading the extension for development

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

After editing any JS file, click the refresh icon on the extension card in `chrome://extensions`.

## Handlebars templates

The `.handlebars` source files must be precompiled into `js/*.precompiled.js` files after any template change. Install the Handlebars CLI and run:

```sh
handlebars knownplaces.handlebars -f js/knownplaces.precompiled.js
```

The `typeahead.precompiled.js` and `locations.precompiled.js` files are similarly precompiled from their respective source templates (not currently present in the repo — treat the `.precompiled.js` files as the source of truth if the `.handlebars` sources are missing).

## Architecture

**Storage schema** (`chrome.storage.sync`):
- `settings` — active location: `{ latitude, longitude, location, name, placeId, hl, gl, regions, enabled, timestamp }`
- `knownPlaces` — array of saved places (same shape as `settings`)
- `options` — `{ consent, contextnumber, maxplaces }`

**Key mechanisms:**
- `js/background.js` (service worker): owns the `declarativeNetRequest` session rules. On startup or storage change it calls `checkEnabled()` which adds/removes rule ID 1 (x-geo + accept-language headers) and rule ID 2/3 if applicable. Also manages the right-click context menu showing the N most-recently-used places (`options.contextnumber`, default 3).
- `js/popup.js`: the popup UI. Uses [Bloodhound/Typeahead.js](https://github.com/twitter/typeahead.js) to autocomplete place names by querying `https://www.google.com/s?tbm=map&...`. Writes to `chrome.storage.sync` which triggers the background listener.
- `js/options.js`: the options page UI. Manages `knownPlaces` table (rendered via `knownplaces` Handlebars template) and the `options` object.
- `js/locations.precompiled.js`: precompiled Handlebars template for the regions/language typeahead dropdown (powered by the hardcoded `google_sites` array in `popup.js`).

**UULE encoding** (`genUULE()` in `background.js`): multiplies lat/lng by 1e7, embeds in a proto-text format, base64-encodes it, and prefixes with `"a "`. This is the value sent as the `x-geo` request header.
