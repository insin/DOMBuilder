var DOMBuilder = require('./core')
  , Concur = require('Concur')
  , is = require('isomorph/is')
  , object = require('isomorph/object')
  , array = require('isomorph/array')

// Native functions
var slice = Array.prototype.slice
  , toString = Object.prototype.toString

/** Separator used for object lookups. */
var VAR_LOOKUP_SEPARATOR = '.'
/** RegExp for specifying the loop variable for a ForNode. */
var FOR_RE = /( in )([\.\w_]+)$/
/** Separator for specifying multiple variable names to be unpacked. */
var UNPACK_SEPARATOR_RE = /, ?/
/** RegExp for template variables. */
var VARIABLE_RE = /{{(.*?)}}/
/** RegExp for trimming whitespace. */
var TRIM_RE = /^\s+|\s+$/g
/** Context key for block inheritance context. */
var BLOCK_CONTEXT_KEY = 'blockContext'
/** Document Type Definitions. */
var DOCTYPES = {
      4: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">'
    , 5: '<!DOCTYPE html>'
    }

/** Template lookup. */
var templates = {}

/**
 * Creates a lookup object from a list of BlockNodes by name, asserting that
 * their names are unique.
 */
function blockLookup(blocks) {
  var lookup = {}
    , block
  for (var i = 0; block = blocks[i]; i++) {
    if (typeof lookup[block.name] != 'undefined') {
      throw new TemplateSyntaxError("Block with name '" + block.name +
                                    "' appears more than once.")
    }
    lookup[block.name] = block
  }
  return lookup
}

/**
 * Searches a TemplateNode (or an object which looks like one) for contents
 * which are instances of the given node type.
 */
function findNodesByType(contents, nodeType) {
  var nodes = []
  for (var i = 0, l = contents.length, node; i < l; i++) {
    node = contents[i]
    if (node instanceof nodeType) {
      nodes.push(node)
    }
    if (node instanceof TemplateNode && typeof node.contents != 'undefined') {
      nodes.push.apply(nodes, findNodesByType(node.contents, nodeType))
    }
  }
  return nodes
}

/**
 * Some browser implementations of String.prototype.split don't include matches
 * from capturing RegExps.
 */
var splitBits = (function() {
  var memo = {}
  return function(expr, re) {
    if (!re.global) {
      if (!object.hasOwn(memo, re.source)) {
        memo[re.source] = new RegExp(re.source, 'g')
      }
      re = memo[re.source]
    }
    var bits = []
      , match
      , lastIndex
      , lastLastIndex = 0
      , lastLength
    while (match = re.exec(expr)) {
      lastIndex = match.index + match[0].length
      if (lastIndex > lastLastIndex) {
        bits.push(expr.slice(lastLastIndex, match.index))
        if (match.length > 1 && match.index < expr.length) {
          bits.push.apply(bits, match.slice(1))
        }
        lastLength = match[0].length
        lastLastIndex = lastIndex
      }
      if (re.lastIndex === match.index) {
        re.lastIndex++
      }
    }
    bits.push(expr.slice(lastLastIndex))
    return bits
  }
})()

/**
 * Escapes a string for inclusion in generated code where strings use double
 * quotes as delimiters.
 */
function escapeString(s) {
  return s.replace('\\', '\\\\').replace('"', '\\"')
}

/**
 * Default rendering for a list of template contents.
 */
function render(contents, context) {
  var results = []
  for (var i = 0, l = contents.length, content; i < l; i++) {
    content = contents[i]
    if (content && (content instanceof TemplateNode ||
                    is.Function(content.render))) {
      results.push(content.render(context))
    }
    else {
      results.push(content)
    }
  }
  return results
}

// -------------------------------------------------------------- Exceptions ---

/**
 * Thrown when pop() is called too many times on a Context.
 */
function ContextPopError() {
  this.message = 'pop() was called more times than push()'
}
object.inherits(ContextPopError, Error)

/**
 * Thrown when a Variable cannot be resolved.
 */
function VariableNotFoundError(message) {
  this.message = message
}
object.inherits(VariableNotFoundError, Error)

/**
 * Thrown when expressions cannot be parsed or otherwise invalid contents are
 * detected.
 */
function TemplateSyntaxError(message) {
  this.message = message
}
object.inherits(TemplateSyntaxError, Error)

/**
 * Thrown when a named template cannot be found.
 */
