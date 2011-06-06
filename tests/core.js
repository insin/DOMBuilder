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

test('Array output', function() {
  // Test with no active mode
  DOMBuilder.withMode(null, function() {

  deepEqual(el.DIV(), ['div']);
  deepEqual(el.DIV('1'), ['div', {}, '1']);
  deepEqual(el.DIV({'1': '2'}), ['div', {'1': '2'}]);
  deepEqual(el.DIV({'1': '2'}, '3'), ['div', {'1': '2'}, '3']);
  deepEqual(el.DIV({'1': '2'}, ['3']), ['div', {'1': '2'}, '3']);
  deepEqual(el.DIV({'1': '2'}, el.SPAN()), ['div', {'1': '2'}, ['span']]);
  deepEqual(el.DIV({'1': '2'}, el.SPAN({'3': '4'})), ['div', {'1': '2'}, ['span', {'3': '4'}]]);
  deepEqual(el.DIV({'1': '2'}, el.SPAN({'3': '4'}, '5')), ['div', {'1': '2'}, ['span', {'3': '4'}, '5']]);

  var a = el.DIV({'class': 'test'}
          , 'before'
          , el.SPAN(
              'stuff'
            , DOMBuilder.fragment(
                el.STRONG({'class': 'very'}, 'things')
              , 'here'
              )
            )
          , 'between'
          , el.BR()
          , 'after'
          );
  deepEqual(a, ['div', {'class': 'test'}
               , 'before'
               , ['span', {}
                 , 'stuff'
                 , ['#document-fragment'
                   , ['strong', {'class': 'very'}, 'things']
                   , 'here'
                   ]
                 ]
               , 'between'
               , ['br']
               , 'after'
               ]);

  }); // DOMBuilder.withMode
});

test('Building from Array', function() {
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
'<div class=test before<span stuff<#fragment <strong class=very things>here>>between<br>after>',
        'Builds using the specified mode');
  DOMBuilder.withMode('html', function() {
    equal(''+DOMBuilder.build(a),
'<div class="test">before<span>stuff<strong class="very">things</strong>here</span>between<br>after</div>',
          'Falls back to DOMBuilder.mode if a mode is not specified');
  });
});

})();
