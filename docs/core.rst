===============
DOMBuilder Core
===============

This page documents the ``DOMBuilder`` object implemented in the core
DOMBuilder.js script.

.. note::
   For brevity, some further examples will assume that element functions are
   available in the global scope.

.. _core-api:

.. _element-functions:

Element Functions
=================

Element functions accept flexible combinations of input arguments,
creating a declarative layer on top of :js:func:`DOMBuilder.createElement`.

:js:attr:`DOMBuilder.elements` is an ``Object`` containing a function for
each valid tag name declared in the HTML 4.01 `Strict DTD`_,
`Frameset DTD`_ and `HTML5 differences from HTML4 W3C Working Draft`_,
referenced by the corresponding tag name in uppercase.

.. js:attribute:: DOMBuilder.elements

   Element functions which create contents based on the current value of
   :js:attr:`DOMBuilder.mode`

An exhaustive list is available below in :ref:`element-function-names`.

When called, these functions will create an element with the corresponding
tag name, giving it any attributes which are specified as properties of an
optional ``Object`` argument and appending any child content passed in.

Element functions accept the following variations of arguments:

+--------------------------------------------------------------------------------+
| Element Creation Function Arguments                                            |
+=================================+==============================================+
| ``(attributes, child1, ...)``   | an attributes ``Object`` followed by an      |
|                                 | arbitrary number of children.                |
+---------------------------------+----------------------------------------------+
| ``(attributes, [child1, ...])`` | an attributes ``Object`` and an ``Array`` of |
|                                 | children.                                    |
+---------------------------------+----------------------------------------------+
| ``(child1, ...)``               | an arbitrary number of children.             |
+---------------------------------+----------------------------------------------+
+ ``([child1, ...])``             | an ``Array`` of children.                    |
+---------------------------------+----------------------------------------------+

.. _`Strict DTD`: http://www.w3.org/TR/html4/sgml/dtd.html
.. _`Frameset DTD`: http://www.w3.org/TR/html4/sgml/framesetdtd.html
.. _`HTML5 differences from HTML4 W3C Working Draft`: http://dev.w3.org/html5/html4-differences/#new-elements

Example:

The following function creates a ``<table>`` representation of a list of
objects, taking advantage of the flexible combinations of arguments
accepted by element functions::

   /**
    * @param headers a list of column headings.
    * @param objects the objects to be displayed.
    * @param properties names of object properties which map to the
    *                   corresponding columns.
    */
   function createTable(headers, objects, properties) {
     return TABLE({cellSpacing: 1, 'class': 'data sortable'}
     , THEAD(TR(TH.map(headers)))
     , TBODY(
         TR.map(objects, function(obj) {
           return TD.map(properties, function(prop) {
             if (typeof obj[prop] == 'boolean') {
               return obj[prop] ? 'Yes' : 'No'
             }
             return obj[prop]
           })
         })
       )
     )
   }

Given this function, the following code...

::

   createTable(
     ['Name', 'Table #', 'Vegetarian'],
     [{name: 'Steve McMeat',   table: 3, veggie: false},
      {name: 'Omar Omni',      table: 5, veggie: false},
      {name: 'Ivana Huggacow', table: 1, veggie: True}],
     ['name', 'table', 'veggie']
   )

...would produce output corresponding to the following HTML:

.. code-block:: html

   <table class="data sortable" cellspacing="1">
     <thead>
       <tr>
         <th>Name</th>
         <th>Table #</th>
         <th>Vegetarian</th>
       </tr>
     </thead>
     <tbody>
       <tr>
         <td>Steve McMeat</td>
         <td>3</td>
         <td>No</td>
       </tr>
       <tr>
         <td>Omar Omni</td>
         <td>5</td>
         <td>No</td>
       </tr>
       <tr>
         <td>Ivana Huggacow</td>
         <td>1</td>
         <td>Yes</td>
       </tr>
     </tbody>
   </table>

Map Functions
=============

.. versionadded:: 1.3

