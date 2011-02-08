DOMBuilder
==========

DOMBuilder takes some of the pain out of programatically creating DOM
Elements and HTML in JavaScript.

.. toctree::
   :maxdepth: 1

   htmlmode
   news
   license

Dependencies
------------

There are no *required* dependencies, but if `jQuery`_ (>= 1.4) is
available, DOMBuilder will use it to take care of cross-browser issues
creating DOM Elements and setting up their attributes and event handlers.

If not, DOMBuilder will fall back to using some less comprehensive
workarounds for cross-browser issues and use the `traditional event
registration model`_.

.. versionchanged:: 1.3
   jQuery was added as a dependency.

.. versionchanged:: 1.4
   jQuery was made optional, with the caveat that cross-browser support will
   be less robust.

.. _`jQuery`: http://jquery.com
.. _`traditional event registration model`: http://www.quirksmode.org/js/events_tradmod.html

Introduction
------------

DOMBuilder takes some of the pain out of programatically creating DOM
Elements and HTML in JavaScript, providing element creation functions which
give you a more declarative, compact API to work with when creating content
in code, while cross-browser DOM issues are taken care of by jQuery behind
the scenes.

Element Creation Functions
~~~~~~~~~~~~~~~~~~~~~~~~~~

.. js:attribute:: DOMBuilder.elementFunctions

   An ``Object`` containing a function for each valid tag name declared in
   the HTML 4.01 `Strict DTD`_ and `Frameset DTD`_.

   Functions are referenced by the corresponding tag name in upper case,
   e.g. ``DOMBuilder.elementFunctions.DIV``, ``DOMBuilder.elementFunctions.A``,
   ``DOMBuilder.elementFunctions.TD``...

   When called, these functions will create an element with the
   corresponding tag name, giving it any attributes which are specified as
   properties of an optional ``Object`` argument and appending any children
   which are specified as additional arguments or an ``Array`` argument.

   Element creation functions accept the following variations of arguments:

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

   See :js:func:`DOMBuilder.createElement` for more detail on how these
   arguments are used.

   .. _`Strict DTD`: http://www.w3.org/TR/html4/sgml/dtd.html
   .. _`Frameset DTD`: http://www.w3.org/TR/html4/sgml/framesetdtd.html

There's nothing compact about code littered with ``DOMBuilder.elementFunctions``,
so to get started, use :js:func:`DOMBuilder.apply` to add element creation
functions to a context object of your choice.

.. js:function:: DOMBuilder.apply([context])

   :param Object context:
       an object to have element creation functions added to it.
       If not provided, a new Object will be created and used.
   :returns: The context Object which was passed in or created.

   Adds element creation functions to a context object, with names
   corresponding to valid HTML elements in upper case.

For a simple example, the following code...

::

   var html = DOMBuilder.apply();
   var article =
     html.DIV({"class": "article"},
       html.H2("Article title"),
       html.P("Paragraph one"),
       html.P("Paragraph two")
     );

...would produce a DOM Element corresponding to the following HTML:

