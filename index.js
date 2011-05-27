var DOMBuilder = require('./lib/DOMBuilder')
  , htmlMode = require('./lib/DOMBuilder.html')
  , templateMode = require('./lib/DOMBuilder.template')
  ;

DOMBuilder.addMode(htmlMode);
DOMBuilder.addMode(templateMode);

DOMBuilder.util.extend(exports, DOMBuilder);