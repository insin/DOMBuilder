DOMBuilder takes some of the pain out of programatically creating DOM
Elements and HTML in JavaScript, providing element creation functions
which give you a more declarative, compact API to work with when creating
content in code.

Version 1.4 released on 13th February 2011
==========================================

`v1.4 documentation at readthedocs.org`_.

Significant changes in this release:

**DOM mode**:

- `jQuery`_ (>= 1.4) is no longer a dependency, but will be used for
  creating elements/setting attributes/adding event listeners when
  present; otherwise, DOMBuilder implements a less comprehensive set of
  cross-browser workarounds.

**HTML mode**:

- `Event listeners can now be added in HTML mode`_ using the same API as DOM
  mode - a new ``insertWithEvents`` method takes care of doing all the
  work for you if you want to try using the same code in HTML mode in case
  there's a performance boost to be had.

- Fixed HTML escaping bugs: attribute names and unknown tag names are now
  escaped.

.. _`v1.4 documentation at readthedocs.org`: http://readthedocs.org/docs/dombuilder/en/1.4/index.html
.. _`jQuery`: http://jquery.com
.. _`Event listeners can now be added in HTML mode`: http://readthedocs.org/docs/dombuilder/en/1.4/htmlmode.html#event-handlers-and-innerhtml

Basic usage
-----------

Use ``DOMBuilder.apply()`` to add element creation functions to a context
object. A function will be added for each HTML tag, with its name being
the tag name in upper case. If you don't pass in a context object, one
will be created for you.

Element creation functions take an (optional) ``Object`` specifying element
attributes and as many additional arguments as you like specifying element
contents.

For example, the following code::

   var html = DOMBuilder.apply();
   var article =
     html.DIV({"class": "article"},
       html.H2("Article title"),
       html.P("Paragraph one"),
       html.P("Paragraph two")
     );

...will produce a DOM element corresponding to the following HTML::

   <div class="article">
     <h2>Article title</h2>
     <p>Paragraph one</p>
     <p>Paragraph two</p>
   </div>

For convenience, you may want to create the utility methods in the global
scope, which is done like so::

   DOMBuilder.apply(window);
   var article =
     DIV({"class": "article"},
       H2("Article title"),
       P("Paragraph one"),
       P("Paragraph two")
     );

Map functions make it a breeze to work with lists of items::

   var headers = ["One", "Two", "Three"];
   var rows = [["1.1", "1.2", "1.3"], ["2.1", "2.2", "2.3"]];
   var table =
     TABLE({"class": "data"},
       THEAD(TR(TH.map(headers))),
       TBODY(
         TR.map(rows, function(cells, attrs, index) {
           attrs["class"] = (index % 2 == 0 ? "odd" : "even");
           return TD.map(cells);
         })
       )
     );

...which is equivalent to::

   <table class="data">
   <thead>
     <tr>
       <th>One</th><th>Two</th><th>Three</th>
     </tr>
   </thead>
   <tbody>
     <tr class="odd">
       <td>1.1</td><td>1.2</td><td>1.3</td>
     </tr>
     <tr class="even">
       <td>2.1</td><td>2.2</td><td>2.3</td>
     </tr>
   </tbody>
   </table>

`Read the documentation to find out more...`_

.. _`Read the documentation to find out more...`: http://readthedocs.org/docs/dombuilder/en/1.4/index.html

Benefits of multiple output modes
---------------------------------

`js-forms`_ uses DOMBuilder for all its content creation. Due to
DOMBuilder's multiple `output modes`_, this means js-forms' form
generation and validation will be usable in the browser and on the
backend, using largely the same codebase. Examples of current usage of
DOMBuilder:

* `js-forms Demo Page`_ - all form elements are created in DOM mode.

* `js-forms Unit Tests`_ - unit tests take advantage of HTML mode to more
  easily validate what's being created.

* `Akshell`_ has ported js-forms and DOMBuilder for use as its backend
  `form-handling library`_.

.. _`js-forms`: https://github.com/js-forms/
.. _`output modes`: http://readthedocs.org/docs/dombuilder/en/latest/htmlmode.html#DOMBuilder.mode
.. _`js-forms Demo Page`: http://jonathan.buchanan153.users.btopenworld.com/js-forms/demo.html
.. _`js-forms Unit Tests`: http://jonathan.buchanan153.users.btopenworld.com/js-forms/tests.html
.. _`Akshell`: http://www.akshell.com
.. _`form-handling library`: http://www.akshell.com/apps/form/
