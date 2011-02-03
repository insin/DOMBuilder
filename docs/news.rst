News for DOMBuilder
===================

Trunk
-----

- Added ``DOMBuilder.elementFunctions`` to hold element creation functions
  instead of creating them every time ``DOMBuilder.apply()`` is called.
  This also allows for the possibility of using a ``with`` statement for
  convenience (not that you should!) instead of adding element creation
  functions to the global scope.

- Added ``DOMBuilder.fragment.map()`` to create contents from a list of
  items using a mapping function and wrap them in a single fragment as
  siblings, negating the need for redundant wrapper elements.

- Fixed issue #5 - added ``HTMLFragment.toString()``.

- Fixed issue #3 - we now append "nodey" contents (anything with a truthy
  ``nodeType``) directly and coerce everything else to ``String`` when
  appending child nodes, rather than checking for types which should be
  coerced to ``String`` and appending everything else directly.

- Bit the bullet and switched to using jQuery for element creation and
  more. DOMBuilder now depends on jQuery >= 1.4.

- Fixed issue #2 - nested ``Array`` objects in child arguments to
  ``DOMBuilder.createElement()`` and ``DOMBuilder.fragment()`` are now
  flattened.

- Extracted ``HTMLNode`` base class to contain common logic from
  ``HTMLElement`` and ``HTMLFragment``.

- Renamed ``Tag`` to ``HTMLElement``.

- ``DOMBuilder.fragment`` now works in HTML mode -
  ``DOMBuilder.HTMLFragment`` objects lightly mimic the ``DocumentFragment``
  API.

- Added ``DOMBuilder.map()`` to create elements based on a list, with an
  optional mapping function to control if and how resulting elements are
  created.

- Added ``DOMBuilder.fragment()``, a utility method for creating and
  populating ``DocumentFragment`` objects.

Version 1.2
-----------

Packaged from revision 23 in Subversion.

- Created Sphinx docs.

- ``Tag`` objects created when in HTML mode now remember which mode was
  active when they were created, as they may not be coerced until a later
  time, when the mode may have changed.

- Added ``DOMBuilder.withMode()`` to switch to HTML mode for the scope of
  a function call.

- Fixed short circuiting in element creation functions and decreased the
  number of checks required to determine which of the 4 supported argument
  combinations the user passed in.

- Attributes are now lowercased when generating HTML.

- ``DOMBuilder.isSafe()`` and ``DOMBuilder.markSafe()`` added as the public
  API for managing escaping of strings when generating HTML.

- Added support for using the DOMBuilder API to generate HTML/XHTML output
  instead of DOM elements. This is an experimental change for using the same
  codebase to generate HTML on the backend and DOM elements on the frontend,
  as is currently being implemented in http://code.google.com/p/js-forms/

Version 1.1
-----------

Packaged from revision 12 in Subversion.

- An ``NBSP`` property is now also added to the context object by
  ``DOMBuilder.apply()``, for convenience.

- ``Boolean`` attributes are now only set if they're ``true``. Added
  items to the demo page to demonstrate that you can now create an
  explicitly unchecked checkbox and an explicity non-multiple select.

- Added more IE workarounds for:

  - Creating multiple selects
  - Creating pre-selected radio and checkbox inputs

Version 1.0
-----------

Packaged from revision 5 in Subversion.

- Added support for passing children to element creation function as an
  `Array``.

- Added more robust support for registering event handlers, including
  cross-browser event handling utility methods and context correction for IE
  when the event handler is fired.

- IE detection is now performed once and once only, using conditional
  compilation rather than user-agent ``String`` inspection.
