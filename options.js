var background = chrome.extension.getBackgroundPage();

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
        var index = result.knownPlaces.findIndex(place => place.placeId === placeid);
        var removedPlace = result.knownPlaces.splice(index, 1);
        if (background.settings.placeId == removedPlace[0].placeId) {
          background.settings.enabled = false;
          chrome.browserAction.setIcon({path:"disabled.png"});
        }
        background.knownPlaces = result.knownPlaces;
        background.settings.timestamp = new Date().getTime();
        chrome.storage.sync.set({settings: background.settings}, function () {
          getKnownPlaces();
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
    $('#input-consent').val(result['options']['consent']);

    $('#button-contextnumber').on('click', function() {
      result['options']['contextnumber'] = parseInt($('#input-contextnumber').val()) || 3;
      chrome.storage.sync.set(result);
    });

    $('#button-maxplaces').on('click', function() {
      result['options']['maxplaces'] = parseInt($('#input-maxplaces').val()) || 100;
      chrome.storage.sync.set(result);
    });

    $('#button-consent').on('click', function() {
      result['options']['consent'] = $('#input-consent').val() || '';
      chrome.storage.sync.set(result);
      background.options.consent = result['options']['consent'];
    });
  });
}
getOptions();
