/**
 * DOMBuilder 2.1.6 (modes: dom [default], html, template) - https://github.com/insin/DOMBuilder
 * MIT Licensed
 */
;(function() {
  var modules = {}
  function require(name) {
    return modules[name]
  }
  require.define = function(rs, fn) {
    var module = {}
      , exports = {}
    module.exports = exports
    fn(module, exports, require)
    if (Object.prototype.toString.call(rs) == '[object Array]') {
      for (var i = 0, l = rs.length; i < l; i++) {
        modules[rs[i]] = module.exports
      }
    }
    else {
      modules[rs] = module.exports
    }
  }

require.define(["isomorph/is","./is"], function(module, exports, require) {
var toString = Object.prototype.toString

// Type checks

function isArray(o) {
  return toString.call(o) == '[object Array]'
}

function isBoolean(o) {
  return toString.call(o) == '[object Boolean]'
}

function isDate(o) {
  return toString.call(o) == '[object Date]'
}

function isError(o) {
  return toString.call(o) == '[object Error]'
}

function isFunction(o) {
  return toString.call(o) == '[object Function]'
}

function isNumber(o) {
  return toString.call(o) == '[object Number]'
}

function isObject(o) {
  return toString.call(o) == '[object Object]'
}

function isRegExp(o) {
  return toString.call(o) == '[object RegExp]'
}

function isString(o) {
  return toString.call(o) == '[object String]'
}

// Content checks

function isEmpty(o) {
  for (var prop in o) {
    return false
  }
  return true
}

module.exports = {
  Array: isArray
, Boolean: isBoolean
, Date: isDate
, Empty: isEmpty
, Error: isError
, Function: isFunction
, NaN: isNaN
, Number: isNumber
, Object: isObject
, RegExp: isRegExp
, String: isString
}
})

require.define("isomorph/object", function(module, exports, require) {
/**
 * Callbound version of Object.prototype.hasOwnProperty(), ready to be called
 * with an object and property name.
 */
var hasOwn = (function() {
  var hasOwnProperty = Object.prototype.hasOwnProperty
  return function(obj, prop) { return hasOwnProperty.call(obj, prop) }
})()

/**
 * Copies own properties from any given objects to a destination object.
 */
function extend(dest) {
  for (var i = 1, l = arguments.length, src; i < l; i++) {
    src = arguments[i]
    if (src) {
      for (var prop in src) {
        if (hasOwn(src, prop)) {
          dest[prop] = src[prop]
        }
      }
    }
  }
  return dest
}

/**
 * Makes a constructor inherit another constructor's prototype without
 * having to actually use the constructor.
 */
function inherits(childConstructor, parentConstructor) {
  var F = function() {}
  F.prototype = parentConstructor.prototype
  childConstructor.prototype = new F()
  childConstructor.prototype.constructor = childConstructor
  return childConstructor
}

/**
 * Creates an Array of [property, value] pairs from an Object.
 */
function items(obj) {
  var items = []
  for (var prop in obj) {
    if (hasOwn(obj, prop)) {
      items.push([prop, obj[prop]])
    }
  }
  return items
}

/**
 * Creates an Object from an Array of [property, value] pairs.
 */
function fromItems(items) {
  var obj = {}
  for (var i = 0, l = items.length, item; i < l; i++) {
    item = items[i]
    obj[item[0]] = item[1]
  }
  return obj
}

/**
 * Creates a lookup Object from an Array, coercing each item to a String.
 */
function lookup(arr) {
  var obj = {}
  for (var i = 0, l = arr.length; i < l; i++) {
    obj[''+arr[i]] = true
  }
  return obj
}

/**
 * If the given object has the given property, returns its value, otherwise
 * returns the given default value.
 */
function get(obj, prop, defaultValue) {
  return (hasOwn(obj, prop) ? obj[prop] : defaultValue)
}

module.exports = {
  hasOwn: hasOwn
, extend: extend
, inherits: inherits
, items: items
, fromItems: fromItems
, lookup: lookup
, get: get
}
})

require.define("isomorph/array", function(module, exports, require) {
var is = require('./is')

var splice = Array.prototype.splice

/**
 * Flattens an Array in-place, replacing any Arrays it contains with their
 * contents, and flattening their contents in turn.
 */
function flatten(arr) {
  for (var i = 0, l = arr.length, current; i < l; i++) {
    current = arr[i]
    if (is.Array(current)) {
      // Make sure we loop to the Array's new length
      l += current.length - 1
      // Replace the current item with its contents
      splice.apply(arr, [i, 1].concat(current))
      // Stay on the current index so we continue looping at the first
      // element of the array we just spliced in or removed.
      i--
    }
  }
  // We flattened in-place, but return for chaining
  return arr
}

module.exports = {
  flatten: flatten
}
})

require.define(["./dombuilder/core","./core"], function(module, exports, require) {
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
})

require.define("Concur", function(module, exports, require) {
var is = require('isomorph/is')
  , object = require('isomorph/object')

/**
 * Mixes in properties from one object to another. If the source object is a
 * Function, its prototype is mixed in instead.
 */
function mixin(dest, src) {
  if (is.Function(src)) {
    object.extend(dest, src.prototype)
  }
  else {
    object.extend(dest, src)
  }
}

/**
 * Applies mixins specified as a __mixin__ property on the given properties
 * object, returning an object containing the mixed in properties.
 */
function applyMixins(properties) {
  var mixins = properties.__mixin__
  if (!is.Array(mixins)) {
    mixins = [mixins]
  }
  var mixedProperties = {}
  for (var i = 0, l = mixins.length; i < l; i++) {
    mixin(mixedProperties, mixins[i])
  }
  delete properties.__mixin__
  return object.extend(mixedProperties, properties)
}

/**
 * Inherits another constructor's prototype and sets its prototype and
 * constructor properties in one fell swoop.
 *
 * If a child constructor is not provided via prototypeProps.constructor,
 * a new constructor will be created.
 */
function inheritFrom(parentConstructor, prototypeProps, constructorProps) {
  // Get or create a child constructor
  var childConstructor
  if (prototypeProps && object.hasOwn(prototypeProps, 'constructor')) {
    childConstructor = prototypeProps.constructor
  }
  else {
    childConstructor = function() {
      parentConstructor.apply(this, arguments)
    }
  }

  // Base constructors should only have the properties they're defined with
  if (parentConstructor !== Concur) {
    // Inherit the parent's prototype
    object.inherits(childConstructor, parentConstructor)
    childConstructor.__super__ = parentConstructor.prototype
  }

  // Add prototype properties, if given
  if (prototypeProps) {
    object.extend(childConstructor.prototype, prototypeProps)
  }

  // Add constructor properties, if given
  if (constructorProps) {
    object.extend(childConstructor, constructorProps)
  }

  return childConstructor
}

/**
 * Namespace and dummy constructor for initial extension.
 */
var Concur = module.exports = function() {}

/**
 * Creates or uses a child constructor to inherit from the the call
 * context, which is expected to be a constructor.
 */
Concur.extend = function(prototypeProps, constructorProps) {
  // If the constructor being inherited from has a __meta__ function somewhere
  // in its prototype chain, call it to customise prototype and constructor
  // properties before they're used to set up the new constructor's prototype.
  if (typeof this.prototype.__meta__ != 'undefined') {
    // Property objects must always exist so properties can be added to
    // and removed from them.
    prototypeProps = prototypeProps || {}
    constructorProps = constructorProps || {}
    this.prototype.__meta__(prototypeProps, constructorProps)
  }

  // If any mixins are specified, mix them into the property objects
  if (prototypeProps && object.hasOwn(prototypeProps, '__mixin__')) {
    prototypeProps = applyMixins(prototypeProps)
  }
  if (constructorProps && object.hasOwn(constructorProps, '__mixin__')) {
    constructorProps = applyMixins(constructorProps)
  }

  // Set up and return the new child constructor
  var childConstructor = inheritFrom(this,
                                     prototypeProps,
                                     constructorProps)
  childConstructor.extend = this.extend
  return childConstructor
}
})

require.define("./dombuilder/dom", function(module, exports, require) {
var DOMBuilder =require('./core')
  , object = require('isomorph/object')

var document = window.document
  // DOMBuilder utilities
  , EVENT_ATTRS = DOMBuilder.util.EVENT_ATTRS
  , JQUERY_AVAILABLE = DOMBuilder.util.JQUERY_AVAILABLE
  , setInnerHTML = DOMBuilder.util.setInnerHTML

/**
 * Cross-browser means of creating a DOM Element with attributes.
 * @param {string} tagName
 * @param {Object} attributes
 * @return {Element}
 */
var createElement = (JQUERY_AVAILABLE
    ? function(tagName, attributes) {
        if (object.hasOwn(attributes, 'innerHTML')) {
          var html = attributes.innerHTML
          delete attributes.innerHTML
          return jQuery('<' + tagName + '>', attributes).html(html).get(0)
        }
        else {
          return jQuery('<' + tagName + '>', attributes).get(0)
        }
      }
    : (function() {
        var attrFix = {
              tabindex: 'tabIndex'
            }
          , propFix = {
              tabindex: 'tabIndex'
            , readonly: 'readOnly'
            , 'for': 'htmlFor'
            , 'class': 'className'
            , maxlength: 'maxLength'
            , cellspacing: 'cellSpacing'
            , cellpadding: 'cellPadding'
            , rowspan: 'rowSpan'
            , colspan: 'colSpan'
            , usemap: 'useMap'
            , frameborder: 'frameBorder'
            , contenteditable: 'contentEditable'
            }
          , nodeName = function(elem, name) {
              return elem.nodeName && elem.nodeName.toUpperCase() == name.toUpperCase()
            }
          , support = (function() {
              var div = document.createElement('div')
              div.setAttribute('className', 't')
              div.innerHTML = '<span style="color:silver">s<span>'
              var span = div.getElementsByTagName('span')[0]
              var input = document.createElement('input')
              input.value = 't'
              input.setAttribute('type', 'radio')
              return {
                style: /silver/.test(span.getAttribute('style'))
              , getSetAttribute: div.className != 't'
              , radioValue: input.value == 't'
              }
            })()
          , formHook
          // Hook for boolean attributes
          , boolHook = function(elem, value, name) {
              var propName
              if (value !== false) {
                // value is true since we know at this point it's type boolean and not false
                // Set boolean attributes to the same name and set the DOM property
                propName = propFix[name] || name
                if (propName in elem) {
                  // Only set the IDL specifically if it already exists on the element
                  elem[propName] = true
                }
                elem.setAttribute(name, name.toLowerCase())
              }
              return name
            }
          , attrHooks = {
              type: function(elem, value) {
                if (!support.radioValue && value == 'radio' && nodeName(elem, 'input')) {
                  // Setting the type on a radio button after the value resets the value in IE6-9
                  // Reset value to its default in case type is set after value
                  var val = elem.value
                  elem.setAttribute('type', value)
                  if (val) {
                    elem.value = val
                  }
                  return value
                }
              }
              // Use the value property for back compat
              // Use the formHook for button elements in IE6/7
            , value: function(elem, value, name) {
                if (formHook && nodeName(elem, 'button')) {
                  return formHook(elem, value, name)
                }
                // Does not return so that setAttribute is also used
                elem.value = value
              }
            }
          , rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i
          , rinvalidChar = /\:|^on/

        // IE6/7 do not support getting/setting some attributes with get/setAttribute
        if (!support.getSetAttribute) {
          // propFix is more comprehensive and contains all fixes
          attrFix = propFix

          // Use this for any attribute on a form in IE6/7
          formHook = attrHooks.name = attrHooks.title = function(elem, value, name) {
            // Check form objects in IE (multiple bugs related)
            // Only use nodeValue if the attribute node exists on the form
            var ret = elem.getAttributeNode(name)
            if (ret) {
              ret.nodeValue = value
              return value
            }
          }

          // Set width and height to auto instead of 0 on empty string( Bug #8150 )
          // This is for removals
          attrHooks.width = attrHooks.height = function(elem, value) {
            if (value === '') {
              elem.setAttribute(name, 'auto')
              return value
            }
          }
        }

        if (!support.style) {
          attrHooks.style = function(elem, value) {
            return (elem.style.cssText = ''+value)
          }
        }

        function setAttr(elem, name, value) {
          // Fallback to prop when attributes are not supported
          if (!('getAttribute' in elem)) {
            // Inlined version of the relevant bits of prop
            name = propFix[name] || name
            if (value !== undefined) {
              return (elem[name] = value)
            }
            return
          }

          var ret, hook
          // Normalize the name if needed
          name = attrFix[name] || name
          hook = attrHooks[name]

          if (!hook) {
            // Use boolHook for boolean attributes
            if (rboolean.test(name)) {
              hook = boolHook
            }
            // Use formHook for forms and if the name contains certain characters
            else if (formHook && name != 'className' &&
              (nodeName(elem, 'form') || rinvalidChar.test(name))) {
              hook = formHook
            }
          }

          if (value !== undefined) {
            if (hook && (ret = hook(elem, value, name)) !== undefined) {
              return ret
            }
            else {
              elem.setAttribute(name, ''+value)
              return value
            }
          }
        }

        return function(tagName, attributes) {
          var el = document.createElement(tagName)
            , name
            , value
          if (object.hasOwn(attributes, 'innerHTML')) {
              setInnerHTML(el, attributes.innerHTML)
              delete attributes.innerHTML
          }
          for (name in attributes) {
            value = attributes[name]
            if (EVENT_ATTRS[name]) {
              el['on' + name] = value
            }
            else {
              setAttr(el, name, value)
            }
          }
          return el
        }
      })()
    )

DOMBuilder.addMode({
  name: 'dom'
, createElement: function(tagName, attributes, children) {
    var hasInnerHTML = object.hasOwn(attributes, 'innerHTML')
    // Create the element and set its attributes and event listeners
    var el = createElement(tagName, attributes)

    // If content was set via innerHTML, we're done...
    if (!hasInnerHTML) {
      // ...otherwise, append children
      for (var i = 0, l = children.length, child; i < l; i++) {
        child = children[i]
        if (child && child.nodeType) {
          el.appendChild(child)
        }
        else {
          el.appendChild(document.createTextNode(''+child))
        }
      }
    }
    return el
  }
, textNode: function(text) {
    return document.createTextNode(text)
  }
, fragment: function(children) {
    var fragment = document.createDocumentFragment()
    for (var i = 0, l = children.length, child; i < l; i++) {
      child = children[i]
      if (child.nodeType) {
        fragment.appendChild(child)
      }
      else {
        fragment.appendChild(document.createTextNode(''+child))
      }
    }
    return fragment
  }
, isModeObject: function(obj) {
    return !!obj.nodeType
  }
, api: {
    createElement: createElement
  }
})
})

require.define("./dombuilder/html", function(module, exports, require) {
var DOMBuilder = require('./core')
  , object = require('isomorph/object')

// Native functions
var splice = Array.prototype.splice
// DOMBuilder utilities
var EVENT_ATTRS = DOMBuilder.util.EVENT_ATTRS
  , FRAGMENT_NAME = DOMBuilder.util.FRAGMENT_NAME
  , JQUERY_AVAILABLE = DOMBuilder.util.JQUERY_AVAILABLE
  , TAG_NAMES = DOMBuilder.util.TAG_NAMES
  , setInnerHTML = DOMBuilder.util.setInnerHTML

/**
 * Lookup for known tag names.
 * @const
 * @type {Object.<string, boolean>}
 */
var TAG_NAME_LOOKUP = object.lookup(TAG_NAMES)

/**
 * Lookup for tags defined as EMPTY in the HTML 4.01 Strict and Frameset DTDs
 * and in the HTML5 spec.
 * @const
 * @type {Object.<string, boolean>}
 */
var EMPTY_TAGS = object.lookup(('area base br col command embed frame hr input img ' +
                                'keygen link meta param source track wbr').split(' '))

/**
 * Cross-browser event registration.
 * @param {string} id
 * @param {string} event
 * @param {Function} handler
 */
var addEvent = (JQUERY_AVAILABLE
    ? function(id, event, handler) {
        jQuery('#' + id)[event](handler)
      }
    : function(id, event, handler) {
        document.getElementById(id)['on' + event] = handler
      }
    )

// ----------------------------------------------------------- HTML Escaping ---

/**
 * String subclass which marks the given string as safe for inclusion
 * without escaping.
 * @constructor
 * @extends {String}
 * @param {string} value
 */
function SafeString(value) {
  this.value = value;
}
object.inherits(SafeString, String)

/**
 * @return {string}
 */
SafeString.prototype.toString = SafeString.prototype.valueOf = function() {
  return this.value
}

/**
 * Marks a string as safe
 * @param {string} value
 * @return {SafeString}
 */
function markSafe(value) {
  return new SafeString(value)
}

/**
 * Determines if a string is safe.
 * @param {string|SafeString} value
 * @return {boolean}
 */
function isSafe(value) {
  return (value instanceof SafeString)
}

/**
 * Escapes sensitive HTML characters.
 * @param {string} s
 * @return {string}
 */
var escapeHTML = (function() {
  var amp = /&/g, lt = /</g, gt = />/g, quot = /"/g, apos = /'/g
  return function(s) {
    return s.replace(amp, '&amp;')
             .replace(lt, '&lt;')
              .replace(gt, '&gt;')
               .replace(quot,'&quot;')
                .replace(apos, '&#39;')
  }
})()

/**
 * If the given input is a SafeString, returns its value; otherwise, coerces
 * to String and escapes.
 * @param {*} html
 * @return {string}
 */
function conditionalEscape(html) {
  if (html instanceof SafeString) {
    return html.value
  }
  return escapeHTML(''+html)
}

// ------------------------------------------------------- Mock DOM Elements ---

/**
 * Partially emulates a DOM Node for HTML generation.
 * @constructor
 * @param {Array=} childNodes initial child nodes.
 */
function HTMLNode(childNodes) {
  /**
   * @type {Array}
   */
  this.childNodes = childNodes || []

  // Ensure any MockFragment contents are inlined, as if this object's child
  // nodes were appended one-by-one.
  this._inlineFragments()

  /**
   * @type {?HTMLNode|string}
   */
  this.firstChild = this.childNodes.length ? this.childNodes[0] : null
}
object.inherits(HTMLNode, Object)

/**
 * Replaces any MockFragment objects in child nodes with their own
 * child nodes and empties the fragment.
 * @private
 */
HTMLNode.prototype._inlineFragments = function() {
  for (var i = 0, l = this.childNodes.length, child; i < l; i++) {
    child = this.childNodes[i]
    if (child instanceof MockFragment) {
      // Replace the fragment with its contents
      splice.apply(this.childNodes, [i, 1].concat(child.childNodes))
      // Clear the fragment on append, as per DocumentFragment
      child._clear()
    }
  }
}

/**
 * Emulates appendChild, inserting fragment child node contents and
 * emptying the fragment if one is given.
 * @param {HTMLNode|string} node
 */
HTMLNode.prototype.appendChild = function(node) {
  if (node instanceof MockFragment) {
    this.childNodes = this.childNodes.concat(node.childNodes)
    // Clear the fragment on append, as per DocumentFragment
    node._clear()
  }
  else {
    this.childNodes.push(node)
  }
  if (this.firstChild === null) {
    this.firstChild = this.childNodes[0]
  }
}

/**
 * Emulates cloneNode so cloning of MockFragment objects works
 * as expected.
 * @param {boolean} deep
 * @return {HTMLNode}
 */
HTMLNode.prototype.cloneNode = function(deep) {
  var clone = this._clone();
  if (deep === true)
  {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i]
      if (node instanceof MockElement) {
        node = node.cloneNode(deep)
      }
      if (i === 0) {
        clone.firstChild = node
      }
      clone.childNodes.push(node)
    }
  }
  return clone
}

/**
 * @return {boolean}
 */
HTMLNode.prototype.hasChildNodes = function() {
  return !!this.childNodes.length
}

/**
 * Removes and returns a child node, or throws an exception if this node doesn't
 * contain it.
 * @param {HTMLNode|string} child the child to be removed,
 * @return {HTMLNode|string}
 */
HTMLNode.prototype.removeChild = function(child) {
  if (this.firstChild !== null && child === this.firstChild) {
    this.firstChild = this.childNodes.length > 1 ? this.childNodes[1] : null
    return this.childNodes.shift()
  }
  for (var i = 1, l = this.childNodes.length; i < l; i++) {
    if (child === this.childNodes[i]) {
      return this.childNodes.splice(i, 1)[0]
    }
  }
  throw new Error('Node was not found')
}

/**
 * Creates the object to be used for deep cloning.
 * @protected
 */
HTMLNode.prototype._clone = function() {
  return new Node()
}

/**
 * Partially emulates a DOM Element for HTML generation.
 * @constructor
 * @extends {HTMLNode}
 * @param {string} tagName
 * @param {Object=} attributes
 * @param {Array=} childNodes
 */
function MockElement(tagName, attributes, childNodes) {
  HTMLNode.call(this, childNodes)
  /** @type {string} */
  this.tagName = this.nodeName = tagName.toLowerCase()
  /** @type {Object} */
  this.attributes = attributes || {}
}
object.inherits(MockElement, HTMLNode)
/** @type {number} */
MockElement.eventTrackerId = 1
/** @type {number} */
MockElement.prototype.nodeType = 1
/**
 * @protected
 * @return {MockElement}
 */
MockElement.prototype._clone = function() {
  return new MockElement(this.tagName, object.extend({}, this.attributes))
}

/**
 * Creates an HTML representation of an MockElement.
 *
 * If true is passed as an argument and any event attributes are found, this
 * method will ensure the resulting element has an id so  the handlers for the
 * event attributes can be registered after the element has been inserted into
 * the document via innerHTML.
 *
 * If necessary, a unique id will be generated.
 *
 * @param {boolean=} trackEvents
 * @return {string}
 */
MockElement.prototype.toString = function(trackEvents) {
  trackEvents = (typeof trackEvents != 'undefined' ? trackEvents : false)
  var tagName = (TAG_NAME_LOOKUP[this.tagName]
                 ? this.tagName
                 : conditionalEscape(this.tagName))
      // Opening tag
    , parts = ['<' + tagName]
    , attr
  // Tag attributes
  for (attr in this.attributes) {
    // innerHTML is a special case, as we can use it to (perhaps
    // inadvisedly) specify entire contents as a string.
    if (attr === 'innerHTML') {
      continue
    }
    // Don't create attributes which wouldn't make sense in HTML mode when the
    // DOM is available - they can be dealt with after insertion using
    // addEvents().
    if (EVENT_ATTRS[attr]) {
      if (trackEvents === true && !this.eventsFound) {
        /** @type {boolean|undefined} */
        this.eventsFound = true;
      }
      continue
    }
    parts.push(' ' + conditionalEscape(attr.toLowerCase()) + '="' +
               conditionalEscape(this.attributes[attr]) + '"')
  }
  if (this.eventsFound && !object.hasOwn(this.attributes, 'id')) {
    // Ensure an id is present so we can grab this element later
    this.id = '__DB' + MockElement.eventTrackerId++ + '__'
    parts.push(' id="' + this.id + '"')
  }
  parts.push('>')

  if (EMPTY_TAGS[tagName]) {
    return parts.join('')
  }

  // If innerHTML was given, use it exclusively for the contents
  if (object.hasOwn(this.attributes, 'innerHTML')) {
    parts.push(this.attributes.innerHTML)
  }
  else {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i];
      if (node instanceof MockElement || node instanceof SafeString) {
        parts.push(node.toString(trackEvents))
      }
      else {
        // Coerce to string and escape
        parts.push(escapeHTML(''+node))
      }
    }
  }

  // Closing tag
  parts.push('</' + tagName + '>')
  return parts.join('')
}

