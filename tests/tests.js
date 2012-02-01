var path = require('path')

var qqunit = require('qqunit')

global.DOMBuilder = require('../lib/dombuilder')

var tests = [ 'core.js'
            , 'html.js'
            , 'template.js'
            ].map(function(t) { return path.join(__dirname, t) })

qqunit.Runner.run(tests, function(stats) {
  process.exit(stats.failed)
})
