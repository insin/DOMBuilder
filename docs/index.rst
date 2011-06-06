DOMBuilder
==========

DOMBuilder takes some of the pain out of programatically creating content
in JavaScript.

.. toctree::
   :maxdepth: 1

   core
   dommode
   htmlmode
   templates
   news
   license

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
Manager. The Node.js build includes :doc:`htmlmode` and :doc:`template`,
with HTML as the default output format.

Install::

   npm install DOMBuilder

Import::

   var DOMBuilder = require('DOMBuilder');

.. _`Node.js`: http://nodejs.org
