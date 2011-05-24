(function(__global__, undefined)
{

var modules = (typeof module !== 'undefined' && module.exports)
  , dummy = function() {}
  , document = __global__.document
  , toString = Object.prototype.toString
  , hasOwn = Object.prototype.hasOwnProperty
  , slice = Array.prototype.slice
  , splice = Array.prototype.splice
    // Functioms and objects involved in implementing cross-crowser workarounds
  , eventAttrs, createElement, addEvent, setInnerHTML
    /** Tag names defined in the HTML 4.01 Strict and Frameset DTDs. */
  , tagNames = ('a abbr acronym address area b bdo big blockquote body br ' +
    'button caption cite code col colgroup dd del dfn div dl dt em fieldset ' +
    'form frame frameset h1 h2 h3 h4 h5 h6 hr head html i iframe img input ' +
    'ins kbd label legend li link map meta noscript ' /* :) */ + 'object ol ' +
    'optgroup option p param pre q samp script select small span strong style ' +
    'sub sup table tbody td textarea tfoot th thead title tr tt ul var').split(' ')
    /** Lookup for known tag names. */
  , tagNameLookup = lookup(tagNames)
    /** Lookup for tags defined as EMPTY in the HTML 4.01 Strict and Frameset DTDs. */
  , emptyTags = lookup('area base br col frame hr input img link meta param'.split(' '))
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

function isString(o) {
  return (toString.call(o) === "[object String]");
}

/**
 * We primarily want to distinguish between Objects and Nodes.
 */
function isObject(o) {
  return (!!o && toString.call(o) === '[object Object]' &&
          !o.nodeType &&
          !(o instanceof TemplateNode) &&
          !(o instanceof SafeString))
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

/**
 * Escapes sensitive HTML characters.
 */
function escapeHTML(s) {
  return s.split('&').join('&amp;')
           .split('<').join('&lt;')
            .split('>').join('&gt;')
             .split('"').join('&quot;')
              .split("'").join('&#39;');
}

// Detect and use jQuery to implement cross-browser workarounds when available
if (typeof jQuery != 'undefined') {
  eventAttrs = jQuery.attrFn;
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
  eventAttrs = lookup(
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
        if (eventAttrs[name]) {
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

// === HTML Escaping ===========================================================

/**
 * If the given input is a ``SafeString``, returns its value; otherwise, coerces
 * to ``String`` and escapes.
 */
function conditionalEscape(html) {
  if (html instanceof SafeString) {
    return html.value;
  }
  return escapeHTML(''+html);
}

/**
 * ``String`` subclass which marks the given string as safe for inclusion
 * without escaping.
 */
function SafeString(value) {
  this.value = value;
}
inheritFrom(SafeString, String);

SafeString.prototype.toString = SafeString.prototype.valueOf = function() {
  return this.value;
};

// === Mock DOM Elements =======================================================

/**
 * Partially emulates a DOM ``Node`` for HTML generation.
 */
function HTMLNode(childNodes) {
  this.childNodes = childNodes || [];

  // Ensure HTMLFragment contents are inlined, as if this object's child
  // nodes were appended one-by-one.
  this._inlineFragments();
}
inheritFrom(HTMLNode, Object);

/**
 * Replaces any ``HTMLFragment`` objects in child nodes with their own
 * child nodes and empties the fragment.
 */
HTMLNode.prototype._inlineFragments = function() {
  var i = 0
    , l = this.childNodes.length
    , child
    ;
  for (; i < l; i++) {
    child = this.childNodes[i];
    if (child instanceof HTMLFragment) {
      this.childNodes.splice.apply(this.childNodes,
                                   [i, 1].concat(child.childNodes));
      // Clear the fragment on append, as per DocumentFragment
      child.childNodes = [];
    }
  }
};

/**
 * Emulates ``appendChild``, inserting fragment child node contents and
 * emptying the fragment if one is given.
 */
HTMLNode.prototype.appendChild = function(node) {
  if (node instanceof HTMLFragment) {
    this.childNodes = this.childNodes.concat(node.childNodes);
    // Clear the fragment on append, as per DocumentFragment
    node.childNodes = [];
  } else {
    this.childNodes.push(node);
  }
};

/**
 * Emulates ``cloneNode`` so cloning of ``HTMLFragment`` objects works
 * as expected.
 */
HTMLNode.prototype.cloneNode = function(deep) {
  var clone = this._clone();
  if (deep === true)
  {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i];
      if (node instanceof HTMLElement) {
        clone.childNodes.push(node.cloneNode(deep));
      } else {
        clone.childNodes.push(node);
      }
    }
  }
  return clone;
};

/**
 * Creates the object to be used for deep cloning.
 */
HTMLNode.prototype._clone = function() {
  return new Node();
};

/**
 * Partially emulates a DOM ``Element ``for HTML generation.
 */
function HTMLElement(tagName, attributes, childNodes) {
  HTMLNode.call(this, childNodes);

  this.tagName = this.nodeName = tagName.toLowerCase();
  this.attributes = attributes || {};

  // Keep a record of whether or not closing slashes are needed, as the
  // mode could change before this object is coerced to a String.
  this.xhtml = (DOMBuilder.mode == 'XHTML');
}
inheritFrom(HTMLElement, HTMLNode);

HTMLElement.eventTrackerId = 1;

HTMLElement.prototype.nodeType = 1;

HTMLElement.prototype._clone = function() {
  var clone = new HTMLElement(this.tagName, extend({}, this.attributes));
  clone.xhtml = this.xhtml;
  return clone;
};

/**
 * Creates an HTML/XHTML representation of an HTMLElement.
 *
 * If ``true`` is passed as an argument and any event attributes are found, this
 * method will ensure the resulting element has an id so  the handlers for the
 * event attributes can be registered after the element has been inserted into
 * the document via ``innerHTML``.
 *
 * If necessary, a unique id will be generated.
 */
HTMLElement.prototype.toString = function() {
  var trackEvents = arguments[0] || false
    , tagName = (tagNameLookup[this.tagName]
                 ? this.tagName
                 : conditionalEscape(this.tagName))
      // Opening tag
    , parts = ['<' + tagName]
    ;
  // Tag attributes
  for (var attr in this.attributes) {
    // innerHTML is a special case, as we can use it to (perhaps
    // inadvisedly) specify entire contents as a string.
    if (attr === 'innerHTML') {
      continue;
    }
    // Don't create attributes which wouldn't make sense in HTML mode -
    // they can be dealt with afet insertion using addEvents().
    if (eventAttrs[attr]) {
      if (trackEvents === true && !this.eventsFound) {
        this.eventsFound = true;
      }
      continue;
    }
    parts.push(' ' + conditionalEscape(attr.toLowerCase()) + '="' +
               conditionalEscape(this.attributes[attr]) + '"');
  }
  if (this.eventsFound && !('id' in this.attributes)) {
    // Ensure an id is present so we can grab this element later
    this.id  = '__DB' + HTMLElement.eventTrackerId++ + '__';
    parts.push(' id="' + this.id + '"');
  }
  parts.push('>');

  if (emptyTags[tagName]) {
    if (this.xhtml) {
      parts.splice(parts.length - 1, 1, ' />');
    }
    return parts.join('');
  }

  // If innerHTML was given, use it exclusively for the contents
  if ('innerHTML' in this.attributes) {
    parts.push(this.attributes.innerHTML);
  } else {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i];
      if (node instanceof HTMLElement || node instanceof SafeString) {
        parts.push(node.toString(trackEvents));
      }
      else if (node === '\u00A0') {
        // Special case to convert these back to entities,
        parts.push('&nbsp;');
      } else {
        // Coerce to string and escape
        parts.push(escapeHTML(''+node));
      }
    }
  }

  // Closing tag
  parts.push('</' + tagName + '>');
  return parts.join('');
};

/**
 * If event attributes were found when ``toString(true)`` was called, this
 * method will retrieve the resulting DOM Element by id, attach event handlers
 * to it and call ``addEvents`` on any HTMLElement children.
 */
HTMLElement.prototype.addEvents = function() {
  if (this.eventsFound) {
    var id = ('id' in this.attributes
              ? conditionalEscape(this.attributes.id)
              : this.id)
      , attr
      ;
    for (attr in this.attributes) {
      if (eventAttrs[attr]) {
        addEvent(id, attr, this.attributes[attr]);
      }
    }
    delete this.eventsFound;
    delete this.id;
  }

  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof HTMLElement) {
      node.addEvents();
    }
  }
};

