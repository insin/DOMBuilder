HTML mode
=========

.. versionadded:: 1.2

The DOMBuilder API can also be used to generate HTML. The type of output it
generates is controlled by the :js:attr:`DOMBuilder.mode` attribute.

.. js:attribute:: DOMBuilder.mode

   Determines which kind of objects :js:func:`DOMBuilder.createElement`
   will create.

   The allowable values are:

   +-------------+--------------------------------------------------------------------------+
   | Value       | Output                                                                   |
   +=============+==========================================================================+
   | ``"DOM"``   | DOM Elements (default value)                                             |
   +-------------+--------------------------------------------------------------------------+
   | ``"HTML"``  | :js:class:`DOMBuilder.HTMLElement` objects which ``toString()`` to HTML4 |
   +-------------+--------------------------------------------------------------------------+
   | ``"XHTML"`` | :js:class:`DOMBuilder.HTMLElement` objects which ``toString()`` to XHTML |
   +-------------+--------------------------------------------------------------------------+

To change to HTML mode, set :js:attr:`DOMBuilder.mode` to the appropriate
type of HTML output you want and use DOMBuilder as normal.

.. _mock-dom-objects:

Node.js Support
~~~~~~~~~~~~~~~

DOMBuilder can be imported as a `Node.js`_ module, in which case it
defaults to HTML mode.

A `Node Package Manager`_ package is not currently available, but after
checking out DOMBuilder from GitHub and addding its path to NODE_PATH,
you can import it like so::

   var DOMBuilder = require('DOMBuilder');

.. _`Node.js`: http://nodejs.org
.. _`Node Package Manager`: http://npmjs.org/

Mock DOM Objects
~~~~~~~~~~~~~~~~

In HTML mode, DOMBuilder will create mock DOM objects which implement a
small subset of the `Node interface`_ operations available on their real
counterparts. Calling ``toString()`` on these objects will produce the
appropriate type of HTML based on the mode at the time they and their
contents were created.

With foreknowledge of the available operations (and `requests for
additional operations`_ which would be useful), it's possible to write
complex content creation code which works seamlessly in both DOM and HTML
modes.

.. _`Node interface`: http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-1950641247
.. _`requests for additional operations`: https://github.com/insin/DOMBuilder/issues

Mock Elements
#############

In HTML mode, element creation functions and :js:func:`DOMBuilder.createElement`
will create :js:class:`DOMBuilder.HTMLElement` objects.

.. js:class:: DOMBuilder.HTMLElement(tagName[, attributes[, childNodes]])

   A representation of a DOM Element, its attributes and child nodes.

   Arguments are as per :js:func:`DOMBuilder.createElement`.

   .. versionchanged:: 1.3
      Renamed from "Tag" to "HTMLElement"

.. js:function:: DOMBuilder.HTMLElement.appendChild(node)

   Adds to the list of child nodes, for cases where the desired structure
   cannot be built up at creation time.

   .. versionchanged:: 1.3
      Appending a :js:class:`DOMBuilder.HTMLFragment` will append its
      child nodes instead and clear them from the fragment.

.. js:function:: DOMBuilder.HTMLElement.cloneNode(deep)

   Clones the element and its attributes - if deep is ``true``, its child
   nodes will also be cloned.

   .. versionadded:: 1.3
      Added to support cloning by an :js:class:`DOMBuilder.HTMLFragment`.

.. js:function:: DOMBuilder.HTMLElement.toString([trackEvents])

   Creates a ``String`` containing the HTML representation of the element
   and its children. By default, any ``String`` children will be escaped to
   prevent the use of sensitive HTML characters - see the `Escaping`_
   section for details on controlling escaping.

   If ``true`` is passed as an argument and any event handlers are found
   in this object's attributes during HTML generation, this method will
   ensure the element has an ``id`` attribute so the handlers can be
   registered after the element has been inserted into the document via
   ``innerHTML``.

   If neccessary, a unique id will be generated.

   .. versionchanged:: 1.4
      Added the optional ``trackEvents`` argument to support registration
      of event handlers post-insertion.

.. js:function:: DOMBuilder.HTMLElement.addEvents()

   If event attributes were found when ``toString(true)`` was called, this
   method will attempt to retrieve a DOM Element with this element's ``id``
   attribute, attach event handlers to it and call
   ``addEvents()`` on any HTMLElement children.

   .. versionadded:: 1.4

.. js:function:: DOMBuilder.HTMLElement.insertWithEvents(element)

   Convenience method for generating and inserting HTML into the given
   DOM Element and registering event handlers.

   .. versionadded:: 1.4

Mock Fragments
##############

.. versionadded:: 1.3

In HTML mode, :js:func:`DOMBuilder.fragment` will create
:js:class:`DOMBuilder.HTMLFragment` objects which mimic the behaviour of
DOM DocumentFragments when appended to another fragment or a
:js:class:`DOMBuilder.HTMLElement`.

.. js:class:: DOMBuilder.HTMLFragment([childNodes])

   A representation of a DOM DocumentFragment and its child nodes.

   :param Array childNodes: initial child nodes

.. js:function:: DOMBuilder.HTMLFragment.appendChild(node)

   Adds to the list of child nodes - appending another fragment will
   append its child nodes and clear them from the fragment.

.. js:function:: DOMBuilder.HTMLFragment.cloneNode(deep)

   Clones the fragment - there's no point calling this *without* passing in
   ``true``, as you'll just get an empty fragment back, but that's the API.

