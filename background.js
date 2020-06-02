var settings = {
  'latitude': 37.422388,
  'longitude': -122.0841883,
  'location': "Google Building 40, Amphitheatre Parkway, Mountain View, CA, USA",
  'enabled': false,
  'hl': 'en',
  'gl': 'US'
};
chrome.storage.sync.get("settings", function(result) {
  if(result.latitude) settings.latitude = result.latitude;
  if(result.longitude) settings.longitude = result.longitude;
  if(result.location) settings.location = result.location;
  if(result.enabled) settings.enabled = result.enabled;
});

var requestFilter = {urls: ["https://www.google.com/*"]}
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

  var i = details.requestHeaders.length;
  while (i--) {
    if (details.requestHeaders[i].name === 'Accept-Language') {
      details.requestHeaders.push({
        name: "Accept-Language",
        value: "en-US"
      });
    }
  }

  return {requestHeaders: details.requestHeaders};
};

chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersHandler, requestFilter, ["blocking", "requestHeaders", "extraHeaders"]);