HTMLElement.prototype.insertWithEvents = function(el) {
  setInnerHTML(el, this.toString(true));
  this.addEvents();
};

/**
 * Partially emulates a DOM ``DocumentFragment`` for HTML generation.
 */
function HTMLFragment(childNodes) {
  HTMLNode.call(this, childNodes);
}
inheritFrom(HTMLFragment, HTMLNode);

HTMLFragment.prototype._clone = function() {
  return new HTMLFragment();
};

HTMLFragment.prototype.nodeType = 11;
HTMLFragment.prototype.nodeName = '#document-fragment';

/**
 * Creates an HTML/XHTML representation of an HTMLFragment.
 *
 * If ``true``is passed as an argument, it will be passed on to
 * any child HTMLElements when their ``toString()`` is called.
 */
HTMLFragment.prototype.toString = function() {
  var trackEvents = arguments[0] || false
    , parts = []
    ;
  // Contents
  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof HTMLElement || node instanceof SafeString) {
      parts.push(node.toString(trackEvents));
    } else if (node === '\u00A0') {
      // Special case to convert these back to entities,
      parts.push('&nbsp;');
    } else {
      // Coerce to string and escape
      parts.push(escapeHTML(''+node));
    }
  }

  return parts.join('');
};

/**
 * Calls ``addEvents()`` on any HTMLElement children.
 */
