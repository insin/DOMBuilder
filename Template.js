var toString = Object.prototype.toString
  , slice = Array.prototype.slice;

function isFunction(o) {
  return (toString.call(o) === "[object Function]");
}

function inheritFrom(child, parent) {
  function F() {};
  F.prototype = parent.prototype;
  child.prototype = new F();
  child.prototype.constructor = child;
}

var VAR_LOOKUP_SEPARATOR = '.';

function VariableNotFoundError(message) {
  Error.call(this, message);
  this.message = message;
}
inheritFrom(VariableNotFoundError, Error);

function Variable(variable) {
  if (!(this instanceof Variable)) return new Variable(variable);
  this.variable = variable;
}

Variable.prototype.resolve = function(context) {
  // First path part is always a context lookup
  var path = this.variable.split(VAR_LOOKUP_SEPARATOR)
    , lookup = path.shift()
    , current = context.get(lookup);
  if (typeof current == 'undefined') {
    throw new VariableNotFoundError('Could not find [' + lookup + '] in ' + context);
  } else if (isFunction(current)) {
    current = current();
  }

  // Any further lookups are against current object properties
  if (path.length) {
    var l = path.length, next;
    for (var i = 0; i < l; i++) {
      lookup = path[i];
      if (typeof current[lookup] == 'undefined') {
        throw new VariableNotFoundError('Could not find [' + lookup + '] in ' + current);
      }
      next = current[lookup];
      // Call methods with the current object as context when we find 'em
      if (isFunction(next)) {
        current = next.call(current);
      } else {
        current = next;
      }
    }
  }

  return current;
}

/**
 * Manages a stack of objects holding template context variables.
 */
function Context(initial) {
  if (!(this instanceof Context)) return new Context(initial);
  this.stack = [initial || {}];
  this._top = this.stack[0];
}

Context.prototype.push = function() {
  this.stack.push({});
  this._top = this.stack[this.stack.length - 1];
};

Context.prototype.pop = function() {
  if (this.stack.length > 1) {
    this.stack.pop();
  }
  this._top = this.stack[this.stack.length - 1];
};

Context.prototype.set = function(name, value) {
  this._top[name] = value;
};

/**
 * Adds multiple items to the current context object, where names and values are
 * provided as lists.
 */
Context.prototype.zip = function(names, values) {
  var top = this.stack[this.stack.length - 1]
    , l = Math.min(names.length, values.length)
    ;
  for (var i = 0; i < l; i++) {
    top[names[i]] = values[i];
  }
};

/**
 * Gets variables, checking all context objects from top to bottom.
 *
 * Returns undefined for variables which are not set, to distinguish from
 * variables which are set, but are null.
 */
Context.prototype.get = function(name) {
  if (this._top.hasOwnProperty(name)) {
    return this._top[name];
  }
  for (var i = this.stack.length - 2; i >= 0; i--) {
    if (this.stack[i].hasOwnProperty(name)) {
      return this.stack[i][name];
    }
  }
  return undefined;
};

var UNPACK_SEP_RE = /, ?/g;

function ForNode(props, contents) {
  for (var prop in props) {
    this.loopVars = prop.split(UNPACK_SEP_RE);
    this.listVar = Variable(props[prop]);
    break;
  }
  this.contents = contents;
}

ForNode.prototype.render = function(context) {
  var list = this.listVar.resolve(context)
    , l = list.length
    , item
    , results = []
    , forloop = {
        counter: 1
      , counter0: 0
      , revcounter: l
      , revcounter0: l - 1
      , first: true
      , last: l === 1
      , parentloop: context.get('forloop')
      };
  context.push();
  context.set('forloop', forloop);
  for (var i = 0; i < l; i++) {
    item = list[i];
    // Set current item(s) in context variable(s)
    if (this.loopVars.length === 1) {
      context.set(this.loopVars[0], item);
    } else {
      context.zip(this.loopVars, item);
    }
    // Update loop status variables
    if (i > 0) {
      forloop.counter++;
      forloop.counter0++;
      forloop.revcounter--;
      forloop.revcounter0--;
      forloop.first = false;
      forloop.last = (i === l - 1);
    }
    // Render contents
    for (var j = 0, k = this.contents.length; j < k; j++) {
      results.push(this.contents[j].render(context));
    }
  }
  context.pop();
  return results;
};

function EndForNode() { }

function $var(variable) {
  return new Variable(variable);
}

function $for(props) {
  return new ForNode(props, slice.call(arguments, 1));
}

function $endfor() {
  return new EndForNode();
}

// WIP -----------------------------------------------------------------------

function Template(props, contents) {
  this.name = props.name;
  this.extends_ = props['extends'];
  this.contents = contents; // TODO Check for dynamic content
}

function Block(name, contents) {
  this.name = name;
  this.contents = contents;
}

var VAR_START = '{{';
var VAR_END = '}}';

// These need to hook into the DOMBuilder API via the introduction of a new
// mode, to be used when instantiating Template objects.
function TemplateElement(tagName, attributes, children) {
    this.tagName = tagName;
    this.attributes = attributes; // TODO Check attributes for dynamic content
    this.children = children; // TODO Check children for dynamic content, convert strings to TemplateText
}
function TemplateFragment(children) {
    this.children = children; // TODO Check children for dynamic content, convert strings to TemplateText
}
function TemplateText(text) {
    this.text = text; // TODO Check for dynamic content
}

function TemplateHTMLNode(html) {
   this.text = text; // TODO Check for dynamic content
}

function IfNode(props, contents) { }

function EndIfNode() { }

// Template convenience functions
function $template(props) {
  return new Template(props, slice.call(arguments, 1));
}

function $block(name) {
  return new Block(name, slice.call(arguments, 1));
}

function $if(props) {
  return new IfNode(props, slice.call(arguments, 1));
}

function $endif() {
  return new EndIfNode();
}

function $html(contents) {
  return new RawHTMLNode(contents);
}

// Helper functions
function processMarkerNodes(item) {
  // Find these
  // $for/$if, element, element, $endfor/$endif
  // And end up with this
  // $for/$if[contents=[element, element]
}