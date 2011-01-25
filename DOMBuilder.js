var DOMBuilder = (function(document)
{
    /**
     * **The Function Of All Time** - copies attributes from ``source`` to
     * ``dest`` and returns ``dest``.
     */
    function extend(dest, source)
    {
        for (attr in source)
        {
            if (source.hasOwnProperty(attr))
            {
                dest[attr] = source[attr];
            }
        }
        /*@cc_on
        // ... (stunned silence at Internet Explorer)
        if (source.toString !== Object.prototype.toString)
        {
            dest.toString = source.toString;
        }
        if (source.valueOf !== Object.prototype.valueOf)
        {
            dest.valueOf = source.valueOf;
        }
        @*/
        return dest;
    }

    /**
     * Flattens an Array in-place, replacing any Arrays it contains with their
     * contents, and flatetning their contents in turn.
     */
    function flatten(a)
    {
        for (var i = 0, l = a.length; i < l; i++)
        {
            var c = a[i];
            if (c instanceof Array)
            {
                // Make sure we loop to the Array's new length
                l += c.length - 1;
                // Repllace the current item with its contents
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
     * A quick lookup for names of empty tags.
     */
    var emptyTags = (function()
    {
        var lookup = {},
            tags = ["area", "base", "br", "col", "hr", "input", "img", "link",
                    "meta", "param"];
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
    SafeString.prototype = extend(new String(),
    {
        constructor: SafeString,
        toString: function()
        {
            return this.value;
        },
        valueOf: function()
        {
            return this.value;
        }
    });

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
    HTMLNode.prototype = extend(new Object(),
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
    });

    /**
     * Partially emulates a DOM ``Element ``for HTML generation.
     */
    function HTMLElement(tagName, attributes, childNodes)
    {
        HTMLNode.call(this, childNodes);

        this.tagName = tagName;
        this.attributes = attributes || {};

        // Keep a record of whether or not closing slashes are needed, as the
        // mode could change before this object is coerced to a String.
        this.xhtml = (DOMBuilder.mode == "XHTML");
    }
    HTMLElement.prototype = extend(new HTMLNode(),
    {
        constructor: HTMLElement,

        _createCloneObject: function()
        {
            var clone = new HTMLElement(this.tagName, extend({}, this.attributes));
            clone.xhtml = this.xhtml;
            return clone;
        },

        /**
         * Creates an HTML/XHTML representation of this HTMLElement.
         */
        toString: function()
        {
            // Opening tag
            var parts = ["<" + this.tagName];
            for (var attr in this.attributes)
            {
                if (this.attributes.hasOwnProperty(attr))
                {
                    parts.push(" " + attr.toLowerCase() + "=\"" +
                               conditionalEscape(this.attributes[attr]) + "\"");
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
        }
    });

    /**
     * Partially emulates a DOM ``DocumentFragment`` for HTML generation.
     */
    function HTMLFragment(childNodes)
    {
        HTMLNode.call(this, childNodes);
    }
    HTMLFragment.prototype = extend(new HTMLNode(),
    {
        constructor: HTMLFragment,

        _createCloneObject: function()
        {
            return new HTMLFragment();
        }
    });

    // Build up the object which will be referred to as DOMBuilder in the global
    // scope.
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
            var tagNames = ["a", "abbr", "acronym", "address", "area", "b", "bdo",
                "big", "blockquote", "body", "br", "button", "caption", "cite",
                "code", "col", "colgroup", "dd", "del", "dfn", "div", "dl", "dt",
                "em", "fieldset", "form", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
                "head", "html", "i", "img", "input", "ins", "kbd", "label",
                "legend", "li", "link", "map", "meta", "noscript"/*:)*/, "object",
                "ol", "optgroup", "option", "p", "param", "pre", "q", "samp",
                "script", "select", "small", "span", "strong", "style", "sub",
                "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead",
                "title", "tr", "tt", "ul", "var"];

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
                        return new HTMLElement(tagName);
                    }
                }
                else
                {
                    return DOMBuilder.createElementFromArguments(tagName,
                                                                 arguments);
                }
            };

            // Expose a map function which will call DOMBuilder.map with the
            // appropriate tagName.
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
                     !(firstArg instanceof HTMLElement) &&
                     !(firstArg instanceof SafeString) &&
                     !(firstArg instanceof HTMLFragment))
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
        fragment: function()
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
                var childType = typeof child;

                if (childType == "string" || childType == "number" || childType == "boolean")
                {
                    fragment.appendChild(document.createTextNode(""+child));
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

            // Inline the contents of any child Arrays
            flatten(children);

            if (this.mode != "DOM")
            {
                return new HTMLElement(tagName, attributes, children);
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
                if (childType == "string" || childType == "number" || childType == "boolean")
                {
                    element.appendChild(document.createTextNode(""+child));
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
                if (!(children instanceof Array))
                {
                    children = [children];
                }

                results.push(this.createElement(tagName, attrs, children));
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
        }
    };

    // Detect IE and modify DOMBuilder as required to work around any issues,
    // depending on the IE version and document mode for IE8 and up.
    if (/*@cc_on!@*/false)
    {
        var jscriptVersion/*@cc_on=@_jscript_version@*/;

        // IE8 fixed many longstanding attribute problems
        if (jscriptVersion < 5.8 || document.documentMode < 8)
        {
            o._attrTranslations = extend(o._attrTranslations || {}, {
                "class": "className",
                "for": "htmlFor"
            });

            o._usePropertyAccess = extend(o._usePropertyAccess || {}, {
                "value": true
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

    // Expose types just in case users are interested in them
    o.HTMLElement = HTMLElement;
    o.HTMLFragment = HTMLFragment;
    o.HTMLNode = HTMLNode;
    o.SafeString = SafeString;

    return o;
})(document);
