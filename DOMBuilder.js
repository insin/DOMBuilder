(function(window)
{

var document = window.document;

// Detect and use jQuery, or create these pieces with basic workarounds in place.
var createElementWithAttributes, functionAttributes, registerEventHandler, setInnerHTML;

if (typeof window.jQuery != "undefined")
{
    functionAttributes = jQuery.attrFn;
    createElementWithAttributes = function(tagName, attributes)
    {
        return jQuery("<" + tagName + ">", attributes).get(0);
    };
    registerEventHandler = function(id, event, handler)
    {
        jQuery("#" + id)[event](handler);
    };
    setInnerHTML = function(el, html)
    {
        jQuery(el).html(html);
    };
}
else
{
    var supportsStyle = (function()
        {
            var div = document.createElement("div");
            div.style.display = "none";
            div.innerHTML = '<span style="color:silver;">s<span>';
            return /silver/.test(div.getElementsByTagName("span")[0].getAttribute("style"));
        })(),
        specialRE = /^(?:href|src|style)$/,
        attributeTranslations = {
            cellspacing: "cellSpacing",
            "class": "className",
            colspan: "colSpan",
            "for": "htmlFor",
            frameborder: "frameBorder",
            maxlength: "maxLength",
            readonly: "readOnly",
            rowspan: "rowSpan",
            tabindex: "tabIndex",
            usemap: "useMap"
        };

    functionAttributes = (function(lookup)
    {
        var attrs = ("blur focus focusin focusout load resize scroll unload " +
                     "click dblclick mousedown mouseup mousemove mouseover " +
                     "mouseout mouseenter mouseleave change select submit " +
                     "keydown keypress keyup error").split(" ");
        for (var i = 0, l = attrs.length; i < l; i++)
        {
            lookup[attrs[i]] = true;
        }
        return lookup;
    })({});

    createElementWithAttributes = function(tagName, attributes)
    {
        var el = document.createElement(tagName); // Damn you, IE

        for (var name in attributes)
        {
            var value = attributes[name],
                name = attributeTranslations[name] || name;

            if (name in functionAttributes)
            {
                el["on" + name] = value;
                continue;
            }

            var special = specialRE.test(name);
            if ((name in el || el[name] !== undefined) && !special)
                el[name] = value;
            else if (!supportsStyle && name == "style")
                el.style.cssText = ""+value;
            else
                el.setAttribute(name, ""+value);
        }

        return el;
    };

    registerEventHandler = function(id, event, handler)
    {
        document.getElementById(id)["on" + event] = handler;
    };

    setInnerHTML = function(el, html)
    {
        try
        {
            el.innerHTML = html;
        }
        catch (e)
        {
            var div = document.createElement("div");
            div.innerHTML = html;
            while (el.firstChild)
                el.removeChild(el.firstChild);
            while (div.firstChild)
                el.appendChild(div.firstChild);
        }
    };
}

/**
 * Naively copies from ``source`` to ``dest``.
 */
function extend(dest, source)
{
    for (name in source)
    {
        dest[name] = source[name];
    }
    return dest;
}

/**
 * Uses a dummy constructor to make a ``child`` constructor inherit from a
 * ``parent`` constructor.
 */
function inheritFrom(child, parent)
{
    function F() {};
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
}

function isArray(o)
{
    return (Object.prototype.toString.call(o) === "[object Array]");
}

function isFunction(o)
{
    return (Object.prototype.toString.call(o) === "[object Function]");
}

/**
 * We primarily want to distinguish between Objects and Nodes.
 */
function isObject(o)
{
    return (!!o && Object.prototype.toString.call(o) === "[object Object]" && !o.nodeType)
}

/**
 * Flattens an Array in-place, replacing any Arrays it contains with their
 * contents, and flattening their contents in turn.
 */
function flatten(a)
{
    for (var i = 0, l = a.length; i < l; i++)
    {
        var c = a[i];
        if (isArray(c))
        {
            // Make sure we loop to the Array's new length
            l += c.length - 1;
            // Replace the current item with its contents
            Array.prototype.splice.apply(a, [i, 1].concat(c));
            // Stay on the current index so we continue looping at the first
            // element of the array we just spliced in or removed.
            i--;
        }
    }
}

/**
 * Escapes sensitive HTML characters.
 */
var escapeHTML = (function()
{
    var ampRe = /&/g, ltRe = /</g, gtRe = />/g, quoteRe1 = /"/g, quoteRe2 = /'/g;
    return function(html)
    {
        return html.replace(ampRe, "&amp;")
                    .replace(ltRe, "&lt;")
                     .replace(gtRe, "&gt;")
                      .replace(quoteRe1, "&quot;")
                       .replace(quoteRe2, "&#39;");
    };
})();

/**
 * Escapes if the given input is not a ``SafeString``, otherwise returns its
 * value.
 */
function conditionalEscape(html)
{
    if (html instanceof SafeString)
    {
        return html.value;
    }
    // Ensure the value we're trying to escape is coerced to a String
    return escapeHTML(""+html);
}

/**
 * Tag names defined in the HTML 4.01 Strict and Frameset DTDs.
 */
var tagNames = ("a abbr acronym address area b bdo big blockquote body br " +
    "button caption cite code col colgroup dd del dfn div dl dt em fieldset " +
    "form frame frameset h1 h2 h3 h4 h5 h6 hr head html i iframe img input " +
    "ins kbd label legend li link map meta noscript " /* :) */ + "object ol " +
    "optgroup option p param pre q samp script select small span strong style " +
    "sub sup table tbody td textarea tfoot th thead title tr tt ul var").split(" "),
    tagNameLookup = (function(lookup)
    {
        for (var i = 0, l = tagNames.length; i < l; i++)
        {
            lookup[tagNames[i]] = true;
        }
        return lookup;
    })({});

/**
 * Lookup for tags defined as EMPTY in the HTML 4.01 Strict and Frameset DTDs.
 */
var emptyTags = (function(lookup)
{
    var tags = "area base br col frame hr input img link meta param".split(" ");
    for (var i = 0, l = tags.length; i < l; i++)
    {
        lookup[tags[i]] = true;
    }
    return lookup;
})({});

/**
 * ``String`` subclass which marks the given string as safe for inclusion
 * without escaping.
 */
function SafeString(value)
{
    this.value = value;
}
inheritFrom(SafeString, String);

SafeString.prototype.toString = SafeString.prototype.valueOf = function()
{
    return this.value;
};

/**
 * Partially emulates a DOM ``Node`` for HTML generation.
 */
function HTMLNode(childNodes)
{
    this.childNodes = childNodes || [];

    // Ensure HTMLFragment contents are inlined, as if this object's child
    // nodes were appended one-by-one.
    this._inlineFragments();
}
inheritFrom(HTMLNode, Object);

/**
 * Replaces any ``HTMLFragment`` objects in child nodes with their own
 * child nodes and empties the fragment.
 */
HTMLNode.prototype._inlineFragments = function()
{
     for (var i = 0, l = this.childNodes.length; i < l; i++)
     {
         var child = this.childNodes[i];
         if (child instanceof HTMLFragment)
         {
             this.childNodes.splice.apply(this.childNodes,
                                          [i, 1].concat(child.childNodes));
             // Clear the fragment on append, as per DocumentFragment
             child.childNodes = [];
         }
     }
};

/**
 * Emulates ``appendChild``, inserting fragment child node contents and
 * emptying the fragment if one is given.
 */
HTMLNode.prototype.appendChild = function(node)
{
    if (node instanceof HTMLFragment)
    {
        for (var i = 0, l = node.childNodes.length; i < l; i++)
        {
            this.childNodes.push(node.childNodes[i]);
        }
        // Clear the fragment on append, as per DocumentFragment
        node.childNodes = [];
    }
    else
    {
        this.childNodes.push(node);
    }
};

/**
 * Emulates ``cloneNode`` so cloning of ``HTMLFragment`` objects works
 * as expected.
 */
HTMLNode.prototype.cloneNode = function(deep)
{
    var clone = this._clone();
    if (deep === true)
    {
        for (var i = 0, l = this.childNodes.length; i < l; i++)
        {
            var node = this.childNodes[i];
            if (node instanceof HTMLElement)
            {
                clone.childNodes.push(node.cloneNode(deep));
            }
            else
            {
                clone.childNodes.push(node);
            }
        }
    }
    return clone;
};

/**
 * Creates the object to be used for deep cloning.
 */
HTMLNode.prototype._clone = function()
{
    return new Node();
};

/**
 * Partially emulates a DOM ``Element ``for HTML generation.
 */
function HTMLElement(tagName, attributes, childNodes)
{
    HTMLNode.call(this, childNodes);

    this.tagName = this.nodeName = tagName.toLowerCase();
    this.attributes = attributes || {};

    // Keep a record of whether or not closing slashes are needed, as the
    // mode could change before this object is coerced to a String.
    this.xhtml = (DOMBuilder.mode == "XHTML");
}
inheritFrom(HTMLElement, HTMLNode);

HTMLElement.eventTrackerId = 1;

HTMLElement.prototype.nodeType = 1;

HTMLElement.prototype._clone = function()
{
    var clone = new HTMLElement(this.tagName, extend({}, this.attributes));
    clone.xhtml = this.xhtml;
    return clone;
};

/**
 * Creates an HTML/XHTML representation of an HTMLElement.
 *
 * If ``true`` is passed as an argument and any event attributes are found, this
 * method will ensure the resulting element has an id so  the handlers for the
 * event attributes can be registered after the element has been inserted into
 * the document via ``innerHTML``.
 *
 * If necessary, a unique id will be generated.
 */
HTMLElement.prototype.toString = function()
{
    var trackEvents = arguments[0] || false,
        tagName = (tagNameLookup[this.tagName]
                   ? this.tagName
                   : conditionalEscape(this.tagName));

    // Opening tag
    var parts = ["<" + tagName];
    for (var attr in this.attributes)
    {
        // Don't create attributes which wouldn't make sense in HTML mode -
        // they can be dealt with afet insertion using registerEventHandlers().
        if (attr in functionAttributes)
        {
            if (trackEvents === true && !this.eventsFound)
            {
                this.eventsFound = true;
            }
            continue;
        }
        parts.push(" " + conditionalEscape(attr.toLowerCase()) + "=\"" +
                   conditionalEscape(this.attributes[attr]) + "\"");
    }
    if (this.eventsFound && !("id" in this.attributes))
    {
        // Ensure an id is present so we can grab this element later
        this.generatedId  = "__DB" + HTMLElement.eventTrackerId++ + "__";
        parts.push(' id="' + this.generatedId + '"');
    }
    parts.push(">");

    if (emptyTags[tagName])
    {
        if (this.xhtml)
        {
            parts.splice(parts.length - 1, 1, " />");
        }
        return parts.join("");
    }

    // Contents
    for (var i = 0, l = this.childNodes.length; i < l; i++)
    {
        var node = this.childNodes[i];
        if (node instanceof HTMLElement || node instanceof SafeString)
        {
            parts.push(node.toString());
        }
        else if (node === "\u00A0")
        {
            // Special case to convert these back to entities,
            parts.push("&nbsp;");
        }
        else
        {
            // Coerce to string and escape
            parts.push(escapeHTML(""+node));
        }
    }

    // Closing tag
    parts.push("</" + tagName + ">");
    return parts.join("");
};

/**
 * If event attributes were found when ``toString(true)`` was called, this
 * method will retrieve the resulting DOM Element by id, attach event handlers
 * to it and call ``registerEventHandlers`` on any HTMLElement children.
 */
HTMLElement.prototype.registerEventHandlers = function()
{
    if (this.eventsFound)
    {
        var id = ("id" in this.attributes
                  ? conditionalEscape(this.attributes.id)
                  : this.generatedId);
        for (var attr in this.attributes)
        {
            if (attr in functionAttributes)
            {
                registerEventHandler(id, attr, this.attributes[attr]);
            }
        }

        delete this.eventsFound;
        delete this.generatedId;
    }

    for (var i = 0, l = this.childNodes.length; i < l; i++)
    {
        var node = this.childNodes[i];
        if (node instanceof HTMLElement)
        {
            node.registerEventHandlers();
        }
    }
};

HTMLElement.prototype.insertAndRegister = function(el)
{
    setInnerHTML(el, this.toString(true));
    this.registerEventHandlers();
};

/**
 * Partially emulates a DOM ``DocumentFragment`` for HTML generation.
 */
function HTMLFragment(childNodes)
{
    HTMLNode.call(this, childNodes);
}
inheritFrom(HTMLFragment, HTMLNode);

HTMLFragment.prototype._clone = function()
{
    return new HTMLFragment();
};

HTMLFragment.prototype.nodeType = 11;
HTMLFragment.prototype.nodeName = "#document-fragment";

/**
 * Creates an HTML/XHTML representation of an HTMLFragment.
 *
 * If ``true``is passed as an argument, it will be passed on to
 * any child HTMLElements when their ``toString()`` is called.
 */
HTMLFragment.prototype.toString = function()
{
    var trackEvents = arguments[0] || false,
        parts = [];

    // Contents
    for (var i = 0, l = this.childNodes.length; i < l; i++)
    {
        var node = this.childNodes[i];
        if (node instanceof HTMLElement || node instanceof SafeString)
        {
            parts.push(node.toString(trackEvents));
        }
        else if (node === "\u00A0")
        {
            // Special case to convert these back to entities,
            parts.push("&nbsp;");
        }
        else
        {
            // Coerce to string and escape
            parts.push(escapeHTML(""+node));
        }
    }

    return parts.join("");
};

/**
 * Calls ``registerEventHandlers()`` on any HTMLElement children.
 */
HTMLFragment.prototype.registerEventHandlers = function()
{
    for (var i = 0, l = this.childNodes.length; i < l; i++)
    {
        var node = this.childNodes[i];
        if (node instanceof HTMLElement)
        {
            node.registerEventHandlers();
        }
    }
};

HTMLFragment.prototype.insertAndRegister = function(el)
{
    setInnerHTML(el, this.toString(true));
    this.registerEventHandlers();
};

/**
 * Creates a function which, when called, uses DOMBuilder to create an element
 * with the given ``tagName``.
 *
 * The resulting function will also have a ``map`` function which calls
 * ``DOMBuilder.map`` with the given ``tagName``.
 */
function createElementFunction(tagName)
{
    var elementFunction = function()
    {
        if (arguments.length == 0)
        {
            // Short circuit if there are no arguments, to avoid further
            // argument inspection.
            if (DOMBuilder.mode == "DOM")
            {
                return document.createElement(tagName);
            }
            else
            {
                return new HTMLElement(tagName);
            }
        }
        else
        {
            return DOMBuilder._createElementFromArguments(tagName,
                                                          arguments);
        }
    };

    // Add a ``map`` function which will call ``DOMBuilder.map`` with the
    // appropriate ``tagName``.
    elementFunction.map = function()
    {
        var mapArgs = Array.prototype.slice.call(arguments);
        mapArgs.unshift(tagName);
        return DOMBuilder.map.apply(DOMBuilder, mapArgs);
    };

    return elementFunction;
}

var DOMBuilder = {};

/**
 * Determines which mode the ``createElement`` function will operate in.
 * Supported values are:
 *
 * ``"DOM"``
 *    create DOM Elements.
 * ``"HTML"``
 *    create HTML Strings.
 * ``"XHTML"``
 *    create XHTML Strings.
 */
DOMBuilder.mode = "DOM";

/**
 * Calls a function using DOMBuilder temporarily in the given mode and
 * returns its output.
 *
 * This is primarily intended for using DOMBuilder to generate HTML
 * strings when running in the browser without having to manage the
 * mode flag yourself.
 */
DOMBuilder.withMode = function(mode, func)
{
    var originalMode = this.mode;
    this.mode = mode;
    try
    {
        return func();
    }
    finally
    {
        this.mode = originalMode;
    }
};

/**
 * An ``Object`` containing element creation functions.
 */
DOMBuilder.elementFunctions = (function()
{
    var o = {};
    for (var i = 0, tagName; tagName = tagNames[i]; i++)
    {
        o[tagName.toUpperCase()] = createElementFunction(tagName);
    }
    return o;
})();

/**
 * Adds element creation functions to a given context ``Object``, or to
 * a new object if none was given. Returns the object the functions were
 * added to, either way.
 *
 * An ``NBSP`` property corresponding to the Unicode character for a
 * non-breaking space is also added to the context object, for
 * convenience.
 */
DOMBuilder.apply = function(context)
{
    context = context || {};
    extend(context, this.elementFunctions);
    context.NBSP = "\u00A0"; // Add NBSP for backwards-compatibility
    return context;
};

/**
 * Normalises a list of arguments in order to create a new DOM element
 * using ``DOMBuilder.createElement``. Supported argument formats are:
 *
 * ``(attributes, child1, ...)``
 *    an attributes object followed by an arbitrary number of children.
 * ``(attributes, [child1, ...])``
 *    an attributes object and an ``Array`` of children.
 * ``(child1, ...)``
 *    an arbitrary number of children.
 * ``([child1, ...])``
 *    an ``Array`` of children.
 *
 * At least one argument *must* be provided.
 */
DOMBuilder._createElementFromArguments = function(tagName, args)
{
    var attributes, children;
    // The short circuit in ``createElementFunction`` ensures we will
    // always have at least one argument when called via element creation
    // functions.
    var argsLength = args.length, firstArg = args[0];

    if (argsLength == 1 &&
        isArray(firstArg))
    {
        children = firstArg; // ([child1, ...])
    }
    else if (isObject(firstArg))
    {
        attributes = firstArg;
        children = (argsLength == 2 && isArray(args[1])
                    ? args[1]                               // (attributes, [child1, ...])
                    : Array.prototype.slice.call(args, 1)); // (attributes, child1, ...)
    }
    else
    {
        children = Array.prototype.slice.call(args); // (child1, ...)
    }

    return this.createElement(tagName, attributes, children);
};

/**
 * Creates a DOM element with the given tag name and optionally,
 * the given attributes and children.
 */
DOMBuilder.createElement = function(tagName, attributes, children)
{
    attributes = attributes || {};
    children = children || [];
    flatten(children);

    if (this.mode != "DOM")
    {
        return new HTMLElement(tagName, attributes, children);
    }

    // Create the element and set its attributes and event listeners
    var el = createElementWithAttributes(tagName, attributes);

    // Append children
    for (var i = 0, l = children.length; i < l; i++)
    {
        var child = children[i];
        if (child.nodeType)
        {
            el.appendChild(child);
        }
        else
        {
            el.appendChild(document.createTextNode(""+child));
        }
    }

    return el;
};

/**
 * Creates an element for (potentially) every item in a list. Supported
 * argument formats are:
 *
 * 1. ``(tagName, defaultAttributes, [item1, ...], mappingFunction)``
 * 2. ``(tagName, [item1, ...], mappingFunction)``
 *
 * Arguments are as follows:
 *
 * ``tagName``
 *    the name of the element to create.
 * ``defaultAttributes`` (optional)
 *    default attributes for the element.
 * ``items``
 *    the list of items to use as the basis for creating elements.
 * ``mappingFunction`` (optional)
 *    a function to be called with each item in the list to provide
 *    contents for the element which will be created for that item.
 *
 *    Contents can consist of a single value  or a mixed ``Array``.
 *
 *    If provided, the function will be called with the following
 *    arguments::
 *
 *       func(item, attributes, itemIndex)
 *
 *    Attributes on the element which will be created can be altered by
 *    modifying the ``attributes argument, which will initially contain
 *    the contents of ``defaultAttributes``, if it was provided.
 *
 *    The function can prevent an element being generated for a given
 *    item by returning ``null``.
 *
 *    If not provided, each item will result in the creation of a new
 *    element and the item itself will be used as the only contents.
 */
DOMBuilder.map = function(tagName)
{
    // Determine how the function was called
    if (isArray(arguments[1]))
    {
         // (tagName, items, func)
        var defaultAttrs = {},
            items = arguments[1],
            func = (isFunction(arguments[2]) ? arguments[2] : null);
    }
    else
    {
        // (tagName, attrs, items, func)
        var defaultAttrs = arguments[1],
            items = arguments[2],
            func = (isFunction(arguments[3]) ? arguments[3] : null);
    }

    var results = [];
    for (var i = 0, l = items.length; i < l; i++)
    {
        var attrs = extend({}, defaultAttrs);
        // If we were given a mapping function, call it and use the
        // return value as the contents, unless the function specifies
        // that the item shouldn't generate an element by explicity
        // returning null.
        if (func !== null)
        {
            var children = func(items[i], attrs, i);
            if (children === null)
            {
                continue;
            }
        }
        else
        {
            // If we weren't given a mapping function, use the item as the
            // contents.
            var children = items[i];
        }

        // Ensure children are in an Array, as required by createElement
        if (!isArray(children))
        {
            children = [children];
        }

        results.push(this.createElement(tagName, attrs, children));
    }
    return results;
};

/**
 * Creates a ``DocumentFragment`` with the given children. Supported
 * argument formats are:
 *
 * ``(child1, ...)``
 *    an arbitrary number of children.
 * ``([child1, ...])``
 *    an ``Array`` of children.
 *
 * A ``DocumentFragment`` conveniently allows you to append its contents
 * with a single call. If you're thinking of adding a wrapper ``<div>``
 * solely to be able to insert a number of sibling elements at the same
 * time, a ``DocumentFragment`` will do the same job without the need for
 * a redundant wrapper element.
 *
 * See http://ejohn.org/blog/dom-documentfragments/ for more information
 * about ``DocumentFragment`` objects.
 */
DOMBuilder.fragment = function()
{
    if (arguments.length == 1 &&
        isArray(arguments[0]))
    {
        var children = arguments[0]; // ([child1, ...])
    }
    else
    {
        var children = Array.prototype.slice.call(arguments) // (child1, ...)
    }

    // Inline the contents of any child Arrays
    flatten(children);

    if (this.mode != "DOM")
    {
        return new HTMLFragment(children);
    }

    var fragment = document.createDocumentFragment();
    for (var i = 0, l = children.length; i < l; i++)
    {
        var child = children[i];
        if (child.nodeType)
        {
            fragment.appendChild(child);
        }
        else
        {
            fragment.appendChild(document.createTextNode(""+child));
        }
    }

    return fragment;
};

/**
 * Creates a fragment wrapping content created for every item in a
 * list.
 *
 * Arguments are as follows:
 *
 * ``items``
 *    the list of items to use as the basis for creating fragment
 *    contents.
 * ``mappingFunction``
 *    a function to be called with each item in the list, to provide
 *    contents for the fragment.
 *
 *    Contents can consist of a single value or a mixed ``Array``.
 *
 *    The function will be called with the following arguments::
 *
 *       func(item, itemIndex)
 *
 *    The function can indicate that the given item shouldn't generate
 *    any content for the fragment by returning ``null``.
 */
DOMBuilder.fragment.map = function(items, func)
{
    // If we weren't given a mapping function, the user may as well just
    // have created a fragment directly, as we're just wrapping content
    // here, not creating it.
    if (!isFunction(func))
    {
        return DOMBuilder.fragment(items);
    }

    var results = [];
    for (var i = 0, l = items.length; i < l; i++)
    {
        // Call the mapping function and add the return value to the
        // fragment contents, unless the function specifies that the item
        // shouldn't generate content by explicity returning null.
        var children = func(items[i], i);
        if (children === null)
        {
            continue;
        }
        results = results.concat(children);
    }
    return DOMBuilder.fragment(results);
};

/**
 * Marks a string as safe
 */
DOMBuilder.markSafe = function(value)
{
    return new SafeString(value);
};

/**
 * Determines if a string is safe.
 */
DOMBuilder.isSafe = function(value)
{
    return (value instanceof SafeString);
};

DOMBuilder.HTMLElement = HTMLElement;
DOMBuilder.HTMLFragment = HTMLFragment;
DOMBuilder.HTMLNode = HTMLNode;
DOMBuilder.SafeString = SafeString;

// Expose DOMBuilder to the global object
window.DOMBuilder = DOMBuilder;

})(window);
