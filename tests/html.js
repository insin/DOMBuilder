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

test("DOMBuilder.HTMLElement", function()
{
    expect(7);

    // HTMLElement is available
    equals(typeof DOMBuilder.HTMLElement, "function");

    // No attributes or children
    var el = new DOMBuilder.HTMLElement("a");
    equal(el.tagName, "a");
    deepEqual(el.attributes, {});
    deepEqual(el.childNodes, []);
    ok(!el.xhtml);
    equal(el.toString(), "<a></a>");
    deepEqual(el, el.cloneNode());

    // Appending a child
    // Appending a fragment
    // Appending an empty fragment

    // One of each valid child
    // Initialise with a fragment

    // Attributes are lower-cased
    // Special case for &nbsp;
    // Unrecognised children are coerced to String
});

test("DOMBuilder.HTMLFragment", function()
{
    expect(3);

    // HTMLFragment is available
    equal(typeof DOMBuilder.HTMLFragment, "function");

    // No children
    var f1 = new DOMBuilder.HTMLFragment();
    deepEqual(f1.childNodes, []);
    deepEqual(f1, f1.cloneNode());

    // Initialuse with children

    // Initialise with a fragment

    // Appending a child
    // Appending a fragment
    // Appending an empty fragment

});

test("HTML Escaping", function()
{
    expect(0);
});