HTMLFragment.prototype.addEvents = function() {
  for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
    node = this.childNodes[i];
    if (node instanceof HTMLElement) {
      node.addEvents();
    }
  }
};

HTMLFragment.prototype.insertWithEvents = function(el) {
  setInnerHTML(el, this.toString(true));
  this.addEvents();
};

// === Templates ===============================================================

  /** Separator used for object lookups. */
var VAR_LOOKUP_SEPARATOR = '.'
  /** Separator for specifying multiple variable names to be unpacked. */
  , UNPACK_SEPARATOR_RE = /, ?/
  /** RegExp for template variables. */
  , VARIABLE_RE = /{{(.*?)}}/
  /** RegExp for trimming whitespace. */
  , TRIM_RE = /^\s+|\s+$/g
  /** Context key for block inheritance context. */
  , BLOCK_CONTEXT_KEY = 'blockContext'
  ;

/**
 * Escapes a string for inclustion in generated code where strings use double
 * quotes as delimiters.
 */
function escapeString(s) {
  return s.replace('\\', '\\\\').replace('"', '\\"');
}

/**
 * Some browser implementations of String.prototype.split don't include matches
 * from capturing RegExps.
 */
var splitBits = (function() {
  var memo = {};
  return function(expr, re) {
    if (!re.global) {
      if (!hasOwn.call(memo, re.source)) {
        memo[re.source] = new RegExp(re.source, 'g');
      }
      re = memo[re.source];
    }
    var bits = []
      , match
      , lastIndex
      , lastLastIndex = 0
      , lastLength
      ;
    while(match = re.exec(expr)) {
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        bits.push(expr.slice(lastLastIndex, match.index));
        if (match.length > 1 && match.index < expr.length) {
          bits.push.apply(bits, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
      }
      if (re.lastIndex === match.index) {
        re.lastIndex++;
      }
    }
    bits.push(expr.slice(lastLastIndex));
    return bits;
  };
})();

// -------------------------------------------------------------- Exceptions ---

/**
 * Thrown when pop() is called too many times on a Context.
 */
function ContextPopError() {
  this.message = 'pop() was called more times than push()';
}
inheritFrom(ContextPopError, Error);

/**
 * Thrown when a Variable cannot be resolved.
 */
function VariableNotFoundError(message) {
  this.message = message;
}
inheritFrom(VariableNotFoundError, Error);

/**
 * Thrown when expressions cannot be parsed or orherwise invalid contents are
 * detected.
 */
function TemplateSyntaxError(message) {
  this.message = message;
}
inheritFrom(TemplateSyntaxError, Error);

/**
 * Thrown when a named template cannot be found.
 */
function TemplateNotFoundError(message) {
  this.message = message;
}
inheritFrom(TemplateNotFoundError, Error);

// ----------------------------------------------------------------- Context ---

/**
 * Resolves variable expressions based on a context, supporting object property
 * lookups specified with '.' separators.
 */
function Variable(expr) {
  this.expr = expr;
}

Variable.prototype.resolve = Variable.prototype.render = function(context) {
  // First lookup is in the context
  var bits = this.expr.split(VAR_LOOKUP_SEPARATOR)
    , bit = bits.shift()
    , current = context.get(bit)
    ;
  if (!context.hasKey(bit)) {
    throw new VariableNotFoundError('Could not find [' + bit +
                                    '] in ' + context);
  } else if (isFunction(current)) {
    current = current();
  }

  // Any further lookups are against current object properties
  if (bits.length) {
    var l = bits.length
      , next
      ;
    for (var i = 0; i < l; i++) {
      bit = bits[i];
      if (current === null ||
          current === undefined ||
          typeof current[bit] == 'undefined') {
        throw new VariableNotFoundError('Could not find [' + bit +
                                        '] in ' + current);
      }
      next = current[bit];
      // Call functions with the current object as context
      if (isFunction(next)) {
        current = next.call(current);
      } else {
        current = next;
      }
    }
  }

  return current;
}

/**
 * Manages a stack of objects holding template context variables and rendering
 * context.
 */
function Context(initial) {
  if (!(this instanceof Context)) return new Context(initial);
  this.stack = [initial || {}];
  this.renderContext = new RenderContext();
}

Context.prototype.push = function(context) {
  this.stack.push(context || {});
};

Context.prototype.pop = function() {
  if (this.stack.length == 1) {
    throw new ContextPopError();
  }
  return this.stack.pop();
};

Context.prototype.set = function(name, value) {
  this.stack[this.stack.length - 1][name] = value;
};

/**
 * Adds multiple items to the current context object, where names and values are
 * provided as lists.
 */
Context.prototype.zip = function(names, values) {
  var top = this.stack[this.stack.length - 1]
    , l = Math.min(names.length, values.length)
    ;
  for (var i = 0; i < l; i++) {
    top[names[i]] = values[i];
  }
};

/**
 * Gets variables, checking all context objects from top to bottom.
 *
 * Returns undefined for variables which are not set, to distinguish from
 * variables which are set, but are null.
 */
Context.prototype.get = function(name, d) {
  for (var i = this.stack.length - 1; i >= 0; i--) {
    if (hasOwn.call(this.stack[i], name)) {
      return this.stack[i][name];
    }
  }
  return d !== undefined ? d : null;
};

/**
 * Determine if a particular key is set in the context.
 */
Context.prototype.hasKey = function(name) {
  for (var i = 0, l = this.stack.length; i < l; i++) {
    if (hasOwn.call(this.stack[i], name)) {
      return true;
    }
  }
  return false;
};

/**
 * Convenience method for calling render() on a list of content items
 * with this context.
 */
Context.prototype.render = function(contents) {
  var results = [];
  for (var i = 0, l = contents.length; i < l; i++) {
    if (isString(contents[i])) {
      results.push(contents[i]);
    } else {
      results.push(contents[i].render(this));
    }
  }
  return results;
};

function RenderContext(initial) {
  this.stack = [initial || {}];
}
inheritFrom(RenderContext, Context);

RenderContext.prototype.get = function(name, d) {
  var top = this.stack[this.stack.length - 1];
  if (hasOwn.call(top, name)) {
    return top[name];
  }
  return d !== undefined ? d : null;
};

RenderContext.prototype.hasKey = function(name) {
  return hasOwn.call(this.stack[this.stack.length - 1], name);
};

function BlockContext() {
  this.blocks = {} // FIFO queues by block name
}

BlockContext.prototype.addBlocks = function(blocks) {
  for (var name in blocks) {
    if (typeof this.blocks[name] != 'undefined') {
      this.blocks[name].unshift(blocks[name]);
    } else {
      this.blocks[name] = [blocks[name]];
    }
  }
};

BlockContext.prototype.push = function(name, block) {
  this.blocks[name].push(block);
};

BlockContext.prototype.pop = function(name) {
  if (typeof this.blocks[name] != 'undefined' &&
      this.blocks[name].length) {
    return this.blocks[name].pop();
  }
  return null;
};

BlockContext.prototype.getBlock = function(name) {
  if (typeof this.blocks[name] != 'undefined') {
    var blocks = this.blocks[name];
    if (blocks.length) {
      return blocks[blocks.length - 1];
    }
  }
  return null;
};

//  --------------------------------------------------------------- Template ---

function findNodesByType(contents, nodeType) {
  var nodes = []
    , l = contents.length
    , node
    ;
  for (var i = 0; i < l; i++) {
    node = contents[i];
    if (node instanceof nodeType) {
      nodes.push(node);
    }
    if (node instanceof TemplateNode && typeof node.contents != 'undefined') {
      nodes.push.apply(nodes, findNodesByType(node.contents, nodeType));
    }
  }
  return nodes;
}

function blockLookup(blocks) {
  var lookup = {}
    , block
    ;
  for (var i = 0; block = blocks[i]; i++) {
    if (typeof lookup[block.name] != 'undefined') {
      throw new TemplateSyntaxError("Block with name '" + block.name +
                                    "' appears more than once.");
    }
    lookup[block.name] = block;
  }
  return lookup;
}

function Template(props, contents) {
  this.name = props.name;
  this.extends_ = props['extends'] || null;
  this.contents = contents;
  this.blocks = blockLookup(findNodesByType(contents, BlockNode));
  DOMBuilder._templates[this.name] = this;
}

/**
 * Creates a new rendering context and renders the template.
 */
Template.prototype.render = function(context) {
  context.renderContext.push();
  try {
    return this._render(context);
  }
  finally {
    context.renderContext.pop();
  }
};

/**
 * Rendering implementation - adds blocks to rendering context and either calls
 * render on a parent template, or renders contents if this is a top-level
 * template.
 */
Template.prototype._render = function(context) {
  if (!context.renderContext.hasKey(BLOCK_CONTEXT_KEY)) {
    context.renderContext.set(BLOCK_CONTEXT_KEY, new BlockContext());
  }
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY);
  blockContext.addBlocks(this.blocks);
  if (this.extends_) {
    if (typeof DOMBuilder._templates[this.extends_] == 'undefined') {
      throw new TemplateNotFoundError("Could not find template named '" +
                                      this.extends_ + '"');
    }
    // Call _render directly to add to the current render context
    return DOMBuilder._templates[this.extends_]._render(context);
  } else {
    // Top-level template - render contents
    return DOMBuilder.fragment(context.render(this.contents));
  }
};

