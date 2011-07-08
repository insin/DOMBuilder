===============
DOMBuilder Core
===============

.. _core-api:

Core API
========

.. js:function:: DOMBuilder.createElement(tagName[, attributes], children], mode])

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
      Now delegates to the configured mode to do all the real work.

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

Output Modes
============

.. versionadded:: 2.0

By itself, the core API isn't capable of doing anything but producing
nested Array representations of elements and fragments. DOMBuilder
provides the ability to register new modes, which make use of the
arguments given when elements and fragments are created.

.. js:function:: DOMBuilder.addMode(mode)

   Adds a new mode and exposes an API for it in the DOMBuilder object
   under a property corresponding to the mode's name.

   :param Object mode:
      Modes are defined as an ``Object`` with the following properties.

      ``name``
         the mode's name.
      ``createElement(tagName, attributes, children)``
         a Function which takes a tag name, attributes object and list of
         children and returns a content item.
      ``fragment(children)``
         a Function which takes a list of children and returns a content
         fragment.
      ``isPlainObject(object)`` (optional)
         a Function which can be used to eliminate false positives when
         DOMBuilder is trying to determine whether or not an attributes
         object was given - it should return ``false`` if given a
         mode-specific content object.
      ``api`` (optional)
         an object defining additional public API for the mode and
         exposing the variables, functions and constructors used in its
         implementation, if appropriate.

   When a mode is added, a ``DOMBuilder.<name>`` Object  is also created,
   containing element  functions which will always create content using
   the given mode and any additional properties which were defined via an
   ``api`` Object.

Example: a mode which prints out the arguments it was given::

   DOMBuilder.addMode({
     name: 'log'
   , createElement: function(tagName, attributes, children) {
       console.log(tagName, attributes, children);
       return tagName;
     }
   });

   >>> DOMBuilder.build(article, 'log');
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
| Name           | Output                                                         | Documentation   |
+================+================================================================+=================+
| ``'dom'``      | DOM Elements                                                   | :doc:`dommode`  |
+----------------+----------------------------------------------------------------+-----------------+
| ``'html'``     | :js:class:`MockElement` objects which ``toString()`` to HTML4  | :doc:`htmlmode` |
+----------------+----------------------------------------------------------------+-----------------+

Feature modes:

+----------------+----------------------------------------------------------------+------------------+
| Name           | Output                                                         | Documentation    |
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

   >>> function createParagraph() { return P('Bed and', BR(), 'BReakfast'); }
   >>> DOMBuilder.mode = 'dom'
   >>> createParagraph().toString() // DOM mode by default
   "[object HTMLParagraphElement]"
   >>> DOMBuilder.withMode('HTML', createParagraph).toString();
   "<p>Bed and<br>BReakfast</p>"

.. _element-functions:

Element Functions
=================

Element functions accept flexible combinations of input arguments,
creating a declarative layer on top of :js:func:`DOMBuilder.createElement`.

DOMBuilder core provides two objects which contain element functions:

.. js:attribute:: DOMBuilder.elements

   Element functions which create contents based on the current value of
   :js:attr:`DOMBuilder.mode`

.. js:attribute:: DOMBuilder.array

   Element functions which will always create nested element Array output.

   This is the default output format if :js:attr:`DOMBuilder.mode` is
   ``null``, effectively making it a ``null`` mode.

Each of these is an ``Object`` containing a function for each valid tag
name declared in the HTML 4.01 `Strict DTD`_ and `Frameset DTD`_.

Functions are referenced by the corresponding tag name in upper-case,
e.g. ``DOMBuilder.elements.DIV``, ``DOMBuilder.elements.A``,
``DOMBuilder.elements.TD``...

When called, these functions will create an element with the corresponding
tag name, giving it any attributes which are specified as properties of an
optional ``Object`` argument and appending any children passed in.

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

Example:

The following function reates a ``<table>`` representation of a list of
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
               return obj[prop] ? 'Yes' : 'No';
             }
             return obj[prop];
           });
         })
       )
     );
   }

Given this function, the following code...

::

   createTable(
     ['Name', 'Table #', 'Vegetarian'],
     [{name: 'Steve McMeat',   table: 3, veggie: false},
      {name: 'Omar Omni',      table: 5, veggie: false},
      {name: 'Ivana Huggacow', table: 1, veggie: True}],
     ['name', 'table', 'veggie']
   );

...would produce a DOM Element corresponding to the following HTML:

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
      functions; ``mode`` argument was added. A loop status object is now
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

For example, the table code we looked at earlier could also be written
like so, making use of ``map`` on element creation functions::

   function createTable(headers, objects, properties) {
     return TABLE({cellSpacing: 1, border: 1, "class": "data sortable"}
     , THEAD(TR(TH.map(headers)))
     , TBODY(
         TR.map(objects, function(obj) {
           return TD.map(properties, function(prop) {
             var value = obj[prop];
             if (typeof value == "boolean") {
               value = value ? "Yes" : "No";
             }
             return value;
           });
         })
       )
     );
   }

This isn't essentially any less complex than the previous method, but
there is a decrease in the number of nested method calls and you can see
how the default behaviour in the absence of a mapping function has slightly
simplified creation of the table headers.

This example shows how you could make use of the ``attributes`` and
``itemIndex`` arguments to the mapping function to implement table
striping::

   TR.map(rows, function(row, attributes, loop) {
     attributes['class'] = (loop.index % 2 == 0 ? 'stripe1' : 'stripe2');
     return TD.map(row);
   });

