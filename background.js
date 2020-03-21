var settings = {
  'latitude': 52.510936,
  'longitude': 13.410499,
  'location': "Munich",
  'enabled': false
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

  return {requestHeaders: details.requestHeaders};
};

chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersHandler, requestFilter, ["blocking", "requestHeaders"]);
