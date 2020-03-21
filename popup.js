var latitude,
    longitude,
    place,
    enabled,
    autocomplete,
    hl = 'en',
    gl = 'US',
    html = '',
    key = 'AIzaSyBbP9yILhpfIxC2NfmXXNqdVhcA8RAIEQs';

var background = chrome.extension.getBackgroundPage();
chrome.storage.sync.get("settings", function(result) {
  if (result.latitude) {
    background.settings.latitude = result.latitude;
  }
  if (result.longitude) {
    background.settings.longitude = result.longitude;
  }
  if (result.location) {
    background.settings.location = result.location;
  }
  if (result.enabled) {
    background.settings.enabled = result.enabled;
  }
});

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

function enabler() {
  if ($('#enabled').prop('checked')) {
    chrome.browserAction.setIcon({path:"enabled.png"});
    background.settings.enabled = true;
  } else {
    chrome.browserAction.setIcon({path:"disabled.png"});
    deleteUULE();
    background.settings.enabled = false;
  }
}

function initAC() {
  console.log('initialized');
  autocomplete = new google.maps.places.Autocomplete(
      (document.getElementById('place')),
      {types: ['geocode']});

  autocomplete.setFields(['place_id', 'name', 'types', 'geometry']);
  autocomplete.addListener('place_changed', fillInAddress);

}

function fillInAddress() {
  var place_id;
  try {
    var keys = Object.keys(autocomplete.gm_accessors_.place);
    var l = keys.length;
    while (l--) {
      if (autocomplete.gm_accessors_.place[keys[l]].place && autocomplete.gm_accessors_.place[keys[l]].place.place_id) {
        place_id = autocomplete.gm_accessors_.place[keys[l]].place.place_id;
      }
    }
    if (!place_id) {
      console.error('no place_id')
    }
    // try fetching data from private server first to save money
    fetch('https://valentin.app/location?placeId='+place_id)
      .then(function (response) {
        return response.json()
      })
      .then(function (data) {
        updateLatLng(data);
      })
      .catch(function (error) {
        console.log('Request failed', error);
        var place = autocomplete.getPlace();
        var lat = place.geometry.location.lat();
        var lng = place.geometry.location.lng();
        try {
          var data = {
            lat: lat,
            lng: lng,
            placeId: place['place_id'],
            name: place['name'],
            place: $('#place').val()
          };
          updateLatLng(data);
          var url = 'https://valentin.app/location'
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          })
          .catch(function (error) {
            console.error('Error:', error);
          })
          .then(function (response) {
              console.log('Success:', response.text());
          });
        } catch (e) {
          console.error(e);
        }
      });
  } catch (e) {}

}
function updateLatLng(data) {
  $('#latitude').val(data.lat);
  background.settings.latitude = data.lat;
  $('#longitude').val(data.lng);
  background.settings.longitude = data.lng;
  background.settings.location = data.id;
  updateHandler(false);
}

function loadAPI(hl, gl) {
  //Destroy old API
  try {
    document.querySelectorAll('script[src^="https://maps.googleapis.com"]').forEach(function (script) {
      script.remove();
    });
    if (google) {
      delete google.maps;
    }
  } catch (e) {}

  //Load new API
  var mapsApi = document.createElement('script');
  mapsApi.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&key='+key+'&callback=initAC';
  mapsApi.setAttribute('async', '');
  mapsApi.setAttribute('defer', '');
  document.head.appendChild(mapsApi);
}

var loadHandler = function() {

  $('#place').prop('placeholder', background.settings.location);
  $('#latitude').prop('placeholder', background.settings.latitude);
  $('#longitude').prop('placeholder', background.settings.longitude);
  $("#enabled").change(enabler);

  // assign elements to variables for future references
  place = document.querySelector('#place');
  latitude = document.querySelector('#latitude');
  longitude = document.querySelector('#longitude');
  enabled = document.querySelector('#enabled');

  enabled.checked = background.settings.enabled;

  loadAPI(hl,gl);
};

var updateHandler = function(e) {
  var settings = {
    'latitude': parseFloat(latitude.value),
    'longitude': parseFloat(longitude.value),
    'location': place.value,
    'enabled': enabled.checked
  };

  // set the background settings
  background.settings = settings;

  // persist settings
  chrome.storage.sync.set(settings);
};

// init
document.addEventListener('DOMContentLoaded', loadHandler);
