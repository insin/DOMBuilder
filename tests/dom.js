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

})();