Map functions provide a shorthand for:

- creating elements for each item in a list, via :js:func:`DOMBuilder.map`
- wrapping elements created for each item in a list with a fragment, via
  :js:func:`DOMBuilder.fragment.map`

.. js:function:: DOMBuilder.map(tagName, defaultAttributes, items[, mappingFunction[, mode]])

   Creates an element for (potentially) every item in a list.

   :param String tagName:
      the name of the element to create for each item in the list.
   :param Object defaultAttributes: default attributes for the element.
   :param Array items:
      the list of items to use as the basis for creating elements.
   :param Function mappingFunction:
      a function to be called with each item in the list, to provide
      contents for the element which will be created for that item.
   :param String mode:
      the DOMBuilder mode to be used when creating elements.

   If provided, the mapping function will be called with the following
   arguments::

      mappingFunction(item, attributes, loopStatus)

   Contents returned by the mapping function can consist of a single value
   or a mixed ``Array``.

   Attributes for the created element can be altered per-item by
   modifying the ``attributes`` argument, which will initially contain
   the contents of ``defaultAttributes``, if it was provided.

   The ``loopStatus`` argument is an ``Object`` with the following
   properties:

      ``index``
         0-based index of the current item in the list.
      ``first``
        ``true`` if the current item is the first in the list.
      ``last``
        ``true`` if the current item is the last in the list.

   The mapping function can prevent an element from being created for a
   given item altogether by returning ``null``.

   If a mapping function is not provided, a new element will be created
   for each item in the list and the item itself will be used as the
   contents.

   .. versionchanged:: 2.0
      ``defaultAttributes`` is now required - flexible arguments are now
      handled by the ``map`` functions exposed on element creation
      functions; the ``mode`` argument was added; a loop status object is now
      passed when calling the mapping function.

This function is also exposed via element creation functions. Each
element creation function has its own ``map`` function, which allows more
flexible arguments to be passed in.

+--------------------------------------------------------------------------------------------------+
| Element Creation Function ``.map()`` Arguments                                                   |
+========================================================+=========================================+
| ``(defaultAttributes, [item1, ...], mappingFunction)`` | a default attributes attributes object, |
|                                                        | a list of items and a mapping Function. |
+--------------------------------------------------------+-----------------------------------------+
| ``([item1, ...], mappingFunction)``                    | a list of items and a mapping Function. |
+--------------------------------------------------------+-----------------------------------------+
| ``([item1, ...])``                                     | a list of items, to be used as element  |
|                                                        | content as-is.                          |
+--------------------------------------------------------+-----------------------------------------+

This example shows how you could make use of the ``attributes`` and
``itemIndex`` arguments to the mapping function to implement table
striping::

   TR.map(rows, function(row, attributes, loop) {
     attributes['class'] = (loop.index % 2 == 0 ? 'stripe1' : 'stripe2')
     return TD.map(row)
   })

Core API
========

These are the core functions whose output can be controlled using
:ref:`output-modes`.

.. js:function:: DOMBuilder.createElement(tagName[, attributes[, children[, mode]]])

   Creates an HTML element with the given tag name, attributes and
   children, optionally with a forced output mode.

   :param String tagName: the name of the element to be created.
   :param Object attributes: attributes to be applied to the new element.
   :param Array children: childen to be appended to the new element.
   :param String mode: the mode to be used to create the element.

   If children are provided, they will be appended to the new element.
   Any children which are not elements or fragments will be coerced to
   ``String`` and appended as text nodes.

   .. versionchanged:: 2.0
      Now delegates to the configured or specified mode to do all the
      real work.

.. js:function:: DOMBuilder.textNode(text[, mode])

   Creates a Text Node or its output mode equivalent, optionally
   with a forced output mode.

   This function is provided should you ever need to ``appendChild()`` a
   String to a previously-created HTML element when writing mixed output
   code.

   :param String text: contents for the Text Node.
   :param String mode: the mode to be used to create the Text Node.

   .. versionadded:: 2.1

