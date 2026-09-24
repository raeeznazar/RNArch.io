/*
 * Closure page interactions
 * -------------------------
 *   #puzzle        warm-up: the var-in-a-loop + setTimeout question
 *   #factory       counter factory: every "createCounter()" makes a real closure
 *   #bank          bank account with a private balance
 *   #renders       each render creates a new handlePress closure
 *   #stalePlay     stale closure demo: Start a timer, then Increment
 *   #predictGrid   "predict the output" cards with a reveal button
 *
 * The playgrounds use real closures, so what you see is JavaScript doing it.
 */
(function (EC) {
  function $(id) { return document.getElementById(id); }

  /* ---------- Warm-up puzzle ---------- */

  (function () {
    var puzzle = $('puzzle');
    if (!puzzle) return;

    var CORRECT = '333';
    var choices = puzzle.querySelectorAll('[data-answer]');
    var feedback = puzzle.querySelector('.puzzle__feedback');

    var MESSAGES = {
      right: 'Correct. <code>var</code> creates a single <code>i</code> for the whole loop. All three callbacks close over that same variable, and by the time they run, the loop has already set it to <code>3</code>.',
      wrong: 'It prints <code>3 3 3</code>. The callbacks don\'t remember the value of <code>i</code>; they remember the <em>variable</em>. With <code>var</code> there is only one, and it\'s <code>3</code> when they finally run.'
    };

    choices.forEach(function (button) {
      button.addEventListener('click', function () {
        var isRight = button.dataset.answer === CORRECT;

        choices.forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
        button.classList.add(isRight ? 'is-right' : 'is-wrong');
        if (!isRight) puzzle.querySelector('[data-answer="' + CORRECT + '"]').classList.add('is-right');

        feedback.innerHTML = MESSAGES[isRight ? 'right' : 'wrong'] +
          ' <a href="#loop-trap">See the fix</a>.';
      });
    });
  })();

  /* ---------- Counter factory ---------- */

  (function () {
    var root = $('factory');
    if (!root) return;

    var list = root.querySelector('.factory__list');
    var log = root.querySelector('.console');
    var createBtn = root.querySelector('[data-create]');
    var resetBtn = root.querySelector('[data-reset]');
    var MAX_COUNTERS = 4;
    var counters = [];

    // The real thing: each call gets its own `count`
    function createCounter() {
      var count = 0;
      return {
        increment: function () { count++; return count; },
        peek: function () { return count; }
      };
    }

    function print(line) {
      var empty = log.querySelector('.console__empty');
      if (empty) empty.remove();
      log.querySelectorAll('.is-new').forEach(function (l) { l.classList.remove('is-new'); });
      log.insertAdjacentHTML('beforeend', '<div class="console__line is-new">' + EC.escape(line) + '</div>');
      log.scrollTop = log.scrollHeight;
    }

    function render() {
      list.innerHTML = counters.map(function (c, i) {
        var name = 'counter' + (i + 1);
        return '<div class="factory__card">' +
          '<div class="factory__name">' + name + '</div>' +
          '<div class="mem"><div class="mem__key">count</div><div class="mem__val" data-val="' + i + '">' + c.peek() + '</div></div>' +
          '<button class="btn" type="button" data-call="' + i + '">' + name + '()</button>' +
        '</div>';
      }).join('') || '<p class="factory__empty">No counters yet. Press <strong>createCounter()</strong>.</p>';

      createBtn.disabled = counters.length >= MAX_COUNTERS;
    }

    createBtn.addEventListener('click', function () {
      counters.push(createCounter());
      print('const counter' + counters.length + ' = createCounter();  // new count = 0');
      render();
    });

    resetBtn.addEventListener('click', function () {
      counters = [];
      log.innerHTML = '<div class="console__empty">Nothing printed yet.</div>';
      render();
    });

    list.addEventListener('click', function (e) {
      var button = e.target.closest('[data-call]');
      if (!button) return;

      var i = +button.dataset.call;
      var value = counters[i].increment();
      print('counter' + (i + 1) + '()  → ' + value);

      var cell = list.querySelector('[data-val="' + i + '"]');
      cell.textContent = value;
      cell.classList.remove('is-flash');
      void cell.offsetWidth; // restart the flash animation
      cell.classList.add('is-flash');
    });

    render();
  })();

  /* ---------- Bank account ---------- */

  (function () {
    var root = $('bank');
    if (!root) return;

    var log = root.querySelector('.console');

    function createBankAccount() {
      var balance = 1000;
      return {
        getBalance: function () { return balance; },
        deposit: function (amount) { balance += amount; }
      };
    }

    var account = createBankAccount();

    var ACTIONS = {
      deposit: function () { account.deposit(500); return ['account.deposit(500);', 'undefined']; },
      getBalance: function () { return ['account.getBalance();', String(account.getBalance())]; },
      direct: function () { return ['account.balance;', String(account.balance)]; },
      hack: function () {
        account.balance = 0;
        return ['account.balance = 0;  // try to break in', 'getBalance() is still ' + account.getBalance()];
      },
      reset: function () {
        account = createBankAccount();
        return ['const account = createBankAccount();', 'fresh closure, balance = 1000'];
      }
    };

    root.addEventListener('click', function (e) {
      var button = e.target.closest('[data-action]');
      if (!button) return;

      var result = ACTIONS[button.dataset.action]();
      var empty = log.querySelector('.console__empty');
      if (empty) empty.remove();
      log.querySelectorAll('.is-new').forEach(function (l) { l.classList.remove('is-new'); });
      log.insertAdjacentHTML('beforeend',
        '<div class="console__line is-new">&gt; ' + EC.escape(result[0]) + '</div>' +
        '<div class="console__line is-new">&lt; ' + EC.escape(result[1]) + '</div>');
      log.scrollTop = log.scrollHeight;
    });
  })();

  // Append lines to a playground console, marking them as new
  function printTo(log, lines) {
    var empty = log.querySelector('.console__empty');
    if (empty) empty.remove();
    log.querySelectorAll('.is-new').forEach(function (l) { l.classList.remove('is-new'); });
    log.insertAdjacentHTML('beforeend', lines.map(function (line) {
      return '<div class="console__line is-new">' + EC.escape(line) + '</div>';
    }).join(''));
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- Renders and their closures ---------- */

  (function () {
    var root = $('renders');
    if (!root) return;

    var list = root.querySelector('.factory__list');
    var log = root.querySelector('.console');
    var MAX_SHOWN = 4;
    var renders;

    // Stands in for the component body: each call is one render
    function Counter(count) {
      var handlePress = function () { return count; };
      return { count: count, handlePress: handlePress };
    }

    function reset() {
      renders = [Counter(0)];
      log.innerHTML = '<div class="console__empty">Press a handlePress() button.</div>';
      draw();
    }

    function draw() {
      var first = Math.max(0, renders.length - MAX_SHOWN);
      var hidden = first > 0 ? '<p class="factory__empty">… ' + first + ' older render' + (first > 1 ? 's' : '') + ' not shown</p>' : '';

      list.innerHTML = hidden + renders.slice(first).map(function (r, k) {
        var i = first + k;
        var isCurrent = i === renders.length - 1;
        return '<div class="factory__card' + (isCurrent ? '' : ' is-stale') + '">' +
          '<div class="factory__name">Render #' + (i + 1) + (isCurrent ? ' · on screen' : ' · replaced') + '</div>' +
          '<div class="mem"><div class="mem__key">count</div><div class="mem__val">' + r.count + '</div></div>' +
          '<button class="btn" type="button" data-press="' + i + '">handlePress()</button>' +
        '</div>';
      }).join('');
    }

    root.querySelector('[data-set-count]').addEventListener('click', function () {
      var latest = renders[renders.length - 1];
      renders.push(Counter(latest.count + 1));
      draw();
    });

    root.querySelector('[data-reset]').addEventListener('click', reset);

    list.addEventListener('click', function (e) {
      var button = e.target.closest('[data-press]');
      if (!button) return;
      var i = +button.dataset.press;
      var current = renders[renders.length - 1].count;
      var seen = renders[i].handlePress();
      printTo(log, ['Render #' + (i + 1) + ' handlePress() → console.log(count) → ' + seen +
        (seen === current ? '' : '   (current count is ' + current + ')')]);
    });

    reset();
  })();

  /* ---------- Stale closure: Start, then Increment ---------- */

  (function () {
    var root = $('stalePlay');
    if (!root) return;

    var log = root.querySelector('.console');
    var countEl = root.querySelector('[data-count]');
    var DELAY_MS = 3000;

    var count, countRef, component, timers;

    // One "render" of the component. handlePress closes over this render's count.
    function render(renderCount) {
      countEl.textContent = renderCount;
      return {
        handlePress: function () {
          printTo(log, ['Start pressed while count = ' + renderCount + ', timer set for 3 s…']);
          timers.push(setTimeout(function () {
            printTo(log, [
              '⏰ console.log(count)             → ' + renderCount + (renderCount !== countRef.current ? '   ← stale' : ''),
              '⏰ console.log(countRef.current)  → ' + countRef.current
            ]);
          }, DELAY_MS));
        }
      };
    }

    function reset() {
      (timers || []).forEach(clearTimeout);
      timers = [];
      count = 0;
      countRef = { current: 0 };
      component = render(count);
      log.innerHTML = '<div class="console__empty">Press Start, then Increment a few times.</div>';
    }

    root.querySelector('[data-start]').addEventListener('click', function () {
      component.handlePress();
    });

    root.querySelector('[data-increment]').addEventListener('click', function () {
      count += 1;                 // setCount(c => c + 1)
      countRef.current = count;   // the effect that syncs the ref
      component = render(count);  // React re-renders with a new closure
    });

    root.querySelector('[data-reset]').addEventListener('click', reset);

    reset();
  })();

  /* ---------- Predict the output ---------- */

  (function () {
    var grid = $('predictGrid');
    if (!grid) return;

    var CASES = [
      {
        title: 'Snapshot or live link?',
        code: 'let x = 1;\nconst show = () => console.log(x);\nx = 2;\nshow();',
        answer: 'Prints <b>2</b>. A closure holds a live reference to the variable, not a copy of its value at creation time.'
      },
      {
        title: 'The loop, fixed with let',
        code: 'for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}',
        answer: 'Prints <b>0 1 2</b>. let creates a new i for every iteration, so each callback closes over its own copy.'
      },
      {
        title: 'Function factory',
        code: 'function multiplier(factor) {\n  return (n) => n * factor;\n}\nconst double = multiplier(2);\nconst triple = multiplier(3);\nconsole.log(double(5), triple(5));',
        answer: 'Prints <b>10 15</b>. Parameters are variables too. Each returned function closes over its own factor.'
      },
      {
        title: 'Called somewhere else',
        code: 'const name = "global";\nfunction make() {\n  const name = "inside make";\n  return () => console.log(name);\n}\nfunction run(fn) {\n  const name = "inside run";\n  fn();\n}\nrun(make());',
        answer: 'Prints <b>"inside make"</b>. The closure follows where the function was written, not where it was called.'
      }
    ];

    grid.innerHTML = CASES.map(function (item, i) {
      return '<div class="this-card">' +
        '<h3 class="this-card__title">' + item.title + '</h3>' +
        '<pre><code>' + EC.highlightBlock(item.code) + '</code></pre>' +
        '<button class="btn" type="button" aria-expanded="false" aria-controls="predictAnswer' + i + '">Reveal output</button>' +
        '<p class="this-card__answer" id="predictAnswer' + i + '" hidden>' + item.answer + '</p>' +
      '</div>';
    }).join('');

    grid.addEventListener('click', function (e) {
      var button = e.target.closest('[aria-controls]');
      if (!button) return;

      var answer = $(button.getAttribute('aria-controls'));
      var open = answer.hidden;
      answer.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Hide answer' : 'Reveal output';
    });
  })();
})(window.EC);
