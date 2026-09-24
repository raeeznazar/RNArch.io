/*
 * Event-loop visualizer
 * ---------------------
 * Steps through the programs in EC.loopExamples and draws, for each step:
 *   narration · progress bars · highlighted code · console output
 *   call stack · Web/Native APIs · microtask queue · task queue · event loop status
 *
 * Controls: Restart / Back / Next / Play buttons, the progress bars,
 * and the ← / → arrow keys.
 *
 * Exposes EC.showLoopExample(index) so other scripts (e.g. the puzzle) can jump here.
 */
(function (EC) {
  var root = document.getElementById('loopViz');
  if (!root || !EC.loopExamples) return;

  var PLAY_INTERVAL_MS = 2600;

  function $(id) { return document.getElementById(id); }

  var el = {
    tabs: $('loopTabs'),
    phase: $('loopPhase'),
    title: $('loopTitle'),
    text: $('loopText'),
    count: $('loopCount'),
    progress: $('loopProgress'),
    code: $('loopCode'),
    console: $('loopConsole'),
    stack: $('loopStack'),
    apis: $('loopApis'),
    micro: $('loopMicro'),
    tasks: $('loopTasks'),
    status: $('loopStatus'),
    restart: $('loopRestart'),
    prev: $('loopPrev'),
    next: $('loopNext'),
    play: $('loopPlay')
  };

  var state = { example: 0, step: 0, prevOutLen: 0, timer: null };

  var KIND_LABELS = {
    sync: 'Synchronous code',
    micro: 'Microtask',
    task: 'Task (macrotask)',
    wait: 'Waiting',
    done: 'Done'
  };

  function currentExample() { return EC.loopExamples[state.example]; }

  // ---------- Render pieces ----------

  function renderTabs() {
    el.tabs.innerHTML = EC.loopExamples.map(function (ex, i) {
      return '<button class="btn" type="button" role="tab" aria-selected="' + (i === state.example) + '" data-i="' + i + '">' + ex.label + '</button>';
    }).join('');
  }

  function renderNarration(step) {
    el.phase.className = 'phase-tag ' + step.kind;
    el.phase.textContent = KIND_LABELS[step.kind];
    el.title.textContent = step.title;
    el.text.textContent = step.text;
    el.count.textContent = 'Step ' + (state.step + 1) + ' of ' + currentExample().steps.length;
  }

  function renderProgress() {
    el.progress.innerHTML = currentExample().steps.map(function (s, i) {
      var past = i <= state.step ? ' is-past' : '';
      return '<button type="button" class="' + s.kind + past + '" aria-label="Go to step ' + (i + 1) + '" data-i="' + i + '"></button>';
    }).join('');
  }

  function renderCode(step) {
    el.code.innerHTML = currentExample().code.map(function (line, i) {
      var cls = step.lines.indexOf(i + 1) !== -1 ? ' is-active' : '';
      return '<div class="code-lines__line' + cls + '">' +
        '<span class="code-lines__num">' + (i + 1) + '</span>' +
        '<span class="code-lines__src">' + (EC.highlight(line) || ' ') + '</span>' +
        '</div>';
    }).join('');
  }

  function renderConsole(step) {
    el.console.innerHTML = step.out.map(function (line, i) {
      var cls = i >= state.prevOutLen ? ' is-new' : '';
      return '<div class="console__line' + cls + '">' + EC.escape(line) + '</div>';
    }).join('') || '<div class="console__empty">Nothing printed yet.</div>';
  }

  function itemsHTML(items, hl, emptyText, extraClass) {
    if (!items.length) return '<div class="lane__empty">' + emptyText + '</div>';
    return items.map(function (label, i) {
      var cls = 'lane__item' + (extraClass && extraClass(i) ? ' ' + extraClass(i) : '') + (label === hl ? ' is-flash' : '');
      return '<div class="' + cls + '">' + EC.escape(label) + '</div>';
    }).join('');
  }

  function renderLanes(step) {
    // Stack: newest on top, so draw it reversed
    var stack = step.stack.slice().reverse();
    el.stack.innerHTML = itemsHTML(stack, step.hl, 'empty', function (i) { return i === 0 ? 'is-top' : ''; });
    el.apis.innerHTML = itemsHTML(step.apis, step.hl, 'nothing pending');
    el.micro.innerHTML = itemsHTML(step.micro, step.hl, 'empty');
    el.tasks.innerHTML = itemsHTML(step.tasks, step.hl, 'empty');
    el.status.textContent = step.loop || '';
  }

  function renderControls() {
    var last = currentExample().steps.length - 1;
    el.prev.disabled = state.step === 0;
    el.next.disabled = state.step === last;
    el.next.textContent = state.step === last ? 'Finished' : 'Next';
  }

  function render() {
    var step = currentExample().steps[state.step];
    renderNarration(step);
    renderProgress();
    renderCode(step);
    renderConsole(step);
    renderLanes(step);
    renderControls();
    state.prevOutLen = step.out.length;
  }

  // ---------- Navigation ----------

  function go(delta) {
    var count = currentExample().steps.length;
    var target = Math.max(0, Math.min(count - 1, state.step + delta));
    if (target === state.step) return false;
    if (delta < 0) state.prevOutLen = 99; // going back shouldn't replay "new" highlights
    state.step = target;
    render();
    return true;
  }

  function stopPlay() {
    if (!state.timer) return;
    clearInterval(state.timer);
    state.timer = null;
    el.play.textContent = 'Play';
  }

  function restart() {
    state.step = 0;
    state.prevOutLen = 0;
    render();
  }

  EC.showLoopExample = function (index) {
    stopPlay();
    state.example = index;
    renderTabs();
    restart();
  };

  // ---------- Events ----------

  el.tabs.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-i]');
    if (tab) EC.showLoopExample(+tab.dataset.i);
  });

  el.progress.addEventListener('click', function (e) {
    var bar = e.target.closest('[data-i]');
    if (!bar) return;
    stopPlay();
    state.step = +bar.dataset.i;
    render();
  });

  el.next.addEventListener('click', function () { stopPlay(); go(1); });
  el.prev.addEventListener('click', function () { stopPlay(); go(-1); });
  el.restart.addEventListener('click', function () { stopPlay(); restart(); });

  el.play.addEventListener('click', function () {
    if (state.timer) { stopPlay(); return; }
    if (state.step === currentExample().steps.length - 1) restart();
    el.play.textContent = 'Pause';
    state.timer = setInterval(function () { if (!go(1)) stopPlay(); }, PLAY_INTERVAL_MS);
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, textarea, dialog[open]')) return;
    if (e.key === 'ArrowRight') { stopPlay(); go(1); }
    if (e.key === 'ArrowLeft')  { stopPlay(); go(-1); }
  });

  // ---------- Start ----------

  renderTabs();
  render();
})(window.EC);