/**
 * If event attributes were found when toString(true) was called, this
 * method will retrieve the resulting DOM Element by id, attach event handlers
 * to it and call addEvents on any MockElement children.
 */
MockElement.prototype.addEvents = function() {
  if (this.eventsFound) {
    var id = (object.hasOwn(this.attributes, 'id')
              ? conditionalEscape(this.attributes.id)
              : this.id)
      , attr;
    for (attr in this.attributes) {
      if (EVENT_ATTRS[attr]) {
        addEvent(id, attr, this.attributes[attr])
      }
    }
    delete this.eventsFound
    delete this.id
  }

  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i]
    if (node instanceof MockElement) {
      node.addEvents()
    }
  }
}

/**
 * @param {Element} el
 */
MockElement.prototype.insertWithEvents = function(el) {
  setInnerHTML(el, this.toString(true))
  this.addEvents()
}

/**
 * Partially emulates a DOM DocumentFragment for HTML generation.
 * @constructor
 * @extends {HTMLNode}
 * @param {Array=} childNodes
 */
function MockFragment(childNodes) {
  HTMLNode.call(this, childNodes)
}
object.inherits(MockFragment, HTMLNode)

/**
 * Clears the fragment after its contents been appended to another Node.
 */
MockFragment.prototype._clear = function() {
  this.childNodes = []
  this.firstChild = null
}
/**
 * @protected
 * @return {MockFragment}
 */
