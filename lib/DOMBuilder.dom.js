(function(__global__) {

// --------------------------------------------------------------- Utilities ---

var modules = !!(typeof module !== 'undefined' && module.exports)
  , DOMBuilder = (modules ? require('./DOMBuilder') : __global__.DOMBuilder)
  , document = __global__.document
  // Native functions
  , hasOwn = Object.prototype.hasOwnProperty
  , splice = Array.prototype.splice
  // DOMBuilder utilities
  , EVENT_ATTRS = DOMBuilder.util.EVENT_ATTRS
  , JQUERY_AVAILABLE = DOMBuilder.util.JQUERY_AVAILABLE
  , TAG_NAMES = DOMBuilder.util.TAG_NAMES
  , extend = DOMBuilder.util.extend
  , inheritFrom = DOMBuilder.util.inheritFrom
  , lookup = DOMBuilder.util.lookup
  , setInnerHTML = DOMBuilder.util.setInnerHTML
  /**
   * Cross-browser means of creating a DOM Element with attributes.
   * @param {string} tagName
   * @param {Object} attributes
   * @return {Element}
   */
  , createElement = (JQUERY_AVAILABLE
        ? function(tagName, attributes) {
            if (hasOwn.call(attributes, 'innerHTML')) {
              var html = attributes.innerHTML;
              delete attributes.innerHTML;
              return jQuery('<' + tagName + '>', attributes).html(html).get(0);
            }
            else {
              return jQuery('<' + tagName + '>', attributes).get(0);
            }
          }
        : (function() {
            var supportsStyle = (function() {
                  var div = document.createElement('div');
                  div.style.display = 'none';
                  div.innerHTML = '<span style="color:silver;">s<span>';
                  return /silver/.test(
                    div.getElementsByTagName('span')[0].getAttribute('style'));
                })()
              , specialRE = /^(?:href|src|style)$/
              , attributeTranslations = {
                  cellspacing: 'cellSpacing'
                , 'class': 'className'
                , colspan: 'colSpan'
                , 'for': 'htmlFor'
                , frameborder: 'frameBorder'
                , maxlength: 'maxLength'
                , readonly: 'readOnly'
                , rowspan: 'rowSpan'
                , tabindex: 'tabIndex'
                , usemap: 'useMap'
                }
              ;

            return function(tagName, attributes) {
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
          })())
  ;

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
        }
        else {
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
      }
      else {
        fragment.appendChild(document.createTextNode(''+child));
      }
    }
    return fragment;
  }
, isModeObject: function(obj) {
    return !!obj.nodeType;
  }
, api: {
    EVENT_ATTRS: EVENT_ATTRS
  , createElement: createElement
  , setInnerHTML: setInnerHTML
  }
});

})(this);