.. js:function:: DOMBuilder.fragment()

   Creates a container grouping any given elements together without the
   need to wrap them in a redundant element. This functionality was for
   :doc:`dommode` - see :ref:`document-fragments` - but is supported by all
   output modes for the same grouping purposes.

   Supported argument formats are:

   +--------------------------------------------------------+
   | Fragment Creation Arguments                            |
   +=====================+==================================+
   | ``(child1, ...)``   | an arbitrary number of children. |
   +---------------------+----------------------------------+
   + ``([child1, ...])`` | an ``Array`` of children.        |
   +---------------------+----------------------------------+

.. _output-modes:

Output Modes
============

.. versionchanged:: 2.0
   Output modes now sit independent of DOMBuilder core and are pluggable.

DOMBuilder provides the ability to register new modes, which make use of
the arguments given when elements and fragments are created.

.. js:function:: DOMBuilder.addMode(mode)

   Adds a new mode and exposes an API for it in the DOMBuilder object
   under a property corresponding to the mode's name.

   The first mode to be added will have its name stored in
   :js:attr:`DOMBuilder.mode`, making it the default output mode.

   :param Object mode:
      Modes are defined as an ``Object`` with the following properties.

      ``name``
         the mode's name.
      ``createElement(tagName, attributes, children)``
         a Function which takes a tag name, attributes object and list of
         children and returns a content object.
      ``fragment(children)``
         a Function which takes a list of children and returns a content
         fragment.
      ``isModeObject(object)`` (optional)
         a Function which can be used to eliminate false positives when
         DOMBuilder is trying to determine whether or not an attributes
         object was given - it should return ``true`` if given a mode-created
         content object.
      ``api`` (optional)
         an Object defining a public API for the mode's implementation, exposing
         variables, functions and constructors used in implementation which
         may be of interest to anyone who wants to make use of the mode's
         internals.
      ``apply`` (optional)
         an Object defining additional properties to be added to the object
         DOMBuilder creates for easy access to mode-specific element functions
         (see below). Just as element functions are a convenience layer over
         :js:func:`DOMBuilder.createElement`, the purpose of the ``apply``
         property is to allow modes to provde a convenient way to access
         mode-specific functionality.

         Any properties specified with ``apply`` will also be added to objects
         passed into :js:func:`DOMBuilder.apply` when a mode is specified.

   When a mode is added, a ``DOMBuilder.<mode name>`` Object is also created,
   containing element functions which will always create content using
   the given mode and any additional properties which were defined via the
   mode's ``apply`` properties.

   .. versionadded:: 2.0

Example: a mode which prints out the arguments it was given::

   DOMBuilder.addMode({
     name: 'log'
   , createElement: function(tagName, attributes, children) {
       console.log(tagName, attributes, children)
       return tagName
     }
   })

::

   >>> DOMBuilder.build(article, 'log')
   h2 Object {} ["Article title"]
   p Object {} ["Paragraph one"]
   p Object {} ["Paragraph two"]
   div Object { class="article"} ["h2", "p", "p"]

Setting a mode's name as :js:attr:`DOMBuilder.mode` makes it the default
output format.

.. js:attribute:: DOMBuilder.mode

   Determines which mode :js:func:`DOMBuilder.createElement` and
   :js:func:`DOMBuilder.fragment` will use by default.

Provided Modes
--------------

Implementations of the following default modes are provided for use:

Output modes:

+----------------+----------------------------------------------------------------+-----------------+
| Name           | Outputs                                                        | Documentation   |
+================+================================================================+=================+
| ``'dom'``      | DOM Elements                                                   | :doc:`dommode`  |
+----------------+----------------------------------------------------------------+-----------------+
| ``'html'``     | :js:class:`MockElement` objects which ``toString()`` to HTML4  | :doc:`htmlmode` |
+----------------+----------------------------------------------------------------+-----------------+

Feature modes:

