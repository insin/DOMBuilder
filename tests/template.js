module("Template");

(function() {

function shallowCopy(a) {
  var b = {};
  for (var prop in a) {
    b[prop] = a[prop];
  }
  return b;
}

test("Context", function() {
  // Instantiation with context
  var content = {test1: 1, test2: 2};
  var c = new Context(content);
  equal(c.stack.length, 1, 'Stack is initialised with a single context');
  ok(c.top === c.stack[0], 'Initial top is reference to top of stack');
  ok(c.top === content, 'Initial context object is the given object');

  // Instantiation
  var c = new Context();
  equal(c.stack.length, 1, 'Stack is initialised with a single context');
  ok(c.top === c.stack[0], 'Initial top is reference to top of stack')
  deepEqual(c.top, {}, 'Initial context object is empty');

  // Setting and getting variables
  c.set('test', 42);
  deepEqual(c.top, {test: 42}, 'Variable added to top context object');
  strictEqual(c.resolve('test'), 42, 'Set values resolve via string');
  strictEqual(c.resolve(new Variable('test')), 42, 'Set values resolve via Variable');
  strictEqual(c.resolve($var('test')), 42, 'Set values resolve via Variable created with $var');
  strictEqual(c.resolve('missing'), undefined, 'null returned for unknown context variables');
  raises(function() { c.resolveRequired('missing'); }, VariableNotFoundError, 'Exception thrown if required context variable missing');

  // Setting multiple variables
  c.zip(['a', 'b'], [2, 3]);
  deepEqual(c.top, {test: 42, a: 2, b: 3}, 'Variables added to top context object');

  // Pushing a new context
  c.push();
  equal(c.stack.length, 2, 'Stack gained a new context object');
  ok(c.top === c.stack[1], 'Top references top of stack')
  deepEqual(c.top, {}, 'Initial context object is empty');

  // Setting variables in new context
  c.set('stack', 99);
  deepEqual(c.top, {stack: 99}, 'Top context object modified');
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3}, 'Other context objects not touched');

  // Getting variables with multiple contexts in play
  strictEqual(c.resolve('stack'), 99, 'Top context variable resolves');
  strictEqual(c.resolve('test'), 42, 'Prior context objects searched');
  strictEqual(c.resolve('missing'), undefined, 'null returned for unknown context variables');
  raises(function() { c.resolveRequired('missing'); }, VariableNotFoundError, 'Exception thrown if required context variable missing');

  // Popping contexts
  c.pop();
  equal(c.stack.length, 1, 'Top context object removed');
  ok(c.top === c.stack[0], 'Top references top of stack')
  deepEqual(c.stack[0], {test: 42, a: 2, b: 3}, 'Context objects not touched');

  // Popping single context
  c.pop();
  equal(c.stack.length, 1, 'Popping has no effect if the stack has only one element');

  // 'new' keyword is optional
  c = Context({'test': true});
  ok(c.resolve('test'), '"new" keyword is optional');
});

test("ForNode", function() {
  var items, forloops = [];
  var f = new ForNode({'item': 'items'}, [{render: function(context) {
    forloops.push(shallowCopy(context.resolve('forloop')));
    return context.resolve('item')
  }}])

  // Zero items
  items = f.render(new Context({'items': []}));
  deepEqual(items, [], 'Zero items - item context as expected');
  deepEqual(forloops, [], 'Zero items - forloop context as expected');

  // SIngle item
  items = f.render(new Context({'items': [1]}));
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

  // Three items
  forloops = [];
  items = f.render(new Context({'items': [1,2,3]}));
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
    forloops.push(shallowCopy(context.resolve('forloop')));
    return [context.resolve('a'), context.resolve('b')];
  }}])
  items = f.render(new Context({'items': [[1,1],[2,2],[3,3]]}));
  deepEqual(items, [[1,1],[2,2],[3,3]], 'Multiple loop context variables - item context as expected');
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
    forloops.push(shallowCopy(context.resolve('forloop')));
    return context.resolve('item')
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

})();