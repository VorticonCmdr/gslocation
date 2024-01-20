const options = {
  consent: '',
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

chrome.runtime.onStartup.addListener(function() {
  chrome.storage.sync.get(null, (data) => {
    if (data.settings) {
      Object.assign(settings, data.settings);
      checkEnabled();
    }
    if (data.options) {
      Object.assign(options, data.options);
    }
    if (data.knownPlaces) {
      Object.assign(knownPlaces, data.knownPlaces);
      setupContextMenu(knownPlaces);
    }
  });
});

function genUULE() {
  var lat = Math.floor(settings.latitude*1e7) || 525109360;
  var lng = Math.floor(settings.longitude*1e7) || 134104990;
  var decodedXgeo = 'role: CURRENT_LOCATION\nproducer: DEVICE_LOCATION\nradius: 65000\nlatlng <\n  latitude_e7: '+lat+'\n  longitude_e7: '+lng+'\n>';
  var encodedXgeo = 'a '+btoa(decodedXgeo);
  return encodedXgeo
}

function genAcceptLanguage() {
  return `${settings.hl}-${settings.gl}`;
}

function checkEnabled() {
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
                  "value": genUULE()
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
      () => { console.log('removed'); }
    );
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') {
    return;
  }
  if (changes.settings) {
    Object.assign(settings, changes.settings.newValue);
    checkEnabled();
    setupContextMenu(knownPlaces);
  }
  if (changes.options) {
    Object.assign(options, changes.options.newValue);
  }
  if (changes.knownPlaces) {
    Object.assign(knownPlaces, changes.knownPlaces.newValue);
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
  //,"onclick": genericOnClick
}, () => chrome.runtime.lastError);

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
      chrome.contextMenus.create({"title": "📍"+settings.location, "id": settings.placeId, "parentId": parent}, () => chrome.runtime.lastError);
      chrome.contextMenus.create({"type": "separator", "id": "s2", "parentId": parent}, () => chrome.runtime.lastError);
    } else {
      if (settings.location) {
        chrome.contextMenus.create({"title": settings.location, "id": settings.placeId, "parentId": parent}, () => chrome.runtime.lastError);
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
        chrome.contextMenus.create({"title": item.location, "id": item.placeId, "parentId": parent}, () => chrome.runtime.lastError);
      }
    });
    chrome.contextMenus.onClicked.addListener(genericOnClick);
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
