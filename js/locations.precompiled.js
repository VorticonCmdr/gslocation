(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['locations'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p data-id=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"placeId") || (depth0 != null ? lookupProperty(depth0,"placeId") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"placeId","hash":{},"data":data,"loc":{"start":{"line":1,"column":12},"end":{"line":1,"column":23}}}) : helper)))
    + "\" data-lat=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"lat") || (depth0 != null ? lookupProperty(depth0,"lat") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"lat","hash":{},"data":data,"loc":{"start":{"line":1,"column":35},"end":{"line":1,"column":42}}}) : helper)))
    + "\" data-lng=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"lng") || (depth0 != null ? lookupProperty(depth0,"lng") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"lng","hash":{},"data":data,"loc":{"start":{"line":1,"column":54},"end":{"line":1,"column":61}}}) : helper)))
    + "\" data-hl=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"hl") || (depth0 != null ? lookupProperty(depth0,"hl") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hl","hash":{},"data":data,"loc":{"start":{"line":1,"column":72},"end":{"line":1,"column":78}}}) : helper)))
    + "\" data-gl=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"gl") || (depth0 != null ? lookupProperty(depth0,"gl") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gl","hash":{},"data":data,"loc":{"start":{"line":1,"column":89},"end":{"line":1,"column":95}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"location") || (depth0 != null ? lookupProperty(depth0,"location") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"location","hash":{},"data":data,"loc":{"start":{"line":1,"column":97},"end":{"line":1,"column":105}}}) : helper)))
    + "</p>\n";
},"useData":true});
})();
