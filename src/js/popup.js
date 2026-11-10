const background = {
  settings: {
    latitude: 37.422388,
    longitude: -122.0841883,
    location:
      "Google Building 40, Amphitheatre Parkway, Mountain View, CA, USA",
    name: "Google Building 40",
    placeId: "ChIJj38IfwK6j4ARNcyPDnEGa9g",
    enabled: false,
    hl: "en",
    gl: "US",
    regions: "United States - English",
  },
  knownPlaces: [
    {
      latitude: 37.422388,
      longitude: -122.0841883,
      location:
        "Google Building 40, Amphitheatre Parkway, Mountain View, CA, USA",
      name: "Google Building 40",
      placeId: "ChIJj38IfwK6j4ARNcyPDnEGa9g",
      enabled: false,
      hl: "en",
      gl: "US",
      regions: "United States - English",
    },
  ],
};
chrome.storage.sync.get(null, (data) => {
  if (data.settings) {
    Object.assign(background.settings, data.settings);
  }
  if (data.knownPlaces && data.knownPlaces.length > 0) {
    Object.assign(background.knownPlaces, data.knownPlaces);
  }
  
  // Load and apply theme
  if (data.theme === 'dark') {
    $('body').addClass('dark-mode');
  }

  checkEnabled();
  loadHandler();
});

function checkEnabled() {
  if (background.settings.enabled) {
    $("#enableText").text("ACTIVE").css("color", "var(--success-color)");
    $("#enabled").prop("checked", true);
  } else {
    $("#enableText").text("OFF").css("color", "var(--text-muted)");
    $("#enabled").prop("checked", false);
  }
}

let acEngine;

const GOOGLE_PB_TEMPLATE = "%212i5%214m12%211m3%211d10427.76566217746%212d__LNG__%213d__LAT__%212m3%211f0%212f0%213f0%213m2%211i1066%212i665%214f13.1%217i20%2110b1%2112m25%211m5%2118b1%2130b1%2131m1%211b1%2134e1%212m4%215m1%216e2%2120e3%2139b1%2110b1%2112b1%2113b1%2116b1%2117m1%213e1%2120m3%215e2%216b1%2114b1%2146m1%211b0%2196b1%2199b1";

function googleBiasCenter() {
  var lat = parseFloat(background.settings.latitude);
  var lng = parseFloat(background.settings.longitude);
  if (!isFinite(lat) || lat < -90 || lat > 90) lat = 41.0094287;
  if (!isFinite(lng) || lng < -180 || lng > 180) lng = 28.684810849999998;
  return { lat: lat, lng: lng };
}

function buildGoogleSuggestUrl(query) {
  var c = googleBiasCenter();
  var pb = GOOGLE_PB_TEMPLATE.replace("__LNG__", String(c.lng)).replace("__LAT__", String(c.lat));
  var q = (query === "%QUERY") ? "%QUERY" : encodeURIComponent(query);
  return "https://www.google.com/s?tbm=map&gs_ri=maps&suggest=p&authuser=0&hl=" +
    background.settings.hl + "&gl=" + background.settings.gl +
    "&q=" + q + "&ech=5&pb=" + pb;
}

function parseGoogleSuggestText(data) {
  var places = [];
  var lines = String(data || "").split("\n");
  var jsonLine = null;
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.charAt(0) === "[") { jsonLine = t; break; }
  }
  if (!jsonLine) return places;

  var suggests = null;
  try {
    var result = JSON.parse(jsonLine);
    suggests = result && result[0] && result[0][1];
  } catch (e) {
    return places;
  }
  if (!suggests || !suggests.length) return places;

  return suggests
    .filter(function (item) {
      var inner = item && item[22];
      if (!inner || inner[37] === 2 || !inner[11]) return false;
      var lat = parseFloat(inner[11] && inner[11][2]);
      var lng = parseFloat(inner[11] && inner[11][3]);
      return inner[14] && inner[14][0] && isFinite(lat) && isFinite(lng);
    })
    .map(function (location) {
      return {
        latitude: parseFloat(location[22][11][2]),
        longitude: parseFloat(location[22][11][3]),
        location: location[22][14][0],
        name: location[22][14][0],
        placeId: location[22][0] && location[22][0][27]
      };
    });
}

function initEngine() {
  chrome.storage.sync.get("options", function (result) {
    const useGoogle = result?.options?.useGoogleEndpoint || false;

    if (acEngine) {
      acEngine.clearRemoteCache();
      acEngine.clear();
    }

    let remoteConfig;

    if (useGoogle) {
      remoteConfig = {
        wildcard: "%QUERY",
        url: buildGoogleSuggestUrl("%QUERY"),
        rateLimitWait: 200,
        transform: function (data) {
          return parseGoogleSuggestText(data).slice(0, 5);
        },
        prepare: function (query, settings) {
          settings.dataType = "text";
          settings.url = buildGoogleSuggestUrl(query);
          return settings;
        }
      };
    } else {
      remoteConfig = {
        wildcard: "%QUERY",
        url: `https://photon.komoot.io/api/?q=%QUERY&limit=3`,
        rateLimitWait: 200,
        transform: function (data) {
          if (data?.features?.length < 1) {
            console.log("missing location data");
            return [];
          }

          return data.features
            .filter((item) => {
              return item?.geometry?.type == "Point" && item?.properties?.type;
            })
            .map((location) => {
              let nameArray = [
                location?.properties?.name,
                location?.properties?.country,
              ];
              switch (location.properties.type) {
                case "district":
                  nameArray = [
                    location?.properties?.name,
                    location?.properties?.city,
                    location?.properties?.country,
                  ];
                  break;
                case "street":
                  nameArray = [
                    location?.properties?.name,
                    location?.properties?.city,
                    location?.properties?.country,
                  ];
                  break;
                case "house":
                  nameArray = [
                    location?.properties?.street,
                    location?.properties?.housenumber,
                    location?.properties?.city,
                    location?.properties?.state,
                    location?.properties?.country,
                  ];
                  break;
                case "locality":
                  nameArray = [
                    location?.properties?.name,
                    location?.properties?.city,
                    location?.properties?.state,
                    location?.properties?.country,
                  ];
                  break;
                case "city":
                  nameArray = [
                    location?.properties?.name,
                    location?.properties?.state,
                    location?.properties?.country,
                  ];
                  break;
                case "county":
                  nameArray = [
                    location?.properties?.name,
                    location?.properties?.state,
                    location?.properties?.country,
                  ];
                  break;
                case "state":
                  nameArray = [
                    location?.properties?.name,
                    location?.properties?.country,
                  ];
                  break;
                case "country":
                  nameArray = [location?.properties?.name];
                  break;
                default:
                  console.info(location.properties);
              }
              let name = nameArray.filter((item) => item).join(", ");
              return {
                latitude: location?.geometry?.coordinates?.[1] || 0,
                longitude: location?.geometry?.coordinates?.[0] || 0,
                location: name,
                name: name,
                placeId: location?.properties?.osm_id,
                gl: location?.properties?.countrycode?.toUpperCase()
              };
            });
        },
        prepare: function (query, settings) {
          settings.dataType = "json";
          settings.url = settings.url.replace("%QUERY", encodeURIComponent(query));
          return settings;
        }
      };
    }

    acEngine = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace("location", "name"),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: remoteConfig
    });
    acEngine.initialize(true);
  });
}