+----------------+----------------------------------------------------------------+------------------+
| Name           | Outputs                                                        | Documentation    |
+================+================================================================+==================+
| ``'template'`` | :js:class:`TemplateNode` objects which render an output format | :doc:`templates` |
+----------------+----------------------------------------------------------------+------------------+

Temporarily Switching Mode
--------------------------

If you're going to be working with mixed output types, forgetting to reset
:js:attr:`DOMBuilder.mode` would be catastrophic, so DOMBuilder provides
:js:func:`DOMBuilder.withMode` to manage it for you.

.. js:function:: DOMBuilder.withMode(mode, func[, args...])

   Calls a function, with :js:attr:`DOMBuilder.mode` set to the given value
   for the duration of the function call, and returns its output.

   Any additional arguments passed after the ``func`` argument will be passed
   to the function when it is called.

   >>> function createParagraph() { return P('Bed and', BR(), 'BReakfast') }
   >>> DOMBuilder.mode = 'dom'
   >>> createParagraph().toString() // DOM mode by default
   "[object HTMLParagraphElement]"
   >>> DOMBuilder.withMode('HTML', createParagraph).toString()
   "<p>Bed and<br>BReakfast</p>"

Referencing Element Functions
=============================

Some options for convenient ways to reference element functions.

Create a local variable referencing the element functions you want to use:

   ::

      var el = DOMBuilder.dom
      el.DIV('Hello')

Use the `with statement`_ to put the element functions of your choice in the
scope chain for variable resolution:

   ::

      with (DOMBuilder.dom) {
        DIV('Hello')
      }

   You could consider the `with statement misunderstood`_; some consider
   `with Statement Considered Harmful`_ the final word on using the ``with``
   statement *at all*, but to quote `The Dude`_ - yeah, well, y'know, that's
   just, like, your opinion, man. It's actually a pretty nice fit for builder
   and templating code in which properties are only ever *read* from the scoped
   object and it accounts for a significant proportion of property lookups.

   Just be aware that the ``with`` statement will be considered a syntax error
   if you wish to *opt-in* to `ECMAScript 5's strict mode`_ in the future, but
   there are ways are ways to mix strict and non-stict code, as it can be
   toggled at the function level.

Add element functions to the global scope using :js:func:`DOMBuilder.apply`:

   ::

      DOMBuilder.apply(window, 'dom')
      DIV('Hello')

   Filling the global scope full of properties isn't something which should be
   done lightly, but you might be ok with it for quick scripts or for utilities
   which you'll be using often and which are named in ways which are unlikely to
   conflict with your other code, such as DOMBuilder's upper-cased element
   functions.

   This particular piece of documentation won't judge you - it's your call.

.. js:function:: DOMBuilder.apply(context[, mode])

   Adds element functions to the given object, optionally for a specific mode.

   :param Object context: An object which element functions will be added to.
   :param String mode:
      The name of a mode for which mode-specific element functions and
      convenience API should be added.

      If not given, element functions from :js:attr:`DOMBuilder.elements` will
      be used.

   .. versionchanged:: 2.0
      The ``context`` argument is now required; added the ``mode`` argument.

.. _`with statement`: https://developer.mozilla.org/en/JavaScript/Reference/Statements/with
.. _`with statement misunderstood`: http://webreflection.blogspot.com/2009/12/with-worlds-most-misunderstood.html
.. _`with Statement Considered Harmful`: http://www.yuiblog.com/blog/2006/04/11/with-statement-considered-harmful/
.. _`The Dude`: http://www.imdb.com/title/tt0118715/quotes
.. _`ECMAScript 5's strict mode`: https://developer.mozilla.org/en/JavaScript/Strict_mode

.. _element-function-names:

Element Function Names
======================

An exhaustive list of the available element function names.

