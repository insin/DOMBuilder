var path = require('path')

var buildumb = require('buildumb')
  , object = require('isomorph').object

// Default configuration for all builds
var root = path.normalize(path.join(__dirname, '..'))
var baseModules = {
  // isomorph
  'node_modules/isomorph/is.js'     : ['isomorph/is', './is']
, 'node_modules/isomorph/object.js' : 'isomorph/object'
, 'node_modules/isomorph/array.js'  : 'isomorph/array'
  // DOMBuilder
, 'lib/dombuilder/core.js' : ['./dombuilder/core', './core']
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
  // Include Concur in the build only for plugin modules which use it
  if (pluginModules.indexOf('template') != -1) {
    modules['node_modules/Concur/lib/concur.js'] = 'Concur'
  }
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
