module('Template');

(function() {

var templates = DOMBuilder.template;

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
  var c = new templates.Context(content);
  equal(c.stack.length, 1, 'Stack is initialised with a single context');
  ok(c.stack[0] === content, 'Initial context object is the given object');

  // Instantiation
  var c = new templates.Context();
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
  raises(function() { c.pop(); }, templates.ContextPopError, 'Calling pop() too much');

  // Pushing accepts a new context object
  c.push({'pushed': 'yes'});
  equal(c.stack.length, 2, 'Context object added');
  equal(c.get('pushed'), 'yes', 'Provided context was used');

  // 'new' keyword is optional
  c = templates.Context({'test': true});
  ok(c.get('test'), '"new" keyword is optional');
});

test('BlockContext', function() {
  var b = new templates.BlockContext();
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
  var v = new templates.Variable('test');
  strictEqual(v.resolve(templates.Context({test: 42})), 42, 'Variable resolved');
  raises(function() { v.resolve(templates.Context()) }, templates.VariableNotFoundError,
         'Exception thrown if context variable missing');

  // Nested lookups are supported with the . operator
  v = new templates.Variable('test.foo.bar');
  strictEqual(v.resolve(templates.Context({test: {foo: {bar: 42}}})), 42,
              'Nested lookups performed');
  raises(function() { v.resolve(templates.Context({test: {food: {bar: 42}}})); },
         templates.VariableNotFoundError, 'Exception thrown for invalid nested lookups');
  raises(function() { v.resolve(templates.Context({test: null})); },
         templates.VariableNotFoundError,
         'Attempted lookup on null raises appropriate error');
  raises(function() { v.resolve(templates.Context({test: undefined})); },
         templates.VariableNotFoundError,
        'Attempted lookup on undefined raises appropriate error');

  // Functions found during variable resolution will be called
  strictEqual(v.resolve(templates.Context({
    test: function() {
      return {
        foo: function() {
          return {bar: 42};
        }
      }
    }
  })), 42, 'Functions are called if part of lookup path');
  strictEqual(new templates.Variable('test.bar').resolve(templates.Context({
    test: {
      foo: 42,
      bar: function() { return this.foo; }
    }
  })), 42, 'Nested lookup functions called with appropriate context object');
});

test('ForNode', function() {
  var items, forloops = [];
  var f = templates.$for({'item': 'items'}, {render: function(context) {
    forloops.push(shallowCopy(new templates.Variable('forloop').resolve(context)));
    return new templates.Variable('item').resolve(context)
  }})

  // Zero items
  items = f.render(templates.Context({'items': []}));
  deepEqual(items, [], 'Zero items - item context as expected');
  deepEqual(forloops, [], 'Zero items - forloop context as expected');

  // SIngle item
  items = f.render(templates.Context({'items': [1]}));
  deepEqual(items, [1], 'Single item - item context as expected');
  deepEqual(forloops, [{
      parentloop: {},
      counter: 1,
      counter0: 0,
      revcounter: 1,
      revcounter0: 0,
      first: true,
      last: true
    }], 'Single item - forloop context as expected');

  // Two items
  forloops = [];
  items = f.render(templates.Context({'items': [1,2]}));
  deepEqual(items, [1,2], 'Two items - item context as expected');
  deepEqual(forloops, [{
      parentloop: {},
      counter: 1,
      counter0: 0,
      revcounter: 2,
      revcounter0: 1,
      first: true,
      last: false
    }, {
      parentloop: {},
      counter: 2,
      counter0: 1,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true
    }], 'Two items - forloop context as expected');

  // Three items
  forloops = [];
  items = f.render(templates.Context({'items': [1,2,3]}));
  deepEqual(items, [1,2,3], 'Three items - item context as expected');
  deepEqual(forloops, [{
      parentloop: {},
      counter: 1,
      counter0: 0,
      revcounter: 3,
      revcounter0: 2,
      first: true,
      last: false
    }, {
      parentloop: {},
      counter: 2,
      counter0: 1,
      revcounter: 2,
      revcounter0: 1,
      first: false,
      last: false
    }, {
      parentloop: {},
      counter: 3,
      counter0: 2,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true
    }], 'Three items - forloop context as expected');

  // Multiple loop context variables
  forloops = [];
  f = templates.$for({'a, b': 'items'}, {render: function(context) {
    forloops.push(shallowCopy(new templates.Variable('forloop').resolve(context)));
    return [new templates.Variable('a').resolve(context),
            new templates.Variable('a').resolve(context)];
  }});
  items = f.render(templates.Context({'items': [[1,1],[2,2],[3,3]]}));
  deepEqual(items, [[1,1],[2,2],[3,3]],
            'Multiple loop context variables - item context as expected');
  deepEqual(forloops, [{
      parentloop: {},
      counter: 1,
      counter0: 0,
      revcounter: 3,
      revcounter0: 2,
      first: true,
      last: false
    }, {
      parentloop: {},
      counter: 2,
      counter0: 1,
      revcounter: 2,
      revcounter0: 1,
      first: false,
      last: false
    }, {
      parentloop: {},
      counter: 3,
      counter0: 2,
      revcounter: 1,
      revcounter0: 0,
      first: false,
      last: true
    }], 'Multiple loop context variables - forloop context as expected');

  f = templates.$for({'item': 'items'}, templates.$empty('No items.'));
  deepEqual(f.render(templates.Context({items: []})),
            ['No items.'],
            '$empty contents rendered when list is empty');
});

