module("HTML", {
    setup: function() {
        DOMBuilder.mode = "HTML";
    },
    tearDown: function() {
        if (DOMBuilder.mode != "HTML") {
            fail("DOMBuilder.mode was not \"HTML\" after test completed: " + DOMBuilder.mode);
        }
    }
});

(function()
{

var dom = DOMBuilder.apply();

test("DOMBuilder.HTMLElement", function()
{
    expect(24);

    // HTMLElement is available
    equals(typeof DOMBuilder.HTMLElement, "function");

    // No attributes or children
    var el = new DOMBuilder.HTMLElement("a");
    ok(el instanceof DOMBuilder.HTMLNode, "HTMLElement is-an HTMLNode");
    equal(el.tagName, "a");
    deepEqual(el.attributes, {});
    deepEqual(el.childNodes, []);
    ok(!el.xhtml);
    equal(el.toString(), "<a></a>");
    deepEqual(el, el.cloneNode(true));

    // Initialise with attributes and children
    el = new DOMBuilder.HTMLElement("div", {"class": "test", title: "test"},
                                    [dom.B("test"), dom.BR()]);
    equal(el.toString(), '<div class="test" title="test"><b>test</b><br></div>');
    deepEqual(el, el.cloneNode(true));

    // Appending a child
    var el = new DOMBuilder.HTMLElement("div", {"class": "test"}, ["One"]);
    equal(el.childNodes.length, 1);
    el.appendChild(dom.P("Two"));
    equal(el.childNodes.length, 2);

    // Appending a fragment
    var f = DOMBuilder.fragment([dom.H2("Three"), "Four", dom.P("Five")]);
    el.appendChild(f);
    equal(el.childNodes.length, 5);
    equal(f.childNodes.length, 0);
    equal(el.toString(), '<div class="test">One<p>Two</p><h2>Three</h2>Four<p>Five</p></div>');

    // Appending an empty fragment
    el.appendChild(DOMBuilder.fragment());
    equal(el.childNodes.length, 5);

    // Initialise with a fragment
    f = DOMBuilder.fragment([dom.H2("Two"), "Three", dom.P("Four")]);
    var el = new DOMBuilder.HTMLElement("div", {"class": "test"}, ["One", f, "Five"]);
    equal(el.childNodes.length, 5);
    equal(f.childNodes.length, 0);
    equal(el.toString(), '<div class="test">One<h2>Two</h2>Three<p>Four</p>Five</div>');

    // Attributes are lower-cased
    el = new DOMBuilder.HTMLElement("a", {HREF: "test"}, ["test"]);
    equal(el.toString(), '<a href="test">test</a>', "attributes lower-cased");

    // Special case for &nbsp;
    el.appendChild(dom.NBSP);
    equal(el.toString(), '<a href="test">test&nbsp;</a>',
          "breaking space character converted to entity")

    // Empty tags rendered appropriately
    var emptyTags = "area|base|br|col|frame|hr|input|img|link|meta|param".split("|");
    function createEmptyTags()
    {
        return DOMBuilder.fragment.map(emptyTags, function(t) {
            return new DOMBuilder.HTMLElement(t);
        });
    }
    equal(createEmptyTags().toString(),
          "<area><base><br><col><frame><hr><input><img><link><meta><param>");
    equal(DOMBuilder.withMode("XHTML", createEmptyTags).toString(),
          "<area /><base /><br /><col /><frame /><hr /><input /><img /><link /><meta /><param />");


    // Empty tag children are ignored if present
    el = new DOMBuilder.HTMLElement("br", {clear: "all"}, ["test"]);
    equal(el.toString(), '<br clear="all">');
});

test("DOMBuilder.HTMLFragment", function()
{
    expect(17);

    // HTMLFragment is available
    equal(typeof DOMBuilder.HTMLFragment, "function");

    // No children
    var f1 = new DOMBuilder.HTMLFragment();
    ok(f1 instanceof DOMBuilder.HTMLNode, "HTMLFragment is-an HTMLNode");
    deepEqual(f1.childNodes.length, 0, "childNodes initialised with zero args");
    deepEqual(f1, f1.cloneNode(true));
    equal(f1.toString(), "");

    // Initialuse with children
    var f2 = new DOMBuilder.HTMLFragment([dom.H2("One"), "Two", dom.P("Three")]);
    equal(f2.childNodes.length, 3);
    deepEqual(f2, f2.cloneNode(true));
    equal(f2.toString(), "<h2>One</h2>Two<p>Three</p>");

    // Initialise with a fragment
    var f1 = new DOMBuilder.HTMLFragment([dom.B("Zero"), f2, dom.B("Four")])
    equal(f1.childNodes.length, 5, "HTMLFragment contents inlined on creation");
    equals(f2.childNodes.length, 0, "HTMLFragment which was inlined is empties");
    equal(f1.toString(), "<b>Zero</b><h2>One</h2>Two<p>Three</p><b>Four</b>");

    // Appending a child
    f2.appendChild(dom.BR());
    equal(f2.childNodes.length, 1);
    equal(f2.toString(), "<br>");

    // Appending a fragment
    f2.appendChild(f1);
    equal(f2.childNodes.length, 6);
    equal(f1.childNodes.length, 0);
    equal(f2.toString(), "<br><b>Zero</b><h2>One</h2>Two<p>Three</p><b>Four</b>");

    // Appending an empty fragment
    f2.appendChild(f1);
    equal(f2.childNodes.length, 6);
});

test("HTML Escaping", function()
{
    expect(6);

    var s = "< > & ' \"";
    var ss = DOMBuilder.markSafe(s);
    ok(ss instanceof DOMBuilder.SafeString, "markSafe yields SafeStrings");
    ok(ss instanceof String, "SafeString is-a String");
    ok(!DOMBuilder.isSafe(s), "isSafe returns false for Strings");
    ok(DOMBuilder.isSafe(ss), "isSafe returns true for SafeStrings");

    equal(dom.P({test: s}, s).toString(),
          '<p test="&lt; &gt; &amp; &#39; &quot;">&lt; &gt; &amp; &#39; &quot;</p>',
          "sensitive characters autoescape");
    equal(dom.P({test: ss},ss).toString(),
          '<p test="< > & \' "">< > & \' "</p>',
          "SafeStgrings render as-is");
});

})();
