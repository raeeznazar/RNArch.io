/*
 * Visualizer programs
 * -------------------
 * Pure data: each example is a short program plus the steps the engine takes.
 * Edit or add examples here; js/execution-context/visualizer.js draws them.
 *
 * Step fields:
 *   lines      line numbers to highlight (1-based)
 *   title/text narration
 *   stack      contexts from bottom (Global) to top, made with G() / F()
 *   out        console output so far
 *   error      error message shown in the console (with err: true)
 *   done       true on the final "finished" step
 *   search     { path: [context names searched], found: [context, variable] }
 *   closure    memory kept alive off the stack, e.g. [['count', '0']]
 *   closureHl  flash the closure's value
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

  EC.examples = [
    /* ---------- 1. The basics ---------- */
    {
      id: 'basics',
      label: 'The basics',
      code: [
        'var x = 10;',
        'function double(n) {',
        '  var result = n * 2;',
        '  return result;',
        '}',
        'var y = double(x);',
        'console.log(y);'
      ],
      steps: [
        { lines: [], title: 'The Global Execution Context is created', text: 'Before any line runs, JavaScript creates the Global Execution Context and pushes it onto the call stack. It also sets this to the window object (in a browser). Memory is still empty.', stack: [G('creation', [])] },
        { lines: [1], title: 'Creation phase: found var x', text: 'The engine scans the code looking for declarations. It finds var x and reserves memory for it. The value is set to undefined. The 10 is not assigned yet, that happens later.', stack: [G('creation', [['x', U]], ['x'])] },
        { lines: [2, 3, 4, 5], title: 'Creation phase: found function double', text: 'Function declarations are stored completely, body and all. That is why you can call a function declaration before the line where it is written. Note the engine does not look inside the body yet.', stack: [G('creation', [['x', U], ['double', 'ƒ double(n)']], ['double'])] },
        { lines: [6], title: 'Creation phase: found var y', text: 'y gets memory too, with the value undefined. The scan is complete.', stack: [G('creation', [['x', U], ['double', 'ƒ double(n)'], ['y', U]], ['y'])] },
        { lines: [1], title: 'Execution phase begins: x = 10', text: 'Now the code actually runs, top to bottom. Line 1 replaces undefined with 10.', stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', U]], ['x'])] },
        { lines: [2, 3, 4, 5], title: 'Skipping the function body', text: 'The function was already saved during the creation phase, so there is nothing to do here. Its body only runs when someone calls it.', stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', U]])] },
        { lines: [6], title: 'Calling double(x) creates a new context', text: 'A function call creates a brand-new Function Execution Context and pushes it on top of the stack. It runs its own creation phase: parameter n receives the argument 10, and var result is set to undefined.', stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', U]]), F('double()', 'creation', [['n', '10'], ['result', U]], 'Global', ['n', 'result'])] },
        { lines: [3], title: 'Running inside double', text: 'The new context is now in its execution phase. result = n * 2, so result becomes 20. Notice this happens in double\'s own memory, not in Global.', stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', U]]), F('double()', 'execution', [['n', '10'], ['result', '20']], 'Global', ['result'])] },
        { lines: [4, 6], title: 'return pops the context off the stack', text: 'return sends 20 back to line 6. The function is finished, so its context is popped off the stack and n and result are thrown away. Back in Global, y becomes 20.', stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', '20']], ['y'])] },
        { lines: [7], title: 'console.log(y) prints 20', text: 'console.log is a function too, so it briefly gets its own context, prints, and is popped right away.', stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', '20']])], out: ['20'] },
        { lines: [], title: 'Program finished', text: 'Every line has run. The Global Execution Context stays on the stack until the page is closed, which is why global variables stay around.', done: true, stack: [G('execution', [['x', '10'], ['double', 'ƒ double(n)'], ['y', '20']])], out: ['20'] }
      ]
    },

    /* ---------- 2. Hoisting & TDZ ---------- */
    {
      id: 'hoisting',
      label: 'Hoisting & TDZ',
      code: [
        'console.log(a);',
        'console.log(sayHi());',
        'console.log(b);',
        'var a = 1;',
        'let b = 2;',
        'function sayHi() {',
        '  return "hi";',
        '}'
      ],
      steps: [
        { lines: [], title: 'The Global Execution Context is created', text: 'Same as always: create the global context, push it onto the stack, and start the creation phase.', stack: [G('creation', [])] },
        { lines: [4], title: 'Creation phase: var a becomes undefined', text: 'var a is found on line 4, but memory is reserved for it right now, before line 1 has run. Its value is undefined.', stack: [G('creation', [['a', U]], ['a'])] },
        { lines: [5], title: 'Creation phase: let b is uninitialized', text: 'let and const are hoisted as well, but they are left uninitialized. From the start of the scope until line 5 runs, b is in the Temporal Dead Zone (TDZ). Reading it in that zone throws an error.', stack: [G('creation', [['a', U], ['b', T]], ['b'])] },
        { lines: [6, 7, 8], title: 'Creation phase: sayHi is stored whole', text: 'The function declaration is stored completely, so it is fully usable from the very first line.', stack: [G('creation', [['a', U], ['b', T], ['sayHi', 'ƒ sayHi()']], ['sayHi'])] },
        { lines: [1], title: 'Line 1 prints undefined', text: 'a exists in memory but still holds undefined, because line 4 hasn\'t run yet. No error, just undefined. This is the classic hoisting surprise.', stack: [G('execution', [['a', U], ['b', T], ['sayHi', 'ƒ sayHi()']])], out: ['undefined'] },
        { lines: [2], title: 'Line 2 calls sayHi()', text: 'sayHi already exists in memory, so calling it works. A new context is pushed. It has no variables of its own.', stack: [G('execution', [['a', U], ['b', T], ['sayHi', 'ƒ sayHi()']]), F('sayHi()', 'creation', [], 'Global')], out: ['undefined'] },
        { lines: [7], title: 'sayHi returns "hi"', text: 'The function runs its one line and returns the string "hi".', stack: [G('execution', [['a', U], ['b', T], ['sayHi', 'ƒ sayHi()']]), F('sayHi()', 'execution', [], 'Global')], out: ['undefined'] },
        { lines: [2], title: 'Context popped, "hi" is printed', text: 'sayHi\'s context leaves the stack and console.log prints the returned value.', stack: [G('execution', [['a', U], ['b', T], ['sayHi', 'ƒ sayHi()']])], out: ['undefined', 'hi'] },
        { lines: [3], err: true, title: 'Line 3 throws a ReferenceError', text: 'b is still in the Temporal Dead Zone. JavaScript throws "Cannot access \'b\' before initialization" and the script stops. Lines 4 and 5 never run.', stack: [G('execution', [['a', U], ['b', T], ['sayHi', 'ƒ sayHi()']], ['b'])], out: ['undefined', 'hi'], error: "ReferenceError: Cannot access 'b' before initialization" }
      ]
    },

    /* ---------- 3. Scope chain ---------- */
    {
      id: 'scope',
      label: 'Scope chain',
      code: [
        'var color = "blue";',
        'function outer() {',
        '  var size = "big";',
        '  function inner() {',
        '    console.log(size, color);',
        '  }',
        '  inner();',
        '}',
        'outer();'
      ],
      steps: [
        { lines: [], title: 'The Global Execution Context is created', text: 'Global context pushed. Its outer reference is null, because nothing is outside the global scope.', stack: [G('creation', [])] },
        { lines: [1], title: 'Creation phase: var color', text: 'color gets memory with the value undefined.', stack: [G('creation', [['color', U]], ['color'])] },
        { lines: [2, 3, 4, 5, 6, 7, 8], title: 'Creation phase: function outer', text: 'outer is stored whole. Note that inner is NOT created yet, because it lives inside outer\'s body, which hasn\'t been touched.', stack: [G('creation', [['color', U], ['outer', 'ƒ outer()']], ['outer'])] },
        { lines: [1], title: 'Execution: color = "blue"', text: 'The first real assignment happens.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']], ['color'])] },
        { lines: [9], title: 'Calling outer() creates its context', text: 'outer\'s context is pushed. In its creation phase, size becomes undefined and inner is stored whole. Its outer reference points to Global, because that is where outer was written.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']]), F('outer()', 'creation', [['size', U], ['inner', 'ƒ inner()']], 'Global', ['size', 'inner'])] },
        { lines: [3], title: 'Execution inside outer: size = "big"', text: 'size is assigned in outer\'s own memory.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']]), F('outer()', 'execution', [['size', '"big"'], ['inner', 'ƒ inner()']], 'Global', ['size'])] },
        { lines: [7], title: 'Calling inner() pushes a third context', text: 'inner was written inside outer, so inner\'s outer reference points to outer\'s context. This chain of outer references (inner → outer → Global) is the scope chain.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']]), F('outer()', 'execution', [['size', '"big"'], ['inner', 'ƒ inner()']], 'Global'), F('inner()', 'creation', [], 'outer()')] },
        { lines: [5], title: 'Looking up size', text: 'inner has no size in its own memory. JavaScript follows the outer reference to outer() and finds size = "big" there. The dashed boxes show where it searched.', search: { path: ['inner()', 'outer()'], found: ['outer()', 'size'] }, stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']]), F('outer()', 'execution', [['size', '"big"'], ['inner', 'ƒ inner()']], 'Global'), F('inner()', 'execution', [], 'outer()')] },
        { lines: [5], title: 'Looking up color', text: 'color is not in inner, and not in outer either. The engine keeps following the chain to Global and finds "blue". Then console.log prints both values.', search: { path: ['inner()', 'outer()', 'Global'], found: ['Global', 'color'] }, stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']]), F('outer()', 'execution', [['size', '"big"'], ['inner', 'ƒ inner()']], 'Global'), F('inner()', 'execution', [], 'outer()')], out: ['big blue'] },
        { lines: [6], title: 'inner finishes and is popped', text: 'inner\'s context leaves the stack. Control goes back to outer, right after the inner() call.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']]), F('outer()', 'execution', [['size', '"big"'], ['inner', 'ƒ inner()']], 'Global')], out: ['big blue'] },
        { lines: [8], title: 'outer finishes and is popped', text: 'outer\'s context leaves the stack, and its size and inner are discarded. Only Global remains.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']])], out: ['big blue'] },
        { lines: [], done: true, title: 'Program finished', text: 'Key idea: a variable lookup walks up the chain of places where the code was written. It never looks down into inner functions or sideways into unrelated ones.', stack: [G('execution', [['color', '"blue"'], ['outer', 'ƒ outer()']])], out: ['big blue'] }
      ]
    },

    /* ---------- 4. Closure ---------- */
    {
      id: 'closure',
      label: 'Closure',
      code: [
        'function makeCounter() {',
        '  let count = 0;',
        '  return function () {',
        '    count = count + 1;',
        '    return count;',
        '  };',
        '}',
        'const counter = makeCounter();',
        'console.log(counter());',
        'console.log(counter());'
      ],
      steps: [
        { lines: [], title: 'The Global Execution Context is created', text: 'Global context pushed, creation phase begins.', stack: [G('creation', [])] },
        { lines: [1, 2, 3, 4, 5, 6, 7], title: 'Creation phase: makeCounter stored', text: 'The whole function is saved in memory.', stack: [G('creation', [['makeCounter', 'ƒ makeCounter()']], ['makeCounter'])] },
        { lines: [8], title: 'Creation phase: const counter', text: 'const counter is hoisted but uninitialized (TDZ) until line 8 runs.', stack: [G('creation', [['makeCounter', 'ƒ makeCounter()'], ['counter', T]], ['counter'])] },
        { lines: [8], title: 'Calling makeCounter()', text: 'A new context is pushed. In its creation phase, let count is hoisted as uninitialized.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', T]]), F('makeCounter()', 'creation', [['count', T]], 'Global', ['count'])] },
        { lines: [2], title: 'count = 0', text: 'count is initialized inside makeCounter\'s memory.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', T]]), F('makeCounter()', 'execution', [['count', '0']], 'Global', ['count'])] },
        { lines: [3, 4, 5, 6], title: 'A function is created and returned', text: 'makeCounter creates a new anonymous function. At birth, that function remembers the scope it was created in, including count. This remembered scope is the closure.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', T]]), F('makeCounter()', 'execution', [['count', '0']], 'Global')], closure: [['count', '0']] },
        { lines: [8], title: 'makeCounter is popped, but count survives', text: 'makeCounter\'s context leaves the stack. Normally count would be deleted, but the returned function still needs it, so JavaScript keeps it alive in the closure. counter now holds that function.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']], ['counter'])], closure: [['count', '0']] },
        { lines: [9], title: 'First call: counter()', text: 'A fresh context is pushed for this call. It has no variables of its own. Its outer reference points to the closure, not to Global.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']]), F('counter()', 'creation', [], 'closure of makeCounter')], closure: [['count', '0']] },
        { lines: [4], title: 'count = count + 1 updates the closure', text: 'count isn\'t in counter\'s own memory, so JavaScript follows the outer reference into the closure and updates it there. count is now 1.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']]), F('counter()', 'execution', [], 'closure of makeCounter')], closure: [['count', '1']], closureHl: true },
        { lines: [5, 9], title: 'Return 1, context popped', text: 'The call returns 1 and its context is removed. The closure stays exactly as it is.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']])], closure: [['count', '1']], out: ['1'] },
        { lines: [10], title: 'Second call: another fresh context', text: 'A brand new context for this call, but it is linked to the same closure.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']]), F('counter()', 'creation', [], 'closure of makeCounter')], closure: [['count', '1']], out: ['1'] },
        { lines: [4], title: 'count goes from 1 to 2', text: 'Same lookup, same closure, so the value keeps growing.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']]), F('counter()', 'execution', [], 'closure of makeCounter')], closure: [['count', '2']], closureHl: true, out: ['1'] },
        { lines: [5, 10], title: 'Return 2, context popped', text: 'Prints 2.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']])], closure: [['count', '2']], out: ['1', '2'] },
        { lines: [], done: true, title: 'Program finished', text: 'Each call got its own short-lived context, but all of them shared one closure. That is how a function can "remember" data between calls without using a global variable.', stack: [G('execution', [['makeCounter', 'ƒ makeCounter()'], ['counter', 'ƒ anonymous()']])], closure: [['count', '2']], out: ['1', '2'] }
      ]
    }
  ];
})(window.EC);
