var DOMBuilder = require('./DOMBuilder')
  , htmlMode = require('./DOMBuilder.html')
  , templateMode = require('./DOMBuilder.template')
  ;

DOMBuilder.addMode(htmlMode);
DOMBuilder.addMode(templateMode);

DOMBuilder.util.extend(exports, DOMBuilder);