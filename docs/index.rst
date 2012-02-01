==========
DOMBuilder
==========

DOMBuilder takes *some* of the pain out of dynamically creating HTML
content in JavaScript and supports generating multiple types of output
from the same inputs.

.. toctree::
   :maxdepth: 1

   core
   dommode
   htmlmode
   templates
   news
   license

Quick Guide
===========

DOMBuilder provides a convenient, declarative API for generating HTML elements,
via objects which contain functions named for the HTML element they create::

   with(DOMBuilder.dom) {
     var article =
       DIV({'class': 'article'}
       , H2('Article title')
       , P('Paragraph one')
       , P('Paragraph two')
       )
   }

Every element function also has a ``map`` function attached to it which allows
you to easily generate content from a list of items::

   var el = DOMBuilder.html
   function shoppingList(items) {
     return el.OL(el.LI.map(items))
   }

::

   >>> shoppingList(['Cheese', 'Bread', 'Butter'])
   <ol><li>Cheese</li><li>Bread</li><li>Butter</li></ol>

You can control ``map`` output by passing in a callback function::

   function opinionatedShoppingList(items) {
     return el.OL(el.LI.map(items, function(item, attrs, loop) {
       if (item == 'Cheese') attrs['class'] = 'eww'
       if (item == 'Butter') return el.EM(item)
       return item
     }))
   }

::

   >>> opinionatedShoppingList(['Cheese', 'Bread', 'Butter'])
   <ol><li class="eww">Cheese</li><li>Bread</li><li><em>Butter</em></li></ol>

If you want to use this API to go straight to a particular type of output, you
can do so using the functions defined in :js:attr:`DOMBuilder.dom` and
:js:attr:`DOMBuilder.html`, as demonstrated above.

If you want to be able to switch freely between output modes, or you won't know
which kind of output you need until runtime, you can use the same API via
:js:attr:`DOMBuilder.elements`, controlling what it outputs by setting the
:js:attr:`DOMBuilder.mode` flag to ``'dom'`` or ``'html'``, or calling a
function which generates content using :js:func:`DOMBuilder.withMode`::

   var el = DOMBuilder.elements
   function shoutThing(thing) {
     return el.STRONG(thing)
   }

::

   >>> DOMBuilder.mode = 'html'
   >>> shoutThing('Hello!').toString()
   <strong>Hello!</strong>
   >>> DOMBuilder.withMode('dom', shoutThing, 'Hey there!')
   [object HTMLStrongElement]

This is useful for writing libraries which need to support outputting both DOM
Elements and HTML Strings, or for unit-testing code which normally generates DOM
Elements by flipping the mode in your tests to switch to HTML String output.

DOMBuilder also supports using its output modes with another common means of
defining HTML in JavaScript code, using nested lists (representing elements and
their contents) and objects (representing attributes), like so::

   var article =
     ['div', {'class': 'article'}
     , ['h2', 'Article title']
     , ['p', 'Paragraph one']
     , ['p', 'Paragraph two']
     ]

You can generate output from one of these structures using
:js:func:`DOMBuilder.build`, specifying the output mode::

   >>> DOMBuilder.build(article, 'html').toString()
   <div class="article"><h2>Article title</h2><p>Paragraph one</p><p>Paragraph two</p></div>

   >>> DOMBuilder.build(article, 'dom').toString()
   [object HTMLDivElement]

You can also generate these kinds of structures using the element functions
defined in :js:attr:`DOMBuilder.array`.

This is just a quick guide to what DOMBuilder can do - dive into the rest of the
documentation to find out about the rest of its features, such as:

* Registering :ref:`event-handlers`.
* Making it more convenient to work with :ref:`event-handlers-innerhtml`.
* Populating :ref:`document-fragments` with content in a single call.
* Being able to use fragments in HTML mode via :ref:`mock-dom-objects`.
* :ref:`html-escaping` in HTML mode.

Installation
============

Browsers
--------

DOMBuilder is a modular library, which supports adding new output modes and
feature modes as plugins.

The available components are:

`core.js`_
   Core library
`dom.js`_
   DOM output mode - adds ``DOMBuilder.dom``
`html.js`_
   HTML output mode - adds ``DOMBuilder.html``
`template.js`_
   Template feature mode - adds ``DOMBuilder.template``

.. _`core.js`: https://github.com/insin/DOMBuilder/tree/master/lib/dombuilder/core.js
.. _`dom.js`: https://github.com/insin/DOMBuilder/tree/master/lib/dombuilder/dom.js
.. _`html.js`: https://github.com/insin/DOMBuilder/tree/master/lib/dombuilder/html.js
.. _`template.js`: https://github.com/insin/DOMBuilder/tree/master/lib/dombuilder/template.js

Compressed Builds
~~~~~~~~~~~~~~~~~

Compressed builds of DOMBuilder are available to suit various needs:

`DOM and HTML`_
   For creation of mixed content, with :doc:`dommode` as the default output format.
`DOM only`_
   For creation of DOM Elements, with :doc:`dommode` as the default output format.
`HTML only`_
   For creation of HTML Strings, with :doc:`htmlmode` as the default output format.
`Templates`_
   For templating, with mixed output and :doc:`dommode` as the default output format.

.. _`DOM and HTML`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.min.js
.. _`DOM only`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.dom.min.js
.. _`HTML only`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.html.min.js
.. _`Templates`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.template.min.js

Dependencies
~~~~~~~~~~~~

All required dependencies from `isomorph`_ are bundled into the builds above.

If `jQuery`_ (>= 1.4) is available, DOMBuilder will make use of it when creating
DOM Elements and setting up their attributes and event handlers. Otherwise,
DOMBuilder will fall back to using some less comprehensive workarounds for
cross-browser DOM issues and use the `traditional event registration model`_ for
compatibility.

.. versionchanged:: 1.4
   jQuery was made optional, with the caveat that cross-browser support will
   be less robust.

.. versionchanged:: 2.1
   There are now some required utility dependencies, which are bundled with the
   browser builds.

.. _`isomorph`: https://github.com/insin/isomorph
.. _`jQuery`: http://jquery.com
.. _`traditional event registration model`: http://www.quirksmode.org/js/events_tradmod.html

Node.js
-------

.. versionadded:: 1.4.1

DOMBuilder can be installed as a `Node.js`_ module using `npm`_. The Node.js
build includes :doc:`templates` and :doc:`htmlmode`, and has HTML as the default
output format.

Install::

   npm install DOMBuilder

Import::

   var DOMBuilder = require('DOMBuilder')

.. _`Node.js`: http://nodejs.org
.. _`npm`: http://npmjs.org/