MockFragment.prototype._clone = function() {
  return new MockFragment()
};
/** @type {number} */
MockFragment.prototype.nodeType = 11
/** @type {string} */
MockFragment.prototype.nodeName = FRAGMENT_NAME

/**
 * Creates an HTML representation of an MockFragment.
 *
 * If true is passed as an argument, it will be passed on to
 * any child MockElements when their toString() is called.
 *
 * @param {boolean=} trackEvents
 * @return {string}
 */
MockFragment.prototype.toString = function(trackEvents) {
  trackEvents = (typeof trackEvents != 'undefined' ? trackEvents : false)
  var parts = []
  // Contents
  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof MockElement || node instanceof SafeString) {
      parts.push(node.toString(trackEvents))
    }
    else {
      // Coerce to string and escape
      parts.push(escapeHTML(''+node))
    }
  }

  return parts.join('')
}

/**
 * Calls addEvents() on any MockElement children.
 */
MockFragment.prototype.addEvents = function() {
  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i]
    if (node instanceof MockElement) {
      node.addEvents()
    }
  }
}

/**
 * @param {Element} el
 */
MockFragment.prototype.insertWithEvents = function(el) {
  setInnerHTML(el, this.toString(true))
  this.addEvents()
}

// === Register mode plugin ====================================================

