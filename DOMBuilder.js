(function(window, jQuery)
{

var document = window.document;

/**
 * Flattens an  Array in-place, replacing any Arrays it contains with their
 * contents, and flattening their contents in turn.
 */
function flatten(a)
{
    for (var i = 0, l = a.length; i < l; i++)
    {
        var c = a[i];
        if (jQuery.isArray(c))
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
 * Lookup for tags defined as EMPTY in the HTML 4.01 Strict and Frameset DTDs.
 */
var emptyTags = (function()
{
    var lookup = {};
    jQuery.each("area base br col frame hr input img link meta param".split(" "),
                function(i, name) { lookup[name] = true; });
    return lookup;
})();

/**
 * ``String`` subclass which marks the given string as safe for inclusion
 * without escaping.
 */
function SafeString(value)
{
    this.value = value;
}
SafeString.prototype = jQuery.extend(new String(),
{
    constructor: SafeString
});
// IE won't enumerate any properties which are named in Object.prototype and
// jQuery.extend doesn't special case this for performance reasons, so we need
// to explicitly add those functions to prototypes.
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
HTMLNode.prototype =
{
    constructor: HTMLNode,

    /**
     * Replaces any ``HTMLFragment`` objects in child nodes with their own
     * child nodes and empties the fragment.
     */
    _inlineFragments: function()
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
    },

    /**
     * Emulates ``appendChild``, inserting fragment child node contents and
     * emptying the fragment if one is given.
     */
    appendChild: function(node)
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
    },

    /**
     * Emulates ``cloneNode`` so cloning of ``HTMLFragment`` objects works
     * as expected.
     */
    cloneNode: function(deep)
    {
        var clone = this._createCloneObject();
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
    },

    /**
     * Creates the object to be used for deep cloning.
     */
    _createCloneObject: function()
    {
        return new Node();
    }
};

/**
 * Partially emulates a DOM ``Element ``for HTML generation.
 */
function HTMLElement(tagName, attributes, childNodes)
{
    HTMLNode.call(this, childNodes);

    this.tagName = tagName.toLowerCase();
    this.attributes = attributes || {};

    // Keep a record of whether or not closing slashes are needed, as the
    // mode could change before this object is coerced to a String.
    this.xhtml = (DOMBuilder.mode == "XHTML");
}
HTMLElement.prototype = jQuery.extend(new HTMLNode(),
{
    constructor: HTMLElement,

    _createCloneObject: function()
    {
        var clone = new HTMLElement(this.tagName, jQuery.extend({}, this.attributes));
        clone.xhtml = this.xhtml;
        return clone;
    }
});

/**
 * Creates an HTML/XHTML representation of an HTMLElement.
 */
HTMLElement.prototype.toString = function()
{
    // Opening tag
    var parts = ["<" + this.tagName];
    for (var attr in this.attributes)
    {
        // Don't create attributes which would have been handled by jQuery in
        // DOM mode.
        if (attr in jQuery.attrFn)
        {
            continue;
        }
        parts.push(" " + attr.toLowerCase() + "=\"" +
                   conditionalEscape(this.attributes[attr]) + "\"");
    }
    parts.push(">");

    if (emptyTags[this.tagName])
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
    parts.push("</" + this.tagName + ">");
    return parts.join("");
};

/**
 * Partially emulates a DOM ``DocumentFragment`` for HTML generation.
 */
function HTMLFragment(childNodes)
{
    HTMLNode.call(this, childNodes);
}
HTMLFragment.prototype = jQuery.extend(new HTMLNode(),
{
    constructor: HTMLFragment,

    _createCloneObject: function()
    {
        return new HTMLFragment();
    }
});

/**
 * Creates an HTML/XHTML representation of an HTMLFragment.
 */
HTMLFragment.prototype.toString = function()
{
    var parts = [];

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

    return parts.join("");
};

var DOMBuilder =
{
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
    mode: "DOM",

    /**
     * Calls a function using DOMBuilder temporarily in the given mode and
     * returns its output.
     *
     * This is primarily intended for using DOMBuilder to generate HTML
     * strings when running in the browser without having to manage the
     * mode flag yourself.
     */
    withMode: function(mode, func)
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
    },

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
     *    an <code>Array</code> of children.
     *
     * At least one argument *must* be provided.
     */
    createElementFromArguments: function(tagName, args)
    {
        var attributes, children;
        // The short circuit in ``createElementFunction`` ensures we will
        // always have at least one argument when called via element creation
        // functions.
        var argsLength = args.length, firstArg = args[0];

        if (argsLength == 1 &&
            jQuery.isArray(firstArg))
        {
            children = firstArg; // ([child1, ...])
        }
        else if (jQuery.isPlainObject(firstArg))
        {
            attributes = firstArg;
            children = (argsLength == 2 && jQuery.isArray(args[1])
                        ? args[1]                               // (attributes, [child1, ...])
                        : Array.prototype.slice.call(args, 1)); // (attributes, child1, ...)
        }
        else
        {
            children = jQuery.makeArray(args); // (child1, ...)
        }

        return this.createElement(tagName, attributes, children);
    },

    /**
     * Creates a DOM element with the given tag name and optionally,
     * the given attributes and children.
     */
    createElement: function(tagName, attributes, children)
    {
        attributes = attributes || {};
        children = children || [];
        flatten(children);

        if (this.mode != "DOM")
        {
            return new HTMLElement(tagName, attributes, children);
        }

        // Create the element and set its attributes and event listeners
        var el = jQuery("<" + tagName + ">", attributes);

        // Append children
        for (var i = 0, l = children.length; i < l; i++)
        {
            var child = children[i];
            if (child.nodeType)
            {
                el.append(child);
            }
            else
            {
                el.append(document.createTextNode(""+child));
            }
        }

        return el.get(0);
    },

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
    fragment: function()
    {
        if (arguments.length == 1 &&
            jQuery.isArray(arguments[0]))
        {
            var children = arguments[0]; // ([child1, ...])
        }
        else
        {
            var children = jQuery.makeArray(arguments) // (child1, ...)
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
    },

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
    map: function(tagName)
    {
        // Determine how the function was called
        if (jQuery.isArray(arguments[1]))
        {
             // (tagName, items, func)
            var defaultAttrs = {},
                items = arguments[1],
                func = (jQuery.isFunction(arguments[2]) ? arguments[2] : null);
        }
        else
        {
            // (tagName, attrs, items, func)
            var defaultAttrs = arguments[1],
                items = arguments[2],
                func = (jQuery.isFunction(arguments[3]) ? arguments[3] : null);
        }

        var results = [];
        for (var i = 0, l = items.length; i < l; i++)
        {
            var attrs = jQuery.extend({}, defaultAttrs);
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
            if (!jQuery.isArray(children))
            {
                children = [children];
            }

            results.push(this.createElement(tagName, attrs, children));
        }
        return results;
    },

    /**
     * Marks a string as safe
     */
    markSafe: function(value)
    {
        return new SafeString(value);
    },

    /**
     * Determines if a string is safe.
     */
    isSafe: function(value)
    {
        return (value instanceof SafeString);
    },

    HTMLElement: HTMLElement,
    HTMLFragment: HTMLFragment,
    HTMLNode: HTMLNode,
    SafeString: SafeString
};

// Add element creation functions ----------------------------------------------

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
            return DOMBuilder.createElementFromArguments(tagName,
                                                         arguments);
        }
    };

    // Add a ``map`` function which will call ``DOMBuilder.map`` with the
    // appropriate ``tagName``.
    elementFunction.map = function()
    {
        var mapArgs = jQuery.makeArray(arguments);
        mapArgs.unshift(tagName);
        return DOMBuilder.map.apply(DOMBuilder, mapArgs);
    };

    return elementFunction;
}

