module('Core');

(function() {

var el = DOMBuilder.elements;

var testMode = {
  name: 'test'
, createElement: function(t, a, c) {
    var r = [];
    for (var p in a) {
      r.push(p + '=' + a[p])
    }
    if (c.length) {
      r.push(c.join(''));
    }
    return '<' + t + (r.length ? ' ' + r.join(' ') : '') + '>';
  }
, fragment: function(c) {
    return '<#fragment' + (c.length ? ' ' + c.join('') : '') + '>';
  }
, isObject: function(o) { return true; }
, api: {}
};

DOMBuilder.addMode(testMode);

test('Building from Arrays', function() {
  var a = ['div', {'class': 'test'}
          , 'before'
          , ['span'
            , 'stuff'
            , ['#document-fragment'
              , ['strong', {'class': 'very'}, 'things']
              , 'here'
              ]
            ]
          , 'between'
          , ['br']
          , 'after'
          ];
  equal(DOMBuilder.build(a, 'test'),
'<div class=test before<span stuff<#fragment <strong class=very things>here>>between<br>after>');
  equal(''+DOMBuilder.build(a, 'html'),
'<div class="test">before<span>stuff<strong class="very">things</strong>here</span>between<br>after</div>');
});

})();