DOMBuilder.addMode({
  name: 'html'
, createElement: function(tagName, attributes, children) {
    return new MockElement(tagName, attributes, children)
  }
, textNode: function(text) {
    return text
  }
, fragment: function(children) {
    return new MockFragment(children)
  }
, isModeObject: function(obj) {
    return (obj instanceof HTMLNode ||
            obj instanceof SafeString)
  }
, api: {
    escapeHTML: escapeHTML
  , conditionalEscape: conditionalEscape
  , isSafe: isSafe
  , markSafe: markSafe
  , SafeString: SafeString
  , HTMLNode: HTMLNode
  , MockElement: MockElement
  , MockFragment: MockFragment
  }
, apply: {
    isSafe: isSafe
  , markSafe: markSafe
  }
})
})

require.define("./dombuilder/template", function(module, exports, require) {
var DOMBuilder = require('./core')
  , Concur = require('Concur')
  , is = require('isomorph/is')
  , object = require('isomorph/object')
  , array = require('isomorph/array')

// Native functions
var slice = Array.prototype.slice
  , toString = Object.prototype.toString

/** Separator used for object lookups. */
var VAR_LOOKUP_SEPARATOR = '.'
/** RegExp for specifying the loop variable for a ForNode. */
var FOR_RE = /( in )([\.\w_]+)$/
/** Separator for specifying multiple variable names to be unpacked. */
var UNPACK_SEPARATOR_RE = /, ?/
/** RegExp for template variables. */
var VARIABLE_RE = /{{(.*?)}}/
/** RegExp for trimming whitespace. */
var TRIM_RE = /^\s+|\s+$/g
/** Context key for block inheritance context. */
var BLOCK_CONTEXT_KEY = 'blockContext'
/** Document Type Definitions. */
var DOCTYPES = {
      4: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">'
    , 5: '<!DOCTYPE html>'
    }

/** Template lookup. */
var templates = {}

/**
 * Creates a lookup object from a list of BlockNodes by name, asserting that
 * their names are unique.
 */
function blockLookup(blocks) {
  var lookup = {}
    , block
  for (var i = 0; block = blocks[i]; i++) {
    if (typeof lookup[block.name] != 'undefined') {
      throw new TemplateSyntaxError("Block with name '" + block.name +
                                    "' appears more than once.")
    }
    lookup[block.name] = block
  }
  return lookup
}

/**
 * Searches a TemplateNode (or an object which looks like one) for contents
 * which are instances of the given node type.
 */
function findNodesByType(contents, nodeType) {
  var nodes = []
  for (var i = 0, l = contents.length, node; i < l; i++) {
    node = contents[i]
    if (node instanceof nodeType) {
      nodes.push(node)
    }
    if (node instanceof TemplateNode && typeof node.contents != 'undefined') {
      nodes.push.apply(nodes, findNodesByType(node.contents, nodeType))
    }
  }
  return nodes
}

/**
 * Some browser implementations of String.prototype.split don't include matches
 * from capturing RegExps.
 */
var splitBits = (function() {
  var memo = {}
  return function(expr, re) {
    if (!re.global) {
      if (!object.hasOwn(memo, re.source)) {
        memo[re.source] = new RegExp(re.source, 'g')
      }
      re = memo[re.source]
    }
    var bits = []
      , match
      , lastIndex
      , lastLastIndex = 0
      , lastLength
    while (match = re.exec(expr)) {
      lastIndex = match.index + match[0].length
      if (lastIndex > lastLastIndex) {
        bits.push(expr.slice(lastLastIndex, match.index))
        if (match.length > 1 && match.index < expr.length) {
          bits.push.apply(bits, match.slice(1))
        }
        lastLength = match[0].length
        lastLastIndex = lastIndex
      }
      if (re.lastIndex === match.index) {
        re.lastIndex++
      }
    }
    bits.push(expr.slice(lastLastIndex))
    return bits
  }
})()

/**
 * Escapes a string for inclusion in generated code where strings use double
 * quotes as delimiters.
 */
function escapeString(s) {
  return s.replace('\\', '\\\\').replace('"', '\\"')
}

/**
 * Default rendering for a list of template contents.
 */
function render(contents, context) {
  var results = []
  for (var i = 0, l = contents.length, content; i < l; i++) {
    content = contents[i]
    if (content && (content instanceof TemplateNode ||
                    is.Function(content.render))) {
      results.push(content.render(context))
    }
    else {
      results.push(content)
    }
  }
  return results
}

// -------------------------------------------------------------- Exceptions ---

/**
 * Thrown when pop() is called too many times on a Context.
 */
function ContextPopError() {
  this.message = 'pop() was called more times than push()'
}
object.inherits(ContextPopError, Error)

/**
 * Thrown when a Variable cannot be resolved.
 */
function VariableNotFoundError(message) {
  this.message = message
}
object.inherits(VariableNotFoundError, Error)

/**
 * Thrown when expressions cannot be parsed or otherwise invalid contents are
 * detected.
 */
function TemplateSyntaxError(message) {
  this.message = message
}
object.inherits(TemplateSyntaxError, Error)

/**
 * Thrown when a named template cannot be found.
 */
function TemplateNotFoundError(message) {
  this.message = message
}
object.inherits(TemplateNotFoundError, Error)

// --------------------------------- Template Lookup / Convenience Rendering ---

/**
 * Renders a template with the given name (or list of names).
 */
function renderTemplate(name, context) {
  var template
  if (is.Array(name)) {
    template = selectTemplate(name)
  }
  else {
    template = getTemplate(name)
  }
  return template.render(context)
}

/**
 * Retrieves a template by name, throwing a TemplateNotFoundError if no such
 * template exists.
 */
function getTemplate(name) {
  if (typeof templates[name] == 'undefined') {
    throw new TemplateNotFoundError(name)
  }
  return templates[name]
}

/**
 * Returns the first template which exists from the given list of template
 * names.
 */
function selectTemplate(names) {
  var notFound = []
  for (var i = 0, l = names.length; i < l; i++) {
    try {
      return getTemplate(names[i])
    }
    catch (e) {
      notFound.push(names[i])
    }
  }
  throw new TemplateNotFoundError(notFound.join(', '))
}

// ----------------------------------------------------------------- Context ---

/**
 * A quick shimplementation of FilterExpression to allow IfNodes to perform
 * existence checks on variables. A full implementation which implements filters
 * will be coming once I've decided on the appropriate design for it.
 */
function FilterExpression(expr) {
  this.variable = new Variable(expr)
}

FilterExpression.prototype.resolve = FilterExpression.prototype.render = function(context, ignoreFailures) {
  var current
  if (this.variable instanceof Variable) {
    try {
      current = this.variable.resolve(context)
    }
    catch (e) {
      if (!(e instanceof VariableNotFoundError)) throw e
      if (ignoreFailures) {
        current = null
      }
      else {
        // Emulate what currently happens if a Variable is not found if this
        // shim is used without passing the ignoreFailures parameter.
        throw e
      }
    }
  }
  else {
    current = this.variable
  }
  return current
}

/**
 * Resolves variable expressions based on a context, supporting object property
 * lookups specified with '.' separators.
 */
function Variable(expr, callFunctions) {
  this.expr = expr
  this.callFunctions = (typeof callFunctions != 'undefined' ? callFunctions: true)
}

Variable.prototype.resolve = Variable.prototype.render = function(context) {
  // First lookup is in the context
  var bits = this.expr.split(VAR_LOOKUP_SEPARATOR)
    , bit = bits.shift()
    , current = context.get(bit)
  if (!context.hasKey(bit)) {
    throw new VariableNotFoundError('Could not find [' + bit +
                                    '] in ' + context)
  }
  else if (is.Function(current) && this.callFunctions) {
    current = current()
  }

  // Any further lookups are against current object properties
  if (bits.length) {
    var l = bits.length
      , next
    for (var i = 0; i < l; i++) {
      bit = bits[i]
      if (current == null || typeof current[bit] == 'undefined') {
        throw new VariableNotFoundError('Could not find [' + bit +
                                        '] in ' + current)
      }
      next = current[bit]
      // Call functions with the current object as context
      if (is.Function(next) && this.callFunctions) {
        current = next.call(current)
      }
      else {
        current = next
      }
    }
  }

  return current
}

/**
 * Manages a stack of objects holding template context variables and rendering
 * context.
 */
function Context(initial) {
  if (!(this instanceof Context)) return new Context(initial)
  this.stack = [initial || {}]
  this.renderContext = new RenderContext()
}

Context.prototype.push = function(context) {
  this.stack.push(context || {})
}

Context.prototype.pop = function() {
  if (this.stack.length == 1) {
    throw new ContextPopError()
  }
  return this.stack.pop()
}

Context.prototype.set = function(name, value) {
  this.stack[this.stack.length - 1][name] = value
}

/**
 * Adds multiple items to the current context object, where names and values are
 * provided as lists.
 */
Context.prototype.zip = function(names, values) {
  var top = this.stack[this.stack.length - 1]
    , l = Math.min(names.length, values.length)
  for (var i = 0; i < l; i++) {
    top[names[i]] = values[i]
  }
}

/**
 * Gets variables, checking all context objects from top to bottom.
 *
 * Returns undefined for variables which are not set, to distinguish from
 * variables which are set, but are null.
 */
Context.prototype.get = function(name, d) {
  for (var i = this.stack.length - 1; i >= 0; i--) {
    if (object.hasOwn(this.stack[i], name)) {
      return this.stack[i][name]
    }
  }
  return d !== undefined ? d : null
}

/**
 * Determines if a particular key is set in the context.
 */
Context.prototype.hasKey = function(name) {
  for (var i = 0, l = this.stack.length; i < l; i++) {
    if (object.hasOwn(this.stack[i], name)) {
      return true
    }
  }
  return false
}

/**
 * Context specific to template rendering.
 */
function RenderContext(initial) {
  this.stack = [initial || {}]
}
object.inherits(RenderContext, Context)

RenderContext.prototype.get = function(name, d) {
  var top = this.stack[this.stack.length - 1]
  if (object.hasOwn(top, name)) {
    return top[name]
  }
  return d !== undefined ? d : null
}

RenderContext.prototype.hasKey = function(name) {
  return object.hasOwn(this.stack[this.stack.length - 1], name)
}

/**
 * Context for block inheritance at render time.
 *
 * Each block in the current template being rendered is added to a First In,
 * First Out queue spcific to its block name. As rendering proceeds up through
 * inherited templates, the blocks which were most deeply defined will be at the
 * head of their respective queues when the root template starts rendering block
 * contents.
 */
function BlockContext() {
  this.blocks = {} // FIFO queues by block name
}

BlockContext.prototype.addBlocks = function(blocks) {
  for (var name in blocks) {
    if (typeof this.blocks[name] != 'undefined') {
      this.blocks[name].unshift(blocks[name])
    }
    else {
      this.blocks[name] = [blocks[name]]
    }
  }
}

BlockContext.prototype.push = function(name, block) {
  this.blocks[name].push(block)
}

BlockContext.prototype.pop = function(name) {
  if (typeof this.blocks[name] != 'undefined' &&
      this.blocks[name].length) {
    return this.blocks[name].pop()
  }
  return null
}

BlockContext.prototype.getBlock = function(name) {
  if (typeof this.blocks[name] != 'undefined') {
    var blocks = this.blocks[name]
    if (blocks.length) {
      return blocks[blocks.length - 1]
    }
  }
  return null
}

//  --------------------------------------------------------------- Template ---

function Template(props, contents) {
  if (is.String(props)) {
    this.name = props
  }
  else {
    this.name = props.name
    this.parent = props.extend || null
  }
  this.contents = contents
  this.blocks = blockLookup(findNodesByType(contents, BlockNode))

  // Ensure any top level contents which need to be wrapped are processed
  TemplateNode.prototype.parseContents.call(this)
  // Add ourselves to the template lookup
  templates[this.name] = this
}

/**
 * Creates a new rendering context and renders the template.
 */
Template.prototype.render = function(context) {
  // Allow plain objects to be passed in as context
  if (!(context instanceof Context)) {
    context = Context(context)
  }
  context.renderContext.push()
  try {
    return this._render(context)
  }
  finally {
    context.renderContext.pop()
  }
}

/**
 * Rendering implementation - adds blocks to rendering context and either calls
 * render on a parent template, or renders contents if this is a top-level
 * template.
 */
Template.prototype._render = function(context) {
  if (!context.renderContext.hasKey(BLOCK_CONTEXT_KEY)) {
    context.renderContext.set(BLOCK_CONTEXT_KEY, new BlockContext())
  }
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY)
  blockContext.addBlocks(this.blocks)
  if (this.parent) {
    // Call _render directly to add to the current render context
    return getTemplate(this.parent)._render(context)
  }
  else {
    // Top-level template - render contents
    return DOMBuilder.fragment(render(this.contents, context))
  }
}

// ---------------------------------------------------------- Template Nodes ---

/**
 * Base for template content nodes.
 */
var TemplateNode = Concur.extend({
  constructor: function(contents) {
    this.contents = contents || []
    if (this.contents.length) {
      this.parseContents()
    }
  }
})

/**
 * Wraps any contents which can be specified without a Node for convenience with
 * an appropriate Node.
 */
TemplateNode.prototype.parseContents = function() {
  for (var i = 0, l = this.contents.length, node; i < l; i++) {
    node = this.contents[i]
    // Strings which contain template variables should be wrapped in a TextNode
    if (is.String(node) && VARIABLE_RE.test(node)) {
      this.contents[i] = new TextNode(node)
    }
  }
}

/**
 * A named section which may be overridden by child templates.
 */
function BlockNode(name, contents) {
  this.name = is.String(name) ? name : name.name
  TemplateNode.call(this, contents)
}
object.inherits(BlockNode, TemplateNode)

BlockNode.prototype.render = function(context) {
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY)
    , results, push, block
  context.push()
  if (blockContext === null) {
    context.set('block', this)
    results = render(this.contents, context)
  }
  else {
    push = block = blockContext.pop(this.name)
    if (block === null) {
      block = this
    }
    block = new BlockNode(block.name, block.contents)
    block.context = context
    context.set('block', block)
    results = render(block.contents, context)
    if (push !== null) {
      blockContext.push(this.name, push)
    }
  }
  context.pop()
  return results
}

