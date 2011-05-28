(function(__global__) {

// --------------------------------------------------------------- Utilities ---

var modules = (typeof module !== 'undefined' && module.exports)
  , DOMBuilder = (modules ? require('./DOMBuilder') : __global__.DOMBuilder)
  , document = __global__.document
  // Native functions
  , hasOwn = Object.prototype.hasOwnProperty
  , splice = Array.prototype.splice
  // DOMBuilder utilities
  , addEvent = DOMBuilder.util.addEvent
  , extend = DOMBuilder.util.extend
  , inheritFrom = DOMBuilder.util.inheritFrom
  , lookup = DOMBuilder.util.lookup
  , TAG_NAMES = DOMBuilder.util.TAG_NAMES
  /** Attribute names corresponding to event handlers. */
  , EVENT_ATTRS
  /** Cross-browser means creation of elements with attributes. */
  , createElement
  /** Cross-browser event registration. */
  , addEvent
  /** Cross-browser setting of innerHTML on a DOM Element. */
  , setInnerHTML
  ;

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

// === Register mode plugin ====================================================

DOMBuilder.addMode({
  name: 'dom'
, createElement: function(tagName, attributes, children) {
    var hasInnerHTML = hasOwn.call(attributes, 'innerHTML')
      // Create the element and set its attributes and event listeners
      , el = createElement(tagName, attributes)
      ;

    // If content was set via innerHTML, we're done...
    if (!hasInnerHTML) {
      // ...otherwise, append children
      for (var i = 0, l = children.length, child; i < l; i++) {
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
, fragment: function(children) {
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
, isObject: function(obj) {
    return (!obj.nodeType);
  }
, api: {
    EVENT_ATTRS: EVENT_ATTRS
  , createElement: createElement
  , addEvent: addEvent
  , setInnerHTML: setInnerHTML
  }
});

})(this);
