module('DOM', {
  setup: function() {
    DOMBuilder.mode = 'DOM';
  },
  tearDown: function() {
    if (DOMBuilder.mode != 'DOM') {
      fail('DOMBuilder.mode was not "DOM" after test completed: ' + DOMBuilder.mode);
    }
  }
});

(function() {

var dom = DOMBuilder.apply();

})();
