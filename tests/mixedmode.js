// Tests which can exercise both mode code paths with the same test code to the
// extent that the HTML mode mocks mimic the DOM mode.
module("Mixed mode");

(function()
{

var dom = DOMBuilder.apply();

function testBothModes(testFunc)
{
    DOMBuilder.withMode("DOM", testFunc)
    DOMBuilder.withMode("HTML", testFunc);
}

test("DOMBuilder.withMode", function()
{
    expect(7);

    DOMBuilder.mode = "DOM";
    raises(function()
    {
        DOMBuilder.withMode("HTML", function()
        {
            equal(DOMBuilder.mode, "HTML", "node set correctly within function");
            equal(DOMBuilder.withMode("XHTML", function()
            {
                equal(DOMBuilder.mode, "XHTML", "node set correctly within nested function");
                return "great success";
            }), "great success", "functon return value passed back");
            equal(DOMBuilder.mode, "HTML", "node set back correctly after nested function");

            DOMBuilder.withMode("XHTML", function()
            {
                equal(DOMBuilder.mode, "XHTML", "node set correctly within nested function");
                x // ReferenceError
            });
            fail("exception should be bubbling right about now");
        });
    }, "Exception from within nested withMode bubbled up");
    equal(DOMBuilder.mode, "DOM", "withMode set mode back when exception was thrown");
});

test("Fragment contents are moved when a fragment is appended", function()
{
    expect(8);

    testBothModes(function()
    {
        var fragment = DOMBuilder.fragment(dom.P(), dom.P(), dom.P());
        var el = dom.P(fragment);
        equal(3, el.childNodes.length, "fragment contents were appended");
        equal(0, fragment.childNodes.length, "fragment was cleared");

        var fragment = DOMBuilder.fragment(dom.P(), dom.P(), dom.P());
        var f = DOMBuilder.fragment(fragment);
        equal(3, f.childNodes.length, "fragment contents were appended");
        equal(0, fragment.childNodes.length, "fragment was cleared");
    });
});

test("Regression: Issue 2", function()
{
    // Nested Lists of elements should be flattened when passed into
    // createElement or fragment.
    expect(20);

    // Basic scenario
    testBothModes(function()
    {
        var el = dom.DIV(dom.P(), dom.P.map(["One", "Two"]));
        equal(el.childNodes.length, 3, "element: Array siblings don't throw exceptions");

        el = DOMBuilder.fragment(dom.P(), dom.P.map(["One", "Two"]));
        equal(el.childNodes.length, 3, "fragment: Array siblings don't throw exceptions");
    });

    // Empty lists are removed by flattening
    testBothModes(function()
    {
        var el = dom.DIV(dom.P(), []);
        equal(el.childNodes.length, 1, "element: empty lists are removed");

        el = DOMBuilder.fragment(dom.P(), []);
        equal(el.childNodes.length, 1, "fragment: empty lists are removed");
    });

    // Multiple levels of nesting
    testBothModes(function()
    {
        var el = dom.DIV(dom.P(),
                         [dom.P(), dom.P(),
                           [],
                           [dom.P(), dom.P(), dom.P(),
                             [dom.P()]
                           ]
                         ]);
        equal(el.childNodes.length, 7, "element: multiply nested content flattened");

        var el = DOMBuilder.fragment(dom.P(),
                                     [dom.P(), dom.P(),
                                       [],
                                       [dom.P(), dom.P(), dom.P(),
                                         [dom.P()]
                                       ]
                                     ]);
        equal(el.childNodes.length, 7, "fragment: multiply nested content flattened");
    });

    // Nested fragment contents shoould still be appended
    testBothModes(function()
    {
        var fragment = DOMBuilder.fragment(dom.P(), [dom.P(), dom.P()]);
        var el = dom.P(dom.P(), [dom.P(), fragment]);
        equal(5, el.childNodes.length, "element: nested fragment contents were appended");
        equal(0, fragment.childNodes.length, "fragment was cleared");

        var fragment = DOMBuilder.fragment(dom.P(), [dom.P(), dom.P()]);
        var f = DOMBuilder.fragment(dom.P(), [dom.P(), fragment]);
        equal(5, f.childNodes.length, "fragment: nested fragment contents were appended");
        equal(0, fragment.childNodes.length, "nested fragment was cleared");
    });
});

})();