// Google regions for the region picker. Only name/lang/hl/gl are used.
const google_sites = [
  {"name":"Germany","gl":"DE","lang":"Deutsch","hl":"de"},
  {"name":"Spain","gl":"ES","lang":"español","hl":"es"},
  {"name":"United States","gl":"US","lang":"English","hl":"en"},
  {"name":"United Kingdom","gl":"GB","lang":"English","hl":"en"},
  {"name":"India","gl":"IN","lang":"English","hl":"en"},
  {"name":"Australia","gl":"AU","lang":"English","hl":"en"},
  {"name":"Austria","gl":"AT","lang":"Deutsch","hl":"de"},
  {"name":"Belgium","gl":"BE","lang":"Nederlands","hl":"nl"},
  {"name":"Belgium","gl":"BE","lang":"Français","hl":"fr"},
  {"name":"Belgium","gl":"BE","lang":"Deutsch","hl":"de"},
  {"name":"Belgium","gl":"BE","lang":"English","hl":"en"},
  {"name":"Ireland","gl":"IE","lang":"English","hl":"en"},
  {"name":"Netherlands","gl":"NL","lang":"Nederlands","hl":"nl"},
  {"name":"Canada","gl":"CA","lang":"English","hl":"en"},
  {"name":"Canada","gl":"CA","lang":"Français","hl":"fr"},
  {"name":"Afghanistan","gl":"AF","lang":"پښتو","hl":"ps"},
  {"name":"Afghanistan","gl":"AF","lang":"فارسی","hl":"fa"},
  {"name":"Albania","gl":"AL","lang":"Shqip","hl":"sq"},
  {"name":"Albania","gl":"AL","lang":"English","hl":"en"},
  {"name":"Algeria","gl":"DZ","lang":"Français","hl":"fr"},
  {"name":"Algeria","gl":"DZ","lang":"العربية","hl":"ar"},
  {"name":"American Samoa","gl":"AS","lang":"English","hl":"en"},
  {"name":"Angola","gl":"AO","lang":"Português (Portugal)","hl":"pt-PT"},
  {"name":"Angola","gl":"AO","lang":"Kongo","hl":"kg"},
  {"name":"Anguilla","gl":"AI","lang":"English","hl":"en"},
  {"name":"Antigua & Barbuda","gl":"AG","lang":"English","hl":"en"},
  {"name":"Argentina","gl":"AR","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Armenia","gl":"AM","lang":"հայերեն","hl":"hy"},
  {"name":"Armenia","gl":"AM","lang":"русский","hl":"ru"},
  {"name":"Azerbaijan","gl":"AZ","lang":"Azərbaycan dili","hl":"az"},
  {"name":"Azerbaijan","gl":"AZ","lang":"русский","hl":"ru"},
  {"name":"Bahamas","gl":"BS","lang":"English","hl":"en"},
  {"name":"Bahrain","gl":"BH","lang":"العربية","hl":"ar"},
  {"name":"Bahrain","gl":"BH","lang":"English","hl":"en"},
  {"name":"Bangladesh","gl":"BD","lang":"বাংলা","hl":"bn"},
  {"name":"Bangladesh","gl":"BD","lang":"English","hl":"en"},
  {"name":"Belarus","gl":"BY","lang":"Беларуская","hl":"be"},
  {"name":"Belarus","gl":"BY","lang":"русский","hl":"ru"},
  {"name":"Benin","gl":"BJ","lang":"Français","hl":"fr"},
  {"name":"Benin","gl":"BJ","lang":"Èdè Yorùbá","hl":"yo"},
  {"name":"Bolivia","gl":"BO","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Bolivia","gl":"BO","lang":"Quechua","hl":"qu"},
  {"name":"Bosnia & Herzegovina","gl":"BA","lang":"bosanski","hl":"bs"},
  {"name":"Bosnia & Herzegovina","gl":"BA","lang":"српски","hl":"sr"},
  {"name":"Bosnia & Herzegovina","gl":"BA","lang":"hrvatski","hl":"hr"},
  {"name":"Botswana","gl":"BW","lang":"Setswana","hl":"tn"},
  {"name":"Botswana","gl":"BW","lang":"English","hl":"en"},
  {"name":"Brazil","gl":"BR","lang":"Português (Brasil)","hl":"pt-BR"},
  {"name":"British Virgin Islands","gl":"VG","lang":"English","hl":"en"},
  {"name":"Brunei","gl":"BN","lang":"Melayu","hl":"ms"},
  {"name":"Brunei","gl":"BN","lang":"English","hl":"en"},
  {"name":"Brunei","gl":"BN","lang":"中文(简体)","hl":"zh-CN"},
  {"name":"Bulgaria","gl":"BG","lang":"български","hl":"bg"},
  {"name":"Burkina Faso","gl":"BF","lang":"Français","hl":"fr"},
  {"name":"Burundi","gl":"BI","lang":"Français","hl":"fr"},
  {"name":"Burundi","gl":"BI","lang":"Kiswahili","hl":"sw"},
  {"name":"Burundi","gl":"BI","lang":"ikirundi","hl":"rn"},
  {"name":"Cambodia","gl":"KH","lang":"ខ្មែរ","hl":"km"},
  {"name":"Cambodia","gl":"KH","lang":"English","hl":"en"},
  {"name":"Cameroon","gl":"CM","lang":"Français","hl":"fr"},
  {"name":"Cameroon","gl":"CM","lang":"English","hl":"en"},
  {"name":"Cape Verde","gl":"CV","lang":"Português (Portugal)","hl":"pt-PT"},
  {"name":"Chad","gl":"TD","lang":"Français","hl":"fr"},
  {"name":"Chad","gl":"TD","lang":"العربية","hl":"ar"},
  {"name":"Chile","gl":"CL","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Colombia","gl":"CO","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Congo - Brazzaville","gl":"CG","lang":"Français","hl":"fr"},
  {"name":"Congo - Brazzaville","gl":"CG","lang":"Lingala","hl":"ln"},
  {"name":"Congo - Brazzaville","gl":"CG","lang":"Kongo","hl":"kg"},
  {"name":"Congo - Kinshasa","gl":"CD","lang":"Français","hl":"fr"},
  {"name":"Congo - Kinshasa","gl":"CD","lang":"Kiswahili","hl":"sw"},
  {"name":"Congo - Kinshasa","gl":"CD","lang":"Lingala","hl":"ln"},
  {"name":"Congo - Kinshasa","gl":"CD","lang":"Luo","hl":"ach"},
  {"name":"Congo - Kinshasa","gl":"CD","lang":"Tshiluba","hl":"lua"},
  {"name":"Congo - Kinshasa","gl":"CD","lang":"Kongo","hl":"kg"},
  {"name":"Cook Islands","gl":"CK","lang":"English","hl":"en"},
  {"name":"Costa Rica","gl":"CR","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Costa Rica","gl":"CR","lang":"English","hl":"en"},
  {"name":"Croatia","gl":"HR","lang":"hrvatski","hl":"hr"},
  {"name":"Cyprus","gl":"CY","lang":"English","hl":"en"},
  {"name":"Cyprus","gl":"CY","lang":"Ελληνικά","hl":"el"},
  {"name":"Cyprus","gl":"CY","lang":"Türkçe","hl":"tr"},
  {"name":"Czechia","gl":"CZ","lang":"čeština","hl":"cs"},
  {"name":"Denmark","gl":"DK","lang":"Dansk","hl":"da"},
  {"name":"Denmark","gl":"DK","lang":"Føroyskt","hl":"fo"},
  {"name":"Djibouti","gl":"DJ","lang":"Français","hl":"fr"},
  {"name":"Djibouti","gl":"DJ","lang":"العربية","hl":"ar"},
  {"name":"Djibouti","gl":"DJ","lang":"Soomaali","hl":"so"},
  {"name":"Dominica","gl":"DM","lang":"English","hl":"en"},
  {"name":"Dominican Republic","gl":"DO","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Ecuador","gl":"EC","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Egypt","gl":"EG","lang":"العربية","hl":"ar"},
  {"name":"Egypt","gl":"EG","lang":"English","hl":"en"},
  {"name":"El Salvador","gl":"SV","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Estonia","gl":"EE","lang":"eesti","hl":"et"},
  {"name":"Estonia","gl":"EE","lang":"русский","hl":"ru"},
  {"name":"Fiji","gl":"FJ","lang":"English","hl":"en"},
  {"name":"Finland","gl":"FI","lang":"suomi","hl":"fi"},
  {"name":"Finland","gl":"FI","lang":"svenska","hl":"sv"},
  {"name":"France","gl":"FR","lang":"Français","hl":"fr"},
  {"name":"Gabon","gl":"GA","lang":"Français","hl":"fr"},
  {"name":"Gambia","gl":"GM","lang":"English","hl":"en"},
  {"name":"Gambia","gl":"GM","lang":"Wolof","hl":"wo"},
  {"name":"Georgia","gl":"GE","lang":"ქართული","hl":"ka"},
  {"name":"Georgia","gl":"GE","lang":"English","hl":"en"},
  {"name":"Ghana","gl":"GH","lang":"English","hl":"en"},
  {"name":"Ghana","gl":"GH","lang":"Hausa","hl":"ha"},
  {"name":"Ghana","gl":"GH","lang":"Akan","hl":"ak"},
  {"name":"Ghana","gl":"GH","lang":"Ewe","hl":"ee"},
  {"name":"Ghana","gl":"GH","lang":"Ga","hl":"gaa"},
  {"name":"Greece","gl":"GR","lang":"Ελληνικά","hl":"el"},
  {"name":"Guadeloupe","gl":"GP","lang":"Français","hl":"fr"},
  {"name":"Guatemala","gl":"GT","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Guyana","gl":"GY","lang":"English","hl":"en"},
  {"name":"Haiti","gl":"HT","lang":"Français","hl":"fr"},
  {"name":"Haiti","gl":"HT","lang":"Kreyòl Ayisyen","hl":"ht"},
  {"name":"Haiti","gl":"HT","lang":"English","hl":"en"},
  {"name":"Honduras","gl":"HN","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Hong Kong","gl":"HK","lang":"中文（繁體）","hl":"zh-TW"},
  {"name":"Hong Kong","gl":"HK","lang":"中文(简体)","hl":"zh-CN"},
  {"name":"Hong Kong","gl":"HK","lang":"English","hl":"en"},
  {"name":"Iceland","gl":"IS","lang":"íslenska","hl":"is"},
  {"name":"Iceland","gl":"IS","lang":"English","hl":"en"},
  {"name":"India","gl":"IN","lang":"हिन्दी","hl":"hi"},
  {"name":"India","gl":"IN","lang":"বাংলা","hl":"bn"},
  {"name":"India","gl":"IN","lang":"తెలుగు","hl":"te"},
  {"name":"India","gl":"IN","lang":"मराठी","hl":"mr"},
  {"name":"India","gl":"IN","lang":"தமிழ்","hl":"ta"},
  {"name":"India","gl":"IN","lang":"ગુજરાતી","hl":"gu"},
  {"name":"India","gl":"IN","lang":"ಕನ್ನಡ","hl":"kn"},
  {"name":"India","gl":"IN","lang":"മലയാളം","hl":"ml"},
  {"name":"India","gl":"IN","lang":"ਪੰਜਾਬੀ","hl":"pa"},
  {"name":"Iraq","gl":"IQ","lang":"العربية","hl":"ar"},
  {"name":"Iraq","gl":"IQ","lang":"English","hl":"en"},
  {"name":"Iraq","gl":"IQ","lang":"کوردی","hl":"ckb"},
  {"name":"Ireland","gl":"IE","lang":"Gaeilge","hl":"ga"},
  {"name":"Isle of Man","gl":"IM","lang":"English","hl":"en"},
  {"name":"Israel","gl":"IL","lang":"עברית","hl":"iw"},
  {"name":"Israel","gl":"IL","lang":"العربية","hl":"ar"},
  {"name":"Israel","gl":"IL","lang":"English","hl":"en"},
  {"name":"Jamaica","gl":"JM","lang":"English","hl":"en"},
  {"name":"Japan","gl":"JP","lang":"日本語","hl":"ja"},
  {"name":"Jersey","gl":"JE","lang":"English","hl":"en"},
  {"name":"Jersey","gl":"JE","lang":"Français","hl":"fr"},
  {"name":"Jordan","gl":"JO","lang":"العربية","hl":"ar"},
  {"name":"Jordan","gl":"JO","lang":"English","hl":"en"},
  {"name":"Kenya","gl":"KE","lang":"Kiswahili","hl":"sw"},
  {"name":"Kenya","gl":"KE","lang":"English","hl":"en"},
  {"name":"Kiribati","gl":"KI","lang":"English","hl":"en"},
  {"name":"Kuwait","gl":"KW","lang":"العربية","hl":"ar"},
  {"name":"Kuwait","gl":"KW","lang":"English","hl":"en"},
  {"name":"Kyrgyzstan","gl":"KG","lang":"кыргызча","hl":"ky"},
  {"name":"Kyrgyzstan","gl":"KG","lang":"русский","hl":"ru"},
  {"name":"Laos","gl":"LA","lang":"ລາວ","hl":"lo"},
  {"name":"Laos","gl":"LA","lang":"English","hl":"en"},
  {"name":"Latvia","gl":"LV","lang":"latviešu","hl":"lv"},
  {"name":"Latvia","gl":"LV","lang":"lietuvių","hl":"lt"},
  {"name":"Latvia","gl":"LV","lang":"русский","hl":"ru"},
  {"name":"Lebanon","gl":"LB","lang":"العربية","hl":"ar"},
  {"name":"Lebanon","gl":"LB","lang":"English","hl":"en"},
  {"name":"Lebanon","gl":"LB","lang":"Français","hl":"fr"},
  {"name":"Lebanon","gl":"LB","lang":"հայերեն","hl":"hy"},
  {"name":"Lesotho","gl":"LS","lang":"Sesotho","hl":"st"},
  {"name":"Lesotho","gl":"LS","lang":"English","hl":"en"},
  {"name":"Liechtenstein","gl":"LI","lang":"Deutsch","hl":"de"},
  {"name":"Lithuania","gl":"LT","lang":"lietuvių","hl":"lt"},
  {"name":"Luxembourg","gl":"LU","lang":"Deutsch","hl":"de"},
  {"name":"Luxembourg","gl":"LU","lang":"Français","hl":"fr"},
  {"name":"Macedonia (FYROM)","gl":"MK","lang":"македонски","hl":"mk"},
  {"name":"Madagascar","gl":"MG","lang":"Malagasy","hl":"mg"},
  {"name":"Madagascar","gl":"MG","lang":"Français","hl":"fr"},
  {"name":"Malawi","gl":"MW","lang":"Chichewa","hl":"ny"},
  {"name":"Malawi","gl":"MW","lang":"English","hl":"en"},
  {"name":"Malawi","gl":"MW","lang":"Tumbuka","hl":"tum"},
  {"name":"Malaysia","gl":"MY","lang":"English","hl":"en"},
  {"name":"Malaysia","gl":"MY","lang":"Melayu","hl":"ms"},
  {"name":"Maldives","gl":"MV","lang":"English","hl":"en"},
  {"name":"Mali","gl":"ML","lang":"Français","hl":"fr"},
  {"name":"Mexico","gl":"MX","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Micronesia","gl":"FM","lang":"English","hl":"en"},
  {"name":"Moldova","gl":"MD","lang":"Română","hl":"ro"},
  {"name":"Moldova","gl":"MD","lang":"русский","hl":"ru"},
  {"name":"Mongolia","gl":"MN","lang":"Монгол","hl":"mn"},
  {"name":"Montenegro","gl":"ME","lang":"crnogorski","hl":"sr-ME"},
  {"name":"Montenegro","gl":"ME","lang":"српски","hl":"sr"},
  {"name":"Montenegro","gl":"ME","lang":"bosanski","hl":"bs"},
  {"name":"Morocco","gl":"MA","lang":"Français","hl":"fr"},
  {"name":"Morocco","gl":"MA","lang":"العربية","hl":"ar"},
  {"name":"Namibia","gl":"NA","lang":"English","hl":"en"},
  {"name":"Namibia","gl":"NA","lang":"Afrikaans","hl":"af"},
  {"name":"Namibia","gl":"NA","lang":"Deutsch","hl":"de"},
  {"name":"Nauru","gl":"NR","lang":"English","hl":"en"},
  {"name":"Nicaragua","gl":"NI","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Nicaragua","gl":"NI","lang":"English","hl":"en"},
  {"name":"Niger","gl":"NE","lang":"Français","hl":"fr"},
  {"name":"Niger","gl":"NE","lang":"Hausa","hl":"ha"},
  {"name":"Nigeria","gl":"NG","lang":"English","hl":"en"},
  {"name":"Nigeria","gl":"NG","lang":"Hausa","hl":"ha"},
  {"name":"Nigeria","gl":"NG","lang":"Igbo","hl":"ig"},
  {"name":"Nigeria","gl":"NG","lang":"Èdè Yorùbá","hl":"yo"},
  {"name":"Nigeria","gl":"NG","lang":"Nigerian Pidgin","hl":"pcm"},
  {"name":"Niue","gl":"NU","lang":"English","hl":"en"},
  {"name":"Norfolk Island","gl":"NF","lang":"English","hl":"en"},
  {"name":"Norway","gl":"NO","lang":"norsk","hl":"no"},
  {"name":"Oman","gl":"OM","lang":"العربية","hl":"ar"},
  {"name":"Oman","gl":"OM","lang":"English","hl":"en"},
  {"name":"Pakistan","gl":"PK","lang":"English","hl":"en"},
  {"name":"Pakistan","gl":"PK","lang":"اردو","hl":"ur"},
  {"name":"Pakistan","gl":"PK","lang":"پښتو","hl":"ps"},
  {"name":"Pakistan","gl":"PK","lang":"سنڌي","hl":"sd"},
  {"name":"Palestine","gl":"PS","lang":"العربية","hl":"ar"},
  {"name":"Palestine","gl":"PS","lang":"English","hl":"en"},
  {"name":"Panama","gl":"PA","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Panama","gl":"PA","lang":"English","hl":"en"},
  {"name":"Papua New Guinea","gl":"PG","lang":"English","hl":"en"},
  {"name":"Paraguay","gl":"PY","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Peru","gl":"PE","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Peru","gl":"PE","lang":"Quechua","hl":"qu"},
  {"name":"Philippines","gl":"PH","lang":"English","hl":"en"},
  {"name":"Philippines","gl":"PH","lang":"","hl":"fil"},
  {"name":"Philippines","gl":"PH","lang":"Cebuano","hl":"ceb"},
  {"name":"Pitcairn Islands","gl":"PN","lang":"English","hl":"en"},
  {"name":"Portugal","gl":"PT","lang":"Português (Portugal)","hl":"pt-PT"},
  {"name":"Puerto Rico","gl":"PR","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Puerto Rico","gl":"PR","lang":"English","hl":"en"},
  {"name":"Qatar","gl":"QA","lang":"العربية","hl":"ar"},
  {"name":"Qatar","gl":"QA","lang":"English","hl":"en"},
  {"name":"Romania","gl":"RO","lang":"Română","hl":"ro"},
  {"name":"Romania","gl":"RO","lang":"magyar","hl":"hu"},
  {"name":"Romania","gl":"RO","lang":"Deutsch","hl":"de"},
  {"name":"Russia","gl":"RU","lang":"русский","hl":"ru"},
  {"name":"Rwanda","gl":"RW","lang":"English","hl":"en"},
  {"name":"Rwanda","gl":"RW","lang":"Français","hl":"fr"},
  {"name":"Rwanda","gl":"RW","lang":"Kiswahili","hl":"sw"},
  {"name":"Rwanda","gl":"RW","lang":"Ikinyarwanda","hl":"rw"},
  {"name":"San Marino","gl":"SM","lang":"Italiano","hl":"it"},
  {"name":"Saudi Arabia","gl":"SA","lang":"العربية","hl":"ar"},
  {"name":"Saudi Arabia","gl":"SA","lang":"English","hl":"en"},
  {"name":"Serbia","gl":"RS","lang":"српски","hl":"sr"},
  {"name":"Serbia","gl":"RS","lang":"srpski","hl":"sr-Latn"},
  {"name":"Seychelles","gl":"SC","lang":"Kreol Seselwa","hl":"crs"},
  {"name":"Seychelles","gl":"SC","lang":"English","hl":"en"},
  {"name":"Seychelles","gl":"SC","lang":"Français","hl":"fr"},
  {"name":"Sierra Leone","gl":"SL","lang":"English","hl":"en"},
  {"name":"Sierra Leone","gl":"SL","lang":"Krio (Sierra Leone)","hl":"kri"},
  {"name":"Singapore","gl":"SG","lang":"English","hl":"en"},
  {"name":"Singapore","gl":"SG","lang":"中文(简体)","hl":"zh-CN"},
  {"name":"Singapore","gl":"SG","lang":"Melayu","hl":"ms"},
  {"name":"Singapore","gl":"SG","lang":"தமிழ்","hl":"ta"},
  {"name":"Slovenia","gl":"SI","lang":"slovenščina","hl":"sl"},
  {"name":"Solomon Islands","gl":"SB","lang":"English","hl":"en"},
  {"name":"Somalia","gl":"SO","lang":"Soomaali","hl":"so"},
  {"name":"Somalia","gl":"SO","lang":"العربية","hl":"ar"},
  {"name":"Somalia","gl":"SO","lang":"English","hl":"en"},
  {"name":"South Africa","gl":"ZA","lang":"English","hl":"en"},
  {"name":"South Africa","gl":"ZA","lang":"Afrikaans","hl":"af"},
  {"name":"South Africa","gl":"ZA","lang":"Sesotho","hl":"st"},
  {"name":"South Africa","gl":"ZA","lang":"isiZulu","hl":"zu"},
  {"name":"South Africa","gl":"ZA","lang":"IsiXhosa","hl":"xh"},
  {"name":"South Africa","gl":"ZA","lang":"Setswana","hl":"tn"},
  {"name":"South Africa","gl":"ZA","lang":"Northern Sotho","hl":"nso"},
  {"name":"South Korea","gl":"KR","lang":"한국어","hl":"ko"},
  {"name":"Spain","gl":"ES","lang":"català","hl":"ca"},
  {"name":"Spain","gl":"ES","lang":"galego","hl":"gl"},
  {"name":"Spain","gl":"ES","lang":"euskara","hl":"eu"},
  {"name":"St. Helena","gl":"SH","lang":"English","hl":"en"},
  {"name":"Suriname","gl":"SR","lang":"Nederlands","hl":"nl"},
  {"name":"Suriname","gl":"SR","lang":"English","hl":"en"},
  {"name":"Sweden","gl":"SE","lang":"svenska","hl":"sv"},
  {"name":"Switzerland","gl":"CH","lang":"Deutsch","hl":"de"},
  {"name":"Switzerland","gl":"CH","lang":"English","hl":"en"},
  {"name":"Switzerland","gl":"CH","lang":"Français","hl":"fr"},
  {"name":"Switzerland","gl":"CH","lang":"Italiano","hl":"it"},
  {"name":"Switzerland","gl":"CH","lang":"Rumantsch","hl":"rm"},
  {"name":"Taiwan","gl":"TW","lang":"中文（繁體）","hl":"zh-TW"},
  {"name":"Tanzania","gl":"TZ","lang":"Kiswahili","hl":"sw"},
  {"name":"Tanzania","gl":"TZ","lang":"English","hl":"en"},
  {"name":"Timor-Leste","gl":"TL","lang":"Português (Portugal)","hl":"pt-PT"},
  {"name":"Timor-Leste","gl":"TL","lang":"Indonesia","hl":"id"},
  {"name":"Timor-Leste","gl":"TL","lang":"English","hl":"en"},
  {"name":"Togo","gl":"TG","lang":"Français","hl":"fr"},
  {"name":"Togo","gl":"TG","lang":"Ewe","hl":"ee"},
  {"name":"Tokelau","gl":"TK","lang":"English","hl":"en"},
  {"name":"Tonga","gl":"TO","lang":"English","hl":"en"},
  {"name":"Tonga","gl":"TO","lang":"Faka-Tonga","hl":"to"},
  {"name":"Trinidad & Tobago","gl":"TT","lang":"English","hl":"en"},
  {"name":"Trinidad & Tobago","gl":"TT","lang":"हिन्दी","hl":"hi"},
  {"name":"Trinidad & Tobago","gl":"TT","lang":"Français","hl":"fr"},
  {"name":"Trinidad & Tobago","gl":"TT","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Trinidad & Tobago","gl":"TT","lang":"中文（繁體）","hl":"zh-TW"},
  {"name":"Tunisia","gl":"TN","lang":"العربية","hl":"ar"},
  {"name":"Tunisia","gl":"TN","lang":"Français","hl":"fr"},
  {"name":"Turkey","gl":"TR","lang":"Türkçe","hl":"tr"},
  {"name":"U.S. Virgin Islands","gl":"VI","lang":"English","hl":"en"},
  {"name":"Uganda","gl":"UG","lang":"English","hl":"en"},
  {"name":"Uganda","gl":"UG","lang":"Luganda","hl":"lg"},
  {"name":"Uganda","gl":"UG","lang":"Kiswahili","hl":"sw"},
  {"name":"Uganda","gl":"UG","lang":"Ikinyarwanda","hl":"rw"},
  {"name":"Uganda","gl":"UG","lang":"Luo","hl":"ach"},
  {"name":"Uganda","gl":"UG","lang":"Runyakitara","hl":"nyn"},
  {"name":"Ukraine","gl":"UA","lang":"українська","hl":"uk"},
  {"name":"Ukraine","gl":"UA","lang":"русский","hl":"ru"},
  {"name":"United Arab Emirates","gl":"AE","lang":"العربية","hl":"ar"},
  {"name":"United Arab Emirates","gl":"AE","lang":"فارسی","hl":"fa"},
  {"name":"United Arab Emirates","gl":"AE","lang":"English","hl":"en"},
  {"name":"United Arab Emirates","gl":"AE","lang":"हिन्दी","hl":"hi"},
  {"name":"United Arab Emirates","gl":"AE","lang":"اردو","hl":"ur"},
  {"name":"Uruguay","gl":"UY","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Uzbekistan","gl":"UZ","lang":"O‘zbek","hl":"uz"},
  {"name":"Uzbekistan","gl":"UZ","lang":"русский","hl":"ru"},
  {"name":"Vanuatu","gl":"VU","lang":"English","hl":"en"},
  {"name":"Vanuatu","gl":"VU","lang":"Français","hl":"fr"},
  {"name":"Venezuela","gl":"VE","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Vietnam","gl":"VN","lang":"Tiếng Việt","hl":"vi"},
  {"name":"Vietnam","gl":"VN","lang":"English","hl":"en"},
  {"name":"Vietnam","gl":"VN","lang":"Français","hl":"fr"},
  {"name":"Vietnam","gl":"VN","lang":"中文（繁體）","hl":"zh-TW"},
  {"name":"Zambia","gl":"ZM","lang":"English","hl":"en"},
  {"name":"Zambia","gl":"ZM","lang":"Chichewa","hl":"ny"},
  {"name":"Zambia","gl":"ZM","lang":"IciBemba","hl":"bem"},
  {"name":"Zambia","gl":"ZM","lang":"Tumbuka","hl":"tum"},
  {"name":"Zambia","gl":"ZM","lang":"Lozi","hl":"loz"},
  {"name":"Zimbabwe","gl":"ZW","lang":"English","hl":"en"},
  {"name":"Zimbabwe","gl":"ZW","lang":"ChiShona","hl":"sn"},
  {"name":"Zimbabwe","gl":"ZW","lang":"isiZulu","hl":"zu"},
  {"name":"Zimbabwe","gl":"ZW","lang":"Chichewa","hl":"ny"},
  {"name":"Zimbabwe","gl":"ZW","lang":"Setswana","hl":"tn"},
  {"name":"Andorra","gl":"AD","lang":"català","hl":"ca"},
  {"name":"Belize","gl":"BZ","lang":"English","hl":"en"},
  {"name":"Belize","gl":"BZ","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Bhutan","gl":"BT","lang":"English","hl":"en"},
  {"name":"Central African Republic","gl":"CF","lang":"Français","hl":"fr"},
  {"name":"Côte d’Ivoire","gl":"CI","lang":"Français","hl":"fr"},
  {"name":"Cuba","gl":"CU","lang":"Español (Latinoamérica)","hl":"es-419"},
  {"name":"Ethiopia","gl":"ET","lang":"አማርኛ","hl":"am"},
  {"name":"Ethiopia","gl":"ET","lang":"English","hl":"en"},
  {"name":"Ethiopia","gl":"ET","lang":"ትግርኛ","hl":"ti"},
  {"name":"Ethiopia","gl":"ET","lang":"Soomaali","hl":"so"},
  {"name":"Ethiopia","gl":"ET","lang":"Afaan Oromoo","hl":"om"},
  {"name":"Greenland","gl":"GL","lang":"Dansk","hl":"da"},
  {"name":"Greenland","gl":"GL","lang":"English","hl":"en"},
  {"name":"Guernsey","gl":"GG","lang":"English","hl":"en"},
  {"name":"Guernsey","gl":"GG","lang":"Français","hl":"fr"},
  {"name":"Hungary","gl":"HU","lang":"magyar","hl":"hu"},
  {"name":"Indonesia","gl":"ID","lang":"Indonesia","hl":"id"},
  {"name":"Indonesia","gl":"ID","lang":"English","hl":"en"},
  {"name":"Indonesia","gl":"ID","lang":"","hl":"jv"},
  {"name":"Indonesia","gl":"ID","lang":"Basa Bali","hl":"ban"},
  {"name":"Italy","gl":"IT","lang":"Italiano","hl":"it"},
  {"name":"Kazakhstan","gl":"KZ","lang":"қазақ","hl":"kk"},
  {"name":"Kazakhstan","gl":"KZ","lang":"русский","hl":"ru"},
  {"name":"Malta","gl":"MT","lang":"Malti","hl":"mt"},
  {"name":"Malta","gl":"MT","lang":"English","hl":"en"},
  {"name":"Mauritius","gl":"MU","lang":"English","hl":"en"},
  {"name":"Mauritius","gl":"MU","lang":"Français","hl":"fr"},
  {"name":"Mauritius","gl":"MU","lang":"Kreol morisien","hl":"mfe"},
  {"name":"Montserrat","gl":"MS","lang":"English","hl":"en"},
  {"name":"Mozambique","gl":"MZ","lang":"Português (Portugal)","hl":"pt-PT"},
  {"name":"Mozambique","gl":"MZ","lang":"Kiswahili","hl":"sw"},
  {"name":"Mozambique","gl":"MZ","lang":"Chichewa","hl":"ny"},
  {"name":"Mozambique","gl":"MZ","lang":"ChiShona","hl":"sn"},
  {"name":"Myanmar (Burma)","gl":"MM","lang":"မြန်မာ (မြန်မာ)","hl":"my"},
  {"name":"Myanmar (Burma)","gl":"MM","lang":"English","hl":"en"},
  {"name":"Nepal","gl":"NP","lang":"नेपाली","hl":"ne"},
  {"name":"Nepal","gl":"NP","lang":"English","hl":"en"},
  {"name":"Samoa","gl":"WS","lang":"English","hl":"en"},
  {"name":"Senegal","gl":"SN","lang":"Français","hl":"fr"},
  {"name":"Senegal","gl":"SN","lang":"Wolof","hl":"wo"},
  {"name":"Slovakia","gl":"SK","lang":"slovenčina","hl":"sk"},
  {"name":"St. Vincent & Grenadines","gl":"VC","lang":"English","hl":"en"},
  {"name":"Tajikistan","gl":"TJ","lang":"Тоҷикӣ","hl":"tg"},
  {"name":"Tajikistan","gl":"TJ","lang":"русский","hl":"ru"},
  {"name":"Thailand","gl":"TH","lang":"ภาษาไทย","hl":"th"},
  {"name":"Thailand","gl":"TH","lang":"English","hl":"en"},
  {"name":"Turkmenistan","gl":"TM","lang":"türkmençe","hl":"tk"},
  {"name":"Turkmenistan","gl":"TM","lang":"русский","hl":"ru"},
  {"name":"Turkmenistan","gl":"TM","lang":"O‘zbek","hl":"uz"},
  {"name":"Gibraltar","gl":"GI","lang":"English","hl":"en"},
  {"name":"Gibraltar","gl":"GI","lang":"español","hl":"es"},
  {"name":"Gibraltar","gl":"GI","lang":"Italiano","hl":"it"},
  {"name":"Gibraltar","gl":"GI","lang":"Português (Portugal)","hl":"pt-PT"},
  {"name":"Libya","gl":"LY","lang":"العربية","hl":"ar"},
  {"name":"Libya","gl":"LY","lang":"Italiano","hl":"it"},
  {"name":"Libya","gl":"LY","lang":"English","hl":"en"},
  {"name":"Netherlands","gl":"NL","lang":"Frysk","hl":"fy"},
  {"name":"New Zealand","gl":"NZ","lang":"English","hl":"en"},
  {"name":"New Zealand","gl":"NZ","lang":"Māori","hl":"mi"},
  {"name":"Poland","gl":"PL","lang":"polski","hl":"pl"},
  {"name":"Sri Lanka","gl":"LK","lang":"English","hl":"en"},
  {"name":"Sri Lanka","gl":"LK","lang":"සිංහල","hl":"si"},
  {"name":"Sri Lanka","gl":"LK","lang":"தமிழ்","hl":"ta"},
  {"name":"São Tomé & Príncipe","gl":"ST","lang":"Português (Portugal)","hl":"pt-PT"}
];
var regionsBloodhound = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace("name", "lang"),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  identify: function (obj) {
    return obj.hl + obj.gl;
  },
  local: google_sites,
});
const regionsTemplate = Handlebars.templates.typeahead;
const locationsTemplate = Handlebars.templates.locations;

