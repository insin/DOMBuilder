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
  ok(c._top === c.stack[0], 'Initial top is reference to top of stack');
  ok(c._top === content, 'Initial context object is the given object');

  // Instantiation
  var c = new Context();
  equal(c.stack.length, 1, 'Stack is initialised with a single context');
  ok(c._top === c.stack[0], 'Initial top is reference to top of stack')
  deepEqual(c._top, {}, 'Initial context object is empty');

  // Setting and getting variables
  c.set('test', 42);
  deepEqual(c._top, {test: 42}, 'Variable added to top context object');
  strictEqual(c.get('test'), 42, 'Set values got via string');
  strictEqual(c.get('missing'), undefined,
              'undefined returned for unknown context variables');

  // Setting multiple variables
  c.zip(['a', 'b'], [2, 3]);
  deepEqual(c._top, {test: 42, a: 2, b: 3},
            'Variables added to top context object');

  // Pushing a new context
  c.push();
  equal(c.stack.length, 2, 'Stack gained a new context object');
  ok(c._top === c.stack[1], 'Top references top of stack')
  deepEqual(c._top, {}, 'Initial context object is empty');

  // Setting variables in new context
  c.set('stack', 99);
  deepEqual(c._top, {stack: 99}, 'Top context object modified');
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3},
            'Other context objects not touched');

  // Getting variables with multiple contexts in play
  strictEqual(c.get('stack'), 99, 'Top context variable found');
  strictEqual(c.get('test'), 42, 'Prior context objects searched');
  strictEqual(c.get('missing'), undefined,
              'undefined returned for unknown context variables');

  // Popping contexts
  c.pop();
  equal(c.stack.length, 1, 'Top context object removed');
  ok(c._top === c.stack[0], 'Top references top of stack')
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3}, 'Context objects not touched');

  // Popping single context
  c.pop();
  equal(c.stack.length, 1,
        'Popping has no effect if the stack has only one element');

  // 'new' keyword is optional
  c = Context({'test': true});
  ok(c.get('test'), '"new" keyword is optional');
});

test('Variable', function() {
  // Variables resolve against contexts
  var v = Variable('test');
  strictEqual(v.resolve(Context({test: 42})), 42, 'Variable resolved');
  raises(function() { v.resolve(Context()) }, VariableNotFoundError,
         'Exception thrown if context variable missing');

  // Nested lookups are supported with the . operator
  v = Variable('test.foo.bar');
  strictEqual(v.resolve(Context({test: {foo: {bar: 42}}})), 42,
              'Nested lookups performed');
  raises(function() { v.resolve(Context({test: {food: {bar: 42}}})); },
         VariableNotFoundError, 'Exception thrown for invalid nested lookups');

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
  strictEqual(Variable('test.bar').resolve(Context({
    test: {
      foo: 42,
      bar: function() { return this.foo; }
    }
  })), 42, 'Nested lookup functions called with appropriate context object');
});

test('ForNode', function() {
  var items, forloops = [];
  var f = new ForNode({'item': 'items'}, [{render: function(context) {
    forloops.push(shallowCopy(Variable('forloop').resolve(context)));
    return Variable('item').resolve(context)
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
      parentloop: undefined
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
      parentloop: undefined
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: undefined
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
      parentloop: undefined
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 2,
      revcounter0: 1,
      first: false,
      last: false,
      parentloop: undefined
    }, {
      counter: 3,
      counter0: 2,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: undefined
    }], 'Three items - forloop context as expected');

  // Multiple loop context variables
  forloops = [];
  f = new ForNode({'a, b': 'items'}, [{render: function(context) {
    forloops.push(shallowCopy(Variable('forloop').resolve(context)));
    return [Variable('a').resolve(context), Variable('a').resolve(context)];
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
      parentloop: undefined
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 2,
      revcounter0: 1,
      first: false,
      last: false,
      parentloop: undefined
    }, {
      counter: 3,
      counter0: 2,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: undefined
    }], 'Multiple loop context variables - forloop context as expected');
});

test('$for', function() {
  var items, forloops = [];
  var f = $for({'item': 'items'}, {render: function(context) {
    forloops.push(shallowCopy(Variable('forloop').resolve(context)));
    return Variable('item').resolve(context);
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
      parentloop: undefined
    }, {
      counter: 2,
      counter0: 1,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true,
      parentloop: undefined
    }], 'Two items - forloop context as expected');
});

test('TemplateText', function() {
  var c = Context({test: 42, foo: 'bar'});

  // Static text
  var t = new TemplateText('test');
  ok(!t.dynamic, 'Static text recognised');
  equal(t.render(c), 'test', 'Rendering static text');

  // Dynamic text
  t = new TemplateText('{{test}}');
  ok(t.dynamic, 'Dynamic content recognised');
  equal(t.render(c), '42', 'Rendering dynamic content');

  t = new TemplateText('{{ test }}');
  ok(t.dynamic, 'Dynamic text with whitespace in variable name recognised');
  equal(t.render(c), '42', 'Whitespace trimmed from variable name');

  t = new TemplateText('{{ test }}{{foo}}');
  ok(t.dynamic, 'Dynamic text with multiple variable names recognised');
  equal(t.render(c), '42bar', 'Rendering with multiple variable names');

  t = new TemplateText('The quick brown {{ test }} jumped over the lazy {{foo}}.');
  ok(t.dynamic, 'Mixed content recognised as dynamic');
  equal(t.render(c), 'The quick brown 42 jumped over the lazy bar.',
        'Rendering mixed content');

  t = new TemplateText('The quick brown {{ test.toExponential }} jumped over the lazy {{foo.toUpperCase}}.');
  ok(t.dynamic, 'Mixed content with variable lookup recognised as dynamic');
  equal(t.render(c), 'The quick brown 4.2e+1 jumped over the lazy BAR.',
        'Variable lookup performed');
});

})();
