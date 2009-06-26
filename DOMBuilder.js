/**
 * Provides utility methods for creating DOM elements in a more declarative
 * manner.
 * <p>
 * <strong>Usage</strong>
 * <p>
 * Use <code>DOMBuilder.apply()</code> to add DOM creation functions to a given
 * context object. A function will be added for each HTML tag, with its name
 * being the tag name in upper case. If you don't pass in a context object, one
 * will be created for you. For example, the following code:
 * <pre><code>var html = DOMBuilder.apply();
 * var article =
 *   html.DIV({"class": "article"},
 *     html.H2("Article title"),
 *     html.P("Paragraph one"),
 *     html.P("Paragraph two")
 *   );</code></pre>
 * <p>
 * Will produce a DOM element corresponding to the following HTML:
 * <pre><code>&lt;div class="article"&gt;
 *   &lt;h2&gt;Article title&lt;/h2&gt;
 *   &lt;p&gt;Paragraph one&lt;/p&gt;
 *   &lt;p&gt;Paragraph two&lt;/p&gt;
 * &lt;/div&gt;</code></pre>
 * <p>
 * General usage of DOM creation functions is that an object specifying
 * attributes for the element is passed as the first argument and child elements
 * are passed as further arguments. The attribute object is optional and, for
 * the sake of flexibility, children may also be passed in an
 * <code>Array</code>.
 * <p>
 * For convenience, you may want to create the utility methods in the global
 * scope, which is done like so:
 * <pre><code>DOMBuilder.apply(window);</code></pre>
 * <p>
 * Event handlers can be specified as you would expect - supply an event name
 * (including the <code>"on"</code> prefix) as one of the element's attributes
 * and an event handling function as the corresponding value. DOMBuilder will
 * also ensure the element the event handler is registered on will be accessible
 * cross-browser using the <code>this</code> keyword when the event handling
 * function is executed.
 * <p>
 * For example, the following will create a text input which displays a default
 * value, clearing it when the input is focused and restoring the default if the
 * input is left blank:
 * <pre><code>var defaultInput =
 *   INPUT({type: "text", name: "test",
 *          value: "Type Here!", defaultValue: "Type Here!",
 *          onfocus: function()
 *          {
 *             if (this.value == this.defaultValue)
 *             {
 *                 this.value = "";
 *             }
 *          },
 *          onblur: function()
 *          {
 *             if (this.value == "")
 *             {
 *                 this.value = this.defaultValue;
 *             }
 *          }});</code></pre>
 *
 * @class
 * @static
 * @author Jonathan Buchanan
 */
var DOMBuilder = (function()
{
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
     * String wrapper which marks the given string as safe for inclusion without
     * escaping.
     */
    function SafeString(value)
    {
        this.value = value;
    }

    SafeString.prototype =
    {
        toString: function()
        {
            return this.value;
        }
    };

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
                if (o.mode == "XHTML")
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
         * @param {String} tagName an HTML tag name.
         *
         * @return {Function} an element creation function.
         */
        createElementFunction: function(tagName)
        {
            return function()
            {
                if (arguments.length == 0 && this.mode == "DOM")
                {
                    return document.createElement(tagName);
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
         *   <code>attributes, child1, ...</code> - an attributes object
         *   followed by an arbitrary number of children.
         * </li>
         * <li>
         *   <code>attributes, [child1, ...]</code> - an attributes object and
         *   an <code>Array</code> of children.
         * </li>
         * <li>
         *   <code>child1, ...</code> - an arbitrary number of children.
         * </li>
         * <li>
         *   <code>[child1, ...]</code> - an <code>Array</code> of children.
         * </li>
         * </ol>
         * <p>
         * The official store policy on passing invalid argument lists is "You
         * Break It, You Get To Keep The Pieces."
         *
         * @param {String} tagName an HTML tag name.
         * @param {Array} args a list of arguments, which may not be empty.
         *
         * @return a DOM element.
         */
        createElementFromArguments: function(tagName, args)
        {
            var attributes;
            var children;

            // List of children
            if (args.length == 1 &&
                args[0] instanceof Array)
            {
                children = args[0];
            }
            // Attributes and list of children
            else if (args.length == 2 &&
                     args[0] && args[0].constructor == Object &&
                     args[1] instanceof Array)
            {
                attributes = args[0];
                children = args[1];
            }
            // If the first argument is not an attribute object but is a
            // valid child, assume all arguments are children.
            else if (args[0] && (args[0].nodeName ||
                                 typeof args[0] == "string" ||
                                 typeof args[0] == "number" ||
                                 args[0] instanceof Tag ||
                                 args[0] instanceof SafeString))
            {
                children = args;
            }
            // Default - assume the first argument is an attributes object
            // and all remaining arguments are children.
            else
            {
                attributes = args[0];
                children = Array.prototype.slice.call(args, 1);
            }

            return this.createElement(tagName, attributes, children);
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

            var element = document.createElement(tagName);

            for (var attr in attributes)
            {
                if (attributes.hasOwnProperty(attr))
                {
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
                        if (valueType != "boolean" || value === true)
                        {
                            element.setAttribute(attr, value);
                        }
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

    // Detect IE and modify DOMBuilder as required
    if (/*@cc_on @*//*@if (@_win32)!/*@end @*/false)
    {
        /**
         * Translations for attribute names which IE would otherwise choke on.
         */
        o.ATTR_TRANSLATIONS =
        {
            "class": "className",
            "for": "htmlFor"
        };

        /**
         * Deals with special cases related to setting attributes in IE.
         *
         * @param element a DOM element.
         * @param {String} attr an attribute name.
         * @param {String} value a value for the attribute.
         */
        o.setAttribute = function(element, attr, value)
        {
            if (this.ATTR_TRANSLATIONS.hasOwnProperty(attr))
            {
                element[this.ATTR_TRANSLATIONS[attr]] = value;
            }
            else if (attr == "style")
            {
                element.style.cssText = value;
            }
            else
            {
                if (typeof value != "boolean" || value === true)
                {
                    element.setAttribute(attr, value);
                }
            }
        };

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

        // This is a lot of copying and pasting - it's that or splitting out all
        // the common parts into needless function calls just because IE exists.
        o.createElement = function(tagName, attributes, children)
        {
            attributes = attributes || {};
            children = children || [];

            if (this.mode != "DOM")
            {
                return new Tag(tagName, attributes, children);
            }

            // See http://channel9.msdn.com/Wiki/InternetExplorerProgrammingBugs
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

                var element =
                    document.createElement(tagParts.join(""));
            }
            else
            {
                var element = document.createElement(tagName);
            }

            for (var attr in attributes)
            {
                if (attributes.hasOwnProperty(attr))
                {
                    if (typeof attributes[attr] == "function" &&
                        attr.toLowerCase().indexOf("on") == 0)
                    {
                        // Trust the user with the event name
                        this.addEvent(element,
                                      attr.substr(2),
                                      attributes[attr]);
                    }
                    else
                    {
                        this.setAttribute(element, attr, attributes[attr]);
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
        };
    }

    // Expose escaping-related utility functions
    o.isSafe = isSafe;
    o.markSafe = markSafe;

    return o;
})();
