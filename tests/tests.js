var qunit = require('qunit')
  , path = require('path')

qunit.run({ code: {path: path.join(__dirname, '../lib/dombuilder.js'), namespace: 'DOMBuilder'}
          , tests: [ path.join(__dirname, 'core.js')
                   , path.join(__dirname, 'html.js')
                   , path.join(__dirname, 'template.js')
                   ]
          })
