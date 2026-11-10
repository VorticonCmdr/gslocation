# gs location changer

This is the code repository for the Chrome extension [gs location changer](https://chrome.google.com/webstore/detail/gs-location-changer/blpgcfdpnimjdojecbpagkllfnkajglp). With the help of this extension you can change your location within Google Search by setting the x-geo http header.

Once you set a location Google will write a cookie UULE which also contains the location which is set via the x-geo http header. Therefor to clear the location this extension also will delete the UULE cookie in order to reset all changes made.

You can contact me on [LinkedIn](https://www.linkedin.com/in/valentinpletzer/)

## Development

The extension source lives in `src/`. Browser-specific builds are generated into `dist/` (not committed) by a dependency-free Node script:

```sh
npm run build            # dist/chrome and dist/firefox
npm run package          # also creates dist/gslocation-<browser>-v<version>.zip
```

- **Chrome:** `chrome://extensions` → Developer mode → "Load unpacked" → select `dist/chrome`.
- **Firefox (140+):** `npm run start:firefox`, or `about:debugging` → "This Firefox" → "Load Temporary Add-on" → `dist/firefox/manifest.json`. Firefox grants the Google site access at install; if a user later revokes it in about:addons, the options page shows a "Grant access" button.

`src/manifest.json` holds the shared manifest; `src/manifest.chrome.json` and `src/manifest.firefox.json` contain the per-browser overrides. Pushing a `v*` tag builds both zips and attaches them to a GitHub release.

## v4.0 - 2026-11-10
- New project layout: source in `src/`, per-browser builds in `dist/` via `npm run build`. A Firefox build is included (not yet tested in Firefox).
- Location spoofing is re-applied after a browser restart, and right-click menu actions no longer overwrite your settings with the defaults.
- Saved places stay within Chrome's sync storage limit (oldest are dropped, "places to remember" is enforced).
- Coordinates, language and country are validated and saved as you type; invalid values are highlighted instead of saved.
- Saving a favorite uses an inline form instead of browser dialogs.
- The UULE cookie is cleared whenever spoofing is turned off, including when removing the active place on the options page.
- System font instead of Google Fonts (no network request when opening the popup), unused code and the non-functional consent option removed; package is about 15% smaller.

## v3.9 - 2026-04-05
Thanks to [bhagyesh11698](https://github.com/bhagyesh11698) for a major contribution: UI redesign with dark mode support, smart coordinate paste (comma-separated lat/lng), favorites panel in the popup, GL auto-sync when selecting a location, fix of the coordinate validation bug in `isLatLng()`, and a `NOTES.md` with the release zip command.

## v3.8 - 2025-12-06
Thanks to [Aykut](https://github.com/aykete) The unofficial Google Maps endpoint gets reintroduced to the extension. Activate by selecting in the options menu.

## v3.7 - 2025-11-15
There was a change in the Google Maps autocomplete endpoint used by previous versions of this extension. In order to hopefully gain some more stability (instead of relying on an unofficial endpoint) I changed to https://photon.komoot.io/ as a service which is based on a free and open source database which is based on OpenStreetMap.