/**
 * Tag names defined in the HTML 4.01 Strict and Frameset DTDs.
 */
var tagNames = ["a", "abbr", "acronym", "address", "area", "b", "bdo", "big",
    "blockquote", "body", "br", "button", "caption", "cite", "code", "col",
    "colgroup", "dd", "del", "dfn", "div", "dl", "dt", "em", "fieldset", "form",
    "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "head",
    "html", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li",
    "link", "map", "meta", "noscript"/*:)*/, "object", "ol", "optgroup",
    "option", "p", "param", "pre", "q", "samp", "script", "select", "small",
    "span", "strong", "style", "sub", "sup", "table", "tbody", "td", "textarea",
    "tfoot", "th", "thead", "title", "tr", "tt", "ul", "var"];

jQuery.extend(DOMBuilder,
{
    /**
     * An ``Object`` containing element creation functions.
     */
    elementFunctions: (function()
    {
        var o = {};
        for (var i = 0, tagName; tagName = tagNames[i]; i++)
        {
            o[tagName.toUpperCase()] = createElementFunction(tagName);
        }
        return o;
    })(),

    /**
     * Adds element creation functions to a given context ``Object``, or to
     * a new object if none was given. Returns the object the functions were
     * added to, either way.
     *
     * An ``NBSP`` property corresponding to the Unicode character for a
     * non-breaking space is also added to the context object, for
     * convenience.
     */
    apply: function(context)
    {
        context = context || {};
        jQuery.extend(context, this.elementFunctions);
        context.NBSP = "\u00A0"; // Add NBSP for backwards-compatibility
        return context;
    }
});

// Add fragment convenience methods --------------------------------------------

jQuery.extend(DOMBuilder.fragment,
{
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
    map: function(items, func)
    {
        // If we weren't given a mapping function, the user may as well just
        // have created a fragment directly, as we're just wrapping content
        // here, not creating it.
        if (!jQuery.isFunction(func))
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
    }
});

// Expose DOMBuilder to the global object
window.DOMBuilder = DOMBuilder;

})(window, jQuery);
