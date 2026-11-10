const options = {
  contextnumber: 3,
  maxplaces: 100
};
const settings = {
  'latitude': 37.422388,
  'longitude': -122.0841883,
  'location': "Google Building 40, Amphitheatre Parkway, Mountain View, CA, USA",
  'name': "Google Building 40",
  'placeId': "ChIJj38IfwK6j4ARNcyPDnEGa9g",
  'enabled': false,
  'hl': 'en',
  'gl': 'US',
  'regions': 'United States - English'
};
const knownPlaces = [settings];

// Returns {lat, lng} in degrees, or null if the stored values aren't valid
// coordinates. 0 is a valid value (equator / prime meridian).
function validCoords() {
  var lat = parseFloat(settings.latitude);
  var lng = parseFloat(settings.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat: lat, lng: lng };
}

function genUULE(coords) {
  var lat = Math.round(coords.lat*1e7);
  var lng = Math.round(coords.lng*1e7);
  var decodedXgeo = 'role: CURRENT_LOCATION\nproducer: DEVICE_LOCATION\nradius: 65000\nlatlng <\n  latitude_e7: '+lat+'\n  longitude_e7: '+lng+'\n>';
  var encodedXgeo = 'a '+btoa(decodedXgeo);
  return encodedXgeo
}

function genAcceptLanguage() {
  // hl may already carry a region/script (pt-BR, es-419, sr-Latn); don't
  // append gl again (would give "pt-BR-BR").
  if (String(settings.hl).includes('-')) {
    return settings.hl;
  }
  return `${settings.hl}-${settings.gl}`;
}

function checkEnabled() {
  var coords = validCoords();
  if (settings.enabled && !coords) {
    // Don't send a made-up location; keep whatever rule is active.
    console.warn('Not updating location rule: invalid coordinates', settings.latitude, settings.longitude);
    return;
  }
  if (settings.enabled) {
    chrome.action.setIcon({path:"/img/enabled.png"});
    chrome.declarativeNetRequest.updateSessionRules(
      {
        removeRuleIds: [
          1,2,3
        ],
        addRules: [
          {
            "id": 1,
            "priority": 1,
            "action": {
              "type": "modifyHeaders",
              "requestHeaders": [
                {
                  "header": "x-geo",
                  "operation": "set",
                  "value": genUULE(coords)
                },
                {
                  "header": "accept-language",
                  "operation": "set",
                  "value": genAcceptLanguage()
                }
              ]
            },
            "condition": {
              "urlFilter": "google.com/",
              "resourceTypes": [
                "main_frame",
                "sub_frame",
                "image",
                "xmlhttprequest",
                "ping"
              ]
            }
          }
        ]},() => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
          }
        }
    );
  } else {
    chrome.action.setIcon({path:"/img/disabled.png"});
    chrome.declarativeNetRequest.updateSessionRules(
      {
        removeRuleIds: [1]
      },
      () => {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError.message);
        }
      }
    );
  }
}

// Fallback: if host permissions are missing (e.g. revoked in Firefox),
// open the options page, which offers a button to request them.
chrome.runtime.onInstalled.addListener(() => {
  const origins = chrome.runtime.getManifest().host_permissions || [];
  chrome.permissions.contains({ origins }, (granted) => {
    if (!granted) {
      chrome.runtime.openOptionsPage();
    }
  });
});

// Session rules and the action icon reset when the browser restarts, and an
// MV3 service worker only starts for events it listens to. This (empty)
// listener makes the browser start the worker at startup, which runs the
// hydration at the bottom of this file and re-applies the rule.
chrome.runtime.onStartup.addListener(() => {});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') {
    return;
  }
  await ready;
  if (changes.settings) {
    Object.assign(settings, changes.settings.newValue);
    // Clear Google's persisted location on any enabled -> disabled transition,
    // regardless of which UI (popup, options page, context menu) caused it.
    if (changes.settings.oldValue?.enabled && !changes.settings.newValue?.enabled) {
      deleteUULE();
    }
    checkEnabled();
    setupContextMenu(knownPlaces);
  }
  if (changes.options) {
    Object.assign(options, changes.options.newValue);
  }
  if (changes.knownPlaces) {
    // Replace contents (not Object.assign) so removed places don't linger at the tail.
    knownPlaces.splice(0, knownPlaces.length, ...(changes.knownPlaces.newValue || []));
    setupContextMenu(knownPlaces);
  }
});

