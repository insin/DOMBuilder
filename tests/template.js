module("Template");

(function() {

function shallowCopy(a) {
  var b = {};
  for (var prop in a) {
    b[prop] = a[prop];
  }
  return b;
}

test('Context', function() {
  // Instantiation with context
  var content = {test1: 1, test2: 2};
  var c = new Context(content);
  equal(c.stack.length, 1, 'Stack is initialised with a single context');
  ok(c.stack[0] === content, 'Initial context object is the given object');

  // Instantiation
  var c = new Context();
  equal(c.stack.length, 1, 'Stack is initialised with a single context');
  deepEqual(c.stack[0], {}, 'Initial context object is empty');

  // Setting and getting variables
  c.set('test', 42);
  deepEqual(c.stack[0], {test: 42}, 'Variable added to top context object');
  strictEqual(c.hasKey('test'), true, 'Presence of variable detected');
  strictEqual(c.get('test'), 42, 'Set values got via string');
  strictEqual(c.hasKey('missing'), false, 'Absence of variable detected');
  strictEqual(c.get('missing'), null,
              'null returned by default for unknown context variables');
  strictEqual(c.get('missing', 'test'), 'test',
              'Default can be specified for unknown context variables');

  // Setting multiple variables
  c.zip(['a', 'b'], [2, 3]);
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3},
            'Variables added to top context object');

  // Pushing a new context
  c.push();
  equal(c.stack.length, 2, 'Stack gained a new context object');
  deepEqual(c.stack[1], {}, 'Initial context object is empty');

  // Setting variables in new context
  c.set('stack', 99);
  deepEqual(c.stack[1], {stack: 99}, 'Top context object modified');
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3},
            'Other context objects not touched');

  // Getting variables with multiple contexts in play
  strictEqual(c.hasKey('stack'), true);
  strictEqual(c.get('stack'), 99, 'Top context variable found');
  strictEqual(c.hasKey('test'), true);
  strictEqual(c.get('test'), 42, 'Prior context objects searched');
  strictEqual(c.hasKey('missing'), false);
  strictEqual(c.get('missing'), null,
              'null returned by default for unknown context variables');
  strictEqual(c.get('missing', 'test'), 'test',
              'Default can be specified for unknown context variables');

  // Popping contexts
  c.pop();
  equal(c.stack.length, 1, 'Top context object removed');
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3}, 'Context objects not touched');

  // Popping too many times
  raises(function() { c.pop(); }, ContextPopError, 'Calling pop() too much');

  // Pushing accepts a new context object
  c.push({'pushed': 'yes'});
  equal(c.stack.length, 2, 'Context object added');
  equal(c.get('pushed'), 'yes', 'Provided context was used');

  // 'new' keyword is optional
  c = Context({'test': true});
  ok(c.get('test'), '"new" keyword is optional');
});

test('BlockContext', function() {
  var b = new BlockContext();
  deepEqual(b.blocks, {}, 'Initialised with empty lookup');

  // Add some blocks
  b.addBlocks({title: 9, body_class: 10, main: 11, sidebar: 12});
  deepEqual(b.blocks, {
      title: [9]
    , body_class: [10]
    , main: [11]
    , sidebar: [12]
  }, 'Grandchild template example');
  b.addBlocks({content: 6, main: 7, sidebar: 8});
  deepEqual(b.blocks, {
      title: [9]
    , body_class: [10]
    , main: [7, 11]
    , sidebar: [8, 12]
    , content: [6]
  }, 'Child template example');
  b.addBlocks({fulltitle: 1, title: 2, extra_head: 3, body_class: 4, content: 5});
  deepEqual(b.blocks, {
      title: [2, 9]
    , body_class: [4, 10]
    , main: [7, 11]
    , sidebar: [8, 12]
    , content: [5, 6]
    , fulltitle: [1]
    , extra_head: [3]
  }, 'Base template example');

  // Get blocks
  equals(b.getBlock('content'), 6, 'Getting an overriding block');
  equals(b.pop('title'), 9, 'Popping an overriding block');
  deepEqual(b.blocks, {
      title: [2]
    , body_class: [4, 10]
    , main: [7, 11]
    , sidebar: [8, 12]
    , content: [5, 6]
    , fulltitle: [1]
    , extra_head: [3]
  }, 'Overriding block was popped off');
});