BlockNode.prototype['super'] = function(context) {
  var renderContext = this.context.renderContext
  if (renderContext.hasKey(BLOCK_CONTEXT_KEY) &&
      renderContext.get(BLOCK_CONTEXT_KEY).getBlock(this.name) !== null) {
    return this.render(this.context)
  }
  return ''
}

/**
 * Includes the contents of another template, optionally with some extra
 * context variables.
 */
function IncludeNode(template, extraContext, only) {
  this.template = template
  this.extraContext = extraContext || {}
  this.only = only || false
}
object.inherits(IncludeNode, TemplateNode)

IncludeNode.prototype.render = function(context) {
  var templateName = (this.template instanceof Variable
                      ? this.template.resolve(context)
                      : this.template)
    , template = (is.Array(templateName)
                  ? selectTemplate(templateName)
                  : getTemplate(templateName))
    , extraContext = {}
    , name
    , value
  // Create a copy of extra context, resolving any variables
  for (name in this.extraContext) {
    value = this.extraContext[name]
    extraContext[name] = (value instanceof Variable
                          ? value.resolve(context)
                          : value)
  }
  if (this.only) {
    return template.render(extraContext)
  }
  else {
    context.push(extraContext)
    var results = template.render(context)
    context.pop()
    return results
  }
}

