module('DOM', {
  setup: function() {
    DOMBuilder.mode = 'dom';
  },
  tearDown: function() {
    if (DOMBuilder.mode != 'dom') {
      fail('DOMBuilder.mode was not "dom" after test completed: ' + DOMBuilder.mode);
    }
  }
});

(function() {

var dom = DOMBuilder.dom;

test('Regressions', function() {
  // Button values in IE 6/7
  var button = dom.BUTTON({value: 'test'});
  ok('No error creating <button> with value attribute in IE6/7');
});

test('DOMBuilder.textNode', function() {
  var text = DOMBuilder.textNode('test');
  equal(text.nodeType, 3, 'Text Node created');
});

})();