.. js:function:: DOMBuilder.HTMLFragment.toString([trackEvents])

   Creates a ``String`` containing the HTML representation of the
   fragment's children.

   .. versionchanged:: 1.4
      If the ``trackEvents`` argument is provided, it will be passed on
      to any child HTMLElements when their :js:func:`DOMBuilder.HTMLElement.toString`
      method is called.

.. js:function:: DOMBuilder.HTMLFragment.addEvents()

   Calls :js:func:`DOMBuilder.HTMLElement.addEvents` on any
   HTMLElement children.

   .. versionadded:: 1.4

.. js:function:: DOMBuilder.HTMLFragment.insertWithEvents(element)

   Convenience method for generating and inserting HTML into the given
   DOM Element and registering event handlers.

   .. versionadded:: 1.4

Event Handlers and ``innerHTML``
################################

.. versionadded:: 1.4

In DOM mode, :ref:`event-handlers` specified for an element are registered
when it's being created - these are skipped when generating HTML, as we
would just be inserting the resut of calling ``toString()`` on the event
handling functions, which wouldn't make any sense.

To allow you to use the same code to define event handlers regardless of
which mode you're in, the mock DOM objects support passing in a flag to
their ``toString()`` methods indicating that you'd like to register event
handlers which have been specified at a later time, after you've inserted
the generated HTML into the document using ``innerHTML``::

   var article = DIV({"class":"article"},
      P({id: "para1", click: function() { alert(this.id); }}, "Paragraph 1"),
      P({click: function() { alert(this.id); }}, "Paragraph 2")
   );
   document.getElementById("articles").innerHTML = article.toString(true);

When you pass ``true`` into the ``toString()`` call as above, DOMBuilder
does two things:

1. Looks at the attributes of each element while generating HTML and
   determines if they contain any event handlers, storing a flag in the
   element if this is the case.
2. Ensures the element has an ``id`` attribute if event handlers were
   found. If an ``id`` attribute was not provided, a unique id is
   generated and stored in the element for later use.

This is the HTML which ewsulted from the above code, where you can
see the generated ``id`` attribute in place:

.. code-block:: html

   <div class="article">
     <p id="para1">Paragraph 1</p>
     <p id="__DB1__">Paragraph 2</p>
   </div>

Since we know which elements have event handlers and what their ids are,
we can use that information to fetch the corresponding DOM Elements and
reister the event handlers - you can do just that using
:js:func:`DOMBuilder.HTMLElement.registerEventHandlers()`::

   article.registerEventHandlers();

Now, clicking on either paragraph will result in its id being alerted.

DOMBuilder also provides a bit of sugar for performing these two steps in
a single call, :js:func:`DOMBuilder.HTMLElement.insertWithEvents()`::

    article.insertWithEvents(document.getElementById("articles"));

Temporarily Switching Mode
~~~~~~~~~~~~~~~~~~~~~~~~~~

If you're going to be working with mixed output types, forgetting to reset
:js:attr:`DOMBuilder.mode` would be catastrophic, so DOMBuilder provides
:js:func:`DOMBuilder.withMode` to manage it for you.

.. js:function:: DOMBuilder.withMode(mode, func)

   Calls a function, with :js:attr:`DOMBuilder.mode` set to the given value
   for the duration of the function call, and returns its output.

The following `FireBug`_ console session shows :js:func:`DOMBuilder.withMode` in action::

    >>> function createParagraph() { return P("Bed and", BR(), "BReakfast"); }
    >>> createParagraph().toString() // DOM mode by default
    "[object HTMLParagraphElement]"
    >>> DOMBuilder.withMode("HTML", createParagraph).toString();
    "<p>Bed and<br>BReakfast</p>"
    >>> DOMBuilder.withMode("XHTML", createParagraph).toString();
    "<p>Bed and<br />BReakfast</p>"
    >>> DOMBuilder.withMode("HTML", function() {
    ...     return createParagraph() + " " + DOMBuilder.withMode("XHTML", createParagraph);
    ... })
    "<p>Bed and<br>BReakfast</p> <p>Bed and<br />BReakfast</p>"

.. _Firebug: http://www.getfirebug.com

Escaping
~~~~~~~~

HTML mode was initially introduced with backend use in mind - specifically,
for generating forms and working with user input. As such, autoescaping was
implemented to protect the developer from malicious user input. The same can
still apply on the frontend, so :js:func:`DOMBuilder.HTMLElement.toString`
automatically escapes the following characters in any ``String`` contents it
finds, replacing them with their equivalent HTML entities::

   < > & ' "

If you have a ``String`` which is known to be safe for inclusion without
escaping, pass it through :js:func:`DOMBuilder.markSafe` before adding it
to a :js:class:`DOMBuilder.HTMLElement`.

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

   ``String`` operations performed on a ``String`` which was marked safe will
   produce a ``String`` which is no longer marked as safe.

To avoid accidentally removing safe status from a ``String``, try not to mark it
safe until it's ready for use::

   >>> var response = "<span style=\"font-family: Comic Sans MS\">Your money is safe with us!</span>";
   >>> function tasteFilter(s) { return s.replace(/Comic Sans MS/gi, "Verdana"); }
   >>> var safeResponse = DOMBuilder.markSafe(response);
   >>> P("Valued customer: ", safeResponse).toString()
   "<p>Valued customer: <span style="font-family: Comic Sans MS">Your money is safe with us!</span></p>"
   >>> P("Valued customer: ", tasteFilter(safeResponse)).toString()
   "<p>Valued customer: &lt;span style=&quot;font-family: Verdana&quot;&gt;Your money is safe with us!&lt;/span&gt;</p>"