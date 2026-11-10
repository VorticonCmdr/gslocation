# gs location changer

**See Google Search results as if you were somewhere else.** Pick a place, flip the switch, and Google shows the results people there see. Made for local SEO checks, research and testing, without a VPN.

- Website: <https://www.decompile.tools/gslocation/>
- Install: [Chrome Web Store](https://chrome.google.com/webstore/detail/gs-location-changer/blpgcfdpnimjdojecbpagkllfnkajglp)
- Firefox: an experimental build can be made from source (not yet tested or listed on addons.mozilla.org)

## Features

- **Place search** with autocomplete from OpenStreetMap data ([Photon](https://photon.komoot.io/)), or optionally an unofficial Google Maps endpoint.
- **Exact coordinates**: type or paste `lat, lng`; values are validated before they are used.
- **Language and country**: about 390 Google region/language pairs, or let the country follow the selected place.
- **Favorites** that sync with your browser profile and appear in the right-click menu.
- **Right-click menu** to switch location or turn spoofing off.
- **Dark mode.**

## How it works

Google reads a location hint from the `x-geo` request header. While enabled, the extension adds that header (your chosen latitude/longitude) and an `accept-language` header to requests to `google.com`. Google's country sites redirect to google.com, so that is the only site covered.

Once a location is set, Google also writes a `UULE` cookie containing it. To really reset your location, the extension deletes that cookie whenever you switch it off.

It does not change your IP address and does not affect other websites.

## Privacy and permissions

- No analytics or tracking, and no server of its own.
- Place names you type in the popup are sent to `photon.komoot.io` (or to Google, if you select that source) to fetch suggestions.
- Settings and favorites are kept in the browser's sync storage. Favorites are limited by its 8 KB per-item quota (around 30 places); the oldest are dropped when it is full.
- Permissions: modify request headers on `google.com`; cookie access on `google.com` (used only to delete the `UULE` cookie); context menu; storage.

This project is not affiliated with or endorsed by Google.

## Contact

You can contact me on [LinkedIn](https://www.linkedin.com/in/valentinpletzer/), or open an [issue](https://github.com/VorticonCmdr/gslocation/issues).

## Development

The extension source lives in `src/`. Browser-specific builds are generated into `dist/` (not committed) by a dependency-free Node script:

```sh
npm run build            # dist/chrome and dist/firefox
npm run package          # also creates dist/gslocation-<browser>-v<version>.zip
```

- **Chrome:** `chrome://extensions` → Developer mode → "Load unpacked" → select `dist/chrome`.
- **Firefox (140+):** `npm run start:firefox`, or `about:debugging` → "This Firefox" → "Load Temporary Add-on" → `dist/firefox/manifest.json`. Firefox grants the Google site access at install; if a user later revokes it in about:addons, the options page shows a "Grant access" button.

`src/manifest.json` holds the shared manifest; `src/manifest.chrome.json` and `src/manifest.firefox.json` contain the per-browser overrides. Pushing a `v*` tag builds both zips and attaches them to a GitHub release.

The website is a single static page in `docs/index.html`, served by GitHub Pages.

## Changelog

### v4.0 - 2026-11-10
- New project layout: source in `src/`, per-browser builds in `dist/` via `npm run build`. A Firefox build is included (not yet tested in Firefox).
- Location spoofing is re-applied after a browser restart, and right-click menu actions no longer overwrite your settings with the defaults.
- Saved places stay within Chrome's sync storage limit (oldest are dropped, "places to remember" is enforced).
- Coordinates, language and country are validated and saved as you type; invalid values are highlighted instead of saved.
- Saving a favorite uses an inline form instead of browser dialogs.
- The UULE cookie is cleared whenever spoofing is turned off, including when removing the active place on the options page.
- System font instead of Google Fonts (no network request when opening the popup), unused code and the non-functional consent option removed; package is about 15% smaller.

### v3.9 - 2026-04-05
Thanks to [bhagyesh11698](https://github.com/bhagyesh11698) for a major contribution: UI redesign with dark mode support, smart coordinate paste (comma-separated lat/lng), favorites panel in the popup, GL auto-sync when selecting a location, fix of the coordinate validation bug in `isLatLng()`, and a `NOTES.md` with the release zip command.

### v3.8 - 2025-12-06
Thanks to [Aykut](https://github.com/aykete) The unofficial Google Maps endpoint gets reintroduced to the extension. Activate by selecting in the options menu.

### v3.7 - 2025-11-15
There was a change in the Google Maps autocomplete endpoint used by previous versions of this extension. In order to hopefully gain some more stability (instead of relying on an unofficial endpoint) I changed to https://photon.komoot.io/ as a service which is based on a free and open source database which is based on OpenStreetMap.
