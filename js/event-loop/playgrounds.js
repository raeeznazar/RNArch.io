/*
 * Threads & event loop page interactions
 * --------------------------------------
 *   #puzzle      warm-up: order of sync code, a promise and a 0 ms timer
 *   #blockDemo   block the real JS thread and watch what freezes:
 *                a requestAnimationFrame ball (JS-driven) stops, a CSS ball
 *                (animated off the main thread) keeps moving, taps queue up.
 *                "In chunks" does the same work but yields between slices.
 */
(function (EC) {
  function $(id) { return document.getElementById(id); }

  /* ---------- Warm-up puzzle ---------- */

  (function () {
    var puzzle = $('puzzle');
    if (!puzzle) return;

    var CORRECT = 'ADCB';
    var PROMISE_EXAMPLE = 1;
    var choices = puzzle.querySelectorAll('[data-answer]');
    var feedback = puzzle.querySelector('.puzzle__feedback');

    var MESSAGES = {
      right: 'Correct. Synchronous code first (A, D), then all microtasks (the promise: C), then the next task (the timer: B).',
      wrong: 'It prints <code>A D C B</code>. Synchronous code runs first. Then the microtask queue (promise callbacks) is emptied before the next task (the <code>setTimeout</code> callback), even with a 0 ms delay.'
    };

    choices.forEach(function (button) {
      button.addEventListener('click', function () {
        var isRight = button.dataset.answer === CORRECT;

        choices.forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
        button.classList.add(isRight ? 'is-right' : 'is-wrong');
        if (!isRight) puzzle.querySelector('[data-answer="' + CORRECT + '"]').classList.add('is-right');

        feedback.innerHTML = MESSAGES[isRight ? 'right' : 'wrong'] +
          ' <a href="#visualizer" data-show-example>Watch it step by step</a>.';

        feedback.querySelector('[data-show-example]').addEventListener('click', function () {
          if (EC.showLoopExample) EC.showLoopExample(PROMISE_EXAMPLE);
        });
      });
    });
  })();

  /* ---------- Block the JS thread ---------- */

  (function () {
    var root = $('blockDemo');
    if (!root) return;

    var BLOCK_MS = 2000;
    var CHUNK_MS = 8;        // work per slice when chunked: fits inside one frame
    var PERIOD_MS = 2000;    // one full left-right-left trip of the JS ball

    var jsRunner = root.querySelector('[data-js-runner]');
    var tapBtn = root.querySelector('[data-tap]');
    var tapCount = root.querySelector('[data-tap-count]');
    var blockBtn = root.querySelector('[data-block]');
    var chunkBtn = root.querySelector('[data-chunk]');
    var status = root.querySelector('[data-status]');
    var log = root.querySelector('.console');

    var taps = 0;

    // JS-driven animation: position is recalculated by JavaScript every frame
    function frame(now) {
      var t = (now % PERIOD_MS) / PERIOD_MS;           // 0 → 1
      var x = t < 0.5 ? t * 2 : 2 - t * 2;             // 0 → 1 → 0
      jsRunner.style.setProperty('--x', x.toFixed(4));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function print(line) {
      var empty = log.querySelector('.console__empty');
      if (empty) empty.remove();
      log.querySelectorAll('.is-new').forEach(function (l) { l.classList.remove('is-new'); });
      log.insertAdjacentHTML('beforeend', '<div class="console__line is-new">' + EC.escape(line) + '</div>');
      log.scrollTop = log.scrollHeight;
    }

    function setBusy(on, text) {
      blockBtn.disabled = on;
      chunkBtn.disabled = on;
      root.classList.toggle('is-blocking', on);
      status.textContent = text;
    }

    function spin(ms) {
      var end = performance.now() + ms;
      while (performance.now() < end) { /* busy: the thread can't do anything else */ }
    }

    tapBtn.addEventListener('click', function () {
      taps++;
      tapCount.textContent = taps;
    });

    blockBtn.addEventListener('click', function () {
      var tapsBefore = taps;
      setBusy(true, 'JS thread blocked…');
      // Let the browser paint the "blocked" state before we freeze it
      setTimeout(function () {
        spin(BLOCK_MS);
        setBusy(false, 'Idle');
        // Taps made during the block are still queued; they run after this task.
        setTimeout(function () {
          print('while loop held the thread for ' + BLOCK_MS + ' ms. Taps handled late: ' + (taps - tapsBefore) + '.');
        }, 0);
      }, 50);
    });

    chunkBtn.addEventListener('click', function () {
      var done = 0;
      var slices = 0;
      var started = performance.now();
      setBusy(true, 'Working in chunks… (thread free between slices)');

      function slice() {
        spin(CHUNK_MS);
        done += CHUNK_MS;
        slices++;
        if (done < BLOCK_MS) {
          setTimeout(slice, 0); // yield: let rendering and taps run
          return;
        }
        setBusy(false, 'Idle');
        print('Same ' + BLOCK_MS + ' ms of work in ' + slices + ' slices, finished after ' +
          Math.round(performance.now() - started) + ' ms. The UI stayed responsive.');
      }
      setTimeout(slice, 50);
    });
  })();
})(window.EC);