.. code-block:: html

   <div class="article">
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
        DIV({"class": "article"},
          H2("Article title"),
          P("Paragraph one"),
          P("Paragraph two")
        );

   Aletrnatively, you could (please don't) use JavaScript's much-derided
   `with statement`_ to temporarily add :js:attr:`DOMBuilder.elementFunctions`
   to the scope chain::

      with (DOMBuilder.elementFunctions)
      {
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
   function createTable(headers, objects, properties)
   {
       return TABLE({cellSpacing: 1, "class": "data sortable"},
           THEAD(TR(headers.map(function(header) { return TH(header); }))),
           TBODY(objects.map(function(obj) {
              return TR(properties.map(function(prop) {
                  var value = obj[prop];
                  if (typeof value == "boolean")
                  {
                      value = value ? "Yes" : "No";
                  }
                  return TD(obj[prop]);
              }))
           }))
       );
   }

Given this function, the following code...

::

   createTable(
       ["Name", "Table #", "Vegetarian"],
       [{name: "Steve McMeat",   table: 3, veggie: false},
        {name: "Omar Omni",      table: 5, veggie: false},
        {name: "Ivana Huggacow", table: 1, veggie: True}],
       ["name", "table", "veggie"]
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

Event Handlers
##############

Event handlers can be specified by supplying an event name as one of the
element's attributes and an event handling function as the corresponding
value.  Any of the following events can be registered in this manner:

+----------------------------------------------------------------------+
| Event names                                                          |
+===========+===========+==========+============+============+=========+
| blur      | focus     | focusin  | focusout   | load       | resize  |
+-----------+-----------+----------+------------+------------+---------+
| scroll    | unload    | click    | dblclick   | mousedown  | mouseup |
+-----------+-----------+----------+------------+------------+---------+
| mousemove | mouseover | mouseout | mouseenter | mouseleave | change  |
+-----------+-----------+----------+------------+------------+---------+
| select    | submit    | keydown  | keypress   | keyup      | error   |
+-----------+-----------+----------+------------+------------+---------+

These correspond to `events which have jQuery shortcut methods`_, which will
be used for event handler registration if jQuery is available.

For example, the following will create a text input which displays a default
value, clearing it when the input is focused and restoring the default if
the input is left blank::

   var defaultInput =
     INPUT({type: "text", name: "email",
            value: "email@host.com", defaultValue: "email@host.com",
            focus: function()
            {
               if (this.value == this.defaultValue)
               {
                   this.value = "";
               }
            },
            blur: function()
            {
               if (this.value == "")
               {
                   this.value = this.defaultValue;
               }
            }});

.. _`events which have jQuery shortcut methods`: http://api.jquery.com/category/events/

Manual Element Creation
-----------------------

The function which does the real work when you call an element creation
function :js:func:`DOMBuilder.createElement` - it's comparatively inflexible
with the arguments it accepts, but still more convenient than creating and
populating elements manually using DOM methods.

.. js:function:: DOMBuilder.createElement(tagName[, attributes[, children]])

   :param String tagName: the name of the element to be created.
   :param Object attributes: attributes to be applied to the new element.
   :param Array children: childen to be appended to the new element.

   Creates a DOM Element object with the given tag name, attributes and
   children.

   If children are provided, they will be appended to the new element.
   Any  children which are not DOM Elements will be coerced to ``String``
   and appended as Text Nodes.

   .. versionchanged:: 1.2
      Now generates :js:class:`DOMBuilder.HTMLElement` objects if
      :js:attr:`DOMBuilder.mode` is set to anything but ``"DOM"``.

Document Fragments
------------------

.. versionadded:: 1.3

A `DOM DocumentFragment`_ is a lightweight container for elements which,
conveniently, allows you to append its entire contents with a single call
to the destination element's ``appendChild()`` method.

If you're thinking of adding a wrapper ``<div>`` solely to be able to
insert a number of sibling elements at the same time, a
DocumentFragment will do the same job without the need for the redundant
wrapper element. This single append functionality also makes it a handy
container for content which needs to be inserted repeatedly, calling
``cloneNode(true)`` for each insertion.

DOMBuilder provides a :js:func:`DOMBuilder.fragment` wrapper function,
which allows you to pass all the contents you want into a DocumentFragment
in one call, and also allows you make use of this functionality in HTML
mode by creating equivalent :ref:`mock-dom-objects` as appropriate. This
will allow you to, for example, unit test functionality you've written
which makes use of DocumentFragment objects by using HTML mode to verify
output against strings, rather than against DOM trees.

.. js:function:: DOMBuilder.fragment()

   Creates a DOM DocumentFragment with the given children.

   Supported argument formats are:

   +--------------------------------------------------------+
   | Fragment Creation Arguments                            |
   +=================================+======================+
   | ``(child1, ...)``   | an arbitrary number of children. |
   +---------------------------------+----------------------+
   + ``([child1, ...])`` | an ``Array`` of children.        |
   +---------------------------------+----------------------+

See http://ejohn.org/blog/dom-documentfragments/ for more information about
DocumentFragment objects.

.. _`DOM DocumentFragment`: http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-B63ED1A3

Map Functions
-------------

.. versionadded:: 1.3

Map functions provide a shorthand for:

- creating elements for each item in a list, via :js:func:`DOMBuilder.map`
- wrapping elements created for each item in a list with a fragment, via
  :js:func:`DOMBuilder.fragment.map`

Mapping Elements
~~~~~~~~~~~~~~~~

.. js:function:: DOMBuilder.map(tagName[, defaultAttributes], items[, mappingFunction])

   Creates an element for (potentially) every item in a list.

   :param String tagName:
      the name of the element to create for each item in the list.
   :param Object defaultAttributes: default attributes for the element.
   :param Array items:
      the list of items to use as the basis for creating elements.
   :param Function mappingFunction:
      a function to be called with each item in the list, to provide
      contents for the element which will be created for that item.

   If provided, the mapping function will be called with the following
   arguments::

      mappingFunction(item, attributes, itemIndex)

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

This function is also exposed via element creation functions. Each
element creation function has its own ``map`` function, which takes the
same arguments as :js:func:`DOMBuilder.map` excluding the ``tagName``
argument, which is taken from the element creation function itself.

For example, the table code we looked at earlier could also be written
like so, making use of ``map`` on element creation functions::

   function createTable(headers, objects, properties)
   {
       return TABLE({cellSpacing: 1, border: 1, "class": "data sortable"},
         THEAD(TR(TH.map(headers))),
         TBODY(
           TR.map(objects, function(obj) {
             return TD.map(properties, function(prop) {
                 var value = obj[prop];
                 if (typeof value == "boolean")
                 {
                   value = value ? "Yes" : "No";
                 }
                 return value;
             })
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

   TR.map(rows, function(row, attributes, itemIndex)
   {
       attributes['class'] = (itemIndex % 2 == 0 ? "stripe1" : "stripe2");
       return TD.map(row);
   });

Mapping Fragments
~~~~~~~~~~~~~~~~~

.. js:function:: DOMBuilder.fragment.map(items, mappingFunction)

   Creates a fragment wrapping content created for (potentially) every item
   in a list.

   :param Array items:
      the list of items to use as the basis for creating fragment contents.
   :param Function mappingFunction:
      a function to be called with each item in the list, to provide
      contents for the fragment.

   The mapping function will be called with the following arguments::

      mappingFunction(item, itemIndex)

   The function can indicate that the given item shouldn't generate
   any content for the fragment by returning ``null``.

   Contents created by the function can consist of a single value or a
   mixed ``Array``.

This function is useful if you want to generate sibling content from a list
of items without introducing redundant wrapper elements.

For example, with a `js-forms`_ ``FormSet`` object, which contains multiple
``Form`` objects. If you wanted to generate a heading and a table for each
form object and have the whole lot sitting side-by-side in the document::

   var formFragment = DOMBuilder.fragment.map(formset.forms, function(form, index)
   {
       return [
         H2("Widget " + (index + 1)),
         TABLE(TBODY(
           TR.map(form.boundFields(), function(field)
           {
             return [TH(field.labelTag()), TD(field.asWidget())];
           })
         ))
       ];
   });

Appending ``formFragment`` would result in the equivalent of the following
HTML:

.. code-block:: html

    <h2>Widget 1</h2>
    <table> ... </table>
    <h2>Widget 2</h2>
    <table> ... </table>
    <h2>Widget 3</h2>
    <table> ... </table>
    ...

.. _`js-forms`: http://code.google.com/p/js-forms/