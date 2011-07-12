var DOMBuilder = require('./lib/DOMBuilder');

// Modes: html [default]
require('./lib/DOMBuilder.html');

DOMBuilder.mode = 'html';

module.exports = DOMBuilder;
