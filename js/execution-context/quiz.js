/*
 * Quiz
 * ----
 * Five multiple-choice questions. Each can be answered once; the right answer
 * is always shown, with an explanation. A score appears after the last one.
 * Edit QUESTIONS to change the quiz (`correct` is the index of the right option).
 * Another page can supply its own quiz by setting EC.quiz = { questions, perfect }
 * in a script that loads before this one.
 */
(function (EC) {
  var quiz = document.getElementById('quiz');
  var scoreEl = document.getElementById('quizScore');
  if (!quiz) return;

  var custom = EC.quiz || {};
  var PERFECT = custom.perfect || 'You\'ve got execution contexts down.';

  var QUESTIONS = custom.questions || [
    {
      question: 'What does this print?',
      code: 'console.log(v);\nvar v = 3;',
      options: ['3', 'undefined', 'ReferenceError'],
      correct: 1,
      explanation: 'var v is created with undefined in the creation phase. The 3 is only assigned when line 2 runs.'
    },
    {
      question: 'What happens here?',
      code: 'console.log(k);\nlet k = 1;',
      options: ['Prints undefined', 'Prints 1', 'Throws ReferenceError'],
      correct: 2,
      explanation: 'let is hoisted but stays uninitialized in the Temporal Dead Zone until its line runs.'
    },
    {
      question: 'When does a function declaration become callable?',
      options: ['Only after the line it is written on', 'From the start, because it is stored whole in the creation phase', 'Only if it is declared with const'],
      correct: 1,
      explanation: 'Function declarations are stored completely during the creation phase.'
    },
    {
      question: 'What happens to a function\'s execution context when the function returns?',
      options: ['It is popped off the call stack', 'It stays on the stack forever', 'It moves to the bottom of the stack'],
      correct: 0,
      explanation: 'The context is popped and its local variables are discarded, unless a closure still references them.'
    },
    {
      question: 'A function looks up a variable it doesn\'t have. Where does it look next?',
      code: 'var name = "global";\nfunction a() { console.log(name); }\nfunction b() { var name = "b"; a(); }\nb();',
      options: ['In b, because b called a, so it prints "b"', 'In the global scope, where a was written, so it prints "global"', 'Nowhere, it throws an error'],
      correct: 1,
      explanation: 'The outer reference follows where a function was written (lexical scope), not where it was called. a was written globally.'
    }
  ];

  var answered = 0;
  var correctCount = 0;

  quiz.innerHTML = QUESTIONS.map(function (q, qi) {
    var code = q.code ? '<pre><code>' + EC.highlightBlock(q.code) + '</code></pre>' : '';
    var options = q.options.map(function (option, oi) {
      return '<button class="btn" type="button" data-q="' + qi + '" data-o="' + oi + '">' + EC.escape(option) + '</button>';
    }).join('');

    return '<div class="quiz__card">' +
      '<div class="quiz__question">' + (qi + 1) + '. ' + EC.escape(q.question) + '</div>' +
      code +
      '<div class="quiz__options">' + options + '</div>' +
      '<p class="quiz__feedback" id="quizFeedback' + qi + '" hidden></p>' +
    '</div>';
  }).join('');

  quiz.addEventListener('click', function (e) {
    var button = e.target.closest('[data-o]');
    if (!button || button.disabled) return;

    var qi = +button.dataset.q;
    var oi = +button.dataset.o;
    var q = QUESTIONS[qi];
    var isRight = oi === q.correct;
    var buttons = quiz.querySelectorAll('[data-q="' + qi + '"]');

    buttons.forEach(function (b) { b.disabled = true; });
    buttons[q.correct].classList.add('is-right');
    if (!isRight) button.classList.add('is-wrong');

    answered++;
    if (isRight) correctCount++;

    var feedback = document.getElementById('quizFeedback' + qi);
    feedback.textContent = (isRight ? 'Correct. ' : 'Not quite. ') + q.explanation;
    feedback.hidden = false;

    if (answered === QUESTIONS.length) {
      scoreEl.textContent = 'You got ' + correctCount + ' of ' + QUESTIONS.length + '. ' +
        (correctCount === QUESTIONS.length
          ? PERFECT
          : 'Step through the examples above again and retry by reloading the page.');
    }
  });
})(window.EC);