// ---------------------------------------------------------- Template Nodes ---

/**
 * Base for template content nodes.
 */
function TemplateNode() {}

/**
 * A named section which may be overridden by child templates.
 */
function BlockNode(name, contents) {
  this.name = isString(name) ? name : name.name;
  this.contents = contents;
}
inheritFrom(BlockNode, TemplateNode);

BlockNode.prototype.render = function(context) {
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY)
    , results, push, block
    ;
  context.push();
  if (blockContext === null) {
    context.set('block', this);
    results = context.render(this.contents);
  } else {
    push = block = blockContext.pop(this.name);
    if (block === null) {
      block = this;
    }
    block = new BlockNode(block.name, block.contents);
    block.context = context;
    context.set('block', block);
    results = context.render(block.contents);
    if (push !== null) {
      blockContext.push(this.name, push);
    }
  }
  context.pop();
  return results;
}

BlockNode.prototype['super'] = function(context) {
  var renderContext = this.context.renderContext;
  if (renderContext.hasKey(BLOCK_CONTEXT_KEY) &&
      renderContext.get(BLOCK_CONTEXT_KEY).getBlock(this.name) !== null) {
    return this.render(this.context);
  }
  return '';
}

/**
 * An HTML element and its contents.
 */
function ElementNode(tagName, attributes, contents) {
  this.tagName = tagName;
  this.attributes = attributes;
  this.contents = contents;
}
inheritFrom(ElementNode, TemplateNode);