function TemplateNotFoundError(message) {
  this.message = message
}
object.inherits(TemplateNotFoundError, Error)

// --------------------------------- Template Lookup / Convenience Rendering ---

/**
 * Renders a template with the given name (or list of names).
 */
function renderTemplate(name, context) {
  var template
  if (is.Array(name)) {
    template = selectTemplate(name)
  }
  else {
    template = getTemplate(name)
  }
  return template.render(context)
}

/**
 * Retrieves a template by name, throwing a TemplateNotFoundError if no such
 * template exists.
 */
function getTemplate(name) {
  if (typeof templates[name] == 'undefined') {
    throw new TemplateNotFoundError(name)
  }
  return templates[name]
}

/**
 * Returns the first template which exists from the given list of template
 * names.
 */
function selectTemplate(names) {
  var notFound = []
  for (var i = 0, l = names.length; i < l; i++) {
    try {
      return getTemplate(names[i])
    }
    catch (e) {
      notFound.push(names[i])
    }
  }
  throw new TemplateNotFoundError(notFound.join(', '))
}

// ----------------------------------------------------------------- Context ---

/**
 * A quick shimplementation of FilterExpression to allow IfNodes to perform
 * existence checks on variables. A full implementation which implements filters
 * will be coming once I've decided on the appropriate design for it.
 */
function FilterExpression(expr) {
  this.variable = new Variable(expr)
}

FilterExpression.prototype.resolve = FilterExpression.prototype.render = function(context, ignoreFailures) {
  var current
  if (this.variable instanceof Variable) {
    try {
      current = this.variable.resolve(context)
    }
    catch (e) {
      if (!(e instanceof VariableNotFoundError)) throw e
      if (ignoreFailures) {
        current = null
      }
      else {
        // Emulate what currently happens if a Variable is not found if this
        // shim is used without passing the ignoreFailures parameter.
        throw e
      }
    }
  }
  else {
    current = this.variable
  }
  return current
}

/**
 * Resolves variable expressions based on a context, supporting object property
 * lookups specified with '.' separators.
 */
function Variable(expr, callFunctions) {
  this.expr = expr
  this.callFunctions = (typeof callFunctions != 'undefined' ? callFunctions: true)
}

Variable.prototype.resolve = Variable.prototype.render = function(context) {
  // First lookup is in the context
  var bits = this.expr.split(VAR_LOOKUP_SEPARATOR)
    , bit = bits.shift()
    , current = context.get(bit)
  if (!context.hasKey(bit)) {
    throw new VariableNotFoundError('Could not find [' + bit +
                                    '] in ' + context)
  }
  else if (is.Function(current) && this.callFunctions) {
    current = current()
  }

  // Any further lookups are against current object properties
  if (bits.length) {
    var l = bits.length
      , next
    for (var i = 0; i < l; i++) {
      bit = bits[i]
      if (current == null || typeof current[bit] == 'undefined') {
        throw new VariableNotFoundError('Could not find [' + bit +
                                        '] in ' + current)
      }
      next = current[bit]
      // Call functions with the current object as context
      if (is.Function(next) && this.callFunctions) {
        current = next.call(current)
      }
      else {
        current = next
      }
    }
  }

  return current
}

/**
 * Manages a stack of objects holding template context variables and rendering
 * context.
 */
function Context(initial) {
  if (!(this instanceof Context)) return new Context(initial)
  this.stack = [initial || {}]
  this.renderContext = new RenderContext()
}

Context.prototype.push = function(context) {
  this.stack.push(context || {})
}

Context.prototype.pop = function() {
  if (this.stack.length == 1) {
    throw new ContextPopError()
  }
  return this.stack.pop()
}

Context.prototype.set = function(name, value) {
  this.stack[this.stack.length - 1][name] = value
}

/**
 * Adds multiple items to the current context object, where names and values are
 * provided as lists.
 */
Context.prototype.zip = function(names, values) {
  var top = this.stack[this.stack.length - 1]
    , l = Math.min(names.length, values.length)
  for (var i = 0; i < l; i++) {
    top[names[i]] = values[i]
  }
}

/**
 * Gets variables, checking all context objects from top to bottom.
 *
 * Returns undefined for variables which are not set, to distinguish from
 * variables which are set, but are null.
 */
