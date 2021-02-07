var settings = {
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

var options = {
  contextnumber: 3,
  maxplaces: 100,
  consent: 'YES+US.en+V14+BX; '
};

var knownPlaces = [
  settings
];

var parent = chrome.contextMenus.create({"title": "change location", "id": "window"});
chrome.contextMenus.create({"title": "🚫 disable fake location", "id": "disable","parentId": parent, "onclick": genericOnClick});

chrome.storage.sync.get(null, function(result) {
  if (result.options) {
    options = result.options;
  }

  if (result.settings) {
    settings = result.settings;
    if (settings.enabled) {
      chrome.browserAction.setIcon({path:"enabled.png"});
    } else {
      chrome.browserAction.setIcon({path:"disabled.png"});
    }
  }

  if (result.knownPlaces) {
    knownPlaces = result.knownPlaces;
    setupContextMenu(result.knownPlaces);
  }
});

var requestFilter = {urls: ["https://www.google.com/*", "https://maps.google.com/*"]}
var onBeforeSendHeadersHandler = function(details) {
  if (!settings.enabled) {
    return {};
  }
  var lat = Math.floor(settings.latitude*1e7) || 525109360;
  var lng = Math.floor(settings.longitude*1e7) || 134104990;
  var decodedXgeo = 'role: CURRENT_LOCATION\nproducer: DEVICE_LOCATION\nradius: 65000\nlatlng <\n  latitude_e7: '+lat+'\n  longitude_e7: '+lng+'\n>';
  var encodedXgeo = 'a '+btoa(decodedXgeo);
  var xgeoHeader = {
    name: "x-geo",
    value: encodedXgeo
  };
  details.requestHeaders.push(xgeoHeader);

  if (settings.hl && settings.gl) {
    var i = details.requestHeaders.length;
    while (i--) {
      if (details.requestHeaders[i].name === 'Accept-Language') {
        details.requestHeaders.push({
          name: "Accept-Language",
          value: settings.hl+'-'+settings.gl
        });
      }
    }
  }


  if (document.cookie == "" && options.consent) {
    var consentCookieHeader = {
      name: 'cookie',
      value: 'CONSENT='+options.consent
    };
    details.requestHeaders.push(consentCookieHeader);
  }

  return {requestHeaders: details.requestHeaders};
};

chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersHandler, requestFilter, ["blocking", "requestHeaders", "extraHeaders"]);

function placeExists(data) {
  return knownPlaces.findIndex(place => place.placeId === data.placeId);
}

function addKnownPlace(data) {
  if (placeExists(data) === -1) {
    var l = knownPlaces.push(data);
    if (l > options.maxplaces) {
      knownPlaces = knownPlaces.slice(l-options.maxplaces);
    }
  }
  chrome.storage.sync.set({knownPlaces: knownPlaces});
  setupContextMenu(knownPlaces);
}

chrome.storage.onChanged.addListener(function(changes,area) {
  if (changes.settings && changes.settings.newValue) {
    addKnownPlace(changes.settings.newValue);
  }
});

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
    parent = chrome.contextMenus.create({"title": "change location", "id": "window"});
    chrome.contextMenus.create({"title": "🚫 disable fake location", "id": "disable","parentId": parent, "onclick": genericOnClick});
    chrome.contextMenus.create({"type": "separator","parentId": parent});
    if (settings.enabled && settings.location) {
      chrome.contextMenus.create({"title": "📍"+settings.location, "id": settings.placeId,"parentId": parent, "onclick": genericOnClick});
      chrome.contextMenus.create({"type": "separator","parentId": parent});
    } else {
      if (settings.location) {
        chrome.contextMenus.create({"title": settings.location, "id": settings.placeId,"parentId": parent, "onclick": genericOnClick});
      }
    }
    contextPlaces.forEach(function (item) {
      if (item.placeId && settings.placeId && (item.placeId != settings.placeId) && item.location) {
        chrome.contextMenus.create({"title": item.location, "id": item.placeId,"parentId": parent, "onclick": genericOnClick});
      }
    });
  });
}

function deleteUULE() {
  chrome.cookies.getAll({'name':'UULE'}, function(cookies) {
    for (c in cookies) {
      var cookie = cookies[c];
      var url = 'https://'+cookie.domain+cookie.path;
      chrome.cookies.remove({'name':'UULE', 'url': url}, function(details) {
        console.log(details);
      });
    }
  });
}

function genericOnClick(info, tab) {
  if (info.menuItemId == 'disable') {
    chrome.browserAction.setIcon({path:"disabled.png"});
    settings.enabled = false;
    deleteUULE();
  } else {
    var data = knownPlaces.find(place => place.placeId == info.menuItemId);
    if (data && data.placeId) {
      chrome.browserAction.setIcon({path:"enabled.png"});
      settings = data;
      settings.enabled = true;
    }
  }
  settings.timestamp = new Date().getTime();
  chrome.storage.sync.set({settings: settings});
}

chrome.runtime.onInstalled.addListener(function(details){
  var thisVersion = chrome.runtime.getManifest().version;
  if (details.reason == "update" && (thisVersion != details.previousVersion)) {
    settings = {
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
    knownPlaces = [settings];
    settings.timestamp = new Date().getTime();
    chrome.storage.sync.set({settings: settings});
  }
});
