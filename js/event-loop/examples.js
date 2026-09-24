/*
 * Event-loop visualizer programs
 * ------------------------------
 * Pure data: each example is a short program plus the steps the runtime takes.
 * js/event-loop/visualizer.js draws them.
 *
 * Step fields (anything not given carries over from the previous step,
 * except lines / hl / loop, which reset every step):
 *   kind     'sync' | 'micro' | 'task' | 'wait' | 'done'  (colours the step)
 *   lines    line numbers to highlight (1-based)
 *   title/text narration
 *   stack    call stack frames, bottom first
 *   apis     work handed to the browser / React Native runtime (timers, network)
 *   micro    microtask queue, front first
 *   tasks    task (macrotask) queue, front first
 *   out      console output so far
 *   loop     what the event loop is doing right now
 *   hl       label of an item that just moved (flashes wherever it appears)
 */
window.EC = window.EC || {};

(function (EC) {
  var EMPTY = { stack: [], apis: [], micro: [], tasks: [], out: [] };

  function build(steps) {
    var prev = EMPTY;
    return steps.map(function (s) {
      prev = Object.assign({}, prev, { lines: [], hl: null, loop: null }, s);
      return prev;
    });
  }

  var BUSY = 'Call stack is busy, so the event loop waits.';

  EC.loopExamples = [
    /* ---------- 1. A C B ---------- */
    {
      label: 'setTimeout: A C B',
      code: [
        'console.log("A");',
        '',
        'setTimeout(() => {',
        '  console.log("B");',
        '}, 1000);',
        '',
        'console.log("C");'
      ],
      steps: build([
        { kind: 'sync', title: 'The script starts', text: 'The whole script is the first piece of work. It goes on the call stack (shown as main()) and runs top to bottom on the single JavaScript thread.', stack: ['main()'], loop: BUSY },
        { kind: 'sync', lines: [1], title: 'console.log("A")', text: 'A normal synchronous call: pushed, runs, prints A, popped.', stack: ['main()', 'console.log("A")'], out: ['A'], loop: BUSY },
        { kind: 'sync', lines: [3, 4, 5], title: 'setTimeout hands the timer to the runtime', text: 'setTimeout doesn\'t wait and doesn\'t create a thread. It registers a timer with the runtime (the browser, or the React Native runtime) and returns immediately. The callback is kept for later.', stack: ['main()', 'setTimeout()'], apis: ['⏱ timer 1000 ms → callback'], hl: '⏱ timer 1000 ms → callback', loop: BUSY },
        { kind: 'sync', lines: [7], title: 'console.log("C") runs right away', text: 'JavaScript doesn\'t sit there for a second doing nothing. It moves on and prints C while the timer counts down outside the call stack.', stack: ['main()', 'console.log("C")'], out: ['A', 'C'], loop: BUSY },
        { kind: 'wait', title: 'The script is finished', text: 'main() is popped. The call stack is empty and both queues are empty, so the event loop has nothing to run yet. The JS thread is free to handle anything else, such as taps and renders.', stack: [], loop: 'Stack empty, queues empty: nothing to do.' },
        { kind: 'wait', title: '1 second later: the timer fires', text: 'The runtime puts the callback into the task queue. It can\'t jump onto the stack by itself. Only the event loop moves things onto the stack.', apis: [], tasks: ['timer callback'], hl: 'timer callback', loop: 'A task is waiting. Is the stack empty?' },
        { kind: 'task', lines: [3], title: 'The event loop moves the callback onto the stack', text: 'The stack is empty and there are no microtasks, so the event loop takes the next task from the queue and runs it.', stack: ['timer callback'], tasks: [], hl: 'timer callback', loop: 'Stack empty → run the next task.' },
        { kind: 'task', lines: [4], title: 'console.log("B")', text: 'The callback runs and prints B, last.', stack: ['timer callback', 'console.log("B")'], out: ['A', 'C', 'B'], loop: BUSY },
        { kind: 'done', title: 'Output: A, C, B', text: 'Synchronous code first (A, C), then the timer callback (B) once the stack was free.', stack: [], loop: 'Idle.' }
      ])
    },

    /* ---------- 2. Microtasks before tasks ---------- */
    {
      label: 'Promise vs setTimeout',
      code: [
        'console.log("A");',
        '',
        'setTimeout(() => {',
        '  console.log("B");',
        '}, 0);',
        '',
        'Promise.resolve().then(() => {',
        '  console.log("C");',
        '});',
        '',
        'console.log("D");'
      ],
      steps: build([
        { kind: 'sync', title: 'The script starts', text: 'main() goes on the call stack.', stack: ['main()'], loop: BUSY },
        { kind: 'sync', lines: [1], title: 'Prints A', text: 'Synchronous, runs immediately.', stack: ['main()', 'console.log("A")'], out: ['A'], loop: BUSY },
        { kind: 'sync', lines: [3, 4, 5], title: 'setTimeout(…, 0) registers a timer', text: 'Even with 0 ms, the callback is never run right here. The timer goes to the runtime.', stack: ['main()', 'setTimeout()'], apis: ['⏱ timer 0 ms → callback'], hl: '⏱ timer 0 ms → callback', loop: BUSY },
        { kind: 'sync', lines: [3], title: 'The 0 ms timer is ready at once', text: 'The runtime puts the callback in the task queue. It has to wait there until the stack is empty.', stack: ['main()'], apis: [], tasks: ['timeout callback (B)'], hl: 'timeout callback (B)', loop: BUSY },
        { kind: 'sync', lines: [7, 8, 9], title: 'The promise is already resolved: .then() queues a microtask', text: 'Promise callbacks don\'t go in the task queue. They go in the microtask queue, which has priority.', stack: ['main()', '.then()'], micro: ['then callback (C)'], hl: 'then callback (C)', loop: BUSY },
        { kind: 'sync', lines: [11], title: 'Prints D', text: 'Still synchronous code, so it runs before anything queued.', stack: ['main()', 'console.log("D")'], out: ['A', 'D'], loop: BUSY },
        { kind: 'wait', title: 'Synchronous code is done', text: 'main() is popped. Both queues have something. Which goes first? The rule: after the current synchronous code finishes, the microtask queue is emptied completely before the next task.', stack: [], loop: 'Stack empty → check microtasks first.' },
        { kind: 'micro', lines: [8], title: 'The microtask runs: prints C', text: 'The then callback goes onto the stack and prints C.', stack: ['then callback (C)'], micro: [], out: ['A', 'D', 'C'], hl: 'then callback (C)', loop: 'Running microtasks.' },
        { kind: 'task', lines: [4], title: 'Only now the task runs: prints B', text: 'The microtask queue is empty, so the event loop takes the next task: the setTimeout callback.', stack: ['timeout callback (B)'], tasks: [], out: ['A', 'D', 'C', 'B'], hl: 'timeout callback (B)', loop: 'Microtasks empty → run the next task.' },
        { kind: 'done', title: 'Output: A, D, C, B', text: 'Synchronous (A, D) → microtasks (C) → tasks (B).', stack: [], loop: 'Idle.' }
      ])
    },

    /* ---------- 3. Blocking the thread ---------- */
    {
      label: 'Blocking the thread',
      code: [
        'setTimeout(() => {',
        '  console.log("timer");',
        '}, 0);',
        '',
        'const end = Date.now() + 2000;',
        'while (Date.now() < end) {',
        '  // busy for 2 seconds',
        '}',
        'console.log("done blocking");'
      ],
      steps: build([
        { kind: 'sync', lines: [1, 2, 3], title: 'A 0 ms timer is registered', text: 'The runtime will have this callback ready almost instantly.', stack: ['main()', 'setTimeout()'], apis: ['⏱ timer 0 ms → callback'], loop: BUSY },
        { kind: 'sync', lines: [1], title: 'The callback is ready and queued', text: 'The timer is done, the callback is in the task queue. It only needs an empty call stack.', stack: ['main()'], apis: [], tasks: ['timer callback'], hl: 'timer callback', loop: BUSY },
        { kind: 'sync', lines: [5, 6, 7, 8], title: 'A 2-second synchronous loop starts', text: 'This while loop never gives the thread back. The event loop can\'t run anything else: no timers, no promise callbacks, no touch handlers.', stack: ['main()', 'while loop'], loop: 'Blocked: stack busy for 2 s.' },
        { kind: 'sync', lines: [6], title: '…1 second in', text: 'The timer callback has been ready for a whole second, but it just waits. In an app, this is when the screen stops responding to JS-driven interactions.', stack: ['main()', 'while loop'], loop: 'Still blocked. The queued callback waits.' },
        { kind: 'sync', lines: [9], title: 'Prints "done blocking"', text: 'The loop ends and the rest of the script runs.', stack: ['main()', 'console.log()'], out: ['done blocking'], loop: BUSY },
        { kind: 'task', lines: [2], title: 'Finally, the "0 ms" timer runs', text: 'About 2 seconds late. setTimeout(fn, 0) means "run no sooner than 0 ms", not "run in exactly 0 ms". Long synchronous work delays everything queued behind it.', stack: ['timer callback'], tasks: [], out: ['done blocking', 'timer'], hl: 'timer callback', loop: 'Stack empty → run the next task.' },
        { kind: 'done', title: 'Output: done blocking, timer', text: 'One thread, one call stack: while it\'s busy, nothing else in JavaScript can run.', stack: [], loop: 'Idle.' }
      ])
    },

    /* ---------- 4. async / await ---------- */
    {
      label: 'async / await',
      code: [
        'async function load() {',
        '  console.log("1");',
        '  await null;',
        '  console.log("3");',
        '}',
        '',
        'load();',
        'console.log("2");'
      ],
      steps: build([
        { kind: 'sync', lines: [7], title: 'load() is called', text: 'An async function starts running synchronously, like any other function.', stack: ['main()', 'load()'], loop: BUSY },
        { kind: 'sync', lines: [2], title: 'Prints 1', text: 'Everything before the first await runs immediately.', stack: ['main()', 'load()', 'console.log("1")'], out: ['1'], loop: BUSY },
        { kind: 'sync', lines: [3], title: 'await pauses load()', text: 'await splits the function. The rest of load() is scheduled as a microtask, and load() leaves the stack for now, returning a pending promise.', stack: ['main()'], micro: ['resume load()'], hl: 'resume load()', loop: BUSY },
        { kind: 'sync', lines: [8], title: 'Prints 2', text: 'The caller keeps going. await never blocks the thread; only the async function itself is paused.', stack: ['main()', 'console.log("2")'], out: ['1', '2'], loop: BUSY },
        { kind: 'micro', lines: [4], title: 'The microtask resumes load(): prints 3', text: 'Synchronous code is done, so the microtask queue runs. load() continues right after the await.', stack: ['load() (resumed)'], micro: [], out: ['1', '2', '3'], hl: 'load() (resumed)', loop: 'Running microtasks.' },
        { kind: 'done', title: 'Output: 1, 2, 3', text: 'await is promise syntax: the code after it runs as a microtask.', stack: [], loop: 'Idle.' }
      ])
    }
  ];
})(window.EC);
