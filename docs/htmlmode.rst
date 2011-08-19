=========
HTML Mode
=========

HTML mode provides an output mode which generates :js:class:`MockElement`
objects from :js:func:`DOMBuilder.createElement` calls and
:js:class:`MockFragment` objects from :js:func:`DOMBuilder.fragment` calls.

The HTML mode API is exposed through ``DOMBuilder.modes.html.api``.

Mode-specific element and convenience functions are exposed through
:js:attr:`DOMBuilder.html`.

.. js:attribute:: DOMBuilder.html

   Contains element functions which always create :ref:`mock-dom-objects` (which
   ``toString()`` to HTML) and convenience functions related to
   :ref:`html-escaping`.

   .. versionadded:: 2.0

.. _mock-dom-objects:

Mock DOM Objects
================

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

HTMLNode
--------

The base constructor for mock DOM objects implements the following
subset of the Node interface.

.. js:class:: HTMLNode([childNodes])

   Creates an HTMLNode with a list of initial childNodes - this
   constructor should only be called by child constructors which are
   inheriting from it.

   :param Array childNodes: initial child nodes

   **Attributes:**

   .. js:attribute:: HTMLNode.firstChild

      This node's first child node, or ``null`` if it has no child nodes.

      .. versionadded:: 2.1

   .. js:attribute:: HTMLNode.childNodes

      This node's child nodes.

   **Methods::**

   .. js:function:: HTMLNode.appendChild(node)

      Adds to the list of child nodes, for cases where the desired structure
      cannot be built up at creation time.

      Appending a :js:class:`MockFragment` will append its child nodes
      instead and clear them from the fragment.

      .. versionadded:: 1.3
         Added :js:class:`MockFragment` appending behaviour.

   .. js:function:: HTMLNode.cloneNode(deep)

      Clones the element and its attributes - if deep is ``true``, its child
      nodes will also be cloned.

      .. versionadded:: 1.3
         Added to support cloning by a :js:class:`MockFragment`.

   .. js:function:: HTMLNode.hasChildNodes()

      Returns ``true`` if this node has any child nodes.

      .. versionadded:: 2.1

   .. js:function:: HTMLNode.removeChild(childNode)

      Removes the given child Node from this Node and returns it.

      Throws an exception if the given node was not one of this node's
      children.

      .. versionadded:: 2.1

Mock Elements
-------------

.. js:class:: MockElement(tagName[, attributes[, childNodes]])

   A representation of a DOM Element, its attributes and child nodes.

   Arguments are as per :js:func:`DOMBuilder.createElement`.

   .. versionchanged:: 2.0
      Renamed from "HTMLElement" to "MockElement"

   .. js:function:: MockElement.toString([trackEvents])

      Creates a ``String`` containing the HTML representation of the element
      and its children. By default, any ``String`` children will be escaped to
      prevent the use of sensitive HTML characters - see the `HTML Escaping`_
      section for details on controlling escaping.

      If ``true`` is passed as an argument and any event handlers are found
      in this object's attributes during HTML generation, this method will
      ensure the element has an ``id`` attribute so the handlers can be
      registered after the element has been inserted into the document via
      ``innerHTML``.

      If necessary, a unique id will be generated.

      .. versionchanged:: 1.4
         Added the optional ``trackEvents`` argument to support registration
         of event handlers post-insertion.

   .. js:function:: MockElement.addEvents()

      If event attributes were found when ``toString(true)`` was called, this
      method will attempt to retrieve a DOM Element with this element's ``id``
      attribute, attach event handlers to it and call
      ``addEvents()`` on any MockElement children.

      .. versionadded:: 1.4

   .. js:function:: MockElement.insertWithEvents(element)

      Convenience method for generating and inserting HTML into the given
      DOM Element and registering event handlers.

      .. versionadded:: 1.4

Mock Fragments
--------------

.. versionadded:: 1.3

In HTML mode, :js:func:`DOMBuilder.fragment` will create
:js:class:`MockFragment` objects which mimic the behaviour of
DOM DocumentFragments when appended to another fragment or a
:js:class:`MockElement`.

.. js:class:: MockFragment([childNodes])

   A mock representation of a DOM DocumentFragment and its child nodes.

   .. versionchanged:: 2.0
      Renamed from "HTMLFragment" to "MockFragment"

   :param Array childNodes: initial child nodes

   .. js:function:: MockFragment.toString([trackEvents])

      Creates a ``String`` containing the HTML representation of the
      fragment's children.

      .. versionchanged:: 1.4
         If the ``trackEvents`` argument is provided, it will be passed on
         to any child MockElements when their :js:func:`MockElement.toString`
         method is called.

   .. js:function:: MockFragment.addEvents()

      Calls :js:func:`MockElement.addEvents` on any
      MockElement children.

      .. versionadded:: 1.4

   .. js:function:: MockFragment.insertWithEvents(element)

      Convenience method for generating and inserting HTML into the given
      DOM Element and registering event handlers.

      .. versionadded:: 1.4