+--------------------------------------------------------------------------------------------------------------+
| Element Function Names                                                                                       |
+==========+==========+============+==========+============+=========+==========+==========+========+==========+
| A        | ABBR     | ACRONYM    | ADDRESS  | AREA       | ARTICLE | ASIDE    | AUDIO    | B      | BDI      |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| BDO      | BIG      | BLOCKQUOTE | BODY     | BR         | BUTTON  | CANVAS   | CAPTION  | CITE   | CODE     |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| COL      | COLGROUP | COMMAND    | DATALIST | DD         | DEL     | DETAILS  | DFN      | DIV    | DL       |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| DT       | EM       | EMBED      | FIELDSET | FIGCAPTION | FIGURE  | FOOTER   | FORM     | FRAME  | FRAMESET |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| H1       | H2       | H3         | H4       | H5         | H6      | HR       | HEAD     | HEADER | HGROUP   |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| HTML     | I        | IFRAME     | IMG      | INPUT      | INS     | KBD      | KEYGEN   | LABEL  | LEGEND   |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| LI       | LINK     | MAP        | MARK     | META       | METER   | NAV      | NOSCRIPT | OBJECT | OL       |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| OPTGROUP | OPTION   | OUTPUT     | P        | PARAM      | PRE     | PROGRESS | Q        | RP     | RT       |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| RUBY     | SAMP     | SCRIPT     | SECTION  | SELECT     | SMALL   | SOURCE   | SPAN     | STRONG | STYLE    |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| SUB      | SUMMARY  | SUP        | TABLE    | TBODY      | TD      | TEXTAREA | TFOOT    | TH     | THEAD    |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+
| TIME     | TITLE    | TR         | TRACK    | TT         | UL      | VAR      | VIDEO    | WBR    |          |
+----------+----------+------------+----------+------------+---------+----------+----------+--------+----------+

Building from Arrays
====================

.. versionadded:: 2.0

To make use of DOMBuilder's :ref:`output-modes` without using the rest of its
API, you can define HTML elements as nested Arrays, where each array represents
an element and each element can consist of a tag name, an optional ``Object``
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
     ]

::

   >>> DOMBuilder.build(article, 'html').toString()
   <div class="article"><h2>Article title</h2><p>Paragraph one</p><p>Paragraph two</p></div>

For convenience, ``id`` and ``class`` attributes can also be specified via the
tag name, like so::

   >>> DOMBuilder.build(['div#id', 'content'], 'html').toString()
   <div id="id">content</div>

   >>> DOMBuilder.build(['div.class', 'content'], 'html').toString()
   <div class="class">content</div>

You can specify multiple classes::

   >>> DOMBuilder.build(['div.class1.class2', 'content'], 'html').toString()
   <div class="class1 class2">content</div>

If you want to specify both, the id must be specified first, or it will be
skipped::

   >>> DOMBuilder.build(['div#id.class', 'content'], 'html').toString()
   <div id="id" class="class">content</div>

   >>> DOMBuilder.build(['div.class#id', 'content'], 'html').toString()
   <div class="class">content</div>

If you omit a tag name but specify an id/class, the tag name will default to
``'div'``::

   >>> DOMBuilder.build(['#id.class', 'content'], 'html').toString()
   <div id="id" class="class">content</div>

You can create :ref:`document-fragments` by providing ``'#document-fragment'``
as the tag name - this is useful if you want to insert a number of elements at
the same time without needing to wrap them in another element

::

   var articles =
     ['#document-fragment'
     , ['div.article', 'Article 1']
     , ['div.article', 'Article 2']
     ]

::

   >>> DOMBuilder.build(articles, 'html').toString()
   <div class="article">Article 1</div><div class="article">Article 2</div>

   >>> DOMBuilder.build(articles, 'dom').toString()
   [object DocumentFragment]

You can also use the element functions and core API to create array
representations of HTML elements, by setting :js:attr:`DOMBuilder.mode`
to ``null`` and using :js:attr:`DOMBuilder.elements`, or directly by using
the element functions defined in :js:attr:`DOMBuilder.array`:

.. js:attribute:: DOMBuilder.array

   Element functions which will always create nested element Array output.

   This is the default output format if :js:attr:`DOMBuilder.mode` is
   ``null``, effectively making it a ``null`` mode.