Context.prototype.get = function(name, d) {
  for (var i = this.stack.length - 1; i >= 0; i--) {
    if (object.hasOwn(this.stack[i], name)) {
      return this.stack[i][name]
    }
  }
  return d !== undefined ? d : null
}

/**
 * Determines if a particular key is set in the context.
 */
Context.prototype.hasKey = function(name) {
  for (var i = 0, l = this.stack.length; i < l; i++) {
    if (object.hasOwn(this.stack[i], name)) {
      return true
    }
  }
  return false
}

/**
 * Context specific to template rendering.
 */
function RenderContext(initial) {
  this.stack = [initial || {}]
}
object.inherits(RenderContext, Context)

RenderContext.prototype.get = function(name, d) {
  var top = this.stack[this.stack.length - 1]
  if (object.hasOwn(top, name)) {
    return top[name]
  }
  return d !== undefined ? d : null
}

RenderContext.prototype.hasKey = function(name) {
  return object.hasOwn(this.stack[this.stack.length - 1], name)
}

/**
 * Context for block inheritance at render time.
 *
 * Each block in the current template being rendered is added to a First In,
 * First Out queue spcific to its block name. As rendering proceeds up through
 * inherited templates, the blocks which were most deeply defined will be at the
 * head of their respective queues when the root template starts rendering block
 * contents.
 */
function BlockContext() {
  this.blocks = {} // FIFO queues by block name
}

BlockContext.prototype.addBlocks = function(blocks) {
  for (var name in blocks) {
    if (typeof this.blocks[name] != 'undefined') {
      this.blocks[name].unshift(blocks[name])
    }
    else {
      this.blocks[name] = [blocks[name]]
    }
  }
}

BlockContext.prototype.push = function(name, block) {
  this.blocks[name].push(block)
}

BlockContext.prototype.pop = function(name) {
  if (typeof this.blocks[name] != 'undefined' &&
      this.blocks[name].length) {
    return this.blocks[name].pop()
  }
  return null
}

BlockContext.prototype.getBlock = function(name) {
  if (typeof this.blocks[name] != 'undefined') {
    var blocks = this.blocks[name]
    if (blocks.length) {
      return blocks[blocks.length - 1]
    }
  }
  return null
}

//  --------------------------------------------------------------- Template ---

function Template(props, contents) {
  if (is.String(props)) {
    this.name = props
  }
  else {
    this.name = props.name
    this.parent = props.extend || null
  }
  this.contents = contents
  this.blocks = blockLookup(findNodesByType(contents, BlockNode))

  // Ensure any top level contents which need to be wrapped are processed
  TemplateNode.prototype.parseContents.call(this)
  // Add ourselves to the template lookup
  templates[this.name] = this
}

/**
 * Creates a new rendering context and renders the template.
 */
Template.prototype.render = function(context) {
  // Allow plain objects to be passed in as context
  if (!(context instanceof Context)) {
    context = Context(context)
  }
  context.renderContext.push()
  try {
    return this._render(context)
  }
  finally {
    context.renderContext.pop()
  }
}

/**
 * Rendering implementation - adds blocks to rendering context and either calls
 * render on a parent template, or renders contents if this is a top-level
 * template.
 */
Template.prototype._render = function(context) {
  if (!context.renderContext.hasKey(BLOCK_CONTEXT_KEY)) {
    context.renderContext.set(BLOCK_CONTEXT_KEY, new BlockContext())
  }
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY)
  blockContext.addBlocks(this.blocks)
  if (this.parent) {
    // Call _render directly to add to the current render context
    return getTemplate(this.parent)._render(context)
  }
  else {
    // Top-level template - render contents
    return DOMBuilder.fragment(render(this.contents, context))
  }
}

// ---------------------------------------------------------- Template Nodes ---

/**
 * Base for template content nodes.
 */
var TemplateNode = Concur.extend({
  constructor: function(contents) {
    this.contents = contents || []
    if (this.contents.length) {
      this.parseContents()
    }
  }
})

/**
 * Wraps any contents which can be specified without a Node for convenience with
 * an appropriate Node.
 */
TemplateNode.prototype.parseContents = function() {
  for (var i = 0, l = this.contents.length, node; i < l; i++) {
    node = this.contents[i]
    // Strings which contain template variables should be wrapped in a TextNode
    if (is.String(node) && VARIABLE_RE.test(node)) {
      this.contents[i] = new TextNode(node)
    }
  }
}

