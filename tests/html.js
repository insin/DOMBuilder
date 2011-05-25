module('HTML', {
  setup: function() {
    DOMBuilder.mode = 'HTML';
  },
  tearDown: function() {
    if (DOMBuilder.mode != 'HTML') {
      fail('DOMBuilder.mode was not "HTML" after test completed: ' + DOMBuilder.mode);
    }
  }
});

(function() {

var dom = DOMBuilder.apply();
var html = DOMBuilder.html;

test('DOMBuilder.HTMLElement', function() {
  expect(25);

  equals(typeof DOMBuilder.html.HTMLElement, 'function', 'HTMLElement is accessible via DOMBuilder.html');

  // No attributes or children
  var el = new DOMBuilder.html.HTMLElement('A');
  ok(el instanceof DOMBuilder.html.HTMLNode, 'HTMLElement is-an HTMLNode');
  equal(el.tagName, 'a', 'Tag names are lower-cased');
  deepEqual(el.attributes, {}, 'Attributes are initialised as empty if not given');
  deepEqual(el.childNodes, [], 'Children are initialised as empty if not given');
  ok(!el.xhtml, 'XHTML flag set coorectly in HTML mode');
  equal(el.toString(), '<a></a>', 'Rendering with no attributes or children');
  deepEqual(el, el.cloneNode(true), 'Clones are really clones');

  // Initialise with attributes and children
  el = new DOMBuilder.html.HTMLElement('div', {'class': 'test', title: 'test'},
                                       [dom.B('test'), dom.BR()]);
  equal(el.toString(),
        '<div class="test" title="test"><b>test</b><br></div>',
        'Rendering with attributes and children');
  deepEqual(el, el.cloneNode(true), 'Clones with attributes and children are really clones');

  // Appending a child
  var el = new DOMBuilder.html.HTMLElement('div', {'class': 'test'}, ['One']);
  equal(el.childNodes.length, 1, 'Initial childNodes count');
  el.appendChild(dom.P('Two'));
  equal(el.childNodes.length, 2, 'Post-append childNodes count');

  // Appending a fragment
  var f = DOMBuilder.fragment([dom.H2('Three'), 'Four', dom.P('Five')]);
  el.appendChild(f);
  equal(el.childNodes.length, 5, 'All fragment children were appended');
  equal(f.childNodes.length, 0, 'Fragment was emptied');
  equal(el.toString(),
        '<div class="test">One<p>Two</p><h2>Three</h2>Four<p>Five</p></div>',
        'Rendering after appending a fragment');

  // Appending an empty fragment
  el.appendChild(DOMBuilder.fragment());
  equal(el.childNodes.length, 5, 'Appending an empty fragment has no effect');

  // Initialise with a fragment
  f = DOMBuilder.fragment([dom.H2('Two'), 'Three', dom.P('Four')]);
  var el = new DOMBuilder.html.HTMLElement('div', {'class': 'test'}, ['One', f, 'Five']);
  equal(el.childNodes.length, 5, 'Fragment contents inlined on creation');
  equal(f.childNodes.length, 0, 'Fragment was emptied');
  equal(el.toString(),
        '<div class="test">One<h2>Two</h2>Three<p>Four</p>Five</div>',
        'Rendering after initialising with a fragment');

  // Attributes are lower-cased
  el = new DOMBuilder.html.HTMLElement('a', {HREF: 'test'}, ['test']);
  equal(el.toString(), '<a href="test">test</a>', "Attributes are lower-cased");

  // Special case for &nbsp;
  el.appendChild(dom.NBSP);
  equal(el.toString(), '<a href="test">test&nbsp;</a>',
        'Breaking space character converted to entity')

  // Empty tags rendered appropriately
  var emptyTags = 'area|base|br|col|frame|hr|input|img|link|meta|param'.split('|');
  function createEmptyTags() {
    return DOMBuilder.fragment.map(emptyTags, function(t) {
      return new DOMBuilder.html.HTMLElement(t);
    });
  }
  equal(createEmptyTags().toString(),
        '<area><base><br><col><frame><hr><input><img><link><meta><param>',
        'empty tags render as expected in HTML mode');
  equal(DOMBuilder.withMode('XHTML', createEmptyTags).toString(),
        '<area /><base /><br /><col /><frame /><hr /><input /><img /><link /><meta /><param />',
        'empty tags render as expected in XHTML mode');

  el = new DOMBuilder.html.HTMLElement('br', {clear: 'all'}, ['test']);
  equal(el.toString(), '<br clear="all">', 'Empty tag children are ignored if present');

  el = new DOMBuilder.html.HTMLElement('input', {type: 'button', click: function(){}});
  equal(el.toString(), '<input type="button">', ' Attributes which would have been handled by jQuery are ignored');
});

test('DOMBuilder.HTMLFragment', function() {
  expect(17);

  // HTMLFragment is available
  equal(typeof DOMBuilder.html.HTMLFragment, 'function', 'HTMLFragment is accessible via DOMBuilder');

  // No children
  var f1 = new DOMBuilder.html.HTMLFragment();
  ok(f1 instanceof DOMBuilder.html.HTMLNode, 'HTMLFragment is-an HTMLNode');
  deepEqual(f1.childNodes.length, 0, 'Children are initialised as empty if not given');
  deepEqual(f1, f1.cloneNode(true), 'Clones are really clones');
  equal(f1.toString(), '', 'Rendering with no children');

  // Initialuse with children
  var f2 = new DOMBuilder.html.HTMLFragment([dom.H2('One'), 'Two', dom.P('Three')]);
  equal(f2.childNodes.length, 3, 'Initial childNodes count');
  deepEqual(f2, f2.cloneNode(true), 'Clones are really clones');
  equal(f2.toString(), '<h2>One</h2>Two<p>Three</p>', 'Rendering with children');

  // Initialise with a fragment
  var f1 = new DOMBuilder.html.HTMLFragment([dom.B('Zero'), f2, dom.B('Four')])
  equal(f1.childNodes.length, 5,  'Fragment contents inlined on creation');
  equals(f2.childNodes.length, 0, 'Fragment which was inlined was emptied');
  equal(f1.toString(),
        '<b>Zero</b><h2>One</h2>Two<p>Three</p><b>Four</b>',
        'Rendering after initialising with a fragment');

  // Appending a child
  f2.appendChild(dom.BR());
  equal(f2.childNodes.length, 1, 'Post-append childNodes count');
  equal(f2.toString(), '<br>', 'Rendering post-append');

  // Appending a fragment
  f2.appendChild(f1);
  equal(f2.childNodes.length, 6, 'All fragment children were appended');
  equal(f1.childNodes.length, 0, 'Fragment was emptied');
  equal(f2.toString(),
        '<br><b>Zero</b><h2>One</h2>Two<p>Three</p><b>Four</b>',
        'Rendering after appending a fragment');

  // Appending an empty fragment
  f2.appendChild(f1);
  equal(f2.childNodes.length, 6, 'Appending an empty fragment has no effect');
});

test('HTML Escaping', function() {
  expect(9);

  var s = '< > & \' "';
  var ss = DOMBuilder.markSafe(s);
  ok(ss instanceof DOMBuilder.html.SafeString, 'markSafe yields SafeStrings');
  ok(ss instanceof String, 'SafeString is-a String');
  ok(!DOMBuilder.isSafe(s), 'isSafe returns false for Strings');
  ok(DOMBuilder.isSafe(ss), 'isSafe returns true for SafeStrings');

  equal(dom.P({test: s, '< > & \' "': 'test'}, s).toString(),
        '<p test="&lt; &gt; &amp; &#39; &quot;" &lt; &gt; &amp; &#39; &quot;="test">&lt; &gt; &amp; &#39; &quot;</p>',
        'sensitive characters autoescape');
  equal(DOMBuilder.createElement(s).toString(),
        '<&lt; &gt; &amp; &#39; &quot;></&lt; &gt; &amp; &#39; &quot;>',
        'unknowm tagNames autoescape');
  equal(dom.P({test: ss},ss).toString(),
        '<p test="< > & \' "">< > & \' "</p>',
        'SafeStgrings render as-is');
  equal(dom.P(DOMBuilder.markSafe('Test')).toString(),
        '<p>Test</p>',
        'SafeStrings are not used as an attributes argument if given first');
  equal(DOMBuilder.createElement('ul', {}, dom.LI.map(['<script>'])).toString(),
        '<ul><li>&lt;script&gt;</li></ul>',
        'Map list contents are escaped');
});

})();