/**
 * An HTML element and its contents.
 */
function ElementNode(tagName, attributes, contents) {
  this.tagName = tagName
  this.attributes = object.extend({}, attributes)
  this.dynamicAttrs = false
  // Attributes which contain template variables should be wrapped in a TextNode
  for (var name in this.attributes) {
    var attr = this.attributes[name]
    if (is.String(attr) && VARIABLE_RE.test(attr)) {
      this.attributes[name] = new TextNode(attr)
      if (!this.dynamicAttrs) {
        this.dynamicAttrs = true
      }
    }
    else if ((attr instanceof TemplateNode || attr instanceof Variable) &&
             !this.dynamicAttrs) {
      this.dynamicAttrs = true
    }
  }
  TemplateNode.call(this, contents)
}
object.inherits(ElementNode, TemplateNode)

ElementNode.prototype.render = function(context) {
  return DOMBuilder.createElement(this.tagName,
                                  (this.dynamicAttrs
                                   ? this.renderAttributes(context)
                                   : this.attributes),
                                  render(this.contents, context))
}

ElementNode.prototype.renderAttributes = function(context) {
  var attributes = {}, name, attr, result
  for (name in this.attributes) {
    attr = this.attributes[name]
    if (attr instanceof TemplateNode) {
      result = attr.render(context)
      if (is.Array(result)) {
        result = array.flatten(result).join('')
      }
      attributes[name] = result
    }
    else if (attr instanceof Variable) {
      attributes[name] = attr.resolve(context)
    }
    else {
      attributes[name] = attr
    }
  }
  return attributes
}

