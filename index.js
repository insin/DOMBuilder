var DOMBuilder = require('./lib/DOMBuilder')

// Add plugins
require('./lib/DOMBuilder.html');
require('./lib/DOMBuilder.template');

DOMBuilder.util.extend(exports, DOMBuilder);
