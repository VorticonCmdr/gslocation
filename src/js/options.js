const background = {
  options: {
      contextnumber: 3,
    maxplaces: 100,
    useGoogleEndpoint: false
  },
  settings: {
    'latitude': 37.422388,
    'longitude': -122.0841883,
    'location': "Google Building 40, Amphitheatre Parkway, Mountain View, CA, USA",
    'name': "Google Building 40",
    'placeId': "ChIJj38IfwK6j4ARNcyPDnEGa9g",
    'enabled': false,
    'hl': 'en',
    'gl': 'US',
    'regions': 'United States - English'
  },
  knownPlaces: [
    {
      'latitude': 37.422388,
      'longitude': -122.0841883,
      'location': "Google Building 40, Amphitheatre Parkway, Mountain View, CA, USA",
      'name': "Google Building 40",
      'placeId': "ChIJj38IfwK6j4ARNcyPDnEGa9g",
      'enabled': false,
      'hl': 'en',
      'gl': 'US',
      'regions': 'United States - English'
    }
  ]
};

function compareTimestamp(a, b) {
  if (!a.timestamp || !b.timestamp) {
    return 0;
  } else {
    return a.timestamp - b.timestamp;
  }
}

const knownPlacesTemplate = Handlebars.templates.knownplaces;
function getKnownPlaces() {
  chrome.storage.sync.get("knownPlaces", function(result) {
    if (result.knownPlaces) {
      result.knownPlaces.sort(compareTimestamp);
      document.getElementById('knownplaces').innerHTML = knownPlacesTemplate(result);
      $('.remove').on('click', function(event) {
        var placeid = $(event.target).data('placeid');
        var index = result.knownPlaces.findIndex(place => String(place.placeId) === String(placeid));
        if (index === -1) {
          return;
        }
        var removedPlace = result.knownPlaces.splice(index, 1);
        background.knownPlaces = result.knownPlaces;
        // Compare against the stored active settings, not the local defaults.
        // The background service worker updates the icon and header rules via
        // storage.onChanged when settings.enabled flips to false.
        chrome.storage.sync.get("settings", function(stored) {
          var extra = {};
          if (stored.settings && String(stored.settings.placeId) === String(removedPlace[0].placeId)) {
            Object.assign(background.settings, stored.settings);
            background.settings.enabled = false;
            background.settings.timestamp = new Date().getTime();
            extra.settings = background.settings;
          }
          saveKnownPlaces(background.knownPlaces, extra, function () {
            getKnownPlaces();
          });
        });
      });
    }
  });
}
getKnownPlaces();

function getOptions() {
  chrome.storage.sync.get("options", function(result) {
    if (Object.keys(result).length === 0) {
      result['options'] = background.options;
      chrome.storage.sync.set(result);
    }
    $('#input-contextnumber').val(result['options']['contextnumber']);
    $('#input-maxplaces').val(result['options']['maxplaces']);
    $('#checkbox-use-google').prop('checked', result['options']['useGoogleEndpoint'] || false);

    $('#checkbox-use-google').on('change', function() {
      result['options']['useGoogleEndpoint'] = $(this).prop('checked');
      chrome.storage.sync.set(result);
    });

    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === "sync" && changes.options && changes.options.newValue) {
        $('#checkbox-use-google').prop('checked', !!changes.options.newValue.useGoogleEndpoint);
      }
    });

    $('#button-contextnumber').on('click', function() {
      result['options']['contextnumber'] = parseInt($('#input-contextnumber').val()) || 3;
      chrome.storage.sync.set(result);
    });

    $('#button-maxplaces').on('click', function() {
      result['options']['maxplaces'] = parseInt($('#input-maxplaces').val()) || 100;
      chrome.storage.sync.set(result, function() {
        // Apply the new limit to the stored list right away.
        chrome.storage.sync.get('knownPlaces', function(stored) {
          if (stored.knownPlaces) {
            saveKnownPlaces(stored.knownPlaces, {}, function() {
              getKnownPlaces();
            });
          }
        });
      });
    });
  });
}
getOptions();

// Firefox lets users revoke host permissions in about:addons. If they're
// missing, offer a button to request them again (needs a user gesture).
// Normally they're granted at install and the alert stays hidden.
const requiredOrigins = { origins: chrome.runtime.getManifest().host_permissions || [] };
function updatePermissionAlert() {
  chrome.permissions.contains(requiredOrigins, (granted) => {
    $('#permission-alert').toggleClass('d-none', !!granted);
  });
}
$(function() {
  $('#button-grant-permissions').on('click', function() {
    chrome.permissions.request(requiredOrigins, () => updatePermissionAlert());
  });
  updatePermissionAlert();
});
