(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['typeahead'] = template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<p>"
    + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"start":{"line":1,"column":3},"end":{"line":1,"column":11}}}) : helper)))
    + " - <span>"
    + alias4(((helper = (helper = lookupProperty(helpers,"lang") || (depth0 != null ? lookupProperty(depth0,"lang") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"lang","hash":{},"data":data,"loc":{"start":{"line":1,"column":20},"end":{"line":1,"column":28}}}) : helper)))
    + "</span></p>\n";
},"useData":true});
})();