initEngine();
$("#place")
  .typeahead(
    {
      hint: true,
      highlight: true,
      minLength: 1,
      limit: 4,
    },
    {
      limit: 10,
      display: "location",
      name: "locations",
      source: function (q, sync, async) {
        acEngine.search(q, sync, async);
      },
      templates: {
        suggestion: locationsTemplate,
      },
    },
  )
  .bind("typeahead:select", function (ev, suggestion) {
    applyPlaceSuggestion(suggestion);
  });


function applyPlaceSuggestion(suggestion) {
    $("#latitude").val(suggestion.latitude);
    $("#longitude").val(suggestion.longitude);
    $("#place").prop("placeholder", suggestion.name);
    $("#place").typeahead("close");
    $("#place").val("");

    background.settings.latitude = suggestion.latitude;
    background.settings.longitude = suggestion.longitude;
    background.settings.location = suggestion.location;
    background.settings.name = suggestion.name;
    background.settings.placeId = suggestion.placeId;

    // Conditionally update GL based on the "Sync" checkbox
    if ($("#sync-gl").prop("checked") && suggestion.gl) {
      background.settings.gl = suggestion.gl;
      $("#gl").val(suggestion.gl);

      // Update region display text if available
      var site = google_sites.find(s => s.gl === suggestion.gl);
      if (site) {
        background.settings.regions = site.name + " - " + site.lang;
        $("#regions").prop("placeholder", background.settings.regions);
        $("#regions").val("");
      }
    } else {
      $("#gl").prop("placeholder", background.settings.gl);
      $("#gl").val("");
      $("#regions").prop("placeholder", background.settings.regions);
      $("#regions").val("");
    }

    background.settings.timestamp = new Date().getTime();
    chrome.storage.sync.set({ settings: background.settings });
}