test('Variable', function() {
  // Variables resolve against contexts
  var v = new Variable('test');
  strictEqual(v.resolve(Context({test: 42})), 42, 'Variable resolved');
  raises(function() { v.resolve(Context()) }, VariableNotFoundError,
         'Exception thrown if context variable missing');

  // Nested lookups are supported with the . operator
  v = new Variable('test.foo.bar');
  strictEqual(v.resolve(Context({test: {foo: {bar: 42}}})), 42,
              'Nested lookups performed');
  raises(function() { v.resolve(Context({test: {food: {bar: 42}}})); },
         VariableNotFoundError, 'Exception thrown for invalid nested lookups');
  raises(function() { v.resolve(Context({test: null})); },
         VariableNotFoundError,
         'Attempted lookup on null raises appropriate error');
  raises(function() { v.resolve(Context({test: undefined})); },
         VariableNotFoundError,
        'Attempted lookup on undefined raises appropriate error');

  // Functions found during variable resolution will be called
  strictEqual(v.resolve(Context({
    test: function() {
      return {
        foo: function() {
          return {bar: 42};
        }
      }
    }
  })), 42, 'Functions are called if part of lookup path');
  strictEqual(new Variable('test.bar').resolve(Context({
    test: {
      foo: 42,
      bar: function() { return this.foo; }
    }
  })), 42, 'Nested lookup functions called with appropriate context object');
});

test('ForNode', function() {
  var items, forloops = [];
  var f = new ForNode({'item': 'items'}, [{render: function(context) {
    forloops.push(shallowCopy(new Variable('forloop').resolve(context)));
    return new Variable('item').resolve(context)
  }}])

  // Zero items
  items = f.render(Context({'items': []}));
  deepEqual(items, [], 'Zero items - item context as expected');
  deepEqual(forloops, [], 'Zero items - forloop context as expected');

  // SIngle item
  items = f.render(Context({'items': [1]}));
  deepEqual(items, [1], 'Single item - item context as expected');
  deepEqual(forloops, [{
      counter: 1,
      counter0: 0,
      revcounter: 1,
      revcounter0: 0,
      first: true,
      last: true,
      parentloop: null
    }], 'Single item - forloop context as expected');

  // Two items
  forloops = [];
  items = f.render(Context({'items': [1,2]}));
  deepEqual(items, [1,2], 'Two items - item context as expected');
  deepEqual(forloops, [{
      counter: 1,
      counter0: 0,
      revcounter: 2,
      revcounter0: 1,
      first: true,
      last: false,
      parentloop: null
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: null
    }], 'Two items - forloop context as expected');

  // Three items
  forloops = [];
  items = f.render(Context({'items': [1,2,3]}));
  deepEqual(items, [1,2,3], 'Three items - item context as expected');
  deepEqual(forloops, [{
      counter: 1,
      counter0: 0,
      revcounter: 3,
      revcounter0: 2,
      first: true,
      last: false,
      parentloop: null
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 2,
      revcounter0: 1,
      first: false,
      last: false,
      parentloop: null
    }, {
      counter: 3,
      counter0: 2,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: null
    }], 'Three items - forloop context as expected');

  // Multiple loop context variables
  forloops = [];
  f = new ForNode({'a, b': 'items'}, [{render: function(context) {
    forloops.push(shallowCopy(new Variable('forloop').resolve(context)));
    return [new Variable('a').resolve(context), new Variable('a').resolve(context)];
  }}]);
  items = f.render(Context({'items': [[1,1],[2,2],[3,3]]}));
  deepEqual(items, [[1,1],[2,2],[3,3]],
            'Multiple loop context variables - item context as expected');
  deepEqual(forloops, [{
      counter: 1,
      counter0: 0,
      revcounter: 3,
      revcounter0: 2,
      first: true,
      last: false,
      parentloop: null
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 2,
      revcounter0: 1,
      first: false,
      last: false,
      parentloop: null
    }, {
      counter: 3,
      counter0: 2,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: null
    }], 'Multiple loop context variables - forloop context as expected');
});

