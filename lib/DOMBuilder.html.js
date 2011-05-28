(function(__global__) {

// --------------------------------------------------------------- Utilities ---

var modules = (typeof module !== 'undefined' && module.exports)
  , DOMBuilder = (modules ? require('./DOMBuilder') : __global__.DOMBuilder)
  // Native functions
  , hasOwn = Object.prototype.hasOwnProperty
  , splice = Array.prototype.splice
  // DOMBuilder utilities
  , addEvent = DOMBuilder.util.addEvent
  , extend = DOMBuilder.util.extend
  , inheritFrom = DOMBuilder.util.inheritFrom
  , lookup = DOMBuilder.util.lookup
  , setInnerHTML = DOMBuilder.util.setInnerHTML
  , EVENT_ATTRS = DOMBuilder.util.EVENT_ATTRS
  , TAG_NAMES = DOMBuilder.util.TAG_NAMES
  /** Lookup for known tag names. */
  , TAG_NAME_LOOKUP = lookup(TAG_NAMES)
  /** Lookup for tags defined as EMPTY in the HTML 4.01 Strict and Frameset DTDs. */
  , EMPTY_TAGS = lookup('area base br col frame hr input img link meta param'.split(' '))
  ;

// ----------------------------------------------------------- HTML Escaping ---

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

/**
 * Marks a string as safe
 */
function markSafe(value) {
  return new SafeString(value);
}

/**
 * Determines if a string is safe.
 */
function isSafe(value) {
  return (value instanceof SafeString);
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

// ------------------------------------------------------- Mock DOM Elements ---

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
  for (var i = 0, l = this.childNodes.length, child; i < l; i++) {
    child = this.childNodes[i];
    if (child instanceof HTMLFragment) {
      // Replace the fragment with its contents
      splice.apply(this.childNodes, [i, 1].concat(child.childNodes));
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
    , tagName = (TAG_NAME_LOOKUP[this.tagName]
                 ? this.tagName
                 : conditionalEscape(this.tagName))
      // Opening tag
    , parts = ['<' + tagName]
    , attr
    ;
  // Tag attributes
  for (attr in this.attributes) {
    // innerHTML is a special case, as we can use it to (perhaps
    // inadvisedly) specify entire contents as a string.
    if (attr === 'innerHTML') {
      continue;
    }
    // Don't create attributes which wouldn't make sense in HTML mode -
    // they can be dealt with afet insertion using addEvents().
    if (EVENT_ATTRS[attr]) {
      if (trackEvents === true && !this.eventsFound) {
        this.eventsFound = true;
      }
      continue;
    }
    parts.push(' ' + conditionalEscape(attr.toLowerCase()) + '="' +
               conditionalEscape(this.attributes[attr]) + '"');
  }
  if (this.eventsFound && !hasOwn.call(this.attributes, 'id')) {
    // Ensure an id is present so we can grab this element later
    this.id  = '__DB' + HTMLElement.eventTrackerId++ + '__';
    parts.push(' id="' + this.id + '"');
  }
  parts.push('>');

  if (EMPTY_TAGS[tagName]) {
    if (this.xhtml) {
      parts.splice(parts.length - 1, 1, ' />');
    }
    return parts.join('');
  }

  // If innerHTML was given, use it exclusively for the contents
  if (hasOwn.call(this.attributes, 'innerHTML')) {
    parts.push(this.attributes.innerHTML);
  } else {
    for (var i = 0, l = this.childNodes.length, node; i < l; i++) {
      node = this.childNodes[i];
      if (node instanceof HTMLElement || node instanceof SafeString) {
        parts.push(node.toString(trackEvents));
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
    var id = (hasOwn.call(this.attributes, 'id')
              ? conditionalEscape(this.attributes.id)
              : this.id)
      , attr
      ;
    for (attr in this.attributes) {
      if (EVENT_ATTRS[attr]) {
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

// === Register mode plugin ====================================================

DOMBuilder.addMode({
  name: 'html'
, createElement: function(tagName, attributes, children) {
    return new HTMLElement(tagName, attributes, children);
  }
, fragment: function(children) {
    return new HTMLFragment(children);
  }
, isObject: function(obj) {
    return (!(obj instanceof HTMLNode) &&
            !(obj instanceof SafeString));
  }
, api: {
    conditionalEscape: conditionalEscape
  , isSafe: isSafe
  , markSafe: markSafe
  , SafeString: SafeString
  , HTMLNode: HTMLNode
  , HTMLElement: HTMLElement
  , HTMLFragment: HTMLFragment
  }
});

})(this);
