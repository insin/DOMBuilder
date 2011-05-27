(function() {

// --------------------------------------------------------------- Utilities ---

  // Native functions
var hasOwn = Object.prototype.hasOwnProperty
  , slice = Array.prototype.slice
  , toString = Object.prototype.toString
  // DOMBuilder utilities
  , extend = DOMBuilder.util.extend
  , inheritFrom = DOMBuilder.util.inheritFrom
  , isFunction = DOMBuilder.util.isFunction
  , lookup = DOMBuilder.util.lookup
  // Template variables
  /** Separator used for object lookups. */
  , VAR_LOOKUP_SEPARATOR = '.'
  /** Separator for specifying multiple variable names to be unpacked. */
  , UNPACK_SEPARATOR_RE = /, ?/
  /** RegExp for template variables. */
  , VARIABLE_RE = /{{(.*?)}}/
  /** RegExp for trimming whitespace. */
  , TRIM_RE = /^\s+|\s+$/g
  /** Context key for block inheritance context. */
  , BLOCK_CONTEXT_KEY = 'blockContext'
  ;

function isString(o) {
  return (toString.call(o) === "[object String]");
}

/**
 * Creates a lookup object from a list of BlockNodes by name, asserting that
 * their names are unique.
 */
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

/**
 * Escapes a string for inclustion in generated code where strings use double
 * quotes as delimiters.
 */
function escapeString(s) {
  return s.replace('\\', '\\\\').replace('"', '\\"');
}

function findNodesByType(contents, nodeType) {
  var nodes = [];
  for (var i = 0, l = contents.length, node; i < l; i++) {
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

/**
 * Some browser implementations of String.prototype.split don't include matches
 * from capturing RegExps.
 */
var splitBits = (function() {
    var memo = {};
    return function(expr, re) {
      if (!re.global) {
        if (!hasOwn.call(memo, re.source)) {
          memo[re.source] = new RegExp(re.source, 'g');
        }
        re = memo[re.source];
      }
      var bits = []
        , match
        , lastIndex
        , lastLastIndex = 0
        , lastLength
        ;
      while(match = re.exec(expr)) {
        lastIndex = match.index + match[0].length;
        if (lastIndex > lastLastIndex) {
          bits.push(expr.slice(lastLastIndex, match.index));
          if (match.length > 1 && match.index < expr.length) {
            bits.push.apply(bits, match.slice(1));
          }
          lastLength = match[0].length;
          lastLastIndex = lastIndex;
        }
        if (re.lastIndex === match.index) {
          re.lastIndex++;
        }
      }
      bits.push(expr.slice(lastLastIndex));
      return bits;
    };
})()

// -------------------------------------------------------------- Exceptions ---

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

// ----------------------------------------------------------------- Context ---

/**
 * Resolves variable expressions based on a context, supporting object property
 * lookups specified with '.' separators.
 */
function Variable(expr) {
  this.expr = expr;
}

Variable.prototype.resolve = Variable.prototype.render = function(context) {
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
    if (hasOwn.call(this.stack[i], name)) {
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
    if (hasOwn.call(this.stack[i], name)) {
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
  if (hasOwn.call(top, name)) {
    return top[name];
  }
  return d !== undefined ? d : null;
};

RenderContext.prototype.hasKey = function(name) {
  return hasOwn.call(this.stack[this.stack.length - 1], name);
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

//  --------------------------------------------------------------- Template ---

function Template(props, contents) {
  this.name = props.name;
  this.parent = props.extend || null;
  this.contents = contents;
  this.blocks = blockLookup(findNodesByType(contents, BlockNode));

  // Ensure any top level contents which need to be wrapped are processed
  TemplateNode.prototype.parseContents.call(this);
  // Add ourselves to the template lookup
  DOMBuilder._templates[this.name] = this;
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
  if (this.parent) {
    if (typeof DOMBuilder._templates[this.parent] == 'undefined') {
      throw new TemplateNotFoundError("Could not find template named '" +
                                      this.parent + '"');
    }
    // Call _render directly to add to the current render context
    return DOMBuilder._templates[this.parent]._render(context);
  } else {
    // Top-level template - render contents
    return DOMBuilder.fragment(context.render(this.contents));
  }
};

// ---------------------------------------------------------- Template Nodes ---

/**
 * Base for template content nodes.
 */
function TemplateNode(contents) {
  this.contents = contents || [];
  if (this.contents.length) {
    this.parseContents();
  }
}

/**
 * Wraps any contents which can be specified without a Node for convenience with
 * an appropriate Node.
 */
TemplateNode.prototype.parseContents = function() {
  for (var i = 0, l = this.contents.length, node; i < l; i++) {
    node = this.contents[i];
    // Strings which contain template variables should be wrapped in a TextNode
    if (isString(node) && VARIABLE_RE.test(node)) {
      this.contents[i] = new TextNode(node);
    }
  }
}

/**
 * A named section which may be overridden by child templates.
 */
function BlockNode(name, contents) {
  this.name = isString(name) ? name : name.name;
  TemplateNode.call(this, contents);
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
 * Includes the contents of another template, optionally with some extra
 * context variables.
 */
function IncludeNode(template, extraContext) {
  this.template = template;
  this.extraContext = extraContext || {};
}
inheritFrom(IncludeNode, TemplateNode);

IncludeNode.prototype.render = function(context) {
  if (typeof DOMBuilder._templates[this.template] == 'undefined') {
    throw new TemplateNotFoundError("Could not find template named '" +
                                    this.template + '"');
  }
  context.push(this.extraContext);
  var results = DOMBuilder._templates[this.template].render(context);
  context.pop();
  return results;
};

/**
 * An HTML element and its contents.
 */
function ElementNode(tagName, attributes, contents) {
  this.tagName = tagName;
  this.attributes = attributes;
  TemplateNode.call(this, contents);
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
  this.emptyContents = ((contents.length &&
                         contents[contents.length - 1] instanceof EmptyNode)
                        ? contents.pop().contents
                        : []);
  TemplateNode.call(this, contents);
}
inheritFrom(ForNode, TemplateNode);

ForNode.prototype.render = function(context) {
  var list = this.listVar.resolve(context)
    , results = []
    , forloop = {parentloop: context.get('forloop', {})}
    , l = list.length
    , item
    ;
  if (list.length < 1) {
    return context.render(this.emptyContents);
  }
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
 * Provides content for a ForNode if its list of items is empty. Instances of
 * this node will be ignored unless they are the last node in a ForNode's
 * content.
 */
function EmptyNode(contents) {
  TemplateNode.call(this, contents);
}
inheritFrom(EmptyNode, TemplateNode);
EmptyNode.prototype.render = function(context) {
  return [];
}

/**
 * Executes a boolean test using variables obtained from the context,
 * calling render on all its if the result is true.
 */
function IfNode(expr, contents) {
  if (isFunction(expr)) {
    this.test = expr;
  } else {
    this.test = this._parseExpr(expr);
  }
  this.elseContents = ((contents.length &&
                        contents[contents.length - 1] instanceof ElseNode)
                       ? contents.pop().contents
                       : []);
  TemplateNode.call(this, contents);
}
inheritFrom(IfNode, TemplateNode);

IfNode.prototype._parseExpr = (function() {
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
      , bits = splitBits(expr, opsRE)
      ;
    for (var i = 0, l = bits.length, bit; i < l; i++) {
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
      var func = new Function('c', 'Variable', code.join(' '));
      return function(context) {
        return func(context, Variable);
      };
    } catch (e) {
      throw new TemplateSyntaxError('Invalid $if expression (' + e.message +
                                    '): ' + expr);
    }
  }
})();

IfNode.prototype.render = function(context) {
  if (this.test(context)) {
    return context.render(this.contents);
  } else {
    return context.render(this.elseContents);
  }
}

/**
 * Provides content for an IfNode when its test returns ``false``. Instances of
 * this node will be ignored unless they are the last node in an IfNodes's
 * content.
 */
function ElseNode(contents) {
  TemplateNode.call(this, contents);
}
inheritFrom(ElseNode, TemplateNode);
ElseNode.prototype.render = function(context) {
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
    , bits = splitBits(expr, VARIABLE_RE)
    ;
  for (var i = 0, l = bits.length, bit; i < l; i++) {
    bit = bits[i];
    if (i % 2) {
      code.push('a.push(new Variable("' +
                escapeString(bit.replace(TRIM_RE, '')) +
                '").resolve(c))');
    } else if (bit) {
      code.push('a.push("' + escapeString(bit) + '")');
    }
  }
  code.push('return a');
  var func = new Function('c', 'Variable', code.join(';'));
  return function(context) {
    return func(context, Variable);
  };
}

TextNode.prototype.render = function(context) {
  return (this.dynamic ? this.func(context) : this.text);
};

/**
 * Cycles over a list of values, producing the next value on each render.
 */
function CycleNode(values, options) {
  this.values = values;
  options = extend({as: null, silent: false}, options || {});
  this.variableName = options.as;
  this.silent = options.silent;
  // Generate a unique id for each CycleNode
  this.id = 'cycle' + CycleNode.cycleId++;
}
inheritFrom(CycleNode, TemplateNode);

CycleNode.cycleId = 1;

CycleNode.prototype.render = function(context) {
  var nextIndex = context.renderContext.get(this.id, 0)
    , value = this.values[nextIndex]
    ;
  context.renderContext.set(this.id, (nextIndex + 1) % this.values.length);
  if (value instanceof Variable) {
    value = value.resolve(context);
  }
  if (this.variableName) {
    context.set(this.variableName, value);
  }
  if (this.silent) {
    return [];
  }
  return value;
};

// ------------------------------------------ Template Convenience Functions ---

function $template(props) {
return new Template(props, slice.call(arguments, 1));
}

function $block(name) {
  return new BlockNode(name, slice.call(arguments, 1));
}

function $include(template, extraContext) {
  return new IncludeNode(template, extraContext);
}

function $var(expr) {
  return new Variable(expr);
}

function $text(expr) {
  return new TextNode(expr);
}

function $for(props) {
  return new ForNode(props, slice.call(arguments, 1));
}

function $empty() {
  return new EmptyNode(slice.call(arguments));
}

function $if(expr) {
  return new IfNode(expr, slice.call(arguments, 1));
}

function $else() {
  return new ElseNode(slice.call(arguments));
}

function $cycle(values, options) {
  return new CycleNode(values, options);
}

// === Add mode to DOMBuilder ==================================================

DOMBuilder.addMode({
  name: 'template',
, createElement: function(tagName, attributes, children) {
    return new ElementNode(tagName, attributes, children);
  }
, fragment: function(children) {
    return children;
  }
, isObject: function(obj) {
    return (!(obj instanceof TemplateNode));
  }
, api: {
    ContextPopError: ContextPopError
  , VariableNotFoundError: VariableNotFoundError
  , TemplateSyntaxError: TemplateSyntaxError
  , TemplateNotFoundError: TemplateNotFoundError
  , Variable: Variable
  , Context: Context
  , RenderContext: RenderContext
  , BlockContext: BlockContext
  , Template: Template
  , TemplateNode: TemplateNode
  , BlockNode: BlockNode
  , IncludeNode: IncludeNode
  , ElementNode: ElementNode
  , ForNode: ForNode
  , IfNode: IfNode
  , TextNode: TextNode
  , CycleNode: CycleNode
  , $template: $template
  , $block: $block
  , $include: $include
  , $var: $var
  , $text: $text
  , $for: $for
  , $empty: $empty
  , $if: $if
  , $else: $else
  , $cycle: $cycle
  }
});

})();
