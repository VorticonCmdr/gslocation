// Shared helper for writing the knownPlaces list to chrome.storage.sync.
//
// storage.sync limits each item to 8 KB (QUOTA_BYTES_PER_ITEM). knownPlaces is
// a single item, so writes beyond that fail. saveKnownPlaces() stores only the
// place fields (dropping e.g. `enabled`), enforces options.maxplaces, and drops the oldest
// places (by timestamp) until the list fits.

const PLACE_FIELDS = ['latitude', 'longitude', 'location', 'name', 'placeId', 'hl', 'gl', 'regions', 'timestamp'];
const SYNC_ITEM_LIMIT = (chrome.storage.sync && chrome.storage.sync.QUOTA_BYTES_PER_ITEM) || 8192;
const DEFAULT_MAX_PLACES = 100;

function compactPlace(place) {
  const out = {};
  for (const key of PLACE_FIELDS) {
    if (place[key] !== undefined && place[key] !== null) {
      out[key] = place[key];
    }
  }
  return out;
}

// Chrome counts key length + JSON length of the value.
function syncItemBytes(key, value) {
  return new TextEncoder().encode(key + JSON.stringify(value)).length;
}

function dropOldest(places) {
  let oldest = 0;
  for (let i = 1; i < places.length; i++) {
    if ((places[i].timestamp || 0) < (places[oldest].timestamp || 0)) {
      oldest = i;
    }
  }
  places.splice(oldest, 1);
}

/**
 * Save places (array order is kept). Calls callback(result) with
 * { places, dropped, error } where places is what was stored, dropped is the
 * number of places removed to fit, and error is a message or null.
 * `extra` holds other keys to write in the same set() call (e.g. settings).
 */
function saveKnownPlaces(places, extra, callback) {
  chrome.storage.sync.get('options', (result) => {
    const max = parseInt(result.options && result.options.maxplaces, 10);
    const limit = max > 0 ? max : DEFAULT_MAX_PLACES;

    const compacted = places.map(compactPlace);
    const before = compacted.length;
    while (compacted.length > limit) {
      dropOldest(compacted);
    }
    while (compacted.length && syncItemBytes('knownPlaces', compacted) > SYNC_ITEM_LIMIT) {
      dropOldest(compacted);
    }
    const dropped = before - compacted.length;

    chrome.storage.sync.set(Object.assign({}, extra, { knownPlaces: compacted }), () => {
      const error = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
      if (error) {
        console.error('Saving places failed:', error);
      }
      if (callback) {
        callback({ places: compacted, dropped, error });
      }
    });
  });
}
