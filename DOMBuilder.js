/**
 * @class
 * @static
 * @author Jonathan Buchanan
 * @version 1.2
 */
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
        var ampRe = /&/g;
        var ltRe = /</g;
        var gtRe = />/g;
        var quoteRe1 = /"/g;
        var quoteRe2 = /'/g;

        return function(html)
        {
            return html.replace(ampRe, "&amp;").replace(ltRe, "&lt;").replace(gtRe, "&gt;").replace(quoteRe1, "&quot;").replace(quoteRe2, "&#39;");
        };
    })();

    /**
     * Escapes if the given input is not a SafeString, otherwise returns the
     * value of the SafeString.
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
        var lookup = {};
        var tags = ["br", "col", "hr", "input", "img", "link", "param"];
        for (var i = 0, l = tags.length; i < l; i++)
        {
            lookup[tags[i]] = true;
        }
        return lookup;
    })();

    /**
     * String subclass which marks the given string as safe for inclusion
     * without escaping.
     */
    function SafeString(value)
    {
        this.value = value;
    }

    SafeString.prototype = new String();
    with (SafeString.prototype  = new String())
    {
        toString = valueOf = function()
        {
            return this.value;
        }
    }

    /**
     * Marks a string as safe - this method will be exposed as
     * DOMBUilder.markSafe for end users.
     */
    function markSafe(value)
    {
        return new SafeString(value);
    }

    /**
     * Determines if a string is safe - this method will be exposed as
     * DOMBuilder.isSafe to end users so they don't have to know about the
     * implementation details of escaping.
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
    /** @scope DOMBuilder */
    {
        /** Attribute names which should be translated before use. */
        _attrTranslations: null,

        /**
         * Custom element creation function, will be called with
         * (tagName, attributes) if present.
         */
        _customCreateElement: null,

        /** Functions to deal with special case attributes. */
        _specialCaseAttrs: null,

        /**
         * Attributes for which property access should be used instead of
         * <code>setAttribute()</code>.
         */
        _usePropertyAccess: {
            defaultChecked: true,
            defaultSelected: true,
            defaultValue: true
        },

        /**
         * Determines which mode the createElement function will operate in.
         * Supported values are:
         * <dl>
         * <dt>DOM</dt><dd>Create DOM Elements</dd>
         * <dt>HTML</dt><dd>Create HTML Strings</dd>
         * <dt>XHTML</dt><dd>Create XHTML Strings</dd>
         * </dl>
         */
        mode: "DOM",

        /**
         * Calls a function using DOMBuilder temporarily in the given mode.
         * <p>
         * This is primarily intended for using DOMBuilder to generate HTML
         * strings when running in the browser without having to manage the
         * mode flag yourself.
         *
         * @param {String} mode the mode to set DOMBuilder in temporarily.
         * @param {Function} func the function to be executed once the mode has
         *                        been temporarily changed.
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
         * Adds element creation functions to a given context object, or to a
         * new object if no context object was given.
         * <p>
         * An <code>NBSP</code> property corresponding to the Unicode character
         * for a non-breaking space is also added to the context object, for
         * convenience.
         *
         * @param {Object} [context] a context object to which element creation
         *                           functions should be added.
         *
         * @return the context object to which element creation functions were
         *         added.
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
         * <p>
         * See <code>DOMBuilder.createElementFromArguments</code> for the input
         * argument formats supported by the resulting function.
         *
         * @private
         * @param {String} tagName an HTML tag name.
         *
         * @return {Function} an element creation function.
         */
        createElementFunction: function(tagName)
        {
            return function()
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
        },

        /**
         * Normalises a list of arguments in order to create a new DOM element
         * using <code>DOMBuilder.createElement</code>.
         * <p>
         * Supported argument formats are:
         * <ol>
         * <li>
         *   <code>(attributes, child1, ...)</code> - an attributes object
         *   followed by an arbitrary number of children.
         * </li>
         * <li>
         *   <code>(attributes, [child1, ...])</code> - an attributes object and
         *   an <code>Array</code> of children.
         * </li>
         * <li>
         *   <code>(child1, ...)</code> - an arbitrary number of children.
         * </li>
         * <li>
         *   <code>([child1, ...])</code> - an <code>Array</code> of children.
         * </li>
         * </ol>
         * <p>
         * The official  policy on passing invalid argument lists is "You Break
         * It, You Get To Keep The Pieces."
         *
         * @private
         * @param {String} tagName an HTML tag name.
         * @param {Array} args a list of arguments, which may not be empty.
         *
         * @return a DOM element.
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
         * Creates a DocumentFragment with the given children. A
         * DocumentFragment conveniently allows you to append its contents with
         * a single call. If you're thinking of adding a wrapper
         * <code>&lt;div&gt;</code> solely to be able to insert a number of
         * sibling elements at the same time, a DocumentFragment will do the
         * same job without the need for a wrapper element.
         * <p>
         * See http://ejohn.org/blog/dom-documentfragments/ for more info.
         * <p>
         * Supported argument formats are:
         * <ol>
         * <li>
         *   <code>(child1, ...)</code> - an arbitrary number of children.
         * </li>
         * <li>
         *   <code>([child1, ...])</code> - an <code>Array</code> of children.
         * </li>
         * </ol>
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
         * attributes and children.
         * <p>
         * If the <code>attributes</code> argument is given, any properties of
         * the attributes object which have names starting with "on" and which
         * have a <code>Function</code> as their value will be assigned as event
         * listeners on the new element. It is assumed that a valid event name
         * is set as the attribute name in this case.
         * <p>
         * If the <code>children</code> argument is given, its contents will be
         * added to the new element. Strings or Numbers will be added as text
         * nodes. It is assumed that any child passed which is not a String or
         * Number will be a DOM node.
         *
         * @param {String} tagName an HTML tag name.
         * @param {Object} [attributes] an object whose properties specify
         *                              attributes of the new element.
         * @param {Array} [children] a list of child contents, made up of mixed
         *                           Strings, Numbers or DOM elements.
         *
         * @return a DOM element.
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
                var child = children[i];
                var childType = typeof child;

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
         * Utility method for adding event handlers
         *
         * @param element a DOM element.
         * @param {String} eventName an event name, without the
         *                           <code>"on"</code> prefix.
         * @param {Function} handler an event handling function.
         */
        addEvent: function(element, eventName, handler)
        {
            return element.addEventListener(eventName, handler, false);
        },

        /**
         * Utility method for removing event handlers added using DOMBuilder.
         *
         * @param element a DOM element.
         * @param {String} eventName an event name, without the
         *                           <code>"on"</code> prefix.
         * @param {Function} handler an event handling function.
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

        // IE8 fixed many longstanding attribute problems.
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
             * <p>
             * This function is taken from http://fn-js.info/snippets/addevent
             *
             * @param element a DOM element.
             * @param {String} eventName an event name, without the
             *                           <code>"on"</code> prefix.
             * @param {Function} handler an event handling function.
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
             * <p>
             * This function is taken from http://fn-js.info/snippets/addevent
             *
             * @param element a DOM element.
             * @param {String} eventName an event name, without the
             *                           <code>"on"</code> prefix.
             * @param {Function} handler an event handling function.
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