/**
 * A named section which may be overridden by child templates.
 */
function BlockNode(name, contents) {
  this.name = is.String(name) ? name : name.name
  TemplateNode.call(this, contents)
}
object.inherits(BlockNode, TemplateNode)

BlockNode.prototype.render = function(context) {
  var blockContext = context.renderContext.get(BLOCK_CONTEXT_KEY)
    , results, push, block
  context.push()
  if (blockContext === null) {
    context.set('block', this)
    results = render(this.contents, context)
  }
  else {
    push = block = blockContext.pop(this.name)
    if (block === null) {
      block = this
    }
    block = new BlockNode(block.name, block.contents)
    block.context = context
    context.set('block', block)
    results = render(block.contents, context)
    if (push !== null) {
      blockContext.push(this.name, push)
    }
  }
  context.pop()
  return results
}

BlockNode.prototype['super'] = function(context) {
  var renderContext = this.context.renderContext
  if (renderContext.hasKey(BLOCK_CONTEXT_KEY) &&
      renderContext.get(BLOCK_CONTEXT_KEY).getBlock(this.name) !== null) {
    return this.render(this.context)
  }
  return ''
}

/**
 * Includes the contents of another template, optionally with some extra
 * context variables.
 */
function IncludeNode(template, extraContext, only) {
  this.template = template
  this.extraContext = extraContext || {}
  this.only = only || false
}
object.inherits(IncludeNode, TemplateNode)

IncludeNode.prototype.render = function(context) {
  var templateName = (this.template instanceof Variable
                      ? this.template.resolve(context)
                      : this.template)
    , template = (is.Array(templateName)
                  ? selectTemplate(templateName)
                  : getTemplate(templateName))
    , extraContext = {}
    , name
    , value
  // Create a copy of extra context, resolving any variables
  for (name in this.extraContext) {
    value = this.extraContext[name]
    extraContext[name] = (value instanceof Variable
                          ? value.resolve(context)
                          : value)
  }
  if (this.only) {
    return template.render(extraContext)
  }
  else {
    context.push(extraContext)
    var results = template.render(context)
    context.pop()
    return results
  }
}

/**
 * An HTML element and its contents.
 */
function ElementNode(tagName, attributes, contents) {
  this.tagName = tagName
  this.attributes = object.extend({}, attributes)
  this.dynamicAttrs = false
  // Attributes which contain template variables should be wrapped in a TextNode
  for (var name in this.attributes) {
    var attr = this.attributes[name]
    if (is.String(attr) && VARIABLE_RE.test(attr)) {
      this.attributes[name] = new TextNode(attr)
      if (!this.dynamicAttrs) {
        this.dynamicAttrs = true
      }
    }
    else if ((attr instanceof TemplateNode || attr instanceof Variable) &&
             !this.dynamicAttrs) {
      this.dynamicAttrs = true
    }
  }
  TemplateNode.call(this, contents)
}
object.inherits(ElementNode, TemplateNode)

ElementNode.prototype.render = function(context) {
  return DOMBuilder.createElement(this.tagName,
                                  (this.dynamicAttrs
                                   ? this.renderAttributes(context)
                                   : this.attributes),
                                  render(this.contents, context))
}

ElementNode.prototype.renderAttributes = function(context) {
  var attributes = {}, name, attr, result
  for (name in this.attributes) {
    attr = this.attributes[name]
    if (attr instanceof TemplateNode) {
      result = attr.render(context)
      if (is.Array(result)) {
        result = array.flatten(result).join('')
      }
      attributes[name] = result
    }
    else if (attr instanceof Variable) {
      attributes[name] = attr.resolve(context)
    }
    else {
      attributes[name] = attr
    }
  }
  return attributes
}

/**
 * Supports looping over a list obtained from the context, creating new
 * context variables with list contents and calling render on all its
 * contents.
 */
function ForNode(expr, contents) {
  this._parseExpr(expr)
  this.emptyContents = ((contents.length &&
                         contents[contents.length - 1] instanceof EmptyNode)
                        ? contents.pop().contents
                        : [])
  TemplateNode.call(this, contents)
}
object.inherits(ForNode, TemplateNode)

ForNode.prototype._parseExpr = function(expr) {
  var bits = splitBits(expr, FOR_RE)
  if (bits.length != 4 || bits[1] != ' in ' || bits[3] !== '') {
    throw new TemplateSyntaxError('Invalid ForNode expression: ' + expr)
  }
  this.loopVars = bits[0].split(UNPACK_SEPARATOR_RE)
  this.listVar = new Variable(bits[2])
}