test('IfNode', function() {
  var c = templates.Context({a: 41, b: 42, c: 43, d: '43', e: 43, f: true});

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
    strictEqual(templates.$if(expr[0]).test(c), expr[1], 'Valid: ' + expr[0]);
  }

  // Invalid or unsupported expressions
  var invalidExprs = [
    'a >> b'
  , '(a > b'
  , ')a > b'
  , '""" > b'
  ];
  for (var i = 0, expr; expr = invalidExprs[i]; i++) {
    raises(function() { templates.$if(expr) },
           templates.TemplateSyntaxError,
           'Invalid: ' + expr);
  }

  var if_ = templates.$if('test > 4', {
    render: function(context) {
      return new templates.Variable('a').resolve(context);
    }
  }, templates.$else('{{ test }} displeased me.'));

  c = templates.Context({test: 5, a: 42});
  deepEqual(if_.render(c), [42], 'Returns $if contents when condition is true');
  c.set('test', 4);
  deepEqual(if_.render(c),
            [[4, ' displeased me.']],
            'Returns $else contents when condition is false');
});

test('TextNode', function() {
  var c = templates.Context({test: 42, foo: 'bar'});

  // Static text
  var t = templates.$text('test');
  ok(!t.dynamic, 'Static text recognised');
  equal(t.render(c), 'test', 'Rendering static text');

  // Dynamic text
  t = templates.$text('{{test}}');
  ok(t.dynamic, 'Dynamic content recognised');
  deepEqual(t.render(c), [42], 'Rendering dynamic content');

  t = templates.$text('{{ test }}');
  ok(t.dynamic, 'Dynamic text with whitespace in variable name recognised');
  deepEqual(t.render(c), [42], 'Whitespace trimmed from variable name');

  t = templates.$text('{{ test }}{{foo}}');
  ok(t.dynamic, 'Dynamic text with multiple variable names recognised');
  deepEqual(t.render(c), [42, 'bar'], 'Rendering with multiple variable names');

  t = templates.$text('The quick brown {{ test }} jumped over the lazy {{foo}}.');
  ok(t.dynamic, 'Mixed content recognised as dynamic');
  deepEqual(t.render(c), ['The quick brown ', 42, ' jumped over the lazy ', 'bar', '.'],
            'Rendering mixed content');

  t = templates.$text('The quick brown {{ test.toExponential }} jumped over the lazy {{foo.toUpperCase}}.');
  ok(t.dynamic, 'Mixed content with variable lookup recognised as dynamic');
  deepEqual(t.render(c), ['The quick brown ', '4.2e+1', ' jumped over the lazy ', 'BAR', '.'],
            'Variable lookup performed');
});

test('BlockNode', function() {
  var c1 = {render: function(context) { return 'parent'; }}
  var c2 = {render: function(context) { return 'child'; }}
  var b1 = templates.$block('foo', c1);
  var b2 = templates.$block({name: 'foo'}, templates.$var('block.super'), c2);
  equal(b1.name, 'foo', 'Block name as String argument');
  equal(b2.name, 'foo', 'Block name as Object argument');
  var c = templates.Context();
  c.renderContext.set('blockContext', new templates.BlockContext());
  var bc = c.renderContext.get('blockContext');
  bc.addBlocks({'foo': b2});
  bc.addBlocks({'foo': b1});
  deepEqual(b2.render(c), [['parent'], 'child'], 'block.super renders parent contents');
});

