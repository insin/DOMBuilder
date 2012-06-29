var is = require('isomorph/is')
  , object = require('isomorph/object')
  , array = require('isomorph/array')

// Native functions
var toString = Object.prototype.toString
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice

/**
 * @const
 * @type {boolean}
 */
var JQUERY_AVAILABLE = (typeof jQuery != 'undefined')

/**
 * Attribute names corresponding to event handlers.
 * @const
 * @type {Object.<string, boolean>}
 */
var EVENT_ATTRS = (JQUERY_AVAILABLE
    ? jQuery.attrFn
    : object.lookup(('blur focus focusin focusout load resize scroll unload ' +
                     'click dblclick mousedown mouseup mousemove mouseover ' +
                     'mouseout mouseenter mouseleave change select submit ' +
                     'keydown keypress keyup error').split(' '))
    )

/**
 * Element name for fragments.
 * @const
 * @type {string}
 */
var FRAGMENT_NAME = '#document-fragment'

/**
 * Regular Expression which parses out tag names with optional id and class
 * definitions as part of the tag name.
 * @const
 * @type {RegExp}
 */
var BUILD_TAG_RE = new RegExp(
      '^([a-z][a-z0-9]*)?'               // tag name
    + '(?:#([a-z][-:\\w]*))?'            // id, excluding leading '#'
    + '(?:\\.([-\\w]+(?:\\.[-\\w]+)*))?' // class(es), excluding leading '.'
    , 'i'
    )

/**
 * Tag names defined in the HTML 4.01 Strict and Frameset DTDs and new elements
 * from HTML5.
 * @const
 * @type {Array.<string>}
 */
var TAG_NAMES = ('a abbr acronym address area article aside audio b bdi bdo big ' +
    'blockquote body br button canvas caption cite code col colgroup command ' +
    'datalist dd del details dfn div dl dt em embed fieldset figcaption figure ' +
    'footer form frame frameset h1 h2 h3 h4 h5 h6 hr head header hgroup html i ' +
    'iframe img input ins kbd keygen label legend li link map mark meta meter ' +
    'nav noscript ' /* :) */ + 'object ol optgroup option output p param pre ' +
    'progress q rp rt ruby samp script section select small source span strong ' +
    'style sub summary sup table tbody td textarea tfoot th thead time title tr ' +
    'track tt ul var video wbr').split(' ')

/**
 * Cross-browser means of setting innerHTML on a DOM Element.
 * @param {Element} el
 * @param {string} html
 */
var setInnerHTML = (JQUERY_AVAILABLE
    ? function(el, html) {
        jQuery(el).html(html)
      }
    : function(el, html) {
        try {
          el.innerHTML = html
        }
        catch (e) {
          var div = document.createElement('div')
          div.innerHTML = html
          while (el.firstChild)
            el.removeChild(el.firstChild)
          while (div.firstChild)
            el.appendChild(div.firstChild)
        }
      }
    )

// ---------------------------------------------------------- Core utilities ---

/**
 * Distinguishes between Objects which represent attributes and Objects which
 * are created by output modes as elements.
 * @param {*} o the potential Object to be checked.
 * @param {?string=} mode the current mode being used to create content.
 * @return {boolean} false if given something which is not an Object or is an
 *    Object created by an ouput mode.
 */
function isPlainObject(o, mode) {
  return (!!o &&
          toString.call(o) == '[object Object]' &&
          (!mode || !DOMBuilder.modes[mode].isModeObject(o)))
}

/**
 * Distinguishes between Arrays which represent elements and Arrays which
 * represent their contents.
 * @param {*} o the potential Array to be checked.
 * @return {boolean} false if given something which is not an Array or is an
 *    Array which represents an element.
 */
function isPlainArray(o) {
  return (toString.call(o) == '[object Array]' &&
          typeof o.isElement == 'undefined')
}

/**
 * Adds a property to an Array indicating that it represents an element.
 * @param {Array} a
 * @return {Array} the given array.
 */
