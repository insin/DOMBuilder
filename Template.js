function Variable(name) {
  this.name = name;
}

function VariableNotFoundError(name, context) {
  this.name = name;
  this.context = context;
}

function Context(initial) {
  if (!(this instanceof Context)) return new Context(initial);
  this.stack = [initial || {}];
  this.top = this.stack[0];
}

Context.prototype.push = function() {
  this.stack.push({});
  this.top = this.stack[this.stack.length - 1];
};

Context.prototype.pop = function() {
  if (this.stack.length > 1) {
    this.stack.pop();
  }
  this.top = this.stack[this.stack.length - 1];
};

Context.prototype.set = function(name, value) {
  this.top[name] = value;
};

Context.prototype.del = function(name, value) {
  delete this.top[name];
};

Context.prototype.zip = function(names, values) {
  var top = this.stack[this.stack.length - 1]
    , l = Math.min(names.length, values.length)
    ;
  for (var i = 0; i < l; i++) {
    top[names[i]] = values[i];
  }
};

Context.prototype.resolve = function(variable) {
  var name = (variable instanceof Variable ? variable.name : ""+variable);
  if (this.top.hasOwnProperty(name)) {
    return this.top[name];
  }
  for (var i = this.stack.length - 2; i >= 0; i--) {
    if (this.stack[i].hasOwnProperty(name)) {
      return this.stack[i][name];
    }
  }
  return undefined;
};

Context.prototype.resolveRequired = function(variable) {
  var result = this.resolve(variable);
  if (result === undefined) {
    throw new VariableNotFoundError(variable, this);
  }
  return result;
};

var UNPACK_SEP_RE = /, ?/g;

function ForNode(props, contents) {
  for (var prop in props) {
    this.loopVars = prop.split(UNPACK_SEP_RE);
    this.listVar = props[prop];
    break;
  }
  this.contents = contents;
}

ForNode.prototype.render = function(context) {
  var list = context.resolveRequired(this.listVar)
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
      , parentloop: context.resolve('forloop')
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

function EndFornode() { }

function $for(props) {
  return new ForNode(props, Array.prototype.slice.call(arguments, 1));
}

function $endfor() {
  return new EndForNode();
}

// WIP -----------------------------------------------------------------------

function Template(props, contents) {
  this.name = props.name;
  this.extends_ = props['extends'];
  this.contents = contents;
}

function Block(name, contents) {
  this.name = name;
  this.contents = contents;
}

// These need to hook into the DOMBuilder API via the introduction of a new
// mode, to be used when instantiating Template objects.
function TemplateNode() { }
function TemplateTextNode() { }

function TemplateHTMLNode() { }

function IfNode(props, contents) { }

function EndIfNode() { }

// Template convenience functions
function $template(props) {
  return new Template(props, Array.prototype.slice.call(arguments, 1));
}

function $block(name) {
  return new Block(name, Array.prototype.slice.call(arguments, 1));
}

function $if(props) {
  return new IfNode(props, Array.prototype.slice.call(arguments, 1));
}

function $endif() {
  return new EndIfNode();
}

function $html(contents) {
  return new RawHTMLNode(contents);
}

function $var(name) {
  return new Variable(name);
}

// Helper functions
function processMarkerNodes(item) {
  // Find these
  // $for/$if, element, element, $endfor/$endif
  // And end up with this
  // $for/$if[contents=[element, element]
}