ElementNode.prototype.render = function(context) {
  return DOMBuilder.createElement(this.tagName,
                                  this.attributes,
                                  context.render(this.contents));
}

/**
 * Supports looping over a list obtained from the context, creating new
 * context variables with list contents and calling render on all its
 * contents.
 */
function ForNode(props, contents) {
  for (var prop in props) {
    this.loopVars = prop.split(UNPACK_SEPARATOR_RE);
    this.listVar = new Variable(props[prop]);
    break;
  }
  this.contents = contents;
}
inheritFrom(ForNode, TemplateNode);

ForNode.prototype.render = function(context) {
  var list = this.listVar.resolve(context)
    , results = []
    , forloop = {parentloop: context.get('forloop', {})}
    , l = list.length
    , item
    ;
  context.push();
  context.set('forloop', forloop);
  for (var i = 0; i < l; i++) {
    item = list[i];
    // Set current item(s) in context variable(s)
    if (this.loopVars.length === 1) {
      context.set(this.loopVars[0], item);
    } else {
      context.zip(this.loopVars, item);
    }
    // Update loop status variables
    forloop.counter = i + 1;
    forloop.counter0 = i;
    forloop.revcounter = l - i;
    forloop.revcounter0 = l - i - 1;
    forloop.first = (i === 0);
    forloop.last = (i === l - 1);
    // Render contents
    results.push.apply(results, context.render(this.contents));
  }
  context.pop();
  return results;
};

