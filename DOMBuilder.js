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
    var o =
    /** @scope DOMBuilder */
    {
        /**
         * Adds element creation functions to a given context object, or to a
         * new object if no context object was given.
         *
         * @param {Object} [context] a context object to which element creation
         *                           functions should be added.
         *
         * @return the context object to which element creation functions were
         *         added.
         */
        apply : function(context)
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
                if (arguments.length == 0)
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
                                 typeof(args[0]) == "string" ||
                                 typeof(args[0]) == "number"))
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

            var element = document.createElement(tagName);

            for (var attr in attributes)
            {
                if (attributes.hasOwnProperty(attr))
                {
                    if (typeof(attributes[attr]) == "function" &&
                        attr.toLowerCase().indexOf("on") == 0)
                    {
                        // Trust the user with the event name
                        this.addEvent(element,
                                      attr.substr(2),
                                      attributes[attr]);
                    }
                    else
                    {
                        element.setAttribute(attr, attributes[attr]);
                    }
                }
            }

            for (var i = 0, l = children.length; i < l; i++)
            {
                var child = children[i];
                var childType = typeof(child);

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
                element.setAttribute(attr, value);
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
                    el.detachEvent("on" + ev, evts.splice(i, 1)[0]);
        };

        // This is a lot of copying and pasting - it's that or splitting out all
        // the common parts into needless function calls just because IE exists.
        o.createElement = function(tagName, attributes, children)
        {
            attributes = attributes || {};
            children = children || [];

            if (attributes.hasOwnProperty("name"))
            {
                // Name is not updateable in IE
                var element =
                    document.createElement("<" + tagName +
                                           " name=" + attributes.name + ">");
            }
            else
            {
                var element = document.createElement(tagName);
            }

            for (var attr in attributes)
            {
                if (attributes.hasOwnProperty(attr))
                {
                    if (typeof(attributes[attr]) == "function" &&
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
                var childType = typeof(child);

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

    return o;
})();
