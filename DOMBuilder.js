(function(__global__, undefined)
{

var modules = (typeof module !== 'undefined' && module.exports)
  , document = __global__.document
  , toString = Object.prototype.toString
  , hasOwn = Object.prototype.hasOwnProperty
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice
    // Functioms and objects involved in implementing cross-crowser workarounds
  , EVENT_ATTRS, createElement, addEvent, setInnerHTML
    /** Tag names defined in the HTML 4.01 Strict and Frameset DTDs. */
  , TAG_NAMES = ('a abbr acronym address area b bdo big blockquote body br ' +
    'button caption cite code col colgroup dd del dfn div dl dt em fieldset ' +
    'form frame frameset h1 h2 h3 h4 h5 h6 hr head html i iframe img input ' +
    'ins kbd label legend li link map meta noscript ' /* :) */ + 'object ol ' +
    'optgroup option p param pre q samp script select small span strong style ' +
    'sub sup table tbody td textarea tfoot th thead title tr tt ul var').split(' ')
  ;

// === Utility functions =======================================================

/**
 * Naively copies from ``source`` to ``dest``, returning ``dest``.
 */
function extend(dest, source) {
  for (var name in source) {
    dest[name] = source[name];
  }
  return dest;
}

/**
 * Creates a lookup object from an array of strings.
 */
function lookup(a) {
  var obj = {}
    , i = 0
    , l = a.length
    ;
  for (; i < l; i++) {
    obj[a[i]] = true;
  }
  return obj;
}

/**
 * Uses a dummy constructor to make a ``child`` constructor inherit from a
 * ``parent`` constructor.
 */
function inheritFrom(child, parent) {
  function F() {};
  F.prototype = parent.prototype;
  child.prototype = new F();
  child.prototype.constructor = child;
}

function isArray(o) {
  return (toString.call(o) === '[object Array]');
}

function isFunction(o) {
  return (toString.call(o) === '[object Function]');
}

/**
 * We primarily want to distinguish between plain Objects and content nodes.
 * Ruling out content nodes differs depending on the mode we're rendering in.
 */
function isObject(o, mode) {
  return (!!o &&
          toString.call(o) === '[object Object]' &&
          mode ? DOMBuilder.modes[mode].isObject(o) : !o.nodeType);
}

/**
 * Flattens an Array in-place, replacing any Arrays it contains with their
 * contents, and flattening their contents in turn.
 */
function flatten(a) {
  for (var i = 0, l = a.length, c; i < l; i++) {
    c = a[i];
    if (isArray(c)) {
      // Make sure we loop to the Array's new length
      l += c.length - 1;
      // Replace the current item with its contents
      splice.apply(a, [i, 1].concat(c));
      // Stay on the current index so we continue looping at the first
      // element of the array we just spliced in or removed.
      i--;
    }
  }
}

// Detect and use jQuery to implement cross-browser workarounds when available
if (typeof jQuery != 'undefined') {
  EVENT_ATTRS = jQuery.attrFn;
  if (!modules) {
    createElement = function(tagName, attributes) {
      if (hasOwn.call(attributes, 'innerHTML')) {
        var html = attributes.innerHTML;
        delete attributes.innerHTML;
        return jQuery('<' + tagName + '>', attributes).html(html).get(0);
      } else {
        return jQuery('<' + tagName + '>', attributes).get(0);
      }
    };
    addEvent = function(id, event, handler) {
        jQuery('#' + id)[event](handler);
    };
    setInnerHTML = function(el, html) {
        jQuery(el).html(html);
    };
  }
} else {
  EVENT_ATTRS = lookup(
      ('blur focus focusin focusout load resize scroll unload click dblclick ' +
       'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave ' +
       'change select submit keydown keypress keyup error').split(' '));
  if (!modules) {
    // jQuery is not available, implement the most essential workarounds
    var supportsStyle = (function() {
          var div = document.createElement('div');
          div.style.display = 'none';
          div.innerHTML = '<span style="color:silver;">s<span>';
          return /silver/.test(div.getElementsByTagName('span')[0].getAttribute('style'));
        })()
      , specialRE = /^(?:href|src|style)$/
      , attributeTranslations = {
          cellspacing: 'cellSpacing',
          'class': 'className',
          colspan: 'colSpan',
          'for': 'htmlFor',
          frameborder: 'frameBorder',
          maxlength: 'maxLength',
          readonly: 'readOnly',
          rowspan: 'rowSpan',
          tabindex: 'tabIndex',
          usemap: 'useMap'
        }
      ;
    createElement = function(tagName, attributes) {
      var el = document.createElement(tagName) // Damn you, IE
        , name
        , value
        ;
      if (hasOwn.call(attributes, 'innerHTML')) {
          setInnerHTML(el, attributes.innerHTML);
          delete attributes.innerHTML;
      }
      for (name in attributes) {
        value = attributes[name];
        name = attributeTranslations[name] || name;
        if (EVENT_ATTRS[name]) {
          el['on' + name] = value;
          continue;
        }
        var special = specialRE.test(name);
        if ((name in el || el[name] !== undefined) && !special)
          el[name] = value;
        else if (!supportsStyle && name == 'style')
          el.style.cssText = ''+value;
        else
          el.setAttribute(name, ''+value);
      }
      return el;
    };
    addEvent = function(id, event, handler) {
      document.getElementById(id)['on' + event] = handler;
    };
    setInnerHTML = function(el, html) {
      try {
        el.innerHTML = html;
      } catch (e) {
        var div = document.createElement('div');
        div.innerHTML = html;
        while (el.firstChild)
          el.removeChild(el.firstChild);
        while (div.firstChild)
          el.appendChild(div.firstChild);
      }
    };
  }
}

// === DOMBuilder API ==========================================================

// ---------------------------------- Element Creation Convenience Functions ---

/**
 * Creates An ``Object`` containing element creation functions with the given
 * fixed mode, if one is given.
 */
function createElementFunctions(mode) {
  var obj = {};
  for (var i = 0, tagName; tagName = TAG_NAMES[i]; i++){
    obj[tagName.toUpperCase()] = createElementFunction(tagName, mode);
  }
  return obj;
}

/**
 * Creates a function which, when called, uses DOMBuilder to create an element
 * with the given ``tagName``.
 *
 * The resulting function will also have a ``map`` function which calls
 * ``DOMBuilder.map`` with the given ``tagName`` and mode, if one is provided.
 */
function createElementFunction(tagName, fixedMode) {
  var elementFunction = function() {
    if (!arguments.length) {
      var mode = fixedMode || DOMBuilder.mode;
      // Short circuit if there are no arguments, to avoid further
      // argument inspection.
      if (mode == 'DOM') {
        return document.createElement(tagName);
      }
      else if (mode == 'TEMPLATE') {
        return new ElementNode(tagName);
      } else {
        return new HTMLElement(tagName);
      }
    } else {
      return createElementFromArguments(tagName, fixedMode, slice.call(arguments));
    }
  };

  // Add a ``map`` function which will call ``DOMBuilder.map`` with the
  // appropriate ``tagName`` and mode.
  elementFunction.map = function() {
    return mapElementFromArguments(tagName, fixedMode, slice.call(arguments));
  };

  return elementFunction;
}

/**
 * Normalises a list of arguments in order to create a new element using
 *``DOMBuilder.createElement``. Supported argument formats are:
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
function createElementFromArguments(tagName, fixedMode, args) {
    var attributes
      , children
        // The short circuit in ``createElementFunction`` ensures we will
        // always have at least one argument when called via element creation
        // functions.
      , argsLength = args.length
      , firstArg = args[0]
      ;

    if (argsLength === 1 &&
        isArray(firstArg))
    {
        children = firstArg; // ([child1, ...])
    }
    else if (isObject(firstArg))
    {
        attributes = firstArg;
        children = (argsLength == 2 && isArray(args[1])
                    ? args[1]               // (attributes, [child1, ...])
                    : slice.call(args, 1)); // (attributes, child1, ...)
    }
    else
    {
        children = slice.call(args); // (child1, ...)
    }

    return DOMBuilder.createElement(tagName, attributes, children, fixedMode);
}

/**
 * Normalises a list of arguments in order to create new elements using
 * ``DOMBuilder.map``.
 *
 * Supported argument formats are:
 *
 * ``(defaultAttributes, [item1, ...], mappingFunction)``
 *    a default attributes attributes object, a list of items and a mapping
 *    Function.
 * ``([item1, ...], mappingFunction)``
 *    a list of items and a mapping Function.
 */
function mapElementFromArguments(tagName, fixedMode, args) {
    if (isArray(args[0])) { // (items, func)
      var defaultAttrs = {}
        , items = args[0]
        , func = (isFunction(args[1]) ? args[1] : null)
        ;
    } else { // (attrs, items, func)
      var defaultAttrs = args[0]
        , items = args[1]
        , func = (isFunction(args[2]) ? args[2] : null)
        ;
    }

    return DOMBuilder.map(tagName, defaultAttrs, items, func, fixedMode);
}

// -------------------------------------------------------- Public Namespace ---

var DOMBuilder = {
  version: '2.0.0-pre'

// --------------------------------------------------------------- Mixed API ---

  /**
   * Determines which mode the ``createElement`` function will operate in.
   */
, mode: 'dom'

  /**
   * Additional modes registered using ``addMode``.
   */
, modes = {}

  /**
   * Adds a new mode and optionally exposes an API for it on the DOMBuilder
   * object with the mode's name.
   */
, addMode: function(mode) {
    this.modes[mode.name] = mode;
    if (mode.api) {
      this[mode.name] = (mode.extendElementCreationFunctions
                         ? extend(createElementFunctions(mode.name), mode.api)
                         : mode.api);
    }
  }

  /**
   * Calls a function using DOMBuilder temporarily in the given mode and
   * returns its output. Any additional arguments provided will be passed to
   * the function when it is called.
   */
, withMode: function(mode, func) {
    var originalMode = this.mode;
    this.mode = mode;
    try {
      return func.apply(null, slice.call(arguments, 2));
    } finally {
      this.mode = originalMode;
    }
  }

  /**
   * An ``Object`` containing element creation functions which create contents
   * according to ``DOMBuilder.mode``.
   */
, elements: createElementFunctions()
, dom: createElementFunctions('dom')

  /**
   * Adds element creation functions to a given context ``Object``, or to
   * a new object if none was given. Returns the object the functions were
   * added to, either way.
   *
   * An ``NBSP`` property corresponding to the Unicode character for a
   * non-breaking space is also added to the context object, for
   * convenience.
   */
, apply: function(context) {
    context = context || {};
    extend(context, this.elementFunctions);
    context.NBSP = '\u00A0'; // Add NBSP for backwards-compatibility
    return context;
  }

  /**
   * Creates a DOM element with the given tag name and, optionally,
   * the given attributes and children.
   */
, createElement: function(tagName, attributes, children, mode) {
    attributes = attributes || {};
    children = children || [];
    flatten(children);
    mode = mode || this.mode;

    if (mode != 'dom') {
      return this.modes[mode].createElement(tagName, attributes, children);
    }

    var innerHTML = ('innerHTML' in attributes)
        // Create the element and set its attributes and event listeners
      , el = createElement(tagName, attributes)
      ;

    // If content was set via innerHTML, we're done...
    if (!innerHTML) {
      // ...otherwise, append children
      for (var i = 0, l = children.length, child; i < l; i++)
      {
        child = children[i];
        if (child && child.nodeType) {
          el.appendChild(child);
        } else {
          el.appendChild(document.createTextNode(''+child));
        }
      }
    }
    return el;
  }

  /**
   * Creates an element for (potentially) every item in a list.
   *
   * Arguments are as follows:
   *
   * ``tagName``
   *    the name of the element to create.
   * ``defaultAttrs``
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
   * ``mode`` (optional)
   *    an override for the DOMBuilder mode used for this call.
   */
, map: function(tagName, defaultAttrs, items, func, mode) {
    var results = [];
    for (var i = 0, l = items.length, attrs, children; i < l; i++) {
      attrs = extend({}, defaultAttrs);
      // If we were given a mapping function, call it and use the
      // return value as the contents, unless the function specifies
      // that the item shouldn't generate an element by explicity
      // returning null.
      if (func !== null) {
        if (mode) {
          children = DOMBuilder.withMode(mode, func, items[i], attrs, i);
        } else {
          children = func(items[i], attrs, i);
        }
        if (children === null) {
          continue;
        }
      } else {
        // If we weren't given a mapping function, use the item as the
        // contents.
        var children = items[i];
      }

      // Ensure children are in an Array, as required by createElement
      if (!isArray(children)) {
        children = [children];
      }

      results.push(this.createElement(tagName, attrs, children, mode));
    }
    return results;
  }

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
, fragment: function() {
    var children;
    if (arguments.length === 1 &&
        isArray(arguments[0])) {
      children = arguments[0]; // ([child1, ...])
    } else {
      children = slice.call(arguments) // (child1, ...)
    }

    // Inline the contents of any child Arrays
    flatten(children);

    if (this.mode != 'dom') {
      return this.modes[mode].fragment(children);
    }

    var fragment = document.createDocumentFragment();
    for (var i = 0, l = children.length, child; i < l; i++) {
      child = children[i];
      if (child.nodeType) {
        fragment.appendChild(child);
      } else {
        fragment.appendChild(document.createTextNode(''+child));
      }
    }
    return fragment;
  }
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
DOMBuilder.fragment.map = function(items, func) {
  // If we weren't given a mapping function, the user may as well just
  // have created a fragment directly, as we're just wrapping content
  // here, not creating it.
  if (!isFunction(func)) {
    return DOMBuilder.fragment(items);
  }

  var results = [];
  for (var i = 0, l = items.length, children; i < l; i++) {
    // Call the mapping function and add the return value to the
    // fragment contents, unless the function specifies that the item
    // shouldn't generate content by explicity returning null.
    children = func(items[i], i);
    if (children === null) {
      continue;
    }
    results = results.concat(children);
  }
  return DOMBuilder.fragment(results);
};

// Export DOMBuilder or expose it to the global object
if (modules) {
  extend(module.exports, DOMBuilder);
} else {
  __global__.DOMBuilder = DOMBuilder;
}

})(this);
