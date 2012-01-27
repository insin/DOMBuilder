var path = require('path')

var buildumb = require('buildumb')
  , object = require('isomorph').object

// Default configuration for all builds
var root = path.normalize(path.join(__dirname, '..'))
var baseModules = {
  'node_modules/isomorph/lib/is.js'     : ['isomorph/lib/is', './is']
, 'node_modules/isomorph/lib/object.js' : 'isomorph/lib/object'
, 'node_modules/isomorph/lib/array.js'  : 'isomorph/lib/array'
, 'lib/dombuilder/core.js'              : ['./dombuilder/core', './core']
}

// Configuration for multiple feature builds
// [plugin module names, features, build file]
var builds = [
  [['dom','html', 'template'], 'dom [default], html, template', 'DOMBuilder.template.js']
, [['dom', 'html'],            'dom [default], html',           'DOMBuilder.js']
, [['dom'],                    'dom [default]',                 'DOMBuilder.dom.js']
, [['html'],                   'html [default]',                'DOMBuilder.html.js']
]

for (var i = 0, l = builds.length; i < l; i++) {
  var build = builds[i]
    , pluginModules = build[0]
    , features = build[1]
    , buildFile = build[2]
    , outputFile = 'dist/' + buildFile
    , compressFile = outputFile.replace('.js', '.min.js')
    , header = buildumb.formatTemplate(path.join(__dirname, 'header.js'),
                                       require('../package.json').version,
                                       features)

  var modules = object.extend({}, baseModules)
  pluginModules.forEach(function(pluginModule) {
    modules['lib/dombuilder/' + pluginModule + '.js'] = './dombuilder/' + pluginModule
  })
  modules['support/' + buildFile] = 'DOMBuilder'

  console.log('Building version: ' + features)
  buildumb.build({
    root: root
  , modules: modules
  , exports: {
     'DOMBuilder': 'DOMBuilder'
    }
  , output: outputFile
  , compress: compressFile
  , header: header
  })
}