/**
 * Executes a boolean test using variables obtained from the context,
 * calling render on all its if the result is true.
 */
function IfNode(expr, contents) {
  if (isFunction(expr)) {
    this.test = expr;
  } else {
    this.test = this._parseExpr(expr);
  }
  this.contents = contents;
}
inheritFrom(IfNode, TemplateNode);

IfNode.prototype._parseExpr = (function() {
  var ops = lookup('( ) && || == === <= < >= > != !== !! !'.split(' '))
    , opsRE = /(\(|\)|&&|\|\||={2,3}|<=|<|>=|>|!={1,2}|!{1,2})/
    , numberRE = /^-?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
    , quotes = lookup(['"', "'"])
    , isQuotedString = function(s) {
        var q = s.charAt(0);
        return (s.length > 1 &&
                typeof quotes[q] != 'undefined' &&
                s.lastIndexOf(q) == s.length - 1);
      }
    ;
  return function(expr) {
    var code = ['return (']
      , bits = splitBits(expr, opsRE)
      , l = bits.length
      , bit
      ;
    for (var i = 0; i < l; i++) {
      bit = bits[i];
      if (typeof ops[bit] != 'undefined') {
        code.push(bit);
      } else {
        bit = bit.replace(TRIM_RE, '');
        if (bit) {
          if (numberRE.test(bit) || isQuotedString(bit)) {
            code.push(bit);
          } else {
            code.push('new Variable("' + escapeString(bit) + '").resolve(c)');
          }
        }
      }
    }
    code.push(');');
    try {
      var func = new Function('c', 'Variable', code.join(' '));
      return function(context) {
        return func(context, Variable);
      };
    } catch (e) {
      throw new TemplateSyntaxError('Invalid $if expression (' + e.message +
                                    '): ' + expr);
    }
  }
})();

