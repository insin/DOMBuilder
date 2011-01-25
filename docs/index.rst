DOMBuilder
==========

DOMBuilder takes some of the pain out of programatically creating HTML in
JavaScript.

.. toctree::
   :maxdepth: 1

   htmlmode
   license

Introduction
------------

DOMBuilder takes some of the pain out of programatically creating HTML in
JavaScript.

Usually, this involves copious amounts of creating DOM
elements with ``document.createElement()`` and putting them in place with
``appendChild()`` and friends, or lots of ``String`` wrangling if you're
generating HTML text for use with ``innerHTML``.

There are also a bunch of quite annoying *Internet* cross-browser
*Explorer* issues which must be dealt with when creating DOM elements
manually; these usually necessitate your own library of workarounds unless
you're leveraging one of the many fine JavaScript frameworks.

DOMBuilder's element creation functions give you a more declarative,
compact API to work with when creating content in code, while taking care
of cross-browser issues for you behind the scenes.

To get started, use :js:func:`DOMBuilder.apply` to add element creation
functions to a context object.

.. js:function:: DOMBuilder.apply([context])

   :param Object context:
       an object to have element creation functions added to it.
       If not provided, a new Object will be created and used.
   :returns: The context Object which was passed in or created.

   Creates functions in a context object with names corresponding to valid
   HTML elements. When called, these functions will create the appropriate
   elements, giving them any attributes which are specified and creating and
   appending any children which are specified.

   Element creation functions accept the following variations of
   arguments:

   +---------------------------------------------------------------------------------+
   | Element Creation Function Arguments                                             |
   +=================================+===============================================+
   | ``(attributes, child1, ...)``   | an attributes object followed by an arbitrary |
   |                                 | number of children.                           |
   +---------------------------------+-----------------------------------------------+
   | ``(attributes, [child1, ...])`` | an attributes object and an ``Array`` of      |
   |                                 | children.                                     |
   +---------------------------------+-----------------------------------------------+
   | ``(child1, ...)``               | an arbitrary number of children.              |
   +---------------------------------+-----------------------------------------------+
   + ``([child1, ...])``             | an ``Array`` of children.                     |
   +---------------------------------+-----------------------------------------------+

   See :js:func:`DOMBuilder.createElement` for more detail on how these
   arguments are used.

.. tip::
   For convenience, you may want to create the element creation functions
   in the global scope, by passing ``window`` as the context object::

      DOMBuilder.apply(window);

Element Creation Functions
~~~~~~~~~~~~~~~~~~~~~~~~~~

For a simple example, the following code...

::

   var html = DOMBuilder.apply();
   var article =
     html.DIV({"class": "article"},
       html.H2("Article title"),
       html.P("Paragraph one"),
       html.P("Paragraph two")
     );

...would produce a DOM element corresponding to the following HTML:

.. code-block:: html

   <div class="article">
     <h2>Article title</h2>
     <p>Paragraph one</p>
     <p>Paragraph two</p>
   </div>

When you're writig a a web application you're more likely to be creating
dynamic content based on some sort of input.

.. note::
   This example assumes that element creation functions are available in
   the global scope.

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

...would produce a DOM element corresponding to the following HTML:

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

Map Function
############

.. versionadded:: 1.3

DOMBuilder provides a shorthand for creating an element for each item in a
list via its :js:func:`DOMBuilder.map` function.

.. js:function:: DOMBuilder.map(tagName[, defaultAttributes], items[, mappingFunction])

   Creates an element for (potentially) every item in a list.

   :param String tagName:
      the name of the element to create for each item in the list.
   :param Object attributes: default attributes for the element.
   :param Array items:
      the list of items to use as the basis for creating elements.
   :param Function mappingFunction:
      a function to be called with each item in the list, to provide
      contents for the element which will be created for that item.

   If provided, the mapping function will be called with the following
   arguments::

      mappingFunction(item, attributes, itemIndex)

   Contents created by the function can consist of a single value (in DOM
   mode: an ``Element``, ``DocumentFragment``, ``String``, ``Number`` or
   ``Boolean``) or a mixed ``Array`` of these types.

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
how the default behaviour in the absence of a mapping function simplified
creation of the table headers.

