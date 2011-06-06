==========
DOMBuilder
==========

DOMBuilder takes some of the pain out of dynamically creating HTML
elements in JavaScript and supports generating multiple types of output
from the same inputs.

.. toctree::
   :maxdepth: 1

   core
   dommode
   htmlmode
   templates
   news
   license

DOMBuilder supports two main patterns of usage:

1. Using Output Modes to Create Content from Nested Arrays
==========================================================

To make use of DOMBuilder's output modes without using the rest of its API,
you can define elements as nested Arrays, where each array represents an
element and each element can consist of a tag name, an optional Object
defining element attributes and an arbitrary number of content items.

For example:

+--------------------------------------+-------------------------------------+
| Input                                | Sample HTML Output                  |
+======================================+=====================================+
| ``['div']``                          | ``<div></div>``                     |
+--------------------------------------+-------------------------------------+
| ``['div', {id: 'test'}]``            | ``<div id="test"></div>``           |
+--------------------------------------+-------------------------------------+
| ``['div', 'content']``               | ``<div>content</div>``              |
+--------------------------------------+-------------------------------------+
| ``['div', {id: 'test'}, 'content']`` | ``<div id="test">content</div>``    |
+--------------------------------------+-------------------------------------+
| ``['div', 'oh, ', ['span', 'hi!']]`` | ``<div>oh, <span>hi!</span></div>`` |
+--------------------------------------+-------------------------------------+

To create content from a nested Array in this format, use:

.. js:function:: DOMBuilder.build(contents[, mode])

   Builds the specified type of output from a nested Array representation
   of HTML elements.

   :param Array contents:
      Content defined as a nested Array
   :param String mode:
      Name of the output mode to use. If not given, defaults to
      :js:attr:`DOMBuilder.mode`

::

   var article =
     ['div', {'class': 'article'}
     , ['h2', 'Article title']
     , ['p', 'Paragraph one']
     , ['p', 'Paragraph two']
     ];

   >>> DOMBuilder.build(article, 'html').toString()
   <div class="article"><h2>Article title</h2><p>Paragraph one</p><p>Paragraph two</p></div>

2. Using the DOMBuilder API
===========================

The :ref:`core-api` consists of the :js:func:`DOMBuilder.createElement` and
:js:func:`DOMBuilder.fragment` functions, which allow definition of an
element or content fragment, and assignment of its attributes and
children, in a single call. Additonally, all non-element children are
coerced to Strings and appended as text nodes::

   // Vanilla DOM API
   var div = document.createElement('div');
   div.id = 'test';
   div.appendChild(document.createTextNode('content1'));
   var strong = document.createElement('strong');
   strong.appendChild(document.createTextNode('content2'));
   div.appendChild(strong);

   // Equivalent with core DOMBuilder API
   var div = DOMBuilder.createElement('div', {id: 'test'}, [
     'content1',
     DOMBuilder.createElement('strong', {}, ['content2'])
   ]);

To allow creation of HTML elements more succinctly and declaratively,
DOMBuilder provides :ref:`element-functions`, which accept a variety of more
flexible argument combinations and normalise then for use with the core
functions::

   // Equivalent with DOMBuilder element functions
   var el = DOMBuilder.dom;
   var div = el.DIV({id: 'test'}, 'content1', el.STRONG('content2'));

For convenience creating content based on an lists of data, DOMBuilder
provides :js:func:`DOMBuilder.map`, which is also made accessible via
each element function with more flexible arguments, and
:js:func:`DOMBuilder.fragment.map`::

   var items = [1, 2, 3, 4];

   // Without assuming existence of Array.prototype.map
   var lis = [];
   for (var i = 0, l = items.length; i < l; i++) {
     lis.push(el.LI({'class': 'item'}, items[i]));
   }
   var ul = el.UL(lis);

   // Assuming Array.prototype.map
   var ul = UL(items.map(function(item) {
       return el.LI({'class': 'item'}, item);
     })
   );

   // With DOMBuilder.map
   var ul = el.UL(DOMBuilder.map('li', items, {'class': 'item'}));
   );

   // With element function .map
   var ul = el.UL(el.LI.map(items, {'class': 'item'}));

Installation
============

Browsers
--------

DOMBuilder is a modular library, which supports adding new output modes and
feature modes as plugins.

The avaible components are:

`DOMBuilder.js`_
   Core library
`DOMBuilder.dom.js`_
   DOM output mode - adds ``DOMBuilder.dom``
`DOMBuilder.html.js`_
   HTML output mode - adds ``DOMBuilder.html``
`DOMBuilder.template.js`_
   Template feature mode - adds ``DOMBuilder.template``

.. _`DOMBuilder.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.js
.. _`DOMBuilder.dom.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.dom.js
.. _`DOMBuilder.html.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.html.js
.. _`DOMBuilder.template.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.template.js

Builds
~~~~~~

Multiple preconfigured builds of DOMBuilder are available to suit various
needs:

`DOM only`_
   For creation of DOM Elements, with :doc:`dommode` as the default output format
`HTML only`_
   For creation of HTML Strings, wit :doc:`htmlmode` as the default output format
`DOM and HTML`_
   For creation of mixed content, with no default output format
`DOM templates`_
   For creation of DOM Elements using templates, with :doc:`dommode` as the default output format
`HTML templates`_
   For creation of HTML Strings using templates, with :doc:`htmlmode` as default output format
`DOM and HTML templates`_
   For creation of mixed content using templates, with no default output format

.. _`DOM only`: https://github.com/insin/DOMBuilder/raw/master/builds/DOMBuilder.dom.min.js
.. _`HTML only`: https://github.com/insin/DOMBuilder/raw/master/builds/DOMBuilder.html.min.js
.. _`DOM and HTML`: https://github.com/insin/DOMBuilder/raw/master/builds/DOMBuilder.dom-html.min.js
.. _`DOM templates`: https://github.com/insin/DOMBuilder/raw/master/builds/DOMBuilder.dom-template.min.js
.. _`HTML templates`: https://github.com/insin/DOMBuilder/raw/master/builds/DOMBuilder.html-template.min.js
.. _`DOM and HTML templates`: https://github.com/insin/DOMBuilder/raw/master/builds/DOMBuilder.dom-html-template.min.js

Dependencies
~~~~~~~~~~~~

There are no *required* dependencies, but if `jQuery`_ (>= 1.4) is
available, DOMBuilder will make use of it when creating DOM Elements and
setting up their attributes and event handlers.

If not, DOMBuilder will fall back to using some less comprehensive
workarounds for cross-browser DOM issues and use the `traditional event
registration model`_ for compatibility.

.. versionchanged:: 1.4
   jQuery was made optional, with the caveat that cross-browser support will
   be less robust.

.. _`jQuery`: http://jquery.com
.. _`traditional event registration model`: http://www.quirksmode.org/js/events_tradmod.html

Node.js
-------

.. versionadded:: 1.4.1

DOMBuilder can be installed as a `Node.js`_ module using Node Package
Manager. The Node.js build includes :doc:`htmlmode` and :doc:`templates`,
with HTML as the default output format.

Install::

   npm install DOMBuilder

Import::

   var DOMBuilder = require('DOMBuilder');

.. _`Node.js`: http://nodejs.org