IfNode.prototype.render = function(context) {
  if (this.test(context)) {
    return context.render(this.contents);
  }
  return [];
}

/**
 * Wraps static text context and text context which contains template variable
 * definitions to be inserted at render time.
 */
function TextNode(text) {
  this.dynamic = VARIABLE_RE.test(text);
  if (this.dynamic) {
    this.func = this._parseExpr(text);
  } else {
    this.text = text;
  }
}
inheritFrom(TextNode, TemplateNode);

/**
 * Creates a function which accepts context and performs replacement by
 * variable resolution on the given expression.
 */
TextNode.prototype._parseExpr = function(expr) {
  var code = ['var a = []']
    , bits = splitBits(expr, VARIABLE_RE)
    , l = bits.length
    ;
  for (var i = 0; i < l; i++) {
    if (i % 2) {
      code.push('a.push(new Variable("' +
                escapeString(bits[i].replace(TRIM_RE, '')) +
                '").resolve(c))');
    } else if (bits[i]) {
      code.push('a.push("' + escapeString(bits[i]) + '")');
    }
  }
  code.push('return a');
  var func = new Function('c', 'Variable', code.join(';'));
  return function(context) {
    return func(context, Variable);
  };
}

TextNode.prototype.render = function(context) {
  return (this.dynamic ? this.func(context) : this.text);
};

// ------------------------------------------------------------- End Markers ---

// End marker Nodes, for marking the end of content when contents are being
// specified as siblings to reduce the amount of nesting required.
function EndBlockNode() { }
function EndForNode() { }
function EndIfNode() { }

// ------------------------------------------ Template Convenience Functions ---

function $template(props) {
return new Template(props, slice.call(arguments, 1));
}

function $block(name) {
  return new BlockNode(name, slice.call(arguments, 1));
}

function $var(expr) {
  return new Variable(expr);
}

function $text(expr) {
  return new TextNode(expr);
}

function $for(props) {
  return new ForNode(props, slice.call(arguments, 1));
}

function $if(expr) {
  return new IfNode(expr, slice.call(arguments, 1));
}

function $endblock() { return new EndBlockNode(); }
function $endfor() { return new EndForNode(); }
function $endif() { return new EndIfNode(); }

// === DOMBuilder API ==========================================================

// ------------------------------------------------------- Element Functions ---

/**
 * Creates a function which, when called, uses DOMBuilder to create an element
 * with the given ``tagName``.
 *
 * The resulting function will also have a ``map`` function which calls
 * ``DOMBuilder.map`` with the given ``tagName``.
 */
function createElementFunction(tagName) {
  var elementFunction = function() {
    if (!arguments.length) {
      // Short circuit if there are no arguments, to avoid further
      // argument inspection.
      if (DOMBuilder.mode == 'DOM') {
        return document.createElement(tagName);
      }
      else if (DOMBuilder.mode == 'TEMPLATE') {
        return new ElementNode(tagName);
      } else {
        return new HTMLElement(tagName);
      }
    } else {
      return createElementFromArguments(tagName, slice.call(arguments));
    }
  };

  // Add a ``map`` function which will call ``DOMBuilder.map`` with the
  // appropriate ``tagName``.
  elementFunction.map = function() {
    var mapArgs = slice.call(arguments);
    mapArgs.unshift(tagName);
    return DOMBuilder.map.apply(DOMBuilder, mapArgs);
  };

  return elementFunction;
}

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
 *    an ``Array`` of children.
 *
 * At least one argument *must* be provided.
 */
function createElementFromArguments(tagName, args) {
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

    return DOMBuilder.createElement(tagName, attributes, children);
}