function elementArray(a) {
  a.isElement = true
  return a
}

// ---------------------------------- Element Creation Convenience Functions ---

/**
 * Creates on Object containing element creation functions with the given fixed
 * mode, if one is given.
 * @param {?string=} mode
 * @return {Object.<string, Function>}
 */
function createElementFunctions(mode) {
  var obj = {}
  for (var i = 0, tag; tag = TAG_NAMES[i]; i++) {
    obj[tag.toUpperCase()] = createElementFunction(tag, mode)
  }
  return obj
}

/**
 * Creates a function which, when called, uses DOMBuilder to create an element
 * with the given tagName.
 *
 * The resulting function will also have a map function which calls
 * DOMBuilder.map with the given tagName and mode, if one is provided.
 *
 * @param {string} tag
 * @param {?string=} fixedMode
 * @return {function(...[*])}
 */
function createElementFunction(tag, fixedMode) {
  var elementFunction = function() {
    if (!arguments.length) {
      var mode = (typeof fixedMode != 'undefined'
                  ? fixedMode
                  : DOMBuilder.mode)
      // Short circuit if there are no arguments, to avoid further
      // argument inspection.
      if (mode) {
        return DOMBuilder.modes[mode].createElement(tag, {}, [])
      }
      return elementArray([tag])
    }
    else {
      return createElementFromArguments(tag, fixedMode, slice.call(arguments))
    }
  }

  elementFunction.map = function() {
    return mapElementFromArguments(tag, fixedMode, slice.call(arguments))
  }

  return elementFunction
}

/**
 * Normalises a list of arguments in order to create a new element using
 * DOMBuilder.createElement. Supported argument formats are:
 *
 * (attributes, child1, ...)
 *    an attributes object followed by an arbitrary number of children.
 * (attributes, [child1, ...])
 *    an attributes object and an Array of children.
 * (child1, ...)
 *    an arbitrary number of children.
 * ([child1, ...])
 *    an Array of children.
 *
 * At least one argument *must* be provided.
 *
 * @param {string} tagName
 * @param {string|null|undefined} fixedMode
 * @param {Array} args
 * @return {*}
 */
function createElementFromArguments(tagName, fixedMode, args) {
  var attributes
    , children
      // The short circuit in createElementFunction ensures we will
      // always have at least one argument when called via element creation
      // functions.
    , argsLength = args.length
    , firstArg = args[0]

  if (argsLength === 1 && isPlainArray(firstArg)) {
    children = firstArg // ([child1, ...])
  }
  else if (isPlainObject(firstArg, (typeof fixedMode != 'undefined'
                                    ? fixedMode
                                    : DOMBuilder.mode))) {
    attributes = firstArg
    children = (argsLength == 2 && isPlainArray(args[1])
                ? args[1]        // (attributes, [child1, ...])
                : args.slice(1)) // (attributes, child1, ...)
  }
  else {
    children = args // (child1, ...)
  }

  return DOMBuilder.createElement(tagName, attributes, children, fixedMode)
}

/**
 * Normalises a list of arguments in order to create new elements using
 * DOMBuilder.map.
 * @param {string} tagName
 * @param {string|null|undefined} fixedMode
 * @param {Array} args
 * @return {Array}
 */
function mapElementFromArguments(tagName, fixedMode, args) {
  if (isPlainArray(args[0])) { // (items, func)
    var defaultAttrs = {}
      , items = args[0]
      , func = (is.Function(args[1]) ? args[1] : null)
  }
  else { // (attrs, items, func)
    var defaultAttrs = args[0]
      , items = args[1]
      , func = (is.Function(args[2]) ? args[2] : null)
  }

  return DOMBuilder.map(tagName, defaultAttrs, items, func, fixedMode)
}

/**
 * Creates an object with loops status details based on the current index and
 * total length.
 * @param {number} i
 * @param {number} l
 * @return {Object}
 */
function loopStatus(i, l) {
  return {
    index: i
  , first: i == 0
  , last: i == l - 1
  }
}

