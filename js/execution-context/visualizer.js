/*
 * Execution-context visualizer
 * ----------------------------
 * Steps through the programs in EC.examples and draws, for each step:
 *   narration (phase tag, title, text) · progress bars · highlighted code
 *   console output · the call stack of contexts · closure memory
 *
 * Controls: Restart / Back / Next / Play buttons, the progress bars,
 * and the ← / → arrow keys.
 *
 * Exposes EC.showExample(index) so other scripts (e.g. the puzzle) can jump here.
 */
(function (EC) {
  var root = document.getElementById('visualizer');
  if (!root || !EC.examples) return;

  var PLAY_INTERVAL_MS = 2600;

  function $(id) { return document.getElementById(id); }

  var el = {
    tabs: $('vizTabs'),
    phase: $('vizPhase'),
    title: $('vizTitle'),
    text: $('vizText'),
    count: $('vizCount'),
    progress: $('vizProgress'),
    code: $('vizCode'),
    console: $('vizConsole'),
    stack: $('vizStack'),
    closure: $('vizClosure'),
    restart: $('vizRestart'),
    prev: $('vizPrev'),
    next: $('vizNext'),
    play: $('vizPlay')
  };

  var state = {
    example: 0,
    step: 0,
    prevStackLen: 0,  // used to animate newly pushed contexts
    prevOutLen: 0,    // used to highlight new console lines
    timer: null
  };

  var PHASE_LABELS = {
    creation: 'Creation phase',
    execution: 'Execution phase',
    error: 'Error',
    done: 'Done'
  };

  // ---------- Helpers ----------

  function currentExample() { return EC.examples[state.example]; }

  function stepKind(step) {
    if (step.err) return 'error';
    if (step.done) return 'done';
    return step.stack[step.stack.length - 1].phase;
  }

  function valueClass(value) {
    if (value === EC.UNDEFINED) return 'is-undefined';
    if (value === EC.UNINITIALIZED) return 'is-tdz';
    if (String(value).charAt(0) === 'ƒ') return 'is-fn';
    return '';
  }

  function resetAnimations() {
    state.prevStackLen = 0;
    state.prevOutLen = 0;
  }

  // ---------- Render pieces ----------

  function renderTabs() {
    el.tabs.innerHTML = EC.examples.map(function (ex, i) {
      return '<button class="btn" type="button" role="tab" aria-selected="' + (i === state.example) + '" data-i="' + i + '">' + ex.label + '</button>';
    }).join('');
  }

  function renderNarration(step, kind) {
    el.phase.className = 'phase-tag ' + kind;
    el.phase.textContent = PHASE_LABELS[kind];
    el.title.textContent = step.title;
    el.text.textContent = step.text;
    el.count.textContent = 'Step ' + (state.step + 1) + ' of ' + currentExample().steps.length;
  }

  function renderProgress() {
    el.progress.innerHTML = currentExample().steps.map(function (s, i) {
      var past = i <= state.step ? ' is-past' : '';
      return '<button type="button" class="' + stepKind(s) + past + '" aria-label="Go to step ' + (i + 1) + '" data-i="' + i + '"></button>';
    }).join('');
  }

  function renderCode(step) {
    el.code.innerHTML = currentExample().code.map(function (line, i) {
      var n = i + 1;
      var cls = step.lines.indexOf(n) !== -1 ? (step.err ? ' is-error' : ' is-active') : '';
      return '<div class="code-lines__line' + cls + '">' +
        '<span class="code-lines__num">' + n + '</span>' +
        '<span class="code-lines__src">' + (EC.highlight(line) || ' ') + '</span>' +
        '</div>';
    }).join('');
  }

  function renderConsole(step) {
    var out = step.out || [];
    var html = out.map(function (line, i) {
      var cls = i >= state.prevOutLen ? ' is-new' : '';
      return '<div class="console__line' + cls + '">' + EC.escape(line) + '</div>';
    }).join('');

    if (step.error) html += '<div class="console__line is-error">' + EC.escape(step.error) + '</div>';
    el.console.innerHTML = html || '<div class="console__empty">Nothing printed yet.</div>';
  }

  function memoryHTML(mem, highlighted, foundName) {
    if (!mem.length) return '<div class="mem-empty">No local variables</div>';

    return '<div class="mem">' + mem.map(function (entry) {
      var name = entry[0];
      var value = entry[1];
      var cls = valueClass(value);
      if (highlighted && highlighted.indexOf(name) !== -1) cls += ' is-flash';
      if (foundName === name) cls += ' is-found';
      return '<div class="mem__key">' + EC.escape(name) + '</div>' +
             '<div class="mem__val ' + cls + '">' + EC.escape(value) + '</div>';
    }).join('') + '</div>';
  }

  function renderStack(step) {
    var stack = step.stack;
    var grew = stack.length > state.prevStackLen;
    var search = step.search;

    // Newest context is drawn first (top of the stack)
    el.stack.innerHTML = stack.slice().reverse().map(function (ctx, i) {
      var isTop = i === 0;
      var searched = search && search.path.indexOf(ctx.name) !== -1;
      var foundName = search && search.found[0] === ctx.name ? search.found[1] : null;
      var cls = 'ctx' + (isTop ? ' is-top' : '') + (isTop && grew ? ' is-entering' : '') + (searched ? ' is-searched' : '');
      var kind = ctx.name === 'Global' ? 'execution context' : 'function context';

      return '<div class="' + cls + '">' +
        '<div class="ctx__head">' +
          '<span class="ctx__name">' + EC.escape(ctx.name) + '<small>' + kind + '</small></span>' +
          '<span class="ctx__badge ' + ctx.phase + '">' + PHASE_LABELS[ctx.phase] + '</span>' +
        '</div>' +
        memoryHTML(ctx.mem, ctx.hl, foundName) +
        '<div class="ctx__meta">' +
          '<span>this: <code>' + EC.escape(ctx.thisV) + '</code></span>' +
          '<span>outer: <code>' + EC.escape(ctx.outer) + '</code></span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function closureHTML(label, mem, hl) {
    return '<div class="closure"><div class="ctx__head"><span class="ctx__name">' + EC.escape(label) + '</span></div>' +
      memoryHTML(mem, hl) + '</div>';
  }

  // step.closure (one box, closureHl: true flashes count) or
  // step.closures: [{ label, mem, hl: [names to flash] }] for several boxes
  function renderClosure(step) {
    if (step.closures) {
      el.closure.innerHTML = step.closures.map(function (c) {
        return closureHTML(c.label, c.mem, c.hl || []);
      }).join('');
      return;
    }
    el.closure.innerHTML = step.closure
      ? closureHTML('Closure (kept alive off the stack)', step.closure, step.closureHl ? ['count'] : [])
      : '';
  }

  function renderControls() {
    var last = currentExample().steps.length - 1;
    el.prev.disabled = state.step === 0;
    el.next.disabled = state.step === last;
    el.next.textContent = state.step === last ? 'Finished' : 'Next';
  }

  function render() {
    var step = currentExample().steps[state.step];
    var kind = stepKind(step);

    renderNarration(step, kind);
    renderProgress();
    renderCode(step);
    renderConsole(step);
    renderStack(step);
    renderClosure(step);
    renderControls();

    state.prevStackLen = step.stack.length;
    state.prevOutLen = (step.out || []).length;
  }

  // ---------- Navigation ----------

  function go(delta) {
    var count = currentExample().steps.length;
    var target = Math.max(0, Math.min(count - 1, state.step + delta));
    if (target === state.step) return false;

    // Going back shouldn't replay "new" animations
    if (delta < 0) { state.prevStackLen = 99; state.prevOutLen = 99; }

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
    resetAnimations();
    render();
  }

  EC.showExample = function (index) {
    stopPlay();
    state.example = index;
    state.step = 0;
    resetAnimations();
    renderTabs();
    render();
  };

  // ---------- Events ----------

  el.tabs.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-i]');
    if (tab) EC.showExample(+tab.dataset.i);
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
