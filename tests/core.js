QUnit.module('Core', {
  setup: function() {
    DOMBuilder.mode = null;
  },
  tearDown: function() {
    if (DOMBuilder.mode !== null) {
      fail('DOMBuilder.mode was not null after test completed: ' + DOMBuilder.mode);
    }
  }
});

(function() {

var el = DOMBuilder.array;

var testMode = {
  name: 'test'
, createElement: function(t, a, c) {
    var r = [];
    for (var p in a) {
      r.push(p + '=' + a[p]);
    }
    if (c.length) {
      r.push(c.join(''));
    }
    return '<' + t + (r.length ? ' ' + r.join(' ') : '') + '>';
  }
, fragment: function(c) {
    return '<#fragment' + (c.length ? ' ' + c.join('') : '') + '>';
  }
, apply: {
    testApply: function() {}
  }
};

DOMBuilder.addMode(testMode);

QUnit.test('DOMBuilder.addMode', 3, function() {
  ok(DOMBuilder.modes.test,
     'Mode object added to DOMBuilder.modes');
  equal(Object.prototype.toString.call(DOMBuilder.test),
        '[object Object]',
        'Mode-specific element functions added');
  strictEqual(DOMBuilder.modes.test.apply.testApply,
              DOMBuilder.test.testApply,
              'Mode apply properties added to mode-specific element functions');
});

QUnit.test('Element & fragment Array output', 9, function() {
  deepEqual(el.DIV(), ['div']);
  deepEqual(el.DIV('1'), ['div', '1']);
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
               ]);
});

QUnit.test('Map Array output', 4, function() {
  var items = [1, 2, 3];
  var loopStatus = [];
  var expectedLoopStatus = [{
      index: 0
    , first: true
    , last: false
    }, {
      index: 1
    , first: false
    , last: false
    }, {
      index: 2
    , first: false
    , last: true
    }];

  var result = DOMBuilder.map('li', {}, items, function(item, attrs, loop) {
    loopStatus.push(loop);
    return item;
  });
  deepEqual(result, [
      ['li', 1]
    , ['li', 2]
    , ['li', 3]
    ]);
  deepEqual(loopStatus, expectedLoopStatus);

  loopStatus = [];
  result = DOMBuilder.fragment.map(items, function(item, loop) {
    loopStatus.push(loop);
    return item;
  });
  deepEqual(result, ['#document-fragment', 1, 2, 3]);
  deepEqual(loopStatus, expectedLoopStatus);
});

QUnit.test('Building from Array', 2, function() {
  var a = ['#div1', {'class': 'test'}
          , 'before'
          , ['span.class1.class2'
            , 'stuff'
            , ['#document-fragment'
              , ['strong', {'class': 'very'}, 'things']
              , 'here'
              ]
            ]
          , 'between'
          , ['br']
          , ['i', 'i']
          , ['.div2'
            , ['h2', 'test']
            , ['span#span1.class1']
            ]
          , 'after'
          ];
  equal(DOMBuilder.build(a, 'test'),
'<div class=test id=div1 before<span class=class1 class2 stuff<#fragment <strong class=very things>here>>between<br><i i><div class=div2 <h2 test><span id=span1 class=class1>>after>',
    'Builds using the specified mode');
  DOMBuilder.withMode('html', function() {
    equal(''+DOMBuilder.build(a),
'<div class="test" id="div1">before<span class="class1 class2">stuff<strong class="very">things</strong>here</span>between<br><i>i</i><div class="div2"><h2>test</h2><span id="span1" class="class1"></span></div>after</div>',
      'Falls back to DOMBuilder.mode if a mode is not specified');
  });
});

})();