// === DOMBuilder API ==========================================================

var DOMBuilder = {
  version: '2.1.1'

// ------------------------------------------------------------------- Modes ---

  /**
   * Determines which mode content creation functions will operate in by
   * default.
   * @type {string}
   */
, mode: null

  /**
   * Additional modes registered using addMode.
   * @type {Object.<string, Object>}
   */
, modes: {}

  /**
   * Adds a new mode and exposes an API for it on the DOMBuilder object with the
   * mode's name.
   * @param {Object} mode
   */
, addMode: function(mode) {
    mode = object.extend({
      isModeObject: function() { return false; }, api: {}, apply: {}
    }, mode)
    // Store the mode for later use of its content creation functions
    this.modes[mode.name] = mode
    // Expose mode-specific element creation functions and the mode's exported
    // API as a DOMBuilder.<mode name> property.
    this[mode.name] = object.extend(createElementFunctions(mode.name), mode.apply)
    // If there is no default mode set, use the first mode added as the default
    if (this.mode === null) {
      this.mode = mode.name
    }
  }

  /**
   * Calls a function using DOMBuilder temporarily in the given mode and
   * returns its output. Any additional arguments provided will be passed to
   * the function when it is called.
   * @param {string} mode
   * @param {Function} func
   * @return {*}
   */
, withMode: function(mode, func) {
    var originalMode = this.mode
    this.mode = mode
    try {
      return func.apply(null, slice.call(arguments, 2))
    }
    finally {
      this.mode = originalMode
    }
  }

  /**
   * Element creation functions which create contents according to
   * DOMBuilder.mode.
   * @type {Object.<string, Object>}
   */
, elements: createElementFunctions()

  /**
   * Element creation functions which create nested Array contents.
   * @type {Object.<string, Object>}
   */
, array: createElementFunctions(null)

  /**
   * Adds element functions to a given context Object. If a valid mode argument
   * is given, mode-specific element functions are added, as well as any
   * additional functions specified for application by the mode.
   * @param {Object} context
   * @param {string=} mode
   * @return {Object} the object the functions were added to.
   */
, apply: function(context, mode) {
    if (mode && this.modes[mode]) {
      object.extend(context, this[mode])
    }
    else {
      object.extend(context, this.elements)
    }
    return context
  }

// -------------------------------------------------------- Content Creation ---

  /**
   * Generates content from a nested list using the given output mode.
   * @param {Array} content
   * @param {string=} mode
   * @return {*}
   */
, build: function(content, mode) {
    // Default to the configured output mode if called without one
    mode = mode || this.mode

    var tagName = content[0]
      , isFragment = (tagName == FRAGMENT_NAME)
      , attrs = (!isFragment && isPlainObject(content[1], mode)
                 ? content[1]
                 : null)
      , childStartIndex = (attrs === null ? 1 : 2)
      , l = content.length
      , children = []
      , item

    // Extract id and classes from tagName for non-fragment elements, defaulting
    // the tagName to 'div' if none was specified.
    if (!isFragment) {
      if (attrs === null) {
        attrs = {}
      }
      var tagParts = BUILD_TAG_RE.exec(tagName)
      if (!tagParts) {
        throw new Error(tagName + ' is not a valid tag definition')
      }
      tagName = tagParts[1] || 'div'
      if (tagParts[2]) {
        attrs.id = tagParts[2]
      }
      if (tagParts[3]) {
        attrs['class'] = tagParts[3].replace(/\./g, ' ')
      }
    }

    // Build child contents first
    for (var i = childStartIndex; i < l; i++) {
      item = content[i]
      if (is.Array(item)) {
        children.push(this.build(item, mode))
      }
      else {
        children.push(item)
      }
    }

    // Build the current element
    return (isFragment
            ? this.modes[mode].fragment(children)
            : this.modes[mode].createElement(tagName, attrs, children))
  }

  /**
   * Creates an element with the given tag name and, optionally, the given
   * attributes and children.
   * @param {string} tagName
   * @param {Object} attributes
   * @param {Array} children
   * @param {string=} mode
   */
, createElement: function(tagName, attributes, children, mode) {
    attributes = attributes || {}
    children = children || []
    mode = (typeof mode != 'undefined' ? mode : this.mode)
    if (mode) {
      array.flatten(children)
      return this.modes[mode].createElement(tagName, attributes, children)
    }
    else {
      var arrayOutput = [tagName]
      for (var attr in attributes) {
        arrayOutput.push(attributes)
        break
      }
      if (children.length) {
        arrayOutput = arrayOutput.concat(children)
      }
      return elementArray(arrayOutput)
    }
  }

  /**
   * Creates a Text Node with the given text.
   */
, textNode: function(text, mode) {
    mode = (typeof mode != 'undefined' ? mode : this.mode)
    return this.modes[mode].textNode(text)
  }

  /**
   * Creates an element for (potentially) every item in a list.
   * @param {string} tagName
   * @param {Object} defaultAttrs
   * @param {Array} items
   * @param {Function=} func
   * @param {string=} mode
   */
, map: function(tagName, defaultAttrs, items, func, mode) {
    var results = []
    for (var i = 0, l = items.length, attrs, children; i < l; i++) {
      attrs = object.extend({}, defaultAttrs)
      // If we were given a mapping function, call it and use the
      // return value as the contents, unless the function specifies
      // that the item shouldn't generate an element by explicity
      // returning null.
      if (func != null) {
        if (typeof mode != 'undefined') {
          children = DOMBuilder.withMode(mode, func, items[i], attrs,
                                         loopStatus(i, l))
        }
        else {
          children = func(items[i], attrs, loopStatus(i, l))
        }
        if (children === null) {
          continue
        }
      }
      else {
        // If we weren't given a mapping function, use the item as the
        // contents.
        var children = items[i]
      }

      // Ensure children are in an Array, as required by createElement
      if (!isPlainArray(children)) {
        children = [children]
      }

      results.push(this.createElement(tagName, attrs, children, mode))
    }
    return results
  }

  /**
   * Creates a fragment with the given children. Supported argument formats are:
   * @param {...[*]} args
   * @return {*}
   */
, fragment: (function() {
    var fragment = function() {
      var children
      if (arguments.length === 1 &&
          isPlainArray(arguments[0])) {
        children = arguments[0] // ([child1, ...])
      }
      else {
        children = slice.call(arguments) // (child1, ...)
      }

      if (this.mode) {
        // Inline the contents of any child Arrays
        array.flatten(children)
        return this.modes[this.mode].fragment(children)
      }
      else {
        return elementArray([FRAGMENT_NAME].concat(children))
      }
    }

    /**
     * Creates a fragment wrapping content created for every item in a
     * list.
     * @param {Array} items
     * @param {Function=} func
     */
    fragment.map = function(items, func) {
      // If we weren't given a mapping function, the user may as well just
      // have created a fragment directly, as we're just wrapping content
      // here, not creating it.
      if (!is.Function(func)) {
        return DOMBuilder.fragment(items)
      }

      var results = []
      for (var i = 0, l = items.length, children; i < l; i++) {
        // Call the mapping function and add the return value to the
        // fragment contents, unless the function specifies that the item
        // shouldn't generate content by explicity returning null.
        children = func(items[i], loopStatus(i, l))
        if (children === null) {
          continue
        }
        results = results.concat(children)
      }
      return DOMBuilder.fragment(results)
    }

    return fragment
  })()

  /* Exposes utilities for use in mode plugins. */
, util: {
    EVENT_ATTRS: EVENT_ATTRS
  , FRAGMENT_NAME: FRAGMENT_NAME
  , JQUERY_AVAILABLE: JQUERY_AVAILABLE
  , TAG_NAMES: TAG_NAMES
  , setInnerHTML: setInnerHTML
  }
}

module.exports = DOMBuilder
