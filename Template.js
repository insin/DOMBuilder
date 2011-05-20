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

/** Separator used for object lookups. */
var VAR_LOOKUP_SEPARATOR = '.';
/** Separator for specifying multiple variable names to be unpacked. */
var UNPACK_SEPARATOR_RE = /, ?/;
/** RegExp for template variables. */
var VARIABLE_RE = /{{(.*?)}}/;
/** RegExp for trimming whitespace. */
var TRIM_RE = /^\s+|\s+$/g;

/**
 * Thrown when a Variable cannot be resolved.
 */
function VariableNotFoundError(message) {
  Error.call(this, message);
  this.message = message;
}
inheritFrom(VariableNotFoundError, Error);

/**
 * Thrown when expressions cannot be parsed.
 */
function TemplateSyntaxError(message) {
  Error.call(this, message);
  this.message = message;
}
inheritFrom(TemplateSyntaxError, Error);

/**
 * Resolves variables based on a context, supporting object property lookups
 * specified with '.' separators.
 */
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

/**
 * Supports looping over a list obtained from the context, creating new
 * context variables with list contents and calling render on all its
 * contents.
 */
function ForNode(props, contents) {
  for (var prop in props) {
    this.loopVars = prop.split(UNPACK_SEPARATOR_RE);
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

/**
 * Marker for the end of a ForNode, where its contents are specified as
 * siblings to reduce the amount of nesting required.
 */
function EndForNode() { }

function TemplateText(text) {
  this.dynamic = VARIABLE_RE.test(text);
  if (this.dynamic) {
    this.func = this.parse(text);
  } else {
    this.text = text;
  }
}

/**
 * Creates a function which accepts context and performs replacement by
 * variable resolution on the given expression.
 */
TemplateText.prototype.parse = (function() {
  var escapeString = function(s) {
    return s.replace('\\', '\\\\').replace('"', '\\"');
  }
  return function(expr) {
    var code = ['var a = []']
      , bits = expr.split(VARIABLE_RE)
      , l = bits.length
      ;
    for (var i = 0; i < l; i++) {
      if (i % 2) {
        code.push('a.push(Variable("' +
                  escapeString(bits[i].replace(TRIM_RE, '')) +
                  '").resolve(c))');
      } else {
        code.push('a.push("' + escapeString(bits[i]) + '")');
      }
    }
    code.push('return a.join("")');
    console.log(code);
    return new Function('c', code.join(';'));
  };
})();

TemplateText.prototype.render = function(context) {
  return (this.dynamic ? this.func(context) : this.text);
};

/** Convenience method for creating a Variable in a template definition. */
function $var(variable) {
  return new Variable(variable);
}

/** Convenience method for creating a ForNode in a template definition. */
function $for(props) {
  return new ForNode(props, slice.call(arguments, 1));
}

/** Convenience method for creating an EndForNode in a template definition. */
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

// These need to hook into the DOMBuilder API via the introduction of a new
// mode, to be used when instantiating Template objects.
function TemplateElement(tagName, attributes, contents) {
    this.tagName = tagName;
    this.attributes = attributes;
    this.contents = contents;
}
function TemplateFragment(children) {
    this.contents = contents;
}

function TemplateHTMLNode(html) {
   this.html = html;
}

function IfNode(expr, contents) {
    this.expr = expr;
    this.contents = contents;
}

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
function checkDynamicContents(contents) {
  var content
    , l = l = contents.length
    ;
  for (var i = 0; i < l; i++) {
    content = contents[i];

  }
}
function processMarkerNodes(item) {
  // Find these
  // $for/$if, element, element, $endfor/$endif
  // And end up with this
  // $for/$if[contents=[element, element]
}