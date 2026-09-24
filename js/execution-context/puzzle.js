/*
 * Warm-up puzzle
 * --------------
 * "console.log(a); var a = 5;" — what does it print?
 * Marks the chosen answer right/wrong, explains why, and links to the
 * "Hoisting & TDZ" example in the visualizer.
 */
(function (EC) {
  var puzzle = document.getElementById('puzzle');
  if (!puzzle) return;

  var CORRECT = 'undefined';
  var HOISTING_EXAMPLE = 1;

  var choices = puzzle.querySelectorAll('[data-answer]');
  var feedback = puzzle.querySelector('.puzzle__feedback');

  var MESSAGES = {
    right: 'Correct. JavaScript already created <code>a</code> with the value <code>undefined</code> before line 1 ran.',
    wrong: 'It prints <code>undefined</code>. Before any line runs, JavaScript sets up memory and gives <code>a</code> the value <code>undefined</code>.'
  };

  choices.forEach(function (button) {
    button.addEventListener('click', function () {
      var isRight = button.dataset.answer === CORRECT;

      choices.forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
      button.classList.add(isRight ? 'is-right' : 'is-wrong');
      if (!isRight) puzzle.querySelector('[data-answer="' + CORRECT + '"]').classList.add('is-right');

      feedback.innerHTML = MESSAGES[isRight ? 'right' : 'wrong'] +
        ' <a href="#visualizer" data-show-example>See it happen step by step</a>.';

      feedback.querySelector('[data-show-example]').addEventListener('click', function () {
        if (EC.showExample) EC.showExample(HOISTING_EXAMPLE);
      });
    });
  });
})(window.EC);
