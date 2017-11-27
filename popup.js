var geocodingapiKey = 'AIzaSyBbP9yILhpfIxC2NfmXXNqdVhcA8RAIEQs';
var geocodingapiUrl = 'https://maps.googleapis.com/maps/api/geocode/json?key='+geocodingapiKey+'&address=';

var placesapiKey = 'AIzaSyD7i2YsZwik9lzgxEVOlEJhQzASFBlq81w';
var placesapiUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?types=geocode&key='+placesapiKey+'&input=';

var latitude,
    longitude,
    loc,
    enabled,
    background;

function getLocation() {
  var place = $('#place').val();
  loc = place;
  background.settings.location = place;
  if (place == '') {
    return;
  }
  var uri = geocodingapiUrl+encodeURIComponent(place);
  $.ajax({
    url: uri
  })
  .done(function( data ) {
    deleteUULE();
    var lat = (data.results["0"].geometry.location.lat).toFixed(7);
    var lng = (data.results["0"].geometry.location.lng).toFixed(7);
    $('#latitude').val(lat);
    background.settings.latitude = lat;
    $('#longitude').val(lng);
    background.settings.longitude = lng;
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

function enabler() {
  if ($('#enabled').prop('checked')) {
    chrome.browserAction.setIcon({path:"enabled.png"});
  } else {
    chrome.browserAction.setIcon({path:"disabled.png"});
    deleteUULE();
  }
}

$(document).ready(function() {
  background = chrome.extension.getBackgroundPage();

  var options = {
    url: function(phrase) {
      return placesapiUrl+encodeURIComponent(phrase);
    },
    listLocation: "predictions",
    list: {
      onChooseEvent: function() {
        getLocation();
      } 
    },
    getValue: "description",
    requestDelay: 500
  };
  $("#place").easyAutocomplete(options);
  $("#enabled").change(enabler);
  $('#place').prop('placeholder', background.settings.location);

});

var loadHandler = function() {

  // assign elements to variables for future references
  latitude = document.querySelector('#latitude');
  longitude = document.querySelector('#longitude');
  enabled = document.querySelector('#enabled');
  background = chrome.extension.getBackgroundPage();

  // add a listener to each input and set the value from the background
  latitude.addEventListener("keyup", updateHandler, false);
  latitude.value = background.settings.latitude;

  longitude.addEventListener("keyup", updateHandler, false);
  longitude.value = background.settings.longitude;

  enabled.addEventListener("change", updateHandler, false);
  enabled.checked = background.settings.enabled;

};

var updateHandler = function(e)
{
  var settings = {
    'latitude': parseFloat(latitude.value),
    'longitude': parseFloat(longitude.value),
    'location': loc,
    'enabled': enabled.checked
  };

  // set the background settings
  background.settings.latitude = settings.latitude;
  background.settings.longitude = settings.longitude;
  background.settings.enabled = settings.enabled;

  // persist settings
  chrome.storage.sync.set(settings);
};

// init
document.addEventListener('DOMContentLoaded', loadHandler);