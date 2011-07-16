========
DOM Mode
========

DOM mode provides an output mode which generates DOM Elements from
:js:func:`DOMBuilder.createElement` calls and DOM DocumentFragments from
:js:func:`DOMBuilder.fragment` calls.

The DOM mode API is exposed through ``DOMBuilder.modes.dom.api``.

Mode-specific element functions are exposed through :js:attr:`DOMBuilder.dom`.

.. js:attribute:: DOMBuilder.dom

   Element functions which will always create DOM Element output.

   .. versionadded:: 2.0

Attributes
==========

Some attributes are given special treatment based on their name.

.. _event-handlers:

Event Handlers
--------------

Event handlers can be specified by supplying an event name as one of the
element's attributes and an event handling function as the corresponding
value. Any of the following events can be registered in this manner:

+----------------------------------------------------------------------+
| Event Names                                                          |
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
be used for event handler registration if jQuery is available, otherwise
legacy event registration will be used.

For example, the following will create a text input which displays a default
value, clearing it when the input is focused and restoring the default if
the input is left blank::

   var defaultInput =
       el.INPUT({
           type: 'text', name: 'email'
         , value: 'email@host.com', defaultValue: 'email@host.com'
         , focus: function() {
             if (this.value == this.defaultValue) {
               this.value = ''
             }
           }
         , blur: function() {
             if (this.value == '') {
               this.value = this.defaultValue
             }
           }
         }
       )

.. _`events which have jQuery shortcut methods`: http://api.jquery.com/category/events/

Other 'Special' Attributes
--------------------------

Other attributes which trigger special handling or explicit compatibility
handling between DOM and HTML modes.

``innerHTML``
   If you specify an ``innerHTML`` attribute, the given String will be the
   sole source used to provide the element's contents, even if you pass more
   contents in as arguments.

   * In DOM mode, the element's ``innerHTML`` property will be set and no
     further children will be appended, even if given.
   * In HTML mode, the given HTML will be used, unescaped, as the
     element's contents.

.. _document-fragments:

Document Fragments
==================

A `DOM DocumentFragment`_ is a lightweight container for elements which
allows you to append its entire contents with a single call to the
destination element's ``appendChild()`` method.

If you're thinking of adding a wrapper ``<div>`` solely to be able to
insert a number of sibling elements at the same time, a
DocumentFragment will do the same job without the need for the redundant
element. This single append functionality also makes it a handy container
for content which needs to be inserted repeatedly, calling
``cloneNode(true)`` for each insertion.

DOMBuilder provides a :js:func:`DOMBuilder.fragment` wrapper function,
which allows you to pass all the contents you want into a DocumentFragment
in one call, and also allows you make use of this functionality in HTML
mode by creating equivalent :ref:`mock-dom-objects` as appropriate. This
will allow you to, for example, unit test functionality you've written
which makes use of DocumentFragment objects by using HTML mode to verify
output against HTML strings, rather than against DOM trees.

See http://ejohn.org/blog/dom-documentfragments/ for more information about
DocumentFragment objects.

.. _`DOM DocumentFragment`: http://www.w3.org/TR/REC-DOM-Level-1/level-one-core.html#ID-B63ED1A3

Mapping Fragments
-----------------

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

For example, with a `newforms`_ ``FormSet`` object, which contains multiple
``Form`` objects. If you wanted to generate a heading and a table for each
form object and have the whole lot sitting side-by-side in the document::

   var formFragment = DOMBuilder.fragment.map(formset.forms, function(form, loop) {
     return [
       H2('Widget ' + (loop.index + 1)),
       TABLE(TBODY(
         TR.map(form.boundFields(), function(field) {
           return [TH(field.labelTag()), TD(field.asWidget())]
         })
       ))
     ]
   })

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

.. _`newforms`: https://github.com/insin/newforms