var parent = chrome.contextMenus.create({
  "title": "change location",
  "id": "window"
}, () => chrome.runtime.lastError);
chrome.contextMenus.create({
  "title": "🚫 disable fake location",
  "id": "disable",
  "parentId": parent
}, () => chrome.runtime.lastError);

// Registered once, synchronously, at top level so Chrome reliably redelivers
// clicks after the service worker is evicted and woken back up.
chrome.contextMenus.onClicked.addListener(genericOnClick);

function compareTimestamp(a, b) {
  if (!a.timestamp || !b.timestamp) {
    return 0;
  } else {
    return a.timestamp - b.timestamp;
  }
}
function setupContextMenu(allPlaces) {
  var contextPlaces = allPlaces.sort(compareTimestamp).slice(Math.max(allPlaces.length - options.contextnumber, 0));
  chrome.contextMenus.removeAll(function() {
    parent = chrome.contextMenus.create({"title": "change location", "id": "window"}, () => chrome.runtime.lastError);
    chrome.contextMenus.create({"title": "🚫 disable fake location", "id": "disable","parentId": parent}, () => chrome.runtime.lastError);
    chrome.contextMenus.create({"type": "separator", "id": "s1", "parentId": parent}, () => chrome.runtime.lastError);
    if (settings.enabled && settings.location) {
      chrome.contextMenus.create({"title": "📍"+settings.location, "id": String(settings.placeId), "parentId": parent}, () => chrome.runtime.lastError);
      chrome.contextMenus.create({"type": "separator", "id": "s2", "parentId": parent}, () => chrome.runtime.lastError);
    } else {
      if (settings.location) {
        chrome.contextMenus.create({"title": settings.location, "id": String(settings.placeId), "parentId": parent}, () => chrome.runtime.lastError);
      }
    }
    contextPlaces.forEach(function (item) {
      if (!item.placeId) {
        return;
      }
      if (!item.location) {
        return;
      }
      if (item.placeId != settings.placeId) {
        chrome.contextMenus.create({"title": item.location, "id": String(item.placeId), "parentId": parent}, () => chrome.runtime.lastError);
      }
    });
  });
}

function deleteUULE() {
  chrome.cookies.getAll({'name':'UULE'}, function(cookies) {
    for (const cookie of cookies) {
      var domain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
      var url = 'https://'+domain+cookie.path;
      chrome.cookies.remove({'name':'UULE', 'url': url}, function(details) {
        console.log(details);
      });
    }
  });
}

async function genericOnClick(info, tab) {
  // After a worker restart, wait for stored settings; otherwise this would
  // save the built-in defaults over the user's settings.
  await ready;
  if (info.menuItemId == 'disable') {
    settings.enabled = false;
    deleteUULE();
  } else {
    var data = knownPlaces.find(place => place.placeId == info.menuItemId);
    if (data && data.placeId) {
      Object.assign(settings, data);
      settings.enabled = true;
    }
  }
  settings.timestamp = new Date().getTime();
  chrome.storage.sync.set({settings: settings});
}

// Hydrate in-memory state from storage on every service worker start (install,
// browser startup, or wake from idle) rather than only on chrome.runtime.onStartup,
// which does not fire for the far more frequent MV3 service-worker respawns.
// Listeners above await `ready` so they never act on the built-in defaults.
const ready = new Promise((resolve) => {
  chrome.storage.sync.get(null, (data) => {
    if (data.settings) {
      Object.assign(settings, data.settings);
    }
    if (data.options) {
      Object.assign(options, data.options);
    }
    if (data.knownPlaces) {
      knownPlaces.splice(0, knownPlaces.length, ...data.knownPlaces);
    }
    checkEnabled();
    setupContextMenu(knownPlaces);
    resolve();
  });
});
