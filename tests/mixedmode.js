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

function testEventHandlers()
{
    return DOMBuilder.fragment(
      dom.DIV({id: "testElement", click: function() { $("#testOutput").text("PASS"); }}),
      dom.DIV({id: "testOutput"}, "FAIL")
    );
}

test("DOM Event Handlers", function()
{
    expect(1);

    var fragment = DOMBuilder.withMode("DOM", testEventHandlers);
    $("#qunit-fixture").append(fragment);
    $("#testElement").trigger("click");
    equal("PASS",  $("#testOutput").text(), "click handler executed");
});

test("HTML Event Handlers", function()
{
    expect(1);

    var fragment = DOMBuilder.withMode("HTML", testEventHandlers);
    fragment.insertWithEvents($("#qunit-fixture").get(0));
    $("#testElement").trigger("click");
    equal("PASS",  $("#testOutput").text(), "click handler executed");
});

test("HTML Event Handlers on nested elements", function()
{
    expect(1);

    var fragment = DOMBuilder.withMode("HTML", function()
    {
        return dom.DIV(
          dom.DIV({id: "testElement", click: function() { $("#testOutput").text("PASS"); }}),
          dom.DIV({id: "testOutput"}, "FAIL")
        );
    });
    fragment.insertWithEvents($("#qunit-fixture").get(0));
    $("#testElement").trigger("click");
    equal("PASS",  $("#testOutput").text(), "click handler executed");
});

test("insertWithEvents on elements with readonly innerHTML (IE)", function()
{
    expect(2);

    DOMBuilder.mode = "DOM";
    var fixture = $("#qunit-fixture"),
        table = dom.TABLE(dom.TBODY());
    fixture.append(table);
    var fragment = DOMBuilder.withMode("HTML", testEventHandlers);
    fragment.insertWithEvents(fixture.get(0));
    ok("An exceptions wasn't thrown");
    $("#testElement").trigger("click");
    equal("PASS",  $("#testOutput").text(), "click handler executed");
});

function testInnerHTML()
{
  return dom.DIV({innerHTML: "test1<span>test2</span>"}, dom.P(), dom.P(), dom.P());
}

test("DOM innerHTML", function()
{
    expect(3);

    var div = DOMBuilder.withMode("DOM", testInnerHTML);
    equal(div.childNodes.length, 2, "correct number of child nodes");
    equal(div.childNodes[0].nodeValue, "test1");
    equal(div.childNodes[1].nodeName.toLowerCase(), "span");
});

test("HTML innerHTML", function()
{
    expect(1);

    var div = DOMBuilder.withMode("HTML", testInnerHTML);
    equal(""+div, '<div>test1<span>test2</span></div>');
});

function testNodeChecks()
{
    return dom.DIV(null, undefined, true, false, 1, 0);
}

test("DOM child checks", function()
{
    expect(2);

    var div = DOMBuilder.withMode("DOM", testNodeChecks);
    equal(div.childNodes.length, 6, "correct number of child nodes");
    equal(div.innerHTML, "nullundefinedtruefalse10", "Children coerced to String");
});

test("HTML child checks", function()
{
    expect(1);

    var div = DOMBuilder.withMode("HTML", testNodeChecks);
    equal("" + div, "<div>nullundefinedtruefalse10</div>");
});

test("Arguments supplied to withMode", function()
{
    expect(1);

    var div = DOMBuilder.withMode("HTML", function(a,b,c) { return dom.DIV(a, b, c); }, 1, 2, 3);
    equal("" + div, "<div>123</div>");
});

})();