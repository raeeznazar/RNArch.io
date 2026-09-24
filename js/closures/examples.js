/*
 * Closure visualizer programs
 * ---------------------------
 * Pure data for js/execution-context/visualizer.js, which closures.html reuses.
 * Same step format as js/execution-context/examples.js; these programs also use
 *   closures   several closure boxes: [{ label, mem, hl: [names to flash] }]
 *
 * Memory entries are [name, value]. U = undefined, T = uninitialized (TDZ).
 */
window.EC = window.EC || {};

(function (EC) {
  var U = EC.UNDEFINED = 'undefined';
  var T = EC.UNINITIALIZED = 'uninitialized';

  // Global context
  function G(phase, mem, hl) {
    return { name: 'Global', phase: phase, mem: mem, hl: hl || [], outer: 'null (end of chain)', thisV: 'window' };
  }

  // Function context
  function F(name, phase, mem, outer, hl, thisV) {
    return { name: name, phase: phase, mem: mem, hl: hl || [], outer: outer, thisV: thisV || 'window (undefined in strict mode)' };
  }

  // One closure box
  function C(label, mem, hl) {
    return { label: label, mem: mem, hl: hl || [] };
  }

  /* ---------- 1. outer / inner ---------- */

  var g1 = function (counter, hl) {
    return G('execution', [['outer', 'ƒ outer()'], ['counter', counter]], hl);
  };
  var innerClosure = function (count, flash) {
    return [C('inner\'s closure (outer\'s variables)', [['count', count]], flash ? ['count'] : [])];
  };

  var counterSteps = [
    { lines: [], title: 'The Global Execution Context is created', text: 'The script starts. JavaScript creates the Global context and pushes it onto the call stack. Nothing has run yet.', stack: [G('creation', [])] },
    { lines: [1, 9], title: 'Creation phase: outer and counter get memory', text: 'The function declaration outer is stored whole. const counter is reserved but stays uninitialized until line 9 runs.', stack: [G('creation', [['outer', 'ƒ outer()'], ['counter', T]], ['outer', 'counter'])] },
    { lines: [9], title: 'Calling outer() creates a new context', text: 'outer gets its own Function Execution Context on top of the stack. In its creation phase, let count is reserved and inner is stored as a function.', stack: [g1(T), F('outer()', 'creation', [['count', T], ['inner', 'ƒ inner()']], 'Global', ['count', 'inner'])] },
    { lines: [2], title: 'count = 0', text: 'outer starts running. count now holds 0, inside outer\'s own memory.', stack: [g1(T), F('outer()', 'execution', [['count', '0'], ['inner', 'ƒ inner()']], 'Global', ['count'])] },
    { lines: [3, 4, 5, 6], title: 'inner is born inside outer', text: 'When inner was created, it got a hidden link to the scope it was written in: outer\'s variables. That link is the closure. It exists from the moment inner is created.', stack: [g1(T), F('outer()', 'execution', [['count', '0'], ['inner', 'ƒ inner()']], 'Global')], closures: innerClosure('0') },
    { lines: [7, 9], title: 'outer returns inner and is popped', text: 'outer is finished, so its context leaves the stack. You might expect count to be destroyed. It isn\'t: inner still references it, so JavaScript keeps it alive. counter now holds inner.', stack: [g1('ƒ inner()', ['counter'])], closures: innerClosure('0') },
    { lines: [10], title: 'counter() pushes a context for inner', text: 'Calling counter really calls inner. Its context has no variables of its own. Its outer reference points to the closure, not to Global.', stack: [g1('ƒ inner()'), F('inner()', 'creation', [], 'closure of outer()')], closures: innerClosure('0') },
    { lines: [4], title: 'count++ updates the closure', text: 'count isn\'t in inner\'s memory, so JavaScript follows the outer reference into the closure and increments it there. count is now 1.', stack: [g1('ƒ inner()'), F('inner()', 'execution', [], 'closure of outer()')], closures: innerClosure('1', true) },
    { lines: [5, 10], title: 'Prints 1, context popped', text: 'console.log(count) prints 1. inner\'s context is popped, but the closure stays exactly as it is.', stack: [g1('ƒ inner()')], closures: innerClosure('1'), out: ['1'] },
    { lines: [11, 4, 5], title: 'Second call: 2', text: 'A brand-new context for this call, linked to the same closure. count goes from 1 to 2.', stack: [g1('ƒ inner()'), F('inner()', 'execution', [], 'closure of outer()')], closures: innerClosure('2', true), out: ['1', '2'] },
    { lines: [12, 4, 5], title: 'Third call: 3', text: 'Same closure again, so the value keeps growing. The state lives between calls.', stack: [g1('ƒ inner()'), F('inner()', 'execution', [], 'closure of outer()')], closures: innerClosure('3', true), out: ['1', '2', '3'] },
    { lines: [], title: 'Finished', text: 'outer ran once and returned long ago, yet count kept counting. The function inner has closed over count.', stack: [g1('ƒ inner()')], closures: innerClosure('3'), out: ['1', '2', '3'], done: true }
  ];

  /* ---------- 2. Two independent counters ---------- */

  var g2 = function (c1, c2, hl) {
    return G('execution', [['createCounter', 'ƒ createCounter()'], ['counter1', c1], ['counter2', c2]], hl);
  };
  var both = function (a, b, flashA, flashB) {
    return [
      C('counter1\'s closure', [['count', a]], flashA ? ['count'] : []),
      C('counter2\'s closure', [['count', b]], flashB ? ['count'] : [])
    ];
  };
  var anon = 'ƒ anonymous()';
  var callCtx = function (name) { return F(name, 'execution', [], 'closure of ' + name.replace('()', '')); };

  var twoCounterSteps = [
    { lines: [1, 8, 9], title: 'Creation phase', text: 'createCounter is stored whole. counter1 and counter2 are reserved but uninitialized.', stack: [G('creation', [['createCounter', 'ƒ createCounter()'], ['counter1', T], ['counter2', T]], ['createCounter', 'counter1', 'counter2'])] },
    { lines: [8, 2], title: 'First call to createCounter()', text: 'A new context is pushed, with its own count = 0.', stack: [g2(T, T), F('createCounter()', 'execution', [['count', '0']], 'Global', ['count'])] },
    { lines: [3, 4, 5, 6, 8], title: 'counter1 gets a function and a closure', text: 'The returned function remembers this call\'s count. The context is popped; its count lives on in counter1\'s closure.', stack: [g2(anon, T, ['counter1'])], closures: [C('counter1\'s closure', [['count', '0']])] },
    { lines: [9, 2], title: 'Second call to createCounter()', text: 'Each call creates a new lexical environment. This context has a completely separate count = 0.', stack: [g2(anon, T), F('createCounter()', 'execution', [['count', '0']], 'Global', ['count'])], closures: [C('counter1\'s closure', [['count', '0']])] },
    { lines: [3, 4, 5, 6, 9], title: 'counter2 gets its own closure', text: 'Two functions, two closures, two different count variables. They don\'t share anything.', stack: [g2(anon, anon, ['counter2'])], closures: both('0', '0') },
    { lines: [11, 4, 5], title: 'counter1() → 1', text: 'Only counter1\'s closure changes.', stack: [g2(anon, anon), callCtx('counter1()')], closures: both('1', '0', true), out: ['1'] },
    { lines: [12, 4, 5], title: 'counter1() → 2', text: 'Same closure, count keeps growing.', stack: [g2(anon, anon), callCtx('counter1()')], closures: both('2', '0', true), out: ['1', '2'] },
    { lines: [13, 4, 5], title: 'counter1() → 3', text: 'counter2\'s count is still untouched at 0.', stack: [g2(anon, anon), callCtx('counter1()')], closures: both('3', '0', true), out: ['1', '2', '3'] },
    { lines: [15, 4, 5], title: 'counter2() → 1', text: 'counter2 follows its own outer reference to its own count, which goes from 0 to 1. That\'s why it starts from 1.', stack: [g2(anon, anon), callCtx('counter2()')], closures: both('3', '1', false, true), out: ['1', '2', '3', '1'] },
    { lines: [], title: 'Finished', text: 'Every call to createCounter() made a fresh count. Each returned function keeps its own.', stack: [g2(anon, anon)], closures: both('3', '1'), out: ['1', '2', '3', '1'], done: true }
  ];

  /* ---------- 3. setTimeout ---------- */

  var g3 = G('execution', [['test', 'ƒ test()']]);
  var timerClosure = [C('callback\'s closure (test\'s variables)', [['name', '"John"']])];

  var timeoutSteps = [
    { lines: [1], title: 'Creation phase', text: 'The Global context stores test as a function.', stack: [G('creation', [['test', 'ƒ test()']], ['test'])] },
    { lines: [7], title: 'test() is called', text: 'A new context is pushed. let name is reserved.', stack: [g3, F('test()', 'creation', [['name', T]], 'Global', ['name'])] },
    { lines: [2], title: 'name = "John"', text: 'name now holds "John", in test\'s own memory.', stack: [g3, F('test()', 'execution', [['name', '"John"']], 'Global', ['name'])] },
    { lines: [3, 4, 5], title: 'setTimeout gets a callback', text: 'The arrow function is created here, inside test, so it closes over name. setTimeout hands it to the timer system (the browser or React Native runtime) and returns immediately.', stack: [g3, F('test()', 'execution', [['name', '"John"']], 'Global')], closures: timerClosure },
    { lines: [6], title: 'test() finishes and is popped', text: 'test is done and its context is gone. The callback hasn\'t run yet, but it still holds name through its closure.', stack: [g3], closures: timerClosure },
    { lines: [], title: '1 second passes…', text: 'The call stack is idle. Only the waiting callback and its closure remain.', stack: [g3], closures: timerClosure },
    { lines: [3, 4], title: 'The callback runs', text: 'The timer fires and the callback is pushed onto the stack. It looks up name, doesn\'t find it locally, and follows its outer reference into the closure.', stack: [g3, F('callback()', 'execution', [], 'closure of test()')], closures: [C('callback\'s closure (test\'s variables)', [['name', '"John"']], ['name'])] },
    { lines: [4], title: 'Prints John', text: 'Even though test() finished a second ago, the callback still prints "John".', stack: [g3], closures: timerClosure, out: ['John'], done: true }
  ];

  EC.examples = [
    {
      id: 'counter',
      label: 'outer / inner',
      code: [
        'function outer() {',
        '  let count = 0;',
        '  function inner() {',
        '    count++;',
        '    console.log(count);',
        '  }',
        '  return inner;',
        '}',
        'const counter = outer();',
        'counter(); // 1',
        'counter(); // 2',
        'counter(); // 3'
      ],
      steps: counterSteps
    },
    {
      id: 'two-counters',
      label: 'Two counters',
      code: [
        'function createCounter() {',
        '  let count = 0;',
        '  return function () {',
        '    count++;',
        '    return count;',
        '  };',
        '}',
        'const counter1 = createCounter();',
        'const counter2 = createCounter();',
        '',
        'console.log(counter1()); // 1',
        'console.log(counter1()); // 2',
        'console.log(counter1()); // 3',
        '',
        'console.log(counter2()); // 1'
      ],
      steps: twoCounterSteps
    },
    {
      id: 'timeout',
      label: 'setTimeout',
      code: [
        'function test() {',
        '  let name = "John";',
        '  setTimeout(() => {',
        '    console.log(name);',
        '  }, 1000);',
        '}',
        'test();'
      ],
      steps: timeoutSteps
    }
  ];
})(window.EC);