// -------------------------------------------------------- Public Namespace ---

var DOMBuilder = {
  version: '2.0.0-pre'

  /**
   * Determines which mode the ``createElement`` function will operate in.
   * Supported values are:
   *
   * ``'DOM'``
   *    create DOM Elements.
   * ``'HTML'``
   *    create mock HTML Elements which output HTML Strings.
   * ``'XHTML'``
   *    create mock HTML Elements which output XHTML Strings.
   * ``'TEMPLATE'``
   *    create template ElementNodes.
   *
   * The value depends on the environment we're running in - if modules are
   * available, we default to HTML mode, otherwise we assume we'te in a
   * browser and default to DOM mode.
   */
, mode: (modules ? 'HTML' : 'DOM')

  /**
   * Calls a function using DOMBuilder temporarily in the given mode and
   * returns its output.
   *
   * This is primarily intended for using DOMBuilder to generate HTML
   * strings when running in the browser without having to manage the
   * mode flag yourself.
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
   * An ``Object`` containing element creation functions.
   */
, elementFunctions: (function(obj) {
    for (var i = 0, tagName; tagName = tagNames[i]; i++){
      obj[tagName.toUpperCase()] = createElementFunction(tagName);
    }
    return obj;
  })({})

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
, createElement: function(tagName, attributes, children) {
    attributes = attributes || {};
    children = children || [];
    flatten(children);

    if (this.mode == 'TEMPLATE') {
      return new ElementNode(tagName, attributes, children);
    } else if (this.mode != 'DOM') {
      return new HTMLElement(tagName, attributes, children);
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
, map: function(tagName) {
    // Determine how the function was called
    if (isArray(arguments[1])) { // (tagName, items, func)
      var defaultAttrs = {}
        , items = arguments[1]
        , func = (isFunction(arguments[2]) ? arguments[2] : null)
        ;
    } else { // (tagName, attrs, items, func)
      var defaultAttrs = arguments[1]
        , items = arguments[2]
        , func = (isFunction(arguments[3]) ? arguments[3] : null)
        ;
    }

    var results = [];
    for (var i = 0, l = items.length, attrs, children; i < l; i++) {
      attrs = extend({}, defaultAttrs);
      // If we were given a mapping function, call it and use the
      // return value as the contents, unless the function specifies
      // that the item shouldn't generate an element by explicity
      // returning null.
      if (func !== null) {
        children = func(items[i], attrs, i);
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

      results.push(this.createElement(tagName, attrs, children));
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

    if (this.mode != 'DOM') {
      return new HTMLFragment(children);
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

  /**
   * Marks a string as safe
   */
, markSafe: function(value) {
    return new SafeString(value);
  }

  /**
   * Determines if a string is safe.
   */
, isSafe: function(value) {
    return (value instanceof SafeString);
  }

, HTMLElement: HTMLElement
, HTMLFragment: HTMLFragment
, HTMLNode: HTMLNode
, SafeString: SafeString

, _templates: {}
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

/** Exposes the templates API. */
DOMBuilder.templates = extend(
  extend({}, DOMBuilder.elementFunctions), {
    ContextPopError: ContextPopError
  , VariableNotFoundError: VariableNotFoundError
  , TemplateSyntaxError: TemplateSyntaxError
  , TemplateNotFoundError: TemplateNotFoundError
  , Variable: Variable
  , Context: Context
  , RenderContext: RenderContext
  , BlockContext: BlockContext
  , Template: Template
  , TemplateNode: TemplateNode
  , BlockNode: BlockNode
  , ForNode: ForNode
  , IfNode: IfNode
  , TextNode: TextNode
  , $template: $template
  , $block: $block
  , $var: $var
  , $text: $text
  , $for: $for
  , $if: $if
});

// Export DOMBuilder or expose it to the global object
if (modules) {
  extend(module.exports, DOMBuilder);
} else {
  __global__.DOMBuilder = DOMBuilder;
}

})(this);