test('Template', function() {
  var c1 = {render: function(context) { return 'parent'; }}
  var c2 = {render: function(context) { return 'child'; }}
  var b1 = templates.$block('foo', c1);
  var b2 = templates.$block({name: 'foo'}, templates.$text('{{ block.super }} then '), c2);
  var t1 = templates.$template({name: 'bar'}, b1);
  var t2 = templates.$template({name: 'baz', extend: 'bar'}, b2);
  var c = templates.Context();

  var result = DOMBuilder.withMode('html', function() { return t2.render(c) });
  deepEqual(''+result, 'parent then child',
            'Template sets up block inheritance correctly');

  var base, child;
  with (templates) {
    base = $template({name: 'base'}
    , HTML(
        HEAD(TITLE(
          $block('fulltitle'
          , 'Test Template | ', $block('subtitle', 'Default Subtitle')
          )
        ))
      , BODY(
          DIV({id: 'main'}
          , $block('content', 'Default Content')
          )
        )
      )
    );

    child = $template({name: 'child', extend: 'base'}
    , $block('subtitle'
      , 'Child Subtitle'
      )
    , $block('content'
      , '{{ message }}'
      )
    );
  }

  c = templates.Context({message: 'Child Content'});
  result = DOMBuilder.withMode('html', function() {
    return child.render(c);
  });
  equal(''+result,
'<html>' +
'<head><title>Test Template | Child Subtitle</title></head>' +
'<body><div id="main">Child Content</div></body>' +
'</html>');

  raises(function() {
      templates.$template({name: 'test', extend: 'missing'}).render(templates.Context());
    },
    templates.TemplateNotFoundError,
    'Missing parent template throws TemplateNotFoundError');
});

test('IncludeNode', function() {
  var includer;
  with(templates) {
    $template({name: 'included'}
    , '{{ arg }}'
    , $for({item: 'items'}
      , P('{{ item.name }}')
      )
    );

    includer = $template({name: 'includer'}
    , 'Before >'
    , $include('included', {arg: 'Extra Context'})
    , '< After'
    );
  }

  var c = templates.Context({items: [{name: 1}, {name: 2}, {name: 3}]});
  var result = DOMBuilder.withMode('html', function() {
    return includer.render(c);
  });
  equal(''+result,
        'Before &gt;Extra Context<p>1</p><p>2</p><p>3</p>&lt; After',
        'Context and extra context available in included template');
  strictEqual(c.get('arg'), null, 'Extra context was removed');
});

test('CycleNode', function() {
  // With constants and variables
  var cycle = new templates.CycleNode(['a', templates.$var('b'), 'c']);
  equal(cycle.id, 'cycle1', ' Expected id generated');
  strictEqual(cycle.variableName, null, 'Default variable name is null');
  strictEqual(cycle.silent, false, 'Not silent by default');

  var c = templates.Context({b: 'foo'});
  equal(cycle.render(c), 'a', 'First render produces first item');
  strictEqual(c.renderContext.get('cycle1'), 1, 'Next index set in RenderContext');
  deepEqual(c.stack[0], {b: 'foo'}, 'Nothing added to context');
  equal(cycle.render(c), 'foo', 'Variables are resolved');
  strictEqual(c.renderContext.get('cycle1'), 2, 'Next index set in RenderContext');
  equal(cycle.render(c), 'c', 'Next item');
  strictEqual(c.renderContext.get('cycle1'), 0, 'Next index moves back to the start');

  // Options
  cycle = new templates.CycleNode(['a', 'b', 'c'], {as: 'bar', silent: true});
  equal(cycle.id, 'cycle2', ' Expected id generated');
  equal(cycle.variableName, 'bar', 'Variable name set');
  strictEqual(cycle.silent, true, 'silent set');
  c = templates.Context();
  deepEqual(cycle.render(c), [], 'Nothing rendered (empty list)');
  equal(c.get('bar'), 'a', 'Value added to context');
});

test('ElementNode', function() {
  var el = new templates.ElementNode('p', {id: 'item{{ foo }}'}, ['Content']);
  strictEqual(el.dynamicAttrs, true, 'Dynamic attributes detected');
  var c = templates.Context({foo: 42});
  var result = DOMBuilder.withMode('html', function() {
    return el.render(c);
  });
  equal(''+result, '<p id="item42">Content</p>', 'Variable in attribute replaced');

  var cycleAttr;
  with(templates) {
    cycleAttr = $template({name: 'cycleAttr'}
    , $for({item: 'items'}
      , P({id: 'item{{ forloop.counter }}'
        , 'class': $cycle(['foo', 'bar', 'baz'])}
        , '{{ item }}'
        )
      )
    );
  }
  c = templates.Context({items: [1,2,3,4]});
  result = DOMBuilder.withMode('html', function() {
    return cycleAttr.render(c);
  });
  equal(''+result,
        '<p id="item1" class="foo">1</p>' +
        '<p id="item2" class="bar">2</p>' +
        '<p id="item3" class="baz">3</p>' +
        '<p id="item4" class="foo">4</p>',
        'TemplateNodes are rendered as attributes');
});

})();
