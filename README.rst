========================================
DOMBuilder |travis_status| |qunit_tests|
========================================

.. |travis_status| image:: https://secure.travis-ci.org/insin/DOMBuilder.png
   :target: http://travis-ci.org/insin/DOMBuilder

.. |qunit_tests| image:: http://insin.github.com/img/qunit-tests.png
   :target: http://insin.github.com/DOMBuilder/tests.html

DOMBuilder takes *some* of the pain out of dynamically creating HTML
content in JavaScript and supports generating multiple types of output
from the same inputs.

Yes, there are a million builder libraries about. DOMBuilder's goals are to:

* Make it easier to write JavaScript components which can be shared between
  the frontend and backend - `newforms`_ is an example of such a component,
  which aims to share validation code between the two.
* Make it easier to switch from DOM Element output to HTML String output
  if performence becomes an issue, by providing mock DOM objects and event
  registration helpers when generating HTML from the exact same input.

.. _`newforms`: https://github.com/insin/newforms

Demos
=====

- `Fragile`_ - uses DOMBuilder's template mode and its template inheritance to
  create a CRUD admin with templates which can also be rendered on the backend
  with Node.js.
- `DOMBuilder.build() sandbox`_ - play around with DOMBuilder.build(), with
  switchable DOM and HTML output modes.
- Reddit posts - uses JSONP to display a feed of posts from Reddit:

  - `Element function Reddit posts`_ - uses element functions to generate
    contents directly with the DOM output mode.
  - `Templated Reddit posts`_ - uses Template mode with the DOM output mode.

- `Demo page`_ - small examples of using the range of the DOMBuilder API

.. _`Fragile`: http://insin.github.com/sacrum/fragile.html
.. _`DOMBuilder.build() sandbox`: http://insin.github.com/DOMBuilder/build.html
.. _`Element function Reddit posts`: http://insin.github.com/DOMBuilder/reddit_posts.html
.. _`Templated Reddit posts`: http://insin.github.com/DOMBuilder/reddit_posts_template.html
.. _`Demo page`: http://insin.github.com/DOMBuilder/demo.html

Install
=======

Browsers
--------

Compressed builds of DOMBuilder are available to suit various needs:

`DOM and HTML`_
   For creation of mixed content, with DOM Mode as the default output format.
`DOM only`_
   For creation of DOM Elements, with DOM Mode as the default output format.
`HTML only`_
   For creation of HTML Strings, with HTML Mode as the default output format.
`Templates`_
   For templating, with mixed output and DOM Mode as the default output format.

.. _`DOM and HTML`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.min.js
.. _`DOM only`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.dom.min.js
.. _`HTML only`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.html.min.js
.. _`Templates`: https://github.com/insin/DOMBuilder/raw/master/dist/DOMBuilder.template.min.js

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

DOMBuilder can be installed as a `Node.js`_ module via `npm`_. The
Node.js build includes Template mode and has `HTML mode`_ as the default output
format.

Install::

   npm install DOMBuilder

Import::

   var DOMBuilder = require('DOMBuilder')

.. _`Node.js`: http://nodejs.org
.. _`npm`: http://npmjs.org/
.. _`HTML mode`: http://readthedocs.org/docs/dombuilder/en/latest/htmlmode.html

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
.. _`mock DOM objects`: http://readthedocs.org/docs/dombuilder/en/latest/htmlmode.html#mock-dom-objects
.. _`HTML escaping`: http://readthedocs.org/docs/dombuilder/en/latest/htmlmode.html#html-escaping


Development
===========

**Version 2.1: DOMBuilder.template**

DOMBuilder is a modular library, which supports adding new output modes and
feature modes as plugins.

Version 2.1 will add Template mode to DOMBuilder and the templating API should
be considered unstable until Version 2.2.

- Based on Django templates, including their powerful template inheritance.
- Templates are defined entirely in JavaScript code, still discovering the
  pros and cons of this as I go:

  **Pros**

  - Easier to create new template tags, as there's no parsing step.
  - You can spin template creation out into DSL-like functions, which is
    expressive and very flexible, using functions to build up sections
    using logically named functions which create template contents based on
    data structures, rather than copying and pasting chunks of annotated
    markup or trying to use includes.

  **Cons**

  - More unwieldy to edit than text-based templates, but manageable if you
    follow some layout guidelines.
  - More awkward to do things like optional attributes and arbitrary chunks
    of HTML, since HTML is defined at the element level using DOMBuilder's
    element functions.

`In this live example`_, template inheritance is being used to minimise
the effort required to create basic admin CRUD screens using `Sacrum`_.

.. _`In this live example`: http://insin.github.com/sacrum/fragile.html
.. _`Sacrum`: https://github.com/insin/sacrum

**Version 2.0.1 released on August 6th, 2011**

See `News for DOMBuilder`_ for what's new and backwards-incompatible
changes since 1.4.*.

.. _`News for DOMBuilder`: http://readthedocs.org/docs/dombuilder/en/latest/news.html

MIT License
===========

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
