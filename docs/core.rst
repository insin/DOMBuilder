DOMBuilder Core
===============

DOMBuilder supports two main patterns of usage:

1. Using Output Modes to Create Content from Nested Arrays
==========================================================

To make use of DOMBuilder's output modes without using the rest of its API,
you can define elements as nested Arrays, where each array represents an
element and each element can consist of a tag name, an optional Object
defining element attributes and an arbitrary number of content items.

For example:

+======================================+==================================+
| Input                                | Sample HTML Output               |
+======================================+==================================+
| ``['div']``                          | ``<div></div>``                  |
+--------------------------------------+----------------------------------+
| ``['div', {id: 'test'}]``            | ``<div id="test"></div>``        |
+--------------------------------------+----------------------------------+
| ``['div', 'content']``               | ``<div>content</div>``           |
+--------------------------------------+----------------------------------+
| ``['div', {id: 'test'}, 'content']`` | ``<div id="test">content</div>`` |
+--------------------------------------+----------------------------------+
| ``['div', {id: 'test'}, 'content']`` | ``<div id="test">content</div>`` |
+--------------------------------------+----------------------------------+

To create content from a nested Array in this format, use:

.. js:function:: DOMBuilder.build(contents[, mode])

   Builds the specified type of output from a nested element Array.

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

2. Using the OMBuilder API
==========================

The `Core API`_ consists of the :js:func:`DOMBuilder.createElement` and
:js:func:`DOMBuilder.fragment` functions, which allow definition of an
element or fragment, and assignment of its attributes and children, in a
single call::

   // Vanilla DOM
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

For convenience creating HTML elements succinctly in code, there are
element functions, which normalise a variety of more flexible argument
combinations for use with the core functions::

   // Equivalent created with element functions
   var el = DOMBuilder.dom;
   var div = el.DIV({id: 'test'}, 'content1', el.STRONG('content2'));

For convenience creating content based on an lists of data, we add to that
DOMBuilder.map, which is also made accessible via element functions::

   var items = [1, 2, 3, 4];

   // Without assuming existence of Array.prototype.map
   var contents = [];
   for (var i = 0, l = items.length; i < l; i++) {
     contents.push(el.LI({'class': 'item'}, 'Item ' + items[i]));
   }
   var ul = el.UL(contents);

   // Assuming Array.prototype.map
   var ul = UL(items.map(function(item) {
       return el.LI({'class': 'item'}, 'Item ' + item);
     })
   );

   // With DOMBuilder.map
   var ul = el.UL(DOMBuilder.map('li', {'class': 'item'} function(item) {
       return 'Item ' + item;
     })
   );

   // With element function .map
   var ul = el.UL(el.LI.map(items, {'class': 'item'}, function(item) {
       return 'Item ' : item;
     })
   );

Core API
--------

The function which does the real work when you call an element creation
function is :js:func:`DOMBuilder.createElement` - it's comparatively
inflexible with the arguments it accepts, but still more convenient than
creating and populating elements manually using DOM methods.

.. js:function:: DOMBuilder.createElement(tagName[, attributes[, children]])

   Creates a DOM Element with the given tag name, attributes and children.

   :param String tagName: the name of the element to be created.
   :param Object attributes: attributes to be applied to the new element.
   :param Array children: childen to be appended to the new element.

   If children are provided, they will be appended to the new element.
   Any  children which are not DOM Elements will be coerced to ``String``
   and appended as Text Nodes.

   .. versionchanged:: 1.2
      Now generates :js:class:`HTMLElement` objects if
      :js:attr:`DOMBuilder.mode` is set to anything but ``"DOM"``.


Element Functions
-----------------

Element functions accept flexible combinations of input arguments,
creating a declarative API on top of :js:func:`DOMBuilder.createElement`.

DOMBuilder core defines two objects containing element functions:

.. js:attribute:: DOMBuilder.elements

   Element functions which create contents based on the current value of
   :js:attr:`DOMBuilder.mode`

.. js:attribute:: DOMBuilder.array

   Element functions which create nested element Array output.

Each of these is an ``Object`` containing a function for each valid tag
name declared in the HTML 4.01 `Strict DTD`_ and `Frameset DTD`_.

Functions are referenced by the corresponding tag name in upper case,
e.g. ``DOMBuilder.elements.DIV``, ``DOMBuilder.elements.A``
``DOMBuilder.elements.TD``...

When called, these functions will create an element with the corresponding
tag name in the appropriate format, giving it any attributes which are
specified as properties of an optional ``Object`` argument and appending
any children which are specified as additional arguments or an ``Array``
argument.

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

Map Functions
-------------

.. versionadded:: 1.3