test('$for', function() {
  var items, forloops = [];
  var f = $for({'item': 'items'}, {render: function(context) {
    forloops.push(shallowCopy(new Variable('forloop').resolve(context)));
    return new Variable('item').resolve(context);
  }})

  items = f.render(new Context({'items': [1,2]}));
  deepEqual(items, [1,2], 'Two items - item context as expected');
  deepEqual(forloops, [{
      counter: 1,
      counter0: 0,
      revcounter: 2,
      revcounter0: 1,
      first: true,
      last: false,
      parentloop: null
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: null
    }], 'Two items - forloop context as expected');
});

test('IfNode', function() {
  var c = Context({a: 41, b: 42, c: 43, d: '43', e: 43, f: true});

  // Valid, supported expressions
  var exprs = [
    ['a > b', false]
  , ['b > a', true]
  , ['c == d', true]
  , ['c != d', false]
  , ['c === d', false]
  , ['c !== d', true]
  , ['c >= e', true]
  , ['c <= e', true]
  , ['c == d && (a > b || c > b)', true]
  , ['!f', false]
  , ['!!d', true]
  , ['4 < a', true]
  , ['"41" == a', true]
  , ["'42' == b", true]
  , ['"41" === (a)', false]
  , ['41.0000000001 <= a', false]
  , ['"" == f', false]
  , ['!!""', false]
  ];
  for (var i = 0, expr; expr = exprs[i]; i++) {
    strictEqual(new IfNode(expr[0]).test(c), expr[1], 'Valid: ' + expr[0]);
  }

  // Invalid or unsupported expressions
  var invalidExprs = [
    'a >> b'
  , '(a > b'
  , ')a > b'
  , '""" > b'
  ];
  for (var i = 0, expr; expr = invalidExprs[i]; i++) {
    raises(function() { new IfNode(expr) }, TemplateSyntaxError, 'Invalid: ' + expr);
  }
});

test('$if', function() {
  var c = Context({test: 5, a: 42});
  var if_ = $if('test > 4', {
    render: function(context) {
      return new Variable('a').resolve(context);
    }
  });

  deepEqual(if_.render(c), [42], 'Returns rendered contents when condition is true');
  c.set('test', '4');
  deepEqual(if_.render(c), [], 'Returns empty list when condition is false');
});

test('TextNode', function() {
  var c = Context({test: 42, foo: 'bar'});

  // Static text
  var t = new TextNode('test');
  ok(!t.dynamic, 'Static text recognised');
  equal(t.render(c), 'test', 'Rendering static text');

  // Dynamic text
  t = new TextNode('{{test}}');
  ok(t.dynamic, 'Dynamic content recognised');
  equal(t.render(c), '42', 'Rendering dynamic content');

  t = new TextNode('{{ test }}');
  ok(t.dynamic, 'Dynamic text with whitespace in variable name recognised');
  equal(t.render(c), '42', 'Whitespace trimmed from variable name');

  t = new TextNode('{{ test }}{{foo}}');
  ok(t.dynamic, 'Dynamic text with multiple variable names recognised');
  equal(t.render(c), '42bar', 'Rendering with multiple variable names');

  t = new TextNode('The quick brown {{ test }} jumped over the lazy {{foo}}.');
  ok(t.dynamic, 'Mixed content recognised as dynamic');
  equal(t.render(c), 'The quick brown 42 jumped over the lazy bar.',
        'Rendering mixed content');

  t = new TextNode('The quick brown {{ test.toExponential }} jumped over the lazy {{foo.toUpperCase}}.');
  ok(t.dynamic, 'Mixed content with variable lookup recognised as dynamic');
  equal(t.render(c), 'The quick brown 4.2e+1 jumped over the lazy BAR.',
        'Variable lookup performed');
});

})();
