(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['knownplaces'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<tr>\n  <th scope=\"row\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"location") || (depth0 != null ? lookupProperty(depth0,"location") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"location","hash":{},"data":data,"loc":{"start":{"line":3,"column":18},"end":{"line":3,"column":30}}}) : helper)))
    + "</th>\n  <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"latitude") || (depth0 != null ? lookupProperty(depth0,"latitude") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"latitude","hash":{},"data":data,"loc":{"start":{"line":4,"column":6},"end":{"line":4,"column":18}}}) : helper)))
    + "</td>\n  <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"longitude") || (depth0 != null ? lookupProperty(depth0,"longitude") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"longitude","hash":{},"data":data,"loc":{"start":{"line":5,"column":6},"end":{"line":5,"column":19}}}) : helper)))
    + "</td>\n  <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"hl") || (depth0 != null ? lookupProperty(depth0,"hl") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"hl","hash":{},"data":data,"loc":{"start":{"line":6,"column":6},"end":{"line":6,"column":12}}}) : helper)))
    + "</td>\n  <td>"
    + alias4(((helper = (helper = lookupProperty(helpers,"gl") || (depth0 != null ? lookupProperty(depth0,"gl") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"gl","hash":{},"data":data,"loc":{"start":{"line":7,"column":6},"end":{"line":7,"column":12}}}) : helper)))
    + "</td>\n  <td>\n    <div class=\"btn-group\" role=\"group\" aria-label=\"actions\">\n      <button data-placeId=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"placeId") || (depth0 != null ? lookupProperty(depth0,"placeId") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"placeId","hash":{},"data":data,"loc":{"start":{"line":10,"column":28},"end":{"line":10,"column":39}}}) : helper)))
    + "\" type=\"button\" class=\"remove btn btn-sm btn-danger\">remove</button>\n    </div>\n  </td>\n</tr>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"knownPlaces") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":14,"column":9}}})) != null ? stack1 : "");
},"useData":true});
})();