Map functions provide a shorthand for:

- creating elements for each item in a list, via :js:func:`DOMBuilder.map`
- wrapping elements created for each item in a list with a fragment, via
  :js:func:`DOMBuilder.fragment.map`

Mapping Elements
~~~~~~~~~~~~~~~~

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

   Contents created by the function can consist of a single value or a
   mixed ``Array``.

   Attributes for the created element can be altered per-item by
   modifying the ``attributes`` argument, which will initially contain
   the contents of ``defaultAttributes``, if it was provided.

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
     return TABLE({cellSpacing: 1, border: 1, "class": "data sortable"},
       THEAD(TR(TH.map(headers))),
       TBODY(
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

   TR.map(rows, function(row, attributes, itemIndex) {
     attributes['class'] = (itemIndex % 2 == 0 ? 'stripe1' : 'stripe2');
     return TD.map(row);
   });

Modes
-----

3. A means of registering new output modes which alter what DOMBuilder does
   when the declarative API is used and when contents are declared using
   the declarative API::

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


The DOMBuilder API can also be used to generate HTML. The type of output it
generates is controlled by :js:attr:`DOMBuilder.mode`.

.. js:attribute:: DOMBuilder.mode

   Determines which kind of objects :js:func:`DOMBuilder.createElement`
   will create.

   The allowable values are:

   +----------------+----------------------------------------------------------------+
   | Value          | Output                                                         |
   +================+================================================================+
   | ``"dom"``      | DOM Elements                                                   |
   +----------------+----------------------------------------------------------------+
   | ``"html"``     | :js:class:`HTMLElement` objects which ``toString()`` to HTML4  |
   +----------------+----------------------------------------------------------------+
   | ``"template"`` | :js:class:`TemplateNode` objects which render an output format |
   +----------------+----------------------------------------------------------------+

To change to HTML mode, set :js:attr:`DOMBuilder.mode` to the appropriate
type of HTML output you want and use DOMBuilder as normal.







Element Creation Functions
~~~~~~~~~~~~~~~~~~~~~~~~~~

There's nothing compact about code littered with ``DOMBuilder.elementFunctions``,
so to get started, use :js:func:`DOMBuilder.apply` to add element creation
functions to a context object of your choice.

.. js:function:: DOMBuilder.apply([context])

   Adds element creation functions to a context object, with names
   corresponding to valid HTML elements in upper case.

   :param Object context:
       an object to have element creation functions added to it.
       If not provided, a new Object will be created and used.
   :returns: The context Object which was passed in or created.

For a simple example, the following code...

::

   var html = DOMBuilder.apply();
   var article =
     html.DIV({'class': 'article'},
       html.H2('Article title'),
       html.P('Paragraph one'),
       html.P('Paragraph two')
     );

...would produce a DOM Element corresponding to the following HTML:

.. code-block:: html

   <div class='article'>
     <h2>Article title</h2>
     <p>Paragraph one</p>
     <p>Paragraph two</p>
   </div>

.. tip::
   For (arguably, horrible) convenience, you could add element creation
   functions to the global scope by passing ``window`` as the context
   object::

      DOMBuilder.apply(window);
      var article =
        DIV({'class': 'article'},
          H2('Article title'),
          P('Paragraph one'),
          P('Paragraph two')
        );

   Alternatively, you could use JavaScript's much-derided `with statement`_ to
   temporarily add :js:attr:`DOMBuilder.elementFunctions` to the scope chain::

      with (DOMBuilder.elementFunctions) {
         // Code as above
      }

   .. _`with statement`: https://developer.mozilla.org/en/JavaScript/Reference/Statements/with

.. note::
   For brevity, further examples assume that element creation functions
   are available in the global scope.

When you're writing a a web application you're more likely to be creating
dynamic content based on some sort of input.

The following function (which assumes the existence of an ``Array``
`map function`_) programmatically creates a ``<table>`` representation of
a list of objects, taking advantage of the flexible combinations of
arguments accepted by element creation functions::

   /**
    * @param headers a list of column headings.
    * @param objects the objects to be displayed.
    * @param properties names of object properties which map to the
    *                   corresponding columns.
    */
   function createTable(headers, objects, properties) {
     return TABLE({cellSpacing: 1, 'class': 'data sortable'},
       THEAD(TR(headers.map(function(header) { return TH(header); }))),
       TBODY(objects.map(function(obj) {
         return TR(properties.map(function(prop) {
           var value = obj[prop];
           if (typeof value == 'boolean') {
             value = value ? 'Yes' : 'No';
           }
           return TD(obj[prop]);
         }))
       }))
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

.. _`map function`: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/map