ForNode.prototype.render = function(context) {
  var list = this.listVar.resolve(context)
    , results = []
    , forloop = {parentloop: context.get('forloop', {})}
    , l = list.length
    , item
  if (list.length < 1) {
    return render(this.emptyContents, context)
  }
  context.push()
  context.set('forloop', forloop)
  for (var i = 0; i < l; i++) {
    item = list[i]
    // Set current item(s) in context variable(s)
    if (this.loopVars.length === 1) {
      context.set(this.loopVars[0], item)
    }
    else {
      context.zip(this.loopVars, item)
    }
    // Update loop status variables
    forloop.counter = i + 1
    forloop.counter0 = i
    forloop.revcounter = l - i
    forloop.revcounter0 = l - i - 1
    forloop.first = (i === 0)
    forloop.last = (i === l - 1)
    // Render contents
    results.push.apply(results, render(this.contents, context))
  }
  context.pop()
  return results
}

/**
 * Provides content for a ForNode if its list of items is empty. Instances of
 * this node will be ignored unless they are the last node in a ForNode's
 * content.
 */
function EmptyNode(contents) {
  TemplateNode.call(this, contents)
}
object.inherits(EmptyNode, TemplateNode)
EmptyNode.prototype.render = function(context) {
  return []
}

/**
 * Executes a boolean test using variables obtained from the context,
 * calling render on its contents if the result is true. If the last content
 * item is an ElseNode, its contents will be rendered if the test is false.
 */
function IfNode(expr, contents) {
  if (is.Function(expr)) {
    this.test = expr
  }
  else {
    this.test = this._parseExpr(expr)
  }
  this.elseContents = ((contents.length &&
                        contents[contents.length - 1] instanceof ElseNode)
                       ? contents.pop().contents
                       : [])
  TemplateNode.call(this, contents)
}
object.inherits(IfNode, TemplateNode)

IfNode.prototype._parseExpr = (function() {
  var ops = object.lookup('( ) && || == === <= < >= > != !== !! !'.split(' '))
    , opsRE = /(\(|\)|&&|\|\||={2,3}|<=|<|>=|>|!={1,2}|!{1,2})/
    , numberRE = /^-?(?:\d+(?:\.\d+)?|(?:\d+)?\.\d+)$/
    , quotes = object.lookup(['"', "'"])
    , isQuotedString = function(s) {
        var q = s.charAt(0)
        return (s.length > 1 &&
                typeof quotes[q] != 'undefined' &&
                s.lastIndexOf(q) == s.length - 1)
      }
  return function(expr) {
    var code = ['return (']
      , bits = splitBits(expr, opsRE)
    for (var i = 0, l = bits.length, bit; i < l; i++) {
      bit = bits[i]
      if (typeof ops[bit] != 'undefined') {
        code.push(bit)
      }
      else {
        bit = bit.replace(TRIM_RE, '')
        if (bit) {
          if (numberRE.test(bit) || isQuotedString(bit)) {
            code.push(bit)
          }
          else {
            code.push('new FilterExpression("' + escapeString(bit) + '").resolve(c, true)')
          }
        }
      }
    }
    code.push(');')
    try {
      var func = new Function('c', 'FilterExpression', code.join(' '))
      return function(context) {
        return func(context, FilterExpression)
      }
    }
    catch (e) {
      throw new TemplateSyntaxError('Invalid $if expression (' + e.message +
                                    '): ' + expr)
    }
  }
})()

IfNode.prototype.render = function(context) {
  return render(this.test(context) ? this.contents : this.elseContents, context)
}

/**
 * Provides content for an IfNode when its test returns ``false``. Instances of
 * this node will be ignored unless they are the last node in an IfNodes's
 * content.
 */
function ElseNode(contents) {
  TemplateNode.call(this, contents)
}
object.inherits(ElseNode, TemplateNode)
ElseNode.prototype.render = function(context) {
  return []
}

/**
 * Wraps static text context and text context which contains template variable
 * definitions to be inserted at render time.
 */
function TextNode(text) {
  this.dynamic = VARIABLE_RE.test(text)
  if (this.dynamic) {
    this.func = this._parseExpr(text)
  }
  else {
    this.text = text
  }
}
object.inherits(TextNode, TemplateNode)