/**
 * Supports looping over a list obtained from the context, creating new
 * context variables with list contents and calling render on all its
 * contents.
 */
function ForNode(expr, contents) {
  this._parseExpr(expr)
  this.emptyContents = ((contents.length &&
                         contents[contents.length - 1] instanceof EmptyNode)
                        ? contents.pop().contents
                        : [])
  TemplateNode.call(this, contents)
}
object.inherits(ForNode, TemplateNode)

ForNode.prototype._parseExpr = function(expr) {
  var bits = splitBits(expr, FOR_RE)
  if (bits.length != 4 || bits[1] != ' in ' || bits[3] !== '') {
    throw new TemplateSyntaxError('Invalid ForNode expression: ' + expr)
  }
  this.loopVars = bits[0].split(UNPACK_SEPARATOR_RE)
  this.listVar = new Variable(bits[2])
}

ForNode.prototype.render = function(context) {
  var list = this.listVar.resolve(context)
    , results = []
    , forloop = {parentloop: context.get('forloop', {})}
    , l = list.length
    , item
  if (list.length < 1) {
    return render(this.emptyContents, context)
  }
  context.push()
  context.set('forloop', forloop)
  for (var i = 0; i < l; i++) {
    item = list[i]
    // Set current item(s) in context variable(s)
    if (this.loopVars.length === 1) {
      context.set(this.loopVars[0], item)
    }
    else {
      context.zip(this.loopVars, item)
    }
    // Update loop status variables
    forloop.counter = i + 1
    forloop.counter0 = i
    forloop.revcounter = l - i
    forloop.revcounter0 = l - i - 1
    forloop.first = (i === 0)
    forloop.last = (i === l - 1)
    // Render contents
    results.push.apply(results, render(this.contents, context))
  }
  context.pop()
  return results
}

/**
 * Provides content for a ForNode if its list of items is empty. Instances of
 * this node will be ignored unless they are the last node in a ForNode's
 * content.
 */
function EmptyNode(contents) {
  TemplateNode.call(this, contents)
}
object.inherits(EmptyNode, TemplateNode)
EmptyNode.prototype.render = function(context) {
  return []
}

/**
 * Executes a boolean test using variables obtained from the context,
 * calling render on its contents if the result is true. If the last content
 * item is an ElseNode, its contents will be rendered if the test is false.
 */
function IfNode(expr, contents) {
  if (is.Function(expr)) {
    this.test = expr
  }
  else {
    this.test = this._parseExpr(expr)
  }
  this.elseContents = ((contents.length &&
                        contents[contents.length - 1] instanceof ElseNode)
                       ? contents.pop().contents
                       : [])
  TemplateNode.call(this, contents)
}
object.inherits(IfNode, TemplateNode)