This is how you could make use of the ``attributes`` and ``itemIndex``
arguments to the mapping function to implement table striping::

   TR.map(rows, function(row, attributes, itemIndex)
   {
       attributes['class'] = (itemIndex % 2 == 0 ? "row1" : "row2");
       return TD.map(row);
   });

Event Handlers
##############

Event handlers can be specified as you would expect - supply an event name
(including an ``"on"`` prefix) as one of the element's attributes and an event
handling function as the corresponding value. DOMBuilder will ensure the
element the event handler is registered on will be accessible cross-browser
using the ``this`` keyword when the event handling function is executed.

For example, the following will create a text input which displays a default
value, clearing it when the input is focused and restoring the default if
the input is left blank::

   var defaultInput =
     INPUT({type: "text", name: "test",
            value: "Type Here!", defaultValue: "Type Here!",
            onfocus: function()
            {
               if (this.value == this.defaultValue)
               {
                   this.value = "";
               }
            },
            onblur: function()
            {
               if (this.value == "")
               {
                   this.value = this.defaultValue;
               }
            }});

Manual Element Creation
~~~~~~~~~~~~~~~~~~~~~~~

The function which does the majority of the work when you call an element
creation function is available for your own use - the main difference is that
it's inflexible with the arguments it accepts, but it's still more
convenient than creating and populating elements manually using DOM methods.

.. js:function:: DOMBuilder.createElement(tagName[, attributes[, children]])

   :param String tagName: the name of the element to be created.
   :param Object attributes: attributes to be applied to the new element.
   :param Array children:
       childen to be appended to the new element; may be composed of mixed
       ``String``, ``Number``, ``Boolean``, ``Element`` or
       ``DocumentFragment``.

   Creates a DOM ``Element`` or :js:class:`DOMBuilder.HTMLElement` object
   with the given tag name, attributes and children - this is the underlying
   function used by the element creation functions created by
   :js:func:`DOMBuilder.apply`.

   If attributes are provided, any properties of the given object which have
   names starting with ``"on"`` and which have a ``Function`` as their value
   will be assigned as event listeners on the new element. It is assumed that
   a valid event name is set as the attribute name in this case.

   If children are provided, they will be added to the new element.
   ``String``, ``Number`` or ``Boolean`` children will be added as text nodes.
   It is assumed that any child passed which is not one of these types will
   be suitable for appending to its parent element.

   .. versionchanged:: 1.2
      Now generates :js:class:`DOMBuilder.HTMLElement` objects if
      :js:attr:`DOMBuilder.mode` is set to anything but ``"DOM"``.

Document Fragments
~~~~~~~~~~~~~~~~~~

.. versionadded:: 1.3

A ``DocumentFragment`` conveniently allows you to append its entire
contents with a single call to the target node's ``appendChild()``
method.

If you're thinking of adding a wrapper ``<div>`` solely to be able to
insert a number of sibling elements at the same time, a
``DocumentFragment`` will do the same job without the need for a redundant
wrapper element. This single append functionality also makes it a
handy container for content which needs to be inserted repeatedly, calling
``cloneNode(true)`` for every insertion.

DOMBuilder provides a :js:func:`DOMBuilder.fragment` wrapper function,
which allows you to pass all the contents you want into a
``DocumentFragment`` in one call, and also allows you make use of this
functionality in HTML mode by creating equivalent :ref:`mock-dom-objects`
instead. This will allow you to, for example, unit test functionality
you've written which makes use of ``DocumentFragment`` objects by using
HTML mode to verify output against strings, rather than against DOM
trees.

.. js:function:: DOMBuilder.fragment()

   Creates a DOM ``DocumentFragment`` object or
   :js:class:`DOMBuilder.HTMLFragment` with the given children. Supported
   argument formats are:

   +--------------------------------------------------------+
   | Fragment Creation Arguments                            |
   +=================================+======================+
   | ``(child1, ...)``   | an arbitrary number of children. |
   +---------------------------------+----------------------+
   + ``([child1, ...])`` | an ``Array`` of children.        |
   +---------------------------------+----------------------+

See http://ejohn.org/blog/dom-documentfragments/ for more information about
``DocumentFragment`` objects.
