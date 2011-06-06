(function(__global__, undefined)
{

// --------------------------------------------------------------- Utilities ---

var modules = (typeof module != 'undefined' && module.exports)
  // Native functions
  , toString = Object.prototype.toString
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice
  /** Element name for fragments. */
  , FRAGMENT_NAME = '#document-fragment'
  /** Tag names defined in the HTML 4.01 Strict and Frameset DTDs. */
  , TAG_NAMES = ('a abbr acronym address area b bdo big blockquote body br ' +
    'button caption cite code col colgroup dd del dfn div dl dt em fieldset ' +
    'form frame frameset h1 h2 h3 h4 h5 h6 hr head html i iframe img input ' +
    'ins kbd label legend li link map meta noscript ' /* :) */ + 'object ol ' +
    'optgroup option p param pre q samp script select small span strong style ' +
    'sub sup table tbody td textarea tfoot th thead title tr tt ul var').split(' ')
  ;

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
  return (toString.call(o) == '[object Array]');
}

function isFunction(o) {
  return (toString.call(o) == '[object Function]');
}

/**
 * We primarily want to distinguish between plain Objects and content nodes.
 * Ruling out content nodes differs depending on the mode we're rendering in.
 */
function isObject(o, mode) {
  return (!!o &&
          toString.call(o) == '[object Object]' &&
          DOMBuilder.modes[mode].isObject(o));
}

function isString(o) {
  return (toString.call(o) == "[object String]");
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
  // We flattened in-place, but return for chaining
  return a;
}

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
      var mode = (typeof fixedMode != 'undefined'
                  ? fixedMode
                  : DOMBuilder.mode);
      // Short circuit if there are no arguments, to avoid further
      // argument inspection.
      return DOMBuilder.modes[mode].createElement(tagName, {}, []);
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
      isArray(firstArg)) {
    children = firstArg; // ([child1, ...])
  } else if (isObject(firstArg, (typeof fixedMode != 'undefined'
                                 ? fixedMode
                                 : DOMBuilder.mode))) {
    attributes = firstArg;
    children = (argsLength == 2 && isArray(args[1])
                ? args[1]               // (attributes, [child1, ...])
                : slice.call(args, 1)); // (attributes, child1, ...)
  } else {
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

// === DOMBuilder API ==========================================================

var DOMBuilder = {
  version: '2.0.0-alpha1'

// ------------------------------------------------------------------- Modes ---

  /**
   * Determines which mode content creation functions will operate in. We're
   * hardcoding the backend default, as this variable will be exported and can't
   * be replaced after the fact.
   */
, mode: (modules ? 'html' : null)

  /**
   * Additional modes registered using ``addMode``.
   */
, modes: {}

  /**
   * Adds a new mode and exposes an API for it on the DOMBuilder object with the
   * mode's name.
   */
, addMode: function(mode) {
    // Store the mode for later use of its content creation functions
    this.modes[mode.name] = mode;
    // Set the first registered mode as the default
    if (this.mode === null) {
      this.mode = mode.name;
    }
    // Expose mode-specific element creation functions and the mode's public API
    // as a DOMBuilder.<modename> property.
    this[mode.name] = extend(createElementFunctions(mode.name), mode.api);
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
   * Element creation functions which create contents according to
   * ``DOMBuilder.mode``.
   */
, elements: createElementFunctions()

  /**
   * Adds element creation functions to a given context ``Object``, or to
   * a new object if none was given. If a valid mode argument is given, also
   * adds any functions specified for application by the corresponding mode.
   * Returns the object the functions were added to.
   */
, apply: function(context, mode) {
    context = context || {};
    if (mode && this.modes[mode] && this.modes[mode].apply) {
      extend(context, this.modes[mode].apply);
    }
    extend(context, this.elements);
    return context;
  }

// -------------------------------------------------------- Content Creation ---

  /**
   * Generates content from a nested list using the given output mode, where each
   * list item and nested child item must be in one of the following formats:
   *
   * ``[tagName[, attributes], child1, ...]``
   *    a tag name, optional attributes ``Object`` and an arbitrary number of
   *    child elements.
   * ``['#document-fragment', child1, ...]``
   *    a fragment name and an arbitrary number of child elements.
   */
, build: function(content, mode) {
    var elementName = content[0]
      , isFragment = (elementName == FRAGMENT_NAME)
      , attrs = (!isFragment && isObject(content[1], mode) ? content[1] : null)
      , childStartIndex = (attrs === null ? 1 : 2)
      , l = content.length
      , built = []
      ;
    for (var i = childStartIndex; i < l; i++) {
      item = content[i];
      if (isArray(item)) {
        built.push(this.build(item, mode));
      } else {
        built.push(item);
      }
    }
    return (isFragment
            ? this.modes[mode].fragment(built)
            : this.modes[mode].createElement(elementName, attrs, built));
  }

  /**
   * Creates an element with the given tag name and, optionally, the given
   * attributes and children.
   */
, createElement: function(tagName, attributes, children, mode) {
    attributes = attributes || {};
    children = children || [];
    mode = (typeof mode != 'undefined' ? mode : this.mode);
    flatten(children);
    return this.modes[mode].createElement(tagName, attributes, children);
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
      if (func != null) {
        if (typeof mode != 'undefined') {
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
   * Creates a fragment with the given children. Supported argument formats are:
   *
   * ``(child1, ...)``
   *    an arbitrary number of children.
   * ``([child1, ...])``
   *    an ``Array`` of children.
   *
   * In DOM mode, a ``DocumentFragment`` conveniently allows you to append its
   * contents with a single call. If you're thinking of adding a wrapper
   * ``<div>`` solely to be able to insert a number of sibling elements at the
   * same time, a ``DocumentFragment`` will do the same job without the need for
   * the redundant wrapper element.
   *
   * See http://ejohn.org/blog/dom-documentfragments/ for more information
   * about ``DocumentFragment`` objects.
   */
, fragment: (function() {
    var fragment = function() {
      var children;
      if (arguments.length === 1 &&
          isArray(arguments[0])) {
        children = arguments[0]; // ([child1, ...])
      } else {
        children = slice.call(arguments) // (child1, ...)
      }

      // Inline the contents of any child Arrays
      flatten(children);

      return this.modes[this.mode].fragment(children);
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
    fragment.map = function(items, func) {
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

    return fragment;
  })()

  /* Exposes utilities for use in mode plugins. */
, util: {
    FRAGMENT_NAME: FRAGMENT_NAME
  , TAG_NAMES: TAG_NAMES
  , extend: extend
  , lookup: lookup
  , inheritFrom: inheritFrom
  , isArray: isArray
  , isFunction: isFunction
  , isObject: isObject
  , isString: isString
  , flatten: flatten
  }
};

// Export DOMBuilder or expose it to the global object
if (modules) {
  extend(module.exports, DOMBuilder);
} else {
  __global__.DOMBuilder = DOMBuilder;
}

})(this);
