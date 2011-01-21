.. DOMBuilder documentation master file, created by
   sphinx-quickstart on Thu Jan 20 23:05:55 2011.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

DOMBuilder - declarative DOM element and HTML creation
======================================================

DOMBuilder is a standalone script which provides utility methods for
creating DOM elements and HTML in code in a more declarative manner than
repeated ``document.createElement()`` and ``appendChild`` calls or
string manipulation.

.. contents::

Element Creation
----------------

To get started, use :js:func:`DOMBuilder.apply` to add element creation
functions to a context object.

.. js:function:: DOMBuilder.apply([context])

   :param Object context:
       An object to have element creation functions added to it.
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

Example Usage
~~~~~~~~~~~~~

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
   This example assumes that element creation functions are available in the
   global scope.

The following function programmatically creates a ``<table>``
representation of a list of objects, taking advantage of the flexible
combinations of arguments accepted by element creation functions::

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
           TBODY(objects.map(function(obj)
           {
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

Event Handlers
~~~~~~~~~~~~~~

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

The function which does the majority of the work when you call an element
creation function is also available for use - the main difference is that
it's inflexible with the arguments it accepts, but it's still more
convenient than creating and populating elements manually using DOM methods.

.. js:function:: DOMBuilder.createElement(tagName[, attributes[, children]])

   :param String tagName: The name of the element to be created.
   :param Object attributes: Attributes to be applied to the new element.
   :param Array children:
       Childen to be appended to the new element; may be composed of mixed
       ``String``, ``Number`` and DOM elements.
   :returns: The created element.

   Creates a DOM element or :js:class:`DOMBuilder.Tag` object with the given tag name,
   attributes and children - this is the underlying function used by the
   element creation functions created by :js:func:`DOMBuilder.apply`.

   If attributes are provided, any properties of the given object which have
   names starting with ``"on"`` and which have a ``Function`` as their value
   will be assigned as event listeners on the new element. It is assumed that
   a valid event name is set as the attribute name in this case.

   If children are provided, they will be added to the new element.
   ``String`` or ``Number`` children will be added as text nodes. It is
   assumed that any child passed which is not a ``String`` or ``Number``
   will be a DOM element or :js:class:`DOMBuilder.Tag`.

   .. versionchanged:: 1.2
      Now generates :js:class:`DOMBuilder.Tag` objects if
      :js:attr:`DOMBuilder.mode` is set to anything but ``"DOM"``.

HTML Mode
---------

.. versionadded:: 1.2

DOMBuilder can also be used to generate HTML without having to engage in
extensive ``String`` wrangling. The type of output it generates is controlled
by the :js:attr:`DOMBuilder.mode` flag.

.. js:attribute:: DOMBuilder.mode

   Determines which kind of objects :js:func:`DOMBuilder.createElement` will
   create.

   The allowable values are:

   +-------------+------------------------------------------------------------------+
   | Value       | Output                                                           |
   +=============+==================================================================+
   | ``"DOM"``   | DOM elements (default value)                                     |
   +-------------+------------------------------------------------------------------+
   | ``"HTML"``  | :js:class:`DOMBuilder.Tag` objects which ``toString()`` to HTML4 |
   +-------------+------------------------------------------------------------------+
   | ``"XHTML"`` | :js:class:`DOMBuilder.Tag` objects which ``toString()`` to XHTML |
   +-------------+------------------------------------------------------------------+

Yes, that is pretty ugly, but the majority of your usage will depend on the
environment your JavaScript is executing in. If you're on the browser, you're
more likely to want to create DOM elements which are easy to attach event
handlers to, while on the backend you'll probably stick exclusively to one
of the HTML modes.

Of course, there are plenty of scenarios where you would want to generate
HTML in a browser. For example, inserting new content using ``innerHTML``
can be a lot faster than using the DOM methods in scenarios where none of
its limitations or side-effects apply.

To change to HTML mode, set :js:attr:`DOMBuilder.mode` to the appropriate
type of HTML output you want and use it as normal. In HTML mode, element
creation functions create :js:class:`DOMBuilder.Tag` objects.

.. js:class:: DOMBuilder.Tag(tagName[, attributes[, children]])

   A representation of an HTML tag, its attributes and child contents.

   Arguments are as per :js:func:`DOMBuilder.createElement`.

.. js:function:: DOMBuilder.Tag.appendChild(child)

   Adds to the list of children, for cases where the desired structure
   cannot be built up at Tag creation time.

.. js:function:: DOMBuilder.Tag.toString()

   Creates a ``String`` containing the HTML representation of this object
   and its children. By default, any ``String`` children will be escaped to
   prevent the use of sensitive HTML characters - see the `Escaping`_
   section for details on controlling escaping.

If you're going to be working with mixed output types, forgetting to reset
:js:attr:`DOMBuilder.mode` would be catastrophic, so DOMBuilder provides
:js:func:`DOMBuilder.withNode` to manage it for you.

.. js:function:: DOMBuilder.withNode(mode, func)

   Calls a function with :js:attr:`DOMBuilder.mode` set to the given value for
   the duration of the function call.

   :param String mode: The mode to be used.
   :param Function func: The ``Function`` to be called.

It will take the piece of work you want to do as a function, flip to the
appropriate output mode, execute the function then flip the output mode back
again before returning the result of the function call.

The following `FireBug`_ console session shows :js:func:`DOMBuilder.withNode` in action::

    >>> function createParagraph() { return P("Bed and", BR(), "BReakfast"); }
    >>> createParagraph().toString() // DOM mode by default
    "[object HTMLParagraphElement]"
    >>> DOMBuilder.withMode("HTML", createParagraph).toString();
    "<p>Bed and<br>BReakfast</p>"
    >>> DOMBuilder.withMode("XHTML", createParagraph).toString();
    "<p>Bed and<br />BReakfast</p>"
    >>> DOMBuilder.withMode("HTML", function() { return createParagraph() + " " + DOMBuilder.withMode("XHTML", createParagraph); }) // What is this I don't even
    "<p>Bed and<br>BReakfast</p> <p>Bed and<br />BReakfast</p>"

.. _Firebug: http://www.getfirebug.com

Escaping
~~~~~~~~

HTML mode was initially introduced with backend use in mind - specifically,
for generating forms and working with user input. As such, autoescaping was
implemented to protect the developer from malicious user input. The same can
still apply on the frontend, so :js:func:`DOMBuilder.Tag.toString`
automatically escapes the following characters in any ``String`` contents it
finds, replacing them with their equivalent HTML entities::

   < > & ' "

If you have a `String` which is known to be safe for inclusion without
escaping, pass it through :js:func:`DOMBuilder.markSafe` before adding it
to a :js:class:`DOMBuilder.Tag`.

.. js:function:: DOMBuilder.markSafe(value)

   :param String value: A known-safe string.
   :returns: A ``SafeString`` object.

There is also a corresponding method to determine if a ``String`` is
already marked as safe.

.. js:function:: DOMBuilder.isSafe(value)

   :returns: ``true`` if the given ``String`` is marked as safe, ``false``
       otherwise.

Assuming we're in HTML mode, this example shows how autoescaping deals with
malicious input::

   >>> var input = "<span style=\"font-size: 99999px;\" onhover=\"location.href='whereveriwant'\">Free money!</span>";
   >>> P("Steve the dog says: ", input).toString()
   "<p>Steve the dog says: &lt;span style=&quot;font-size: 99999px;&quot; onhover=&quot;location.href=&#39;whereveriwant&#39;&quot;&gt;Free money!&lt;/span&gt;</p>"

But say you have a ``String`` containing HTML which you trust and do want to
render, like a status message you've just created, or an ``XMLHTTPRequest``
response::

   >>> var response = "You have <strong>won the internet!</strong>";
   >>> P("According to our experts: ", response).toString()
   "<p>According to our experts: You have &lt;strong&gt;won the internet!&lt;/strong&gt;</p>"
   >>> P("According to our experts: ", DOMBuilder.markSafe(response)).toString()
   "<p>According to our experts: You have <strong>won the internet!</strong></p>"

.. warning::

   String operations performed on a String which was marked safe will
   produce a String which is not marked as safe.

To avoid accidentally removing safe status from a ``String``, try not to mark it
safe until it's ready for use::

   >>> var response = "<span style=\"font-family: Comic Sans MS\">Your money is safe with us!</span>";
   >>> function tasteFilter(s) { return s.replace(/Comic Sans MS/gi, "Verdana"); }
   >>> var safeResponse = DOMBuilder.markSafe(response);
   >>> P("Valued customer: ", safeResponse).toString()
   "<p>Valued customer: <span style="font-family: Comic Sans MS">Your money is safe with us!</span></p>"
   >>> P("Valued customer: ", tasteFilter(safeResponse)).toString()
   "<p>Valued customer: &lt;span style=&quot;font-family: Verdana&quot;&gt;Your money is safe with us!&lt;/span&gt;</p>"