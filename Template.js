var toString = Object.prototype.toString
  , slice = Array.prototype.slice
  ;

function isFunction(o) {
  return (toString.call(o) === "[object Function]");
}

function isString(o) {
  return (toString.call(o) === "[object String]");
}

function inheritFrom(child, parent) {
  function F() {};
  F.prototype = parent.prototype;
  child.prototype = new F();
  child.prototype.constructor = child;
}

function lookup(a) {
  var obj = {}
    , l = a.length
    ;
  for (var i = 0; i < l; i++) {
    obj[a[i]] = true;
  }
  return obj;
}

function escapeString(s) {
  return s.replace('\\', '\\\\').replace('"', '\\"');
}

// Template lookup
var templates = {};

/** Separator used for object lookups. */
var VAR_LOOKUP_SEPARATOR = '.';
/** Separator for specifying multiple variable names to be unpacked. */
var UNPACK_SEPARATOR_RE = /, ?/;
/** RegExp for template variables. */
var VARIABLE_RE = /{{(.*?)}}/;
/** RegExp for trimming whitespace. */
var TRIM_RE = /^\s+|\s+$/g;
/** Context key for block inheritance context. */
var BLOCK_CONTEXT_KEY = 'blockContext';

// Exceptions ------------------------------------------------------------------

/**
 * Thrown when pop() is called too many times on a Context.
 */
function ContextPopError() {
  this.message = 'pop() was called more times than push()';
}
inheritFrom(ContextPopError, Error);

/**
 * Thrown when a Variable cannot be resolved.
 */
function VariableNotFoundError(message) {
  this.message = message;
}
inheritFrom(VariableNotFoundError, Error);

/**
 * Thrown when expressions cannot be parsed or orherwise invalid contents are
 * detected.
 */
function TemplateSyntaxError(message) {
  this.message = message;
}
inheritFrom(TemplateSyntaxError, Error);

/**
 * Thrown when a named template cannot be found.
 */
function TemplateNotFoundError(message) {
  this.message = message;
}
inheritFrom(TemplateNotFoundError, Error);

// Context ---------------------------------------------------------------------

/**
 * Resolves variable expressions based on a context, supporting object property
 * lookups specified with '.' separators.
 */
function Variable(expr) {
  this.expr = expr;
}

Variable.prototype.resolve = function(context) {
  // First lookup is in the context
  var bits = this.expr.split(VAR_LOOKUP_SEPARATOR)
    , bit = bits.shift()
    , current = context.get(bit)
    ;
  if (!context.hasKey(bit)) {
    throw new VariableNotFoundError('Could not find [' + bit +
                                    '] in ' + context);
  } else if (isFunction(current)) {
    current = current();
  }

  // Any further lookups are against current object properties
  if (bits.length) {
    var l = bits.length
      , next
      ;
    for (var i = 0; i < l; i++) {
      bit = bits[i];
      if (current === null ||
          current === undefined ||
          typeof current[bit] == 'undefined') {
        throw new VariableNotFoundError('Could not find [' + bit +
                                        '] in ' + current);
      }
      next = current[bit];
      // Call functions with the current object as context
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
 * Manages a stack of objects holding template context variables and rendering
 * context.
 */
function Context(initial) {
  if (!(this instanceof Context)) return new Context(initial);
  this.stack = [initial || {}];
  this.renderContext = new RenderContext();
}

Context.prototype.push = function(context) {
  this.stack.push(context || {});
};

Context.prototype.pop = function() {
  if (this.stack.length == 1) {
    throw new ContextPopError();
  }
  return this.stack.pop();
};

Context.prototype.set = function(name, value) {
  this.stack[this.stack.length - 1][name] = value;
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
Context.prototype.get = function(name, d) {
  for (var i = this.stack.length - 1; i >= 0; i--) {
    if (this.stack[i].hasOwnProperty(name)) {
      return this.stack[i][name];
    }
  }
  return d !== undefined ? d : null;
};

/**
 * Determine if a particular key is set in the context.
 */
Context.prototype.hasKey = function(name) {
  for (var i = 0, l = this.stack.length; i < l; i++) {
    if (this.stack[i].hasOwnProperty(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Convenience method for calling render() on a list of content items
 * with this context.
 */
Context.prototype.render = function(contents) {
  var results = [];
  for (var i = 0, l = contents.length; i < l; i++) {
    if (isString(contents[i])) {
      results.push(contents[i]);
    } else {
      results.push(contents[i].render(this));
    }
  }
  return results;
};

function RenderContext(initial) {
  this.stack = [initial || {}];
}
inheritFrom(RenderContext, Context);

RenderContext.prototype.get = function(name, d) {
  var top = this.stack[this.stack.length - 1];
  if (top.hasOwnProperty(name)) {
    return top[name];
  }
  return d !== undefined ? d : null;
};

RenderContext.prototype.hasKey = function(name) {
  return this.stack[this.stack.length - 1].hasOwnProperty(name);
};

function BlockContext() {
  this.blocks = {} // FIFO queues by block name
}

BlockContext.prototype.addBlocks = function(blocks) {
  for (var name in blocks) {
    if (typeof this.blocks[name] != 'undefined') {
      this.blocks[name].unshift(blocks[name]);
    } else {
      this.blocks[name] = [blocks[name]];
    }
  }
};

BlockContext.prototype.push = function(name, block) {
  this.blocks[name].push(block);
};

BlockContext.prototype.pop = function(name) {
  if (typeof this.blocks[name] != 'undefined' &&
      this.blocks[name].length) {
    return this.blocks[name].pop();
  }
  return null;
};

BlockContext.prototype.getBlock = function(name) {
  if (typeof this.blocks[name] != 'undefined') {
    var blocks = this.blocks[name];
    if (blocks.length) {
      return blocks[blocks.length - 1];
    }
  }
  return null;
};

// Template --------------------------------------------------------------------

function findNodesByType(contents, nodeType) {
  var nodes = []
    , l = contents.length
    , node
    ;
  for (var i = 0; i < l; i++) {
    node = contents[i];
    if (node instanceof nodeType) {
      nodes.push(node);
    }
    if (node instanceof TemplateNode && typeof node.contents != 'undefined') {
      nodes.push.apply(nodes, findNodesByType(node.contents, nodeType));
    }
  }
  return nodes;
}

function blockLookup(blocks) {
  var lookup = {}
    , block
    ;
  for (var i = 0; block = blocks[i]; i++) {
    if (typeof lookup[block.name] != 'undefined') {
      throw new TemplateSyntaxError("Block with name '" + block.name +
                                    "' appears more than once.");
    }
    lookup[block.name] = block;
  }
  return lookup;
}

function Template(props, contents) {
  this.name = props.name;
  this.extends_ = props['extends'] || null;
  this.contents = contents;
  this.blocks = blockLookup(findNodesByType(contents, BlockNode));
  templates[this.name] = this;
}

/**
 * Creates a new rendering context and renders the template.
 */
Template.prototype.render = function(context) {
  context.renderContext.push();
  try {
    return this._render(context);
  }
  finally {
    context.renderContext.pop();
  }
};

/**
 * Rendering implementation - adds blocks to rendering context and either calls
 * render on a parent template, or renders contents if this is a top-level
 * template.
 */
Template.prototype._render = function(context) {
  if (!context.renderContext.hasKey(BLOCK_CONTEXT_KEY)) {
    context.renderContext.set(BLOCK_CONTEXT_KEY, new BlockContext());
  }
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY);
  blockContext.addBlocks(this.blocks);
  if (this.extends_) {
    if (typeof templates[this.extends_] == 'undefined') {
      throw new TemplateNotFoundError("Could not find template named '" +
                                      this.extends_ + '"');
    }
    // Call _render directly to add to the current render context
    return templates[this.extends_]._render(context);
  } else {
    // Top-level template - render contents
    return DOMBuilder.fragment(context.render(this.contents));
  }
};

// Template Nodes --------------------------------------------------------------

/**
 * Base for template content nodes.
 */
function TemplateNode() {}

/**
 * A named section which may be overridden by child templates.
 */
function BlockNode(name, contents) {
  this.name = isString(name) ? name : name.name;
  this.contents = contents;
}
inheritFrom(BlockNode, TemplateNode);

BlockNode.prototype.render = function(context) {
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY)
    , results, push, block
    ;
  context.push();
  if (blockContext === null) {
    context.set('block', this);
    results = context.render(this.contents);
  } else {
    push = block = blockContext.pop(this.name);
    if (block === null) {
      block = this;
    }
    block = new BlockNode(block.name, block.contents);
    block.context = context;
    context.set('block', block);
    results = context.render(block.contents);
    if (push !== null) {
      blockContext.push(this.name, push);
    }
  }
  context.pop();
  return results;
}

BlockNode.prototype['super'] = function(context) {
  var renderContext = this.context.renderContext;
  if (renderContext.hasKey(BLOCK_CONTEXT_KEY) &&
      renderContext.get(BLOCK_CONTEXT_KEY).getBlock(this.name) !== null) {
    return this.render(this.context);
  }
  return '';
}

/**
 * An HTML element and its contents.
 */
function ElementNode(tagName, attributes, contents) {
  this.tagName = tagName;
  this.attributes = attributes;
  this.contents = contents;
}
inheritFrom(ElementNode, TemplateNode);

ElementNode.prototype.render = function(context) {
  return DOMBuilder.createElement(this.tagName,
                                  this.attributes,
                                  context.render(this.contents));
}

/**
 * Supports looping over a list obtained from the context, creating new
 * context variables with list contents and calling render on all its
 * contents.
 */
function ForNode(props, contents) {
  for (var prop in props) {
    this.loopVars = prop.split(UNPACK_SEPARATOR_RE);
    this.listVar = new Variable(props[prop]);
    break;
  }
  this.contents = contents;
}
inheritFrom(ForNode, TemplateNode);

ForNode.prototype.render = function(context) {
  var list = this.listVar.resolve(context)
    , results = []
    , forloop = {parentloop: context.get('forloop', {})}
    , l = list.length
    , item
    ;
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
    forloop.counter = i + 1;
    forloop.counter0 = i;
    forloop.revcounter = l - i;
    forloop.revcounter0 = l - i - 1;
    forloop.first = (i === 0);
    forloop.last = (i === l - 1);
    // Render contents
    results.push.apply(results, context.render(this.contents));
  }
  context.pop();
  return results;
};

/**
 * Executes a boolean test using variables obtained from the context,
 * calling render on all its if the result is true.
 */
function IfNode(expr, contents) {
  if (isFunction(expr)) {
    this.test = expr;
  } else {
    this.test = this.parse(expr);
  }
  this.contents = contents;
}
inheritFrom(IfNode, TemplateNode);

IfNode.prototype.parse = (function() {
  var ops = lookup('( ) && || == === <= < >= > != !== !! !'.split(' '))
    , opsRE = /(\(|\)|&&|\|\||={2,3}|<=|<|>=|>|!={1,2}|!{1,2})/
    , numberRE = /^-?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
    , quotes = lookup(['"', "'"])
    , isQuotedString = function(s) {
        var q = s.charAt(0);
        return (s.length > 1 &&
                typeof quotes[q] != 'undefined' &&
                s.lastIndexOf(q) == s.length - 1);
      }
    ;
  return function(expr) {
    var code = ['return (']
      , bits = expr.split(opsRE)
      , l = bits.length
      , bit
      ;
    for (var i = 0; i < l; i++) {
      bit = bits[i];
      if (typeof ops[bit] != 'undefined') {
        code.push(bit);
      } else {
        bit = bit.replace(TRIM_RE, '');
        if (bit) {
          if (numberRE.test(bit) || isQuotedString(bit)) {
            code.push(bit);
          } else {
            code.push('new Variable("' + escapeString(bit) + '").resolve(c)');
          }
        }
      }
    }
    code.push(');');
    try {
      return new Function('c', code.join(' '));
    } catch (e) {
      throw new TemplateSyntaxError('Invalid $if expression (' + e.message +
                                    '): ' + expr);
    }
  }
})();

IfNode.prototype.render = function(context) {
  if (this.test(context)) {
    return context.render(this.contents);
  }
  return [];
}

/**
 * Wraps static text context and text context which contains template variable
 * definitions to be inserted at render time.
 */
function TextNode(text) {
  this.dynamic = VARIABLE_RE.test(text);
  if (this.dynamic) {
    this.func = this._parseExpr(text);
  } else {
    this.text = text;
  }
}
inheritFrom(TextNode, TemplateNode);

/**
 * Creates a function which accepts context and performs replacement by
 * variable resolution on the given expression.
 */
TextNode.prototype._parseExpr = function(expr) {
  var code = ['var a = []']
    , bits = expr.split(VARIABLE_RE)
    , l = bits.length
    ;
  for (var i = 0; i < l; i++) {
    if (i % 2) {
      code.push('a.push(new Variable("' +
                escapeString(bits[i].replace(TRIM_RE, '')) +
                '").resolve(c))');
    } else {
      code.push('a.push("' + escapeString(bits[i]) + '")');
    }
  }
  code.push('return a.join("")');
  return new Function('c', code.join(';'));
}

TextNode.prototype.render = function(context) {
  return (this.dynamic ? this.func(context) : this.text);
};

// Template convenience functions ----------------------------------------------

function $template(props) {
  return new Template(props, slice.call(arguments, 1));
}

function $block(name) {
  return new BlockNode(name, slice.call(arguments, 1));
}

function $var(variable) {
  return new Variable(variable);
}

function $for(props) {
  return new ForNode(props, slice.call(arguments, 1));
}

function $if(props) {
  return new IfNode(props, slice.call(arguments, 1));
}

// Nice to have later ----------------------------------------------------------

// End marker Nodes, for marking the end of content when contents are being
// specified as siblings to reduce the amount of nesting required.
function EndBlockNode() { }
function EndForNode() { }
function EndIfNode() { }

// Convenience methods for creating end Nodes in template definitions
function $endblock() { return new EndBlockNode(); }
function $endfor() { return new EndForNode(); }
function $endif() { return new EndIfNode(); }