IfNode.prototype._parseExpr = (function() {
  var ops = object.lookup('( ) && || == === <= < >= > != !== !! !'.split(' '))
    , opsRE = /(\(|\)|&&|\|\||={2,3}|<=|<|>=|>|!={1,2}|!{1,2})/
    , numberRE = /^-?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
    , quotes = object.lookup(['"', "'"])
    , isQuotedString = function(s) {
        var q = s.charAt(0)
        return (s.length > 1 &&
                typeof quotes[q] != 'undefined' &&
                s.lastIndexOf(q) == s.length - 1)
      }
  return function(expr) {
    var code = ['return (']
      , bits = splitBits(expr, opsRE)
    for (var i = 0, l = bits.length, bit; i < l; i++) {
      bit = bits[i]
      if (typeof ops[bit] != 'undefined') {
        code.push(bit)
      }
      else {
        bit = bit.replace(TRIM_RE, '')
        if (bit) {
          if (numberRE.test(bit) || isQuotedString(bit)) {
            code.push(bit)
          }
          else {
            code.push('new FilterExpression("' + escapeString(bit) + '").resolve(c, true)')
          }
        }
      }
    }
    code.push(');')
    try {
      var func = new Function('c', 'FilterExpression', code.join(' '))
      return function(context) {
        return func(context, FilterExpression)
      }
    }
    catch (e) {
      throw new TemplateSyntaxError('Invalid $if expression (' + e.message +
                                    '): ' + expr)
    }
  }
})()

IfNode.prototype.render = function(context) {
  return render(this.test(context) ? this.contents : this.elseContents, context)
}

/**
 * Provides content for an IfNode when its test returns ``false``. Instances of
 * this node will be ignored unless they are the last node in an IfNodes's
 * content.
 */
function ElseNode(contents) {
  TemplateNode.call(this, contents)
}
object.inherits(ElseNode, TemplateNode)
ElseNode.prototype.render = function(context) {
  return []
}

/**
 * Wraps static text context and text context which contains template variable
 * definitions to be inserted at render time.
 */
function TextNode(text) {
  this.dynamic = VARIABLE_RE.test(text)
  if (this.dynamic) {
    this.func = this._parseExpr(text)
  }
  else {
    this.text = text
  }
}
object.inherits(TextNode, TemplateNode)

/**
 * Creates a function which accepts context and performs replacement by
 * variable resolution on the given expression.
 */
TextNode.prototype._parseExpr = function(expr) {
  var code = ['var a = []']
    , bits = splitBits(expr, VARIABLE_RE)
  for (var i = 0, l = bits.length, bit; i < l; i++) {
    bit = bits[i]
    if (i % 2) {
      code.push('a.push(new Variable("' +
                escapeString(bit.replace(TRIM_RE, '')) +
                '").resolve(c))')
    }
    else if (bit) {
      code.push('a.push("' + escapeString(bit) + '")')
    }
  }
  code.push('return a')
  var func = new Function('c', 'Variable', code.join(';'))
  return function(context) {
    return func(context, Variable)
  }
}

TextNode.prototype.render = function(context) {
  return (this.dynamic ? this.func(context) : [this.text])
}

/**
 * Cycles over a list of values, producing the next value on each render.
 */
function CycleNode(values, options) {
  this.values = values
  options = object.extend({as: null, silent: false}, options || {})
  this.variableName = options.as
  this.silent = options.silent
  // Generate a unique id for each CycleNode
  this.id = 'cycle' + CycleNode.cycleId++
}
object.inherits(CycleNode, TemplateNode)

CycleNode.cycleId = 1

CycleNode.prototype.render = function(context) {
  var nextIndex = context.renderContext.get(this.id, 0)
    , value = this.values[nextIndex]
  context.renderContext.set(this.id, (nextIndex + 1) % this.values.length)
  if (value instanceof Variable) {
    value = value.resolve(context)
  }
  if (this.variableName) {
    context.set(this.variableName, value)
  }
  if (this.silent) {
    return []
  }
  return value
}

function DoctypeNode(version) {
  this.version = version || 5
}
object.inherits(DoctypeNode, TemplateNode)
DoctypeNode.prototype.render = function(context) {
  var doctype = DOCTYPES[this.version] || ''
  return (DOMBuilder.html ? DOMBuilder.html.markSafe(doctype) : doctype)
}

// === Register mode plugin ====================================================

DOMBuilder.addMode({
  name: 'template'
, createElement: function(tagName, attributes, children) {
    return new ElementNode(tagName, attributes, children)
  }
, textNode: function(text) {
    return text
  }
, fragment: function(children) {
    return children
  }
, isModeObject: function(obj) {
    return (obj instanceof TemplateNode || obj instanceof Variable)
  }
, api: {
    DOCTYPES: DOCTYPES
  , templates: templates
  , ContextPopError: ContextPopError
  , VariableNotFoundError: VariableNotFoundError
  , TemplateSyntaxError: TemplateSyntaxError
  , TemplateNotFoundError: TemplateNotFoundError
  , renderTemplate: renderTemplate
  , getTemplate: getTemplate
  , selectTemplate: selectTemplate
  , FilterExpression: FilterExpression
  , Variable: Variable
  , Context: Context
  , RenderContext: RenderContext
  , BlockContext: BlockContext
  , Template: Template
  , TemplateNode: TemplateNode
  , BlockNode: BlockNode
  , IncludeNode: IncludeNode
  , ElementNode: ElementNode
  , ForNode: ForNode
  , EmptyNode: EmptyNode
  , IfNode: IfNode
  , ElseNode: ElseNode
  , TextNode: TextNode
  , CycleNode: CycleNode
  }
, apply: {
    Context: Context
  , renderTemplate: renderTemplate
  , $template: function(props) {
      return new Template(props, array.flatten(slice.call(arguments, 1)))
    }
  , $doctype: function(version) {
      return new DoctypeNode(version)
    }
  , $block: function(name) {
      return new BlockNode(name, array.flatten(slice.call(arguments, 1)))
    }
  , $include: function(template, extraContext, only) {
      return new IncludeNode(template, extraContext, only)
    }
  , $var: function(expr) {
      return new Variable(expr)
    }
  , $func: function(expr) {
      return new Variable(expr, false)
    }
  , $text: function(expr) {
      return new TextNode(expr)
    }
  , $for: function(props) {
      return new ForNode(props, array.flatten(slice.call(arguments, 1)))
    }
  , $empty: function() {
      return new EmptyNode(array.flatten(slice.call(arguments)))
    }
  , $if: function(expr) {
      return new IfNode(expr, array.flatten(slice.call(arguments, 1)))
    }
  , $else: function() {
      return new ElseNode(array.flatten(slice.call(arguments)))
    }
  , $cycle: function(values, options) {
      return new CycleNode(values, options)
    }
  }
})
})

require.define("DOMBuilder", function(module, exports, require) {
var DOMBuilder = require('./dombuilder/core')
require('./dombuilder/dom')
require('./dombuilder/html')
require('./dombuilder/template')
module.exports = DOMBuilder
})

window['DOMBuilder'] = require('DOMBuilder')

})();