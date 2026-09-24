/*
 * Closure quiz questions
 * ----------------------
 * Read by js/execution-context/quiz.js (load this file first).
 * `correct` is the index of the right option.
 */
window.EC = window.EC || {};

EC.quiz = {
  perfect: 'You\'ve got closures down. You\'re ready for the interview question.',
  questions: [
    {
      question: 'What does this print?',
      code: 'function make() {\n  let n = 10;\n  return () => n;\n}\nconst get = make();\nconsole.log(get());',
      options: ['undefined', '10', 'ReferenceError'],
      correct: 1,
      explanation: 'make() has returned, but the arrow function closed over n, so n is still reachable.'
    },
    {
      question: 'Do these two counters share the same count?',
      code: 'const a = createCounter();\nconst b = createCounter();\na(); a();\nconsole.log(b());',
      options: ['Yes, b() prints 3', 'No, b() prints 1', 'No, b() prints 0'],
      correct: 1,
      explanation: 'Every call to createCounter() creates a new lexical environment with its own count.'
    },
    {
      question: 'What does this print after 100 ms?',
      code: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}',
      options: ['0 1 2', '3 3 3', 'undefined undefined undefined'],
      correct: 1,
      explanation: 'var creates one i for the whole loop. All three callbacks close over that same variable, which is 3 by the time they run.'
    },
    {
      question: 'Given the bank account example, what is account.balance?',
      code: 'function createBankAccount() {\n  let balance = 1000;\n  return { getBalance() { return balance; } };\n}\nconst account = createBankAccount();',
      options: ['1000', 'undefined', 'It throws an error'],
      correct: 1,
      explanation: 'balance is a variable in the closure, not a property of the returned object. Only getBalance() can reach it.'
    },
    {
      question: 'count is 0. You press Start, then Increment five times within 3 seconds. What does the timeout print?',
      code: 'const handlePress = () => {\n  setTimeout(() => {\n    console.log(count);\n  }, 3000);\n};',
      options: ['5', '0', 'undefined'],
      correct: 1,
      explanation: 'The timer callback closed over count from the render where Start was pressed. Later renders create new closures, but not for this callback. That is a stale closure.'
    },
    {
      question: 'This effect should log count whenever it changes. What is wrong?',
      code: 'useEffect(() => {\n  console.log(count);\n}, []);',
      options: [
        'Nothing, it logs every change',
        'The empty array means it runs once and only ever sees the initial count',
        'useEffect callbacks cannot read state'
      ],
      correct: 1,
      explanation: 'With [] the effect runs only after the first render, so its closure holds the initial count. Add count to the dependency array.'
    },
    {
      question: 'Which variables does a closure capture?',
      options: [
        'The variables in scope where the function was called',
        'The variables in scope where the function was written',
        'A copy of the variable values at the moment the function was created'
      ],
      correct: 1,
      explanation: 'Closures are lexical: they follow where the function was written. And they hold a live reference to the variables, not a snapshot of their values.'
    }
  ]
};