function deleteUULE() {
  chrome.cookies.getAll({ name: "UULE" }, function (cookies) {
    for (const cookie of cookies) {
      var domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
      var url = "https://" + domain + cookie.path;
      chrome.cookies.remove({ name: "UULE", url: url }, function (details) {
        //console.log(details);
      });
    }
  });
}

function updateCustomLocation() {
  background.settings.location = "Custom Location";
  background.settings.name = "Custom Location";
  background.settings.placeId = "custom";
  $("#place").prop("placeholder", "Custom Location");
}

function enabler() {
  if ($("#enabled").prop("checked")) {
    background.settings.enabled = true;
    checkEnabled();
  } else {
    deleteUULE();
    background.settings.enabled = false;
    checkEnabled();
  }
  // persist settings
  background.settings.timestamp = new Date().getTime();
  chrome.storage.sync.set({ settings: background.settings });
}



function loadHandler() {
  $("#place").prop("placeholder", background.settings.location);
  $("#latitude").prop("placeholder", background.settings.latitude);
  $("#longitude").prop("placeholder", background.settings.longitude);
  $("#hl").prop("placeholder", background.settings.hl);
  $("#gl").prop("placeholder", background.settings.gl);
  $("#regions").prop("placeholder", background.settings.regions);
  $("#enabled").change(enabler);

  $("#sync-gl").on("change", function() {
    chrome.storage.sync.set({ "sync-gl": $(this).prop("checked") });
  });

  chrome.storage.sync.get("sync-gl", function(res) {
    if (res["sync-gl"] !== undefined) {
      $("#sync-gl").prop("checked", res["sync-gl"]);
    }
  });

  function setProviderUI(useGoogle) {
    $("#provider-switch button").removeClass("active");
    $("#provider-switch button[data-provider='" + (useGoogle ? "google" : "komoot") + "']").addClass("active");
  }

  chrome.storage.sync.get("options", function (res) {
    setProviderUI(!!(res.options && res.options.useGoogleEndpoint));
  });

  $("#provider-switch button").on("click", function () {
    var useGoogle = $(this).data("provider") === "google";
    setProviderUI(useGoogle);
    chrome.storage.sync.get("options", function (res) {
      var opts = (res && res.options) || {};
      opts.useGoogleEndpoint = useGoogle;
      chrome.storage.sync.set({ options: opts }, function () {
        initEngine();
      });
    });
  });

  // Smart-paste & coordinate support.
  // Typing saves after a short pause, and only valid coordinates are saved:
  // every save is a storage.sync write (rate-limited) that also rebuilds the
  // header rule and context menu, and half-typed values like "48." must not
  // become the live location.
  var coordSaveTimer = null;

  function parseCoord(raw, fallback, max) {
    var text = String(raw).trim();
    if (text === "") {
      text = String(fallback);
    }
    // Strict number check: parseFloat("48abc") would accept junk.
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(text)) {
      return null;
    }
    var n = Number(text);
    return Math.abs(n) <= max ? n : null;
  }

  function persistCoords() {
    clearTimeout(coordSaveTimer);
    coordSaveTimer = null;
    var lat = parseCoord($("#latitude").val(), background.settings.latitude, 90);
    var lng = parseCoord($("#longitude").val(), background.settings.longitude, 180);
    $("#latitude").toggleClass("is-invalid", lat === null);
    $("#longitude").toggleClass("is-invalid", lng === null);
    if (lat === null || lng === null) {
      return;
    }
    if (lat === parseFloat(background.settings.latitude) && lng === parseFloat(background.settings.longitude)) {
      return;
    }
    background.settings.latitude = lat;
    background.settings.longitude = lng;
    updateCustomLocation();
    background.settings.timestamp = new Date().getTime();
    chrome.storage.sync.set({ settings: background.settings });
  }

  $("#latitude, #longitude").on("input", function () {
    var val = $(this).val();
    if (val.includes(",")) {
      // "lat, lng" pasted into either field: split it across both.
      var parts = val.split(",");
      $("#latitude").val(parts[0].trim());
      $("#longitude").val(parts.slice(1).join(",").trim());
    }
    clearTimeout(coordSaveTimer);
    coordSaveTimer = setTimeout(persistCoords, 500);
  });

  // Save right away when leaving the field or pressing Enter.
  $("#latitude, #longitude").on("change", persistCoords);

  // Manual entry of language (hl) and country (gl).
  // Saved after a short pause or on change, so closing the popup right after
  // typing doesn't lose the edit. Only valid codes are saved: a malformed
  // value makes the header rule update fail and leaves the old rule active.
  // hl: 2-3 letter language, optionally with script/region/area
  // (pt-BR, es-419, sr-Latn); gl: 2-letter country.
  var HL_RE = /^[a-z]{2,3}(-([A-Za-z]{4}|[A-Za-z]{2}|\d{3}))?$/;
  var GL_RE = /^[A-Za-z]{2}$/;
  var localeSaveTimer = null;

  function persistLocale() {
    clearTimeout(localeSaveTimer);
    localeSaveTimer = null;
    // Lowercase the language subtag so "DE" or "Pt-BR" are accepted.
    var hl = ($("#hl").val().trim() || background.settings.hl || "en")
      .replace(/^[A-Za-z]{2,3}/, function (m) { return m.toLowerCase(); });
    var gl = ($("#gl").val().trim() || background.settings.gl || "US").toUpperCase();
    var hlOk = HL_RE.test(hl);
    var glOk = GL_RE.test(gl);
    $("#hl").toggleClass("is-invalid", !hlOk);
    $("#gl").toggleClass("is-invalid", !glOk);
    if (!hlOk || !glOk) {
      return;
    }
    if ($("#hl").val()) {
      $("#hl").val(hl);
    }
    if ($("#gl").val()) {
      $("#gl").val(gl);
    }
    if (hl === background.settings.hl && gl === background.settings.gl) {
      return;
    }
    background.settings.hl = hl;
    background.settings.gl = gl;
    background.settings.timestamp = new Date().getTime();
    chrome.storage.sync.set({ settings: background.settings });
  }

  $("#hl, #gl").on("input", function () {
    clearTimeout(localeSaveTimer);
    localeSaveTimer = setTimeout(persistLocale, 500);
  });
  $("#hl, #gl").on("change", persistLocale);

  // Status line that replaces alert(): native dialogs block the popup and
  // tend to close it in Firefox.
  var statusTimer = null;
  function showStatus(message, isError) {
    clearTimeout(statusTimer);
    $("#popup-status").text(message).toggleClass("is-error", !!isError);
    statusTimer = setTimeout(function () {
      $("#popup-status").text("");
    }, isError ? 8000 : 4000);
  }

  // Inline "save favorite" form that replaces prompt().
  function openFavoriteForm() {
    var currentName = $("#place").val().trim() || background.settings.name || background.settings.location || "";
    $("#favorite-form").removeClass("d-none");
    $("#favorite-name").val(currentName).trigger("focus").trigger("select");
  }

  function closeFavoriteForm() {
    $("#favorite-form").addClass("d-none");
    $("#favorite-name").val("").removeClass("is-invalid");
  }

  function saveFavorite() {
    var locName = $("#favorite-name").val().trim();
    if (!locName) {
      $("#favorite-name").addClass("is-invalid").trigger("focus");
      return;
    }
    var now = new Date().getTime();
    // Build the favorite first; only apply it to settings once it's stored.
    var newFavorite = Object.assign({}, background.settings, {
      location: locName,
      name: locName,
      placeId: "fav_" + now, // unique placeId
      timestamp: now,
    });
    var places = [newFavorite].concat(background.knownPlaces.filter(function (p) {
      return p.placeId !== newFavorite.placeId;
    }));
    var newSettings = Object.assign({}, background.settings, newFavorite);

    saveKnownPlaces(places, { settings: newSettings }, function (res) {
      if (res.error) {
        showStatus("Could not save favorite: " + res.error, true);
        return;
      }
      Object.assign(background.settings, newSettings);
      background.knownPlaces = res.places;
      $("#place").prop("placeholder", locName).val("");
      closeFavoriteForm();
      var note = res.dropped
        ? " The " + res.dropped + " oldest favorite(s) were removed to fit the sync storage limit."
        : "";
      showStatus("⭐ Saved '" + locName + "' to favorites." + note, false);
      renderFavorites();
    });
  }

  $("#btn-favorite").on("click", function () {
    if ($("#favorite-form").hasClass("d-none")) {
      openFavoriteForm();
    } else {
      closeFavoriteForm();
    }
  });
  $("#favorite-save").on("click", saveFavorite);
  $("#favorite-cancel").on("click", closeFavoriteForm);
  $("#favorite-name").on("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveFavorite();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeFavoriteForm();
      $("#btn-favorite").trigger("focus");
    }
  }).on("input", function () {
    $(this).removeClass("is-invalid");
  });

  var enabled = document.querySelector("#enabled");
  enabled.checked = background.settings.enabled;

  checkEnabled();

  $("#regions").typeahead(
    {
      hint: true,
      highlight: true,
      minLength: 1,
      limit: 10,
    },
    {
      display: function (obj) {
        return obj.name + " - " + obj.lang;
      },
      name: "states",
      source: regionsBloodhound,
      templates: {
        suggestion: regionsTemplate,
      },
    },
  );
  $("#regions").bind("typeahead:select", function (ev, data) {
    $("#hl").val(data.hl);
    $("#gl").val(data.gl);
    background.settings.hl = data.hl;
    background.settings.gl = data.gl;
    background.settings.regions = data.name + " - " + data.lang;
    $("#regions").prop("placeholder", background.settings.regions);
    background.settings.timestamp = new Date().getTime();
    chrome.storage.sync.set({ settings: background.settings });
  });

  function renderFavorites() {
    var container = $("#favorites-container");
    container.empty();

    // The very first item is often the default "Google Building 40" if never modified.
    // If it's the only one, users might not think of it as a favorite they saved explicitly,
    // but returning it is fine.
    if (!background.knownPlaces || background.knownPlaces.length === 0) {
      container.append('<div class="list-group-item text-muted">No favorites saved yet.</div>');
      return;
    }

    background.knownPlaces.forEach(function (place, index) {
      var item = $('<button type="button" class="list-group-item list-group-item-action py-1 px-2 d-flex justify-content-between align-items-center">');

      var nameSpan = $('<span>').text(place.name || place.location || "Unknown Location");
      var deleteBtn = $('<span style="cursor:pointer; color:red;" title="Remove this favorite">&times;</span>');

      deleteBtn.on("click", function (e) {
        e.stopPropagation();
        background.knownPlaces.splice(index, 1);
        saveKnownPlaces(background.knownPlaces, {}, function (res) {
          if (!res.error) {
            background.knownPlaces = res.places;
          }
          renderFavorites();
        });
      });

      item.on("click", function () {
        background.settings.latitude = place.latitude;
        background.settings.longitude = place.longitude;
        background.settings.location = place.location;
        background.settings.name = place.name;
        background.settings.placeId = place.placeId;
        background.settings.hl = place.hl;
        background.settings.gl = place.gl;
        background.settings.timestamp = new Date().getTime();

        chrome.storage.sync.set({ settings: background.settings }, function () {
          $("#place").prop("placeholder", place.name || place.location);
          $("#latitude").val(place.latitude);
          $("#longitude").val(place.longitude);
          $("#hl").val(place.hl);
          $("#gl").val(place.gl);
          $("#enabled").prop("checked", true);
          enabler();
        });
      });

      item.append(nameSpan).append(deleteBtn);
      container.append(item);
    });
  }

  renderFavorites();

  $("#btn-toggle-favorites").on("click", function () {
    $("#favoritesList").slideToggle("fast");
    var span = $("#fav-toggle-icon");
    span.text(span.text() === "▼" ? "▲" : "▼");
  });

  // Theme Toggle Listener
  $("#theme-toggle-btn").on("click", function() {
    $('body').toggleClass('dark-mode');
    const isDark = $('body').hasClass('dark-mode');
    chrome.storage.sync.set({ theme: isDark ? 'dark' : 'light' });
  });
};
