var DOMBuilder = (function()
{
    function extend(dest, source)
    {
        for (attr in source)
        {
            if (source.hasOwnProperty(attr))
            {
                dest[attr] = source[attr];
            }
        }
        return dest;
    }

    /**
     * Escapes sensitive HTML characters.
     */
    var escapeHTML = (function()
    {
        var ampRe = /&/g, ltRe = /</g, gtRe = />/g, quoteRe1 = /"/g, quoteRe2 = /'/g;
        return function(html)
        {
            return html.replace(ampRe, "&amp;").replace(ltRe, "&lt;").replace(gtRe, "&gt;").replace(quoteRe1, "&quot;").replace(quoteRe2, "&#39;");
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
     * A quick lookup for names of empty tags.
     */
    var emptyTags = (function()
    {
        var lookup = {},
            tags = ["br", "col", "hr", "input", "img", "link", "param"];
        for (var i = 0, l = tags.length; i < l; i++)
        {
            lookup[tags[i]] = true;
        }
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
    SafeString.prototype = new String();
    SafeString.prototype.toString = SafeString.prototype.valueOf = function()
    {
        return this.value;
    };

    /**
     * Marks a string as safe - this method will be exposed as
     * ``DOMBUilder.markSafe`` for end users.
     */
    function markSafe(value)
    {
        return new SafeString(value);
    }

    /**
     * Determines if a string is safe - this method will be exposed as
     * ``DOMBuilder.isSafe`` for end users.
     */
    function isSafe(value)
    {
        return (value instanceof SafeString);
    }

    /**
     * Encapsulates logic for creating an HTML/XHTML representation of a tag
     * structure.
     */
    function Tag(tagName, attributes, children)
    {
        this.tagName = tagName;
        this.attributes = attributes || {};
        this.children = children || [];
        // Keep a record of whether or not closing slashes are needed, as the
        // mode could change mefore this object is coerced to a String.
        this.xhtml = (DOMBuilder.mode == "XHTML");
    }

    Tag.prototype =
    {
        appendChild: function(child)
        {
            this.children.push(child);
        },

        toString: function()
        {
            // Opening tag
            var parts = ["<" + this.tagName];
            for (var attr in this.attributes)
            {
                if (this.attributes.hasOwnProperty(attr))
                {
                    parts.push(" " + attr.toLowerCase() + "=\"" + conditionalEscape(this.attributes[attr]) + "\"");
                }
            }
            parts.push(">");

            if (typeof emptyTags[this.tagName] != "undefined")
            {
                if (this.xhtml)
                {
                    parts.splice(parts.length - 1, 1, " />");
                }
                return parts.join("");
            }

            // Contents
            for (var i = 0, l = this.children.length; i < l; i++)
            {
                var child = this.children[i];
                if (child instanceof Tag || child instanceof SafeString)
                {
                    parts.push(child.toString());
                }
                else if (child == "\u00A0")
                {
                    // Special case to convert these back to entities,
                    parts.push("&nbsp;");
                }
                else
                {
                    // Coerce to string and escape
                    parts.push(escapeHTML(""+child));
                }
            }

            // Closing tag
            parts.push("</" + this.tagName + ">");
            return parts.join("");
        }
    };

    var o =
    {
        /** Attribute names which should be translated before use. */
        _attrTranslations: null,

        /**
         * Custom element creation function, will be called with
         * ``(tagName, attributes)`` if present.
         */
        _customCreateElement: null,

        /** Functions to deal with special case attributes. */
        _specialCaseAttrs: null,

        /**
         * Attributes for which property access should be used instead of
         * ``setAttribute()``.
         */
        _usePropertyAccess: {
            defaultChecked: true,
            defaultSelected: true,
            defaultValue: true
        },

        /**
         * Determines which mode the createElement function will operate in.
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
            var tagNames = ["a", "abbr", "acronym", "address", "bdo",
                "blockquote", "br", "button", "caption", "cite", "code", "col",
                "colgroup", "dd", "del", "dfn", "div", "dl", "dt", "em",
                "fieldset", "form", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
                "img", "input", "ins", "kbd", "label", "legend", "li", "link",
                "object", "ol", "optgroup", "option", "p", "param", "pre",
                "samp", "script", "select", "span", "strong", "style", "table",
                "tbody", "td", "textarea", "tfoot", "th", "thead", "tr", "ul",
                "var"];

            for (var i = 0, tagName; tagName = tagNames[i]; i++)
            {
                context[tagName.toUpperCase()] = this.createElementFunction(tagName);
            }

            context.NBSP = "\u00A0";

            return context;
        },

        /**
         * Creates a function which, when called, uses DOMBuilder to create a
         * DOM element with the given tagName.
         *
         * See ``DOMBuilder.createElementFromArguments`` for the input argument
         * formats supported by the resulting function.
         */
        createElementFunction: function(tagName)
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
                        return new Tag(tagName);
                    }
                }
                else
                {
                    return DOMBuilder.createElementFromArguments(tagName,
                                                                 arguments);
                }
            };

            elementFunction.map = function()
            {
                var mapArgs = Array.prototype.slice.call(arguments);
                mapArgs.unshift(tagName);
                return DOMBuilder.map.apply(DOMBuilder, mapArgs);
            };

            return elementFunction;
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
         */
        createElementFromArguments: function(tagName, args)
        {
            var attributes, children;
            // The short circuit in createElementFunction ensures we will always
            // have at least one argument.
            var argsLength = args.length, firstArg = args[0];

            if (argsLength == 1 &&
                firstArg instanceof Array)
            {
                children = firstArg; // ([child1, ...])
            }
            else if (firstArg.constructor == Object &&
                     !(firstArg instanceof Tag) &&
                     !(firstArg instanceof SafeString))
            {
                attributes = firstArg;
                children = (argsLength == 2 && args[1] instanceof Array
                            ? args[1]                               // (attributes, [child1, ...])
                            : Array.prototype.slice.call(args, 1)); // (attributes, child1, ...)
            }
            else
            {
                children = Array.prototype.slice.call(args); // (child1, ...)
            }

            return this.createElement(tagName, attributes, children);
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
        fragment: function(children)
        {
            var children;
            if (arguments.length == 1 &&
                arguments[0] instanceof Array)
            {
                children = arguments[0]; // ([child1, ...])
            }
            else
            {
                children = Array.prototype.slice.call(arguments) // (child1, ...)
            }

            var fragment = document.createDocumentFragment();
            for (var i = 0, l = children.length; i < l; i++)
            {
                var child = children[i];
                var childType = typeof child;

                if (childType == "string" || childType == "number")
                {
                    fragment.appendChild(document.createTextNode(child));
                }
                else
                {
                    // Trust the user to pass DOM elements
                    fragment.appendChild(child);
                }
            }

            return fragment;
        },

        /**
         * Creates a DOM element with the given tag name and optionally,
         * the given attributes and children.
         *
         * If an attributes ``Object`` is given, any of its properties which have
         * names starting with ``"on"`` which have a ``Function`` as their value
         * will be assigned as event listeners on the new element. It is assumed
         * that a valid event name is set as the attribute name in this case.
         *
         * If a ``children`` ``Array`` is given, its contents will be appended to
         * the new element. In DOM mode, children may be of type ``Element``,
         * ``DocumentFragment`, ``String`` or ``Number``.
         */
        createElement: function(tagName, attributes, children)
        {
            attributes = attributes || {};
            children = children || [];

            if (this.mode != "DOM")
            {
                return new Tag(tagName, attributes, children);
            }

            // Create the element
            var element = (this._customCreateElement === null
                           ? document.createElement(tagName)
                           : this._customCreateElement(tagName, attributes));

            // Set its attributes/attach event listeners
            for (var attr in attributes)
            {
                if (!attributes.hasOwnProperty(attr))
                {
                    continue;
                }

                var value = attributes[attr];
                var valueType = typeof value;
                if (valueType == "function" &&
                    attr.toLowerCase().indexOf("on") == 0)
                {
                    // Trust the user with the event name
                    this.addEvent(element,
                                  attr.substr(2),
                                  value);
                }
                else
                {
                    // Translate attribute name if necessary
                    if (this._attrTranslations !== null &&
                        this._attrTranslations.hasOwnProperty(attr))
                    {
                        attr = this._attrTranslations[attr];
                    }

                    // Use property access if necessary
                    if (this._usePropertyAccess !== null &&
                        typeof this._usePropertyAccess[attr] != "undefined")
                    {
                        element[attr] = value;
                    }
                    // If any attributes need really weird handling, this is
                    // the place to do it.
                    else if (this._specialCaseAttrs != null &&
                             typeof this._specialCaseAttrs[attr] == "function")
                    {
                        this._specialCaseAttrs[attr](element, value);
                    }
                    else if (valueType != "boolean" || value === true)
                    {
                        element.setAttribute(attr, value);
                    }
                }
            }

            for (var i = 0, l = children.length; i < l; i++)
            {
                var child = children[i], childType = typeof child;
                if (childType == "string" || childType == "number")
                {
                    element.appendChild(document.createTextNode(child));
                }
                else
                {
                    // Trust the user to pass DOM elements
                    element.appendChild(child);
                }
            }

            return element;
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
         *    Contents can consist of a single value (in DOM mode: an
         *    ``Element``, ``DocumentFragment``, ``String`` or ``Number``) or a
         *    mixed ``Array`` of the same.
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
            if (arguments[1] instanceof Array)
            {
                var defaultAttrs = {},
                    items = arguments[1],
                    func = arguments[2] || null; // (tagName, items, func)
            }
            else
            {
                var defaultAttrs = arguments[1],
                    items = arguments[2],
                    func = arguments[3] || null; // (tagName, attrs, items, func)
            }

            var results = [];
            for (var i = 0, l = items.length; i < l; i++)
            {
                // If we weren't given a mapping function, use the item as the
                // contents.
                if (func === null)
                {
                    results.push(this.createElement(tagName, defaultAttrs, items[i]));
                    continue;
                }

                // Otherwise, call the mapping function and use the return value
                // as the contents, unless the function specifies that the item
                // shouldn't generate an element by explicity returning null.
                var children = func(items[i], extend({}, defaultAttrs), i);
                if (children !== null)
                {
                    results.push(this.createElement(tagName, defaultAttrs, children));
                }
            }
            return results;
        },

        /**
         * Utility method for adding event handlers.
         */
        addEvent: function(element, eventName, handler)
        {
            return element.addEventListener(eventName, handler, false);
        },

        /**
         * Utility method for removing event handlers.
         */
        removeEvent: function(element, eventName, handler)
        {
            element.removeEventListener(eventName, handler, false);
        }
    };

    // Detect IE and modify DOMBuilder as required to work around any issues,
    // depending on the IE version and document mode for IE8 and up.
    if (/*@cc_on @*//*@if (@_win32)!/*@end @*/false)
    {
        var jscriptVersion/*@cc_on @*//*@if (@_win32)= @_jscript_version/*@end @*/;

        // IE8 fixed many longstanding attribute problems
        if (jscriptVersion < 5.8 || document.documentMode < 8)
        {
            o._attrTranslations = extend(o._attrTranslations || {}, {
                "class": "className",
                "for": "htmlFor"
            });

            o._specialCaseAttrs = extend(o._specialCaseAttrs || {}, {
                "style": function(el, val) { el.style.cssText = val; }
            });

            o._customCreateElement = function(tagName, attributes)
            {
                if (attributes.hasOwnProperty("name") ||
                    attributes.hasOwnProperty("checked") ||
                    attributes.hasOwnProperty("multiple"))
                {
                    var tagParts = ["<" + tagName];
                    if (attributes.hasOwnProperty("name"))
                    {
                        tagParts[tagParts.length] =
                            ' name="' + attributes.name + '"';
                    }
                    if (attributes.hasOwnProperty("checked") &&
                        "" + attributes.checked == "true")
                    {
                        tagParts[tagParts.length] = " checked";
                    }
                    if (attributes.hasOwnProperty("multiple") &&
                        "" + attributes.multiple == "true")
                    {
                        tagParts[tagParts.length] = " multiple";
                    }
                    tagParts[tagParts.length] = ">";

                    return document.createElement(tagParts.join(""));
                }
                else
                {
                    return document.createElement(tagName);
                }
            };
        }

        // IE9 will add addEventListener and removeEventListener support
        if (jscriptVersion < 9 || document.documentMode < 9)
        {
            /**
             * Adds an event handler to a DOM element in IE.
             *
             * This function is taken from http://fn-js.info/snippets/addevent
             */
            o.addEvent = function(element, eventName, handler)
            {
                // This is to work around a bug in IE whereby the current element
                // doesn't get passed as context.
                // We pass it via closure instead and set it as the context using
                // call().
                // This needs to be stored for removeEvent().
                // We also store the original wrapped function as a property, _w.
                ((element._evts = element._evts || [])[element._evts.length]
                    = function(e) { return handler.call(element, e); })._w = handler;
                return element.attachEvent("on" + eventName,
                                           element._evts[element._evts.length - 1]);
            };

            /**
             * Removes an event handler from a DOM element in IE.
             *
             * This function is taken from http://fn-js.info/snippets/addevent
             */
            o.removeEvent = function(element, eventName, handler)
            {
                for (var evts = el._evts || [], i = evts.length; i--; )
                    if (evts[i]._w === f)
                        el.detachEvent("on" + eventName, evts.splice(i, 1)[0]);
            };
        }
    }

    // Expose tag and escaping-related utility functions
    o.Tag = Tag
    o.isSafe = isSafe;
    o.markSafe = markSafe;

    return o;
})();
