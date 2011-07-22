==========
DOMBuilder
==========

DOMBuilder takes *some* of the pain out of dynamically creating HTML
content in JavaScript and supports generating multiple types of output
from the same inputs.

**Version 2.0.0 released on July 17th, 2011**

See `News for DOMBuilder`_ for what's new and backwards-incompatible
changes since 1.4.*.

.. _`News for DOMBuilder`: http://readthedocs.org/docs/dombuilder/en/2.0.0/news.html

Yes, there are a million builder libraries about. DOMBuilder's goals are to:

* Make it easier to switch from DOM Element output to HTML String output
  if performence becomes an issue, by providing mock DOM objects and event
  registration helpers when generating HTML from the exact same input.
* Make it easier to write JavaScript components which can be shared between
  the frontend and backend - `newforms`_ is an example of such a component,
  which aims to share validation code between the two.

.. _`newforms`: https://github.com/insin/newforms

Installation
============

Browsers
--------

DOMBuilder is a modular library, which supports adding new output modes and
feature modes as plugins.

The available components are:

`DOMBuilder.js`_
   Core library
`DOMBuilder.dom.js`_
   DOM output mode - adds ``DOMBuilder.dom``
`DOMBuilder.html.js`_
   HTML output mode - adds ``DOMBuilder.html``

.. `DOMBuilder.template.js`_
      Template feature mode - adds ``DOMBuilder.template``

   .. _`DOMBuilder.template.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.template.js

.. _`DOMBuilder.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.js
.. _`DOMBuilder.dom.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.dom.js
.. _`DOMBuilder.html.js`: https://github.com/insin/DOMBuilder/raw/master/lib/DOMBuilder.html.js

Compressed Builds
~~~~~~~~~~~~~~~~~

Multiple preconfigured, compressed builds of DOMBuilder are available to suit
various needs:

`DOM and HTML`_
   For creation of mixed content, with DOM Mode as the default output format.
`DOM only`_
   For creation of DOM Elements, with DOM Mode as the default output format.
`HTML only`_
   For creation of HTML Strings, with HTML Mode as the default output format.

.. _`DOM and HTML`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.min.js
.. _`DOM only`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.dom.min.js
.. _`HTML only`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.html.min.js

Dependencies
~~~~~~~~~~~~

There are no *required* dependencies, but if `jQuery`_ (>= 1.4) is
available, DOMBuilder will make use of it when creating DOM Elements and
setting up their attributes and event handlers.

If not, DOMBuilder will fall back to using some less comprehensive
workarounds for cross-browser DOM issues and use the `traditional event
registration model`_ for compatibility.

.. _`jQuery`: http://jquery.com
.. _`traditional event registration model`: http://www.quirksmode.org/js/events_tradmod.html

Node.js
-------

DOMBuilder can be installed as a `Node.js`_ module using Node Package
Manager. The Node.js build includes HTML Mode and has HTML as the default
output format.

Install::

   npm install DOMBuilder

Import::

   var DOMBuilder = require('DOMBuilder')

.. _`Node.js`: http://nodejs.org

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
     return el.OL(el.LI.map(function(item, attrs, loop) {
       if (item == 'Cheese') attrs['class'] = 'eww'
       if (item == 'Butter') return el.EM(item)
       return item
     })
   }

::

   >>> opinionatedShoppingList(['Cheese', 'Bread', 'Butter'])
   <ol><li class="eww">Cheese</li><li>Bread</li><li><em>Butter</em></li></ol>

If you want to use this API to go straight to a particular type of output, you
can do so using the functions defined in ``DOMBuilder.dom`` and
``DOMBuilder.html``, as demonstrated above.

If you want to be able to switch freely between `output modes`_, or you won't
know which kind of output you need until runtime, you can use the same API via
``DOMBuilder.elements``, controlling what it outputs by setting the
``DOMBuilder.mode`` flag to ``'dom'`` or ``'html'``, or calling a
function which generates content using `DOMBuilder.withMode`_::

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
`DOMBuilder.build`_, specifying the output mode::

   >>> DOMBuilder.build(article, 'html').toString()
   <div class="article"><h2>Article title</h2><p>Paragraph one</p><p>Paragraph two</p></div>

   >>> DOMBuilder.build(article, 'dom').toString()
   [object HTMLDivElement]

You can also generate these kinds of structures using the element functions
defined in ``DOMBuilder.array``.

This is just a quick guide to what DOMBuilder can do - dive into the
`full documentation`_ to find out about the rest of its features, such as:

* Registering `event handlers`_.
* Making it more convenient to work with `innerHTML and event handlers`_.
* Populating `DocumentFragments`_ with content in a single call.
* Being able to use fragments in HTML mode via `mock DOM objects`_.
* `HTML escaping`_ in HTML mode.

.. _`output modes`: http://readthedocs.org/docs/dombuilder/en/latest/core.html#output-modes
.. _`DOMBuilder.withMode`: http://readthedocs.org/docs/dombuilder/en/latest/core.html#temporarily-switching-mode
.. _`DOMBuilder.build`: http://readthedocs.org/docs/dombuilder/en/latest/core.html#building-from-arrays
.. _`full documentation`: http://readthedocs.org/docs/dombuilder/en/latest/
.. _`event handlers`: http://readthedocs.org/docs/dombuilder/en/latest/dommode.html#event-handlers
.. _`innerHTML and event handlers`: http://readthedocs.org/docs/dombuilder/en/latest/htmlmode.html#event-handlers-and-innerhtml
.. _`DocumentFragments`: http://readthedocs.org/docs/dombuilder/en/latest/dommode.html#document-fragments
.. _`mock DOM objects`: http://readthedocs.org/docs/dombuilder/en/2.0.0/htmlmode.html#mock-dom-objects
.. _`HTML escaping`: http://readthedocs.org/docs/dombuilder/en/2.0.0/htmlmode.html#html-escaping

MIT License
-----------

Copyright (c) 2011, Jonathan Buchanan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.