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
