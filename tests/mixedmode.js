// Tests which can exercise both mode code paths with the same test code to the
// extent that the HTML mode mocks mimic the DOM mode.
module('Mixed mode');

(function() {

var mixed = DOMBuilder.elements;

function testBothModes(testFunc) {
  DOMBuilder.withMode('dom', testFunc);
  DOMBuilder.withMode('html', testFunc);
}

test('DOMBuilder.apply', function() {
  var context = {};
  DOMBuilder.apply(context, 'badmode');
  var allElementFunctionsPresent = true;
  for (var i = 0, tagName; tagName =  DOMBuilder.util.TAG_NAMES[i]; i++) {
    if (typeof context[tagName.toUpperCase()] != 'function') {
      allElementFunctionsPresent = false;
      break;
    }
  }
  ok(allElementFunctionsPresent, 'All expected element functions were added to context object');
  ok(true, 'An exception was not raised when an invalid mode was passed');
});

test('DOMBuilder.withMode', function() {
  expect(6);

  DOMBuilder.mode = 'dom';
  raises(function() {
    DOMBuilder.withMode('html', function() {
      equal(DOMBuilder.mode, 'html', 'mode set correctly within function');
      DOMBuilder.withMode('template', function() {
        equal(DOMBuilder.mode, 'template', 'mode set correctly within nested function');
      });
      equal(DOMBuilder.mode, 'html', 'mode set back correctly after nested function');
      DOMBuilder.withMode('template', function() {
        equal(DOMBuilder.mode, 'template', 'mode set correctly within nested function');
        x; // ReferenceError
      });
      fail('exception should be bubbling right about now');
    });
  }, 'Exception from within nested withMode bubbled up');
  equal(DOMBuilder.mode, 'dom', 'withMode set mode back when exception was thrown');
});

test('Fragment contents are moved when a fragment is appended', function() {
  expect(8);

  testBothModes(function() {
    var fragment = DOMBuilder.fragment(mixed.P(), mixed.P(), mixed.P());
    var el = mixed.P(fragment);
    equal(3, el.childNodes.length, 'fragment contents were appended');
    equal(0, fragment.childNodes.length, 'fragment was cleared');

    var fragment = DOMBuilder.fragment(mixed.P(), mixed.P(), mixed.P());
    var f = DOMBuilder.fragment(fragment);
    equal(3, f.childNodes.length, 'fragment contents were appended');
    equal(0, fragment.childNodes.length, 'fragment was cleared');
  });
});

test('Regression: Issue 2', function() {
  // Nested Lists of elements should be flattened when passed into
  // createElement or fragment.
  expect(20);

  // Basic scenario
  testBothModes(function() {
    var el = mixed.DIV(mixed.P(), mixed.P.map(['One', 'Two']));
    equal(el.childNodes.length, 3, "element: Array siblings don't throw exceptions");

    el = DOMBuilder.fragment(mixed.P(), mixed.P.map(['One', 'Two']));
    equal(el.childNodes.length, 3, "fragment: Array siblings don't throw exceptions");
  });

  // Empty lists are removed by flattening
  testBothModes(function() {
    var el = mixed.DIV(mixed.P(), []);
    equal(el.childNodes.length, 1, 'element: empty lists are removed');

    el = DOMBuilder.fragment(mixed.P(), []);
    equal(el.childNodes.length, 1, 'fragment: empty lists are removed');
  });

  // Multiple levels of nesting
  testBothModes(function() {
    var el = mixed.DIV(mixed.P(),
                     [mixed.P(), mixed.P(),
                       [],
                       [mixed.P(), mixed.P(), mixed.P(),
                         [mixed.P()]
                       ]
                     ]);
    equal(el.childNodes.length, 7, 'element: multiply nested content flattened');

    var el = DOMBuilder.fragment(mixed.P(),
                                 [mixed.P(), mixed.P(),
                                   [],
                                   [mixed.P(), mixed.P(), mixed.P(),
                                     [mixed.P()]
                                   ]
                                 ]);
    equal(el.childNodes.length, 7, 'fragment: multiply nested content flattened');
  });

  // Nested fragment contents shoould still be appended
  testBothModes(function() {
    var fragment = DOMBuilder.fragment(mixed.P(), [mixed.P(), mixed.P()]);
    var el = mixed.P(mixed.P(), [mixed.P(), fragment]);
    equal(5, el.childNodes.length, 'element: nested fragment contents were appended');
    equal(0, fragment.childNodes.length, 'fragment was cleared');

    var fragment = DOMBuilder.fragment(mixed.P(), [mixed.P(), mixed.P()]);
    var f = DOMBuilder.fragment(mixed.P(), [mixed.P(), fragment]);
    equal(5, f.childNodes.length, 'fragment: nested fragment contents were appended');
    equal(0, fragment.childNodes.length, 'nested fragment was cleared');
  });
});

function testEventHandlers() {
  return DOMBuilder.fragment(
    mixed.DIV({id: 'testElement', click: function() { $('#testOutput').text('PASS'); }}),
    mixed.DIV({id: 'testOutput'}, 'FAIL')
  );
}

test('DOM Event Handlers', function() {
  expect(1);

  var fragment = DOMBuilder.withMode('dom', testEventHandlers);
  $('#qunit-fixture').append(fragment);
  $('#testElement').trigger('click');
  equal('PASS',  $('#testOutput').text(), 'click handler executed');
});

test('HTML Event Handlers', function() {
  expect(1);

  var fragment = DOMBuilder.withMode('html', testEventHandlers);
  fragment.insertWithEvents($('#qunit-fixture').get(0));
  $('#testElement').trigger('click');
  equal('PASS',  $('#testOutput').text(), 'click handler executed');
});

test('HTML Event Handlers on nested elements', function() {
  expect(1);

  var fragment = DOMBuilder.withMode('html', function() {
    return mixed.DIV(
      mixed.DIV({id: 'testElement', click: function() { $('#testOutput').text('PASS'); }}),
      mixed.DIV({id: 'testOutput'}, 'FAIL')
    );
  });
  fragment.insertWithEvents($('#qunit-fixture').get(0));
  $('#testElement').trigger('click');
  equal('PASS',  $('#testOutput').text(), 'click handler executed');
});

test('insertWithEvents on elements with readonly innerHTML (IE)', function() {
  expect(2);

  DOMBuilder.mode = 'dom';
  var fixture = $('#qunit-fixture'),
      table = mixed.TABLE(mixed.TBODY());
  fixture.append(table);
  var fragment = DOMBuilder.withMode('html', testEventHandlers);
  fragment.insertWithEvents(fixture.get(0));
  ok("An exception wasn't thrown");
  $('#testElement').trigger('click');
  equal('PASS',  $('#testOutput').text(), 'click handler executed');
});

function testInnerHTML() {
  return mixed.DIV({innerHTML: 'test1<span>test2</span>'}, mixed.P(), mixed.P(), mixed.P());
}

test('DOM innerHTML', function() {
  expect(3);

  var div = DOMBuilder.withMode('dom', testInnerHTML);
  equal(div.childNodes.length, 2, 'correct number of child nodes');
  equal(div.childNodes[0].nodeValue, 'test1');
  equal(div.childNodes[1].nodeName.toLowerCase(), 'span');
});

test('HTML innerHTML', function() {
  expect(1);

  var div = DOMBuilder.withMode('html', testInnerHTML);
  equal(''+div, '<div>test1<span>test2</span></div>');
});

function testNodeChecks() {
  return mixed.DIV(null, undefined, true, false, 1, 0);
}

test('DOM child checks', function() {
  expect(2);

  var div = DOMBuilder.withMode('dom', testNodeChecks);
  equal(div.childNodes.length, 6, 'correct number of child nodes');
  equal(div.innerHTML, 'nullundefinedtruefalse10', 'Children coerced to String');
});

test('HTML child checks', function() {
  expect(1);

  var div = DOMBuilder.withMode('html', testNodeChecks);
  equal('' + div, '<div>nullundefinedtruefalse10</div>');
});

test('Arguments supplied to withMode', function() {
  expect(1);

  var div = DOMBuilder.withMode('html', function(a,b,c) { return mixed.DIV(a, b, c); }, 1, 2, 3);
  equal('' + div, '<div>123</div>');
});

// TODO Mode-specific creation functions should ignore DOMBuilder.mode

})();