.. _event-handlers-innerhtml:

Event Handlers and ``innerHTML``
================================

.. versionadded:: 1.4

In DOM mode, :ref:`event-handlers` specified for an element are registered
when it's being created - these are skipped when generating HTML, as we
would just be inserting the result of calling ``toString()`` on the event
handling functions, which wouldn't make any sense.

To allow you to use the same code to define event handlers regardless of
which mode you're in, the mock DOM objects support passing in a flag to
their ``toString()`` methods indicating that you'd like to register event
handlers which have been specified at a later time, after you've inserted
the generated HTML into the document using ``innerHTML``::

   var article = html.DIV({"class":"article"},
      html.P({id: "para1", click: function() { alert(this.id) }}, "Paragraph 1"),
      html.P({click: function() { alert(this.id) }}, "Paragraph 2")
   )
   document.getElementById("articles").innerHTML = article.toString(true)

When you pass ``true`` into the ``toString()`` call as above, DOMBuilder
does two things:

1. Looks at the attributes of each element while generating HTML and
   determines if they contain any event handlers, storing a flag in the
   element if this is the case.
2. Ensures the element has an ``id`` attribute if event handlers were
   found. If an ``id`` attribute was not provided, a unique id is
   generated and stored in the element for later use.

This is the HTML which resulted from the above code, where you can
see the generated ``id`` attribute in place:

.. code-block:: html

   <div class="article">
     <p id="para1">Paragraph 1</p>
     <p id="__DB1__">Paragraph 2</p>
   </div>

Since we know which elements have event handlers and what their ids are,
we can use that information to fetch the corresponding DOM Elements and
register the event handlers - you can do just that using
:js:func:`MockElement.addEvents()`::

   article.addEvents()

Now, clicking on either paragraph will result in its id being alerted.

DOMBuilder also provides a bit of sugar for performing these two steps in
a single call, :js:func:`MockElement.insertWithEvents()`::

    article.insertWithEvents(document.getElementById("articles"))

.. _html-escaping:

HTML Escaping
=============

HTML mode was initially introduced with backend use in mind - specifically,
for generating forms and working with user input. As such, autoescaping was
implemented to protect the developer from malicious user input. The same can
still apply on the frontend, so :js:func:`MockElement.toString`
automatically escapes the following characters in any ``String`` contents it
finds, replacing them with their equivalent HTML entities::

   < > & ' "

If you have a ``String`` which is known to be safe for inclusion without
escaping, pass it through :js:func:`DOMBuilder.html.markSafe` before adding it
to a :js:class:`MockElement`.

.. js:function:: DOMBuilder.html.markSafe(value)

   :param String value: A known-safe string.
   :returns: A ``SafeString`` object.

There is also a corresponding method to determine if a ``String`` is
already marked as safe.

.. js:function:: DOMBuilder.html.isSafe(value)

   :returns: ``true`` if the given ``String`` is marked as safe, ``false``
       otherwise.

Assuming we're in HTML mode, this example shows how autoescaping deals with
malicious input::

   >>> var input = "<span style=\"font-size: 99999px;\" onhover=\"location.href='whereveriwant'\">Free money!</span>"
   >>> P("Steve the dog says: ", input).toString()
   "<p>Steve the dog says: &lt;span style=&quot;font-size: 99999px;&quot; onhover=&quot;location.href=&#39;whereveriwant&#39;&quot;&gt;Free money!&lt;/span&gt;</p>"

But say you have a ``String`` containing HTML which you trust and do want to
render, like a status message you've just created, or an ``XMLHTTPRequest``
response::

   >>> var html = DOMBuilder.html
   >>> var response = 'You have <strong>won the internet!</strong>'
   >>> html.P('According to our experts: ', response).toString()
   '<p>According to our experts: You have &lt;strong&gt;won the internet!&lt;/strong&gt;</p>'
   >>> html.P('According to our experts: ', html.markSafe(response)).toString()
   '<p>According to our experts: You have <strong>won the internet!</strong></p>'

.. warning::

   ``String`` operations performed on a ``String`` which was marked safe will
   produce a ``String`` which is no longer marked as safe.

To avoid accidentally removing safe status from a ``String``, try not to mark it
safe until it's ready for use::

   >>> var response = '<span style="font-family: Comic Sans MS">Your money is safe with us!</span>'
   >>> function tasteFilter(s) { return s.replace(/Comic Sans MS/gi, 'Verdana') }
   >>> var safeResponse = html.markSafe(response)
   >>> html.P('Valued customer: ', safeResponse).toString()
   '<p>Valued customer: <span style="font-family: Comic Sans MS">Your money is safe with us!</span></p>'
   >>> html.P('Valued customer: ', tasteFilter(safeResponse)).toString()
   '<p>Valued customer: &lt;span style=&quot;font-family: Verdana&quot;&gt;Your money is safe with us!&lt;/span&gt;</p>'