/**
 * Creates a function which accepts context and performs replacement by
 * variable resolution on the given expression.
 */
TextNode.prototype._parseExpr = function(expr) {
  var code = ['var a = []']
    , bits = splitBits(expr, VARIABLE_RE)
  for (var i = 0, l = bits.length, bit; i < l; i++) {
    bit = bits[i]
    if (i % 2) {
      code.push('a.push(new Variable("' +
                escapeString(bit.replace(TRIM_RE, '')) +
                '").resolve(c))')
    }
    else if (bit) {
      code.push('a.push("' + escapeString(bit) + '")')
    }
  }
  code.push('return a')
  var func = new Function('c', 'Variable', code.join(';'))
  return function(context) {
    return func(context, Variable)
  }
}

TextNode.prototype.render = function(context) {
  return (this.dynamic ? this.func(context) : [this.text])
}

/**
 * Cycles over a list of values, producing the next value on each render.
 */
function CycleNode(values, options) {
  this.values = values
  options = object.extend({as: null, silent: false}, options || {})
  this.variableName = options.as
  this.silent = options.silent
  // Generate a unique id for each CycleNode
  this.id = 'cycle' + CycleNode.cycleId++
}
object.inherits(CycleNode, TemplateNode)

CycleNode.cycleId = 1

CycleNode.prototype.render = function(context) {
  var nextIndex = context.renderContext.get(this.id, 0)
    , value = this.values[nextIndex]
  context.renderContext.set(this.id, (nextIndex + 1) % this.values.length)
  if (value instanceof Variable) {
    value = value.resolve(context)
  }
  if (this.variableName) {
    context.set(this.variableName, value)
  }
  if (this.silent) {
    return []
  }
  return value
}

function DoctypeNode(version) {
  this.version = version || 5
}
object.inherits(DoctypeNode, TemplateNode)
DoctypeNode.prototype.render = function(context) {
  var doctype = DOCTYPES[this.version] || ''
  return (DOMBuilder.html ? DOMBuilder.html.markSafe(doctype) : doctype)
}

// === Register mode plugin ====================================================

DOMBuilder.addMode({
  name: 'template'
, createElement: function(tagName, attributes, children) {
    return new ElementNode(tagName, attributes, children)
  }
, textNode: function(text) {
    return text
  }
, fragment: function(children) {
    return children
  }
, isModeObject: function(obj) {
    return (obj instanceof TemplateNode || obj instanceof Variable)
  }
, api: {
    DOCTYPES: DOCTYPES
  , templates: templates
  , ContextPopError: ContextPopError
  , VariableNotFoundError: VariableNotFoundError
  , TemplateSyntaxError: TemplateSyntaxError
  , TemplateNotFoundError: TemplateNotFoundError
  , renderTemplate: renderTemplate
  , getTemplate: getTemplate
  , selectTemplate: selectTemplate
  , FilterExpression: FilterExpression
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
  , EmptyNode: EmptyNode
  , IfNode: IfNode
  , ElseNode: ElseNode
  , TextNode: TextNode
  , CycleNode: CycleNode
  }
, apply: {
    Context: Context
  , renderTemplate: renderTemplate
  , $template: function(props) {
      return new Template(props, array.flatten(slice.call(arguments, 1)))
    }
  , $doctype: function(version) {
      return new DoctypeNode(version)
    }
  , $block: function(name) {
      return new BlockNode(name, array.flatten(slice.call(arguments, 1)))
    }
  , $include: function(template, extraContext, only) {
      return new IncludeNode(template, extraContext, only)
    }
  , $var: function(expr) {
      return new Variable(expr)
    }
  , $func: function(expr) {
      return new Variable(expr, false)
    }
  , $text: function(expr) {
      return new TextNode(expr)
    }
  , $for: function(props) {
      return new ForNode(props, array.flatten(slice.call(arguments, 1)))
    }
  , $empty: function() {
      return new EmptyNode(array.flatten(slice.call(arguments)))
    }
  , $if: function(expr) {
      return new IfNode(expr, array.flatten(slice.call(arguments, 1)))
    }
  , $else: function() {
      return new ElseNode(array.flatten(slice.call(arguments)))
    }
  , $cycle: function(values, options) {
      return new CycleNode(values, options)
    }
  }
})
