/*
 * Threads & event loop quiz questions
 * -----------------------------------
 * Read by js/execution-context/quiz.js (load this file first).
 * `correct` is the index of the right option.
 */
window.EC = window.EC || {};

EC.quiz = {
  perfect: 'You\'ve got the event loop down. Ready for the threading question in your interview.',
  questions: [
    {
      question: 'What does this print?',
      code: 'console.log("1");\nsetTimeout(() => console.log("2"), 0);\nconsole.log("3");',
      options: ['1 2 3', '1 3 2', '2 1 3'],
      correct: 1,
      explanation: 'The timer callback goes to the task queue and only runs after the synchronous code (1, 3) finishes.'
    },
    {
      question: 'What does this print?',
      code: 'setTimeout(() => console.log("timeout"), 0);\nPromise.resolve().then(() => console.log("promise"));\nconsole.log("sync");',
      options: ['sync timeout promise', 'sync promise timeout', 'promise sync timeout'],
      correct: 1,
      explanation: 'Synchronous code first, then the microtask queue (promise), then the next task (timeout).'
    },
    {
      question: 'Does setTimeout create a new thread?',
      options: [
        'Yes, the callback runs on a background thread',
        'No, the runtime tracks the timer and the callback later runs on the JS thread',
        'Only when the delay is longer than 0 ms'
      ],
      correct: 1,
      explanation: 'The runtime handles the timer. When it fires, the callback is queued and the event loop runs it on the same JS thread once the stack is empty.'
    },
    {
      question: 'A 3-second synchronous loop runs in a press handler in React Native. What happens?',
      options: [
        'Nothing, React Native runs JavaScript on many threads',
        'The JS thread is blocked: JS-driven interactions, timers and state updates stall for 3 seconds',
        'Only the native UI thread is blocked'
      ],
      correct: 1,
      explanation: 'Your JS runs on the JS thread. While it\'s busy, nothing else in JavaScript can run, so JS-driven animations and handlers freeze.'
    },
    {
      question: 'Does JSI in the New Architecture make JavaScript multithreaded?',
      options: [
        'Yes, JSI runs JavaScript on every core',
        'No, JSI improves how JS talks to C++/native code; your JS still runs on the JS thread',
        'Yes, but only for TurboModules'
      ],
      correct: 1,
      explanation: 'JSI replaces the asynchronous, serialized Bridge with direct references to C++ objects. It does not make your JavaScript multithreaded.'
    },
    {
      question: 'Which statement is the most accurate for an interview?',
      options: [
        '"React Native is single-threaded."',
        '"JavaScript execution is generally single-threaded, while a React Native app involves multiple native threads."',
        '"React Native has exactly three threads."'
      ],
      correct: 1,
      explanation: 'The JS execution is single-threaded, but the app also uses the UI/main thread and other native threads. The exact set varies by version and architecture.'
    }
  ]
};
