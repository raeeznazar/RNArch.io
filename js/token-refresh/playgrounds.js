/*
 * Token refresh page interactions
 * -------------------------------
 *   #puzzle       warm-up: 4 requests get 401 at once, how many refresh calls?
 *   #refreshSim   refresh simulator: fire requests with an expired access token
 *                 against a fake server, using either a naive interceptor or the
 *                 refresh queue (isRefreshing + failedQueue + _retry)
 *
 * The simulator runs the same algorithm as the Axios code on the page, with
 * real promises. Only the network is fake: `server()` and `refreshAccessToken()`
 * answer after a delay.
 */
(function (EC) {
  function $(id) { return document.getElementById(id); }

  /* ---------- Warm-up puzzle ---------- */

  (function () {
    var puzzle = $('puzzle');
    if (!puzzle) return;

    var CORRECT = '4';
    var choices = puzzle.querySelectorAll('[data-answer]');
    var feedback = puzzle.querySelector('.puzzle__feedback');

    var MESSAGES = {
      right: 'Correct. Each 401 runs the response interceptor on its own, and none of them knows a refresh is already running, so all four call the refresh endpoint.',
      wrong: 'It makes <b>4</b> refresh calls. Each 401 runs the response interceptor on its own, and none of them knows a refresh is already running.'
    };

    choices.forEach(function (button) {
      button.addEventListener('click', function () {
        var isRight = button.dataset.answer === CORRECT;
        choices.forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
        button.classList.add(isRight ? 'is-right' : 'is-wrong');
        if (!isRight) puzzle.querySelector('[data-answer="' + CORRECT + '"]').classList.add('is-right');
        feedback.innerHTML = MESSAGES[isRight ? 'right' : 'wrong'] +
          ' <a href="#simulator">Try it in the simulator</a>.';
      });
    });
  })();

  /* ---------- Refresh simulator ---------- */

  (function () {
    var root = $('refreshSim');
    if (!root) return;

    var REQUEST_MS = 450;   // fake API round trip
    var REFRESH_MS = 900;   // fake POST /auth/refresh round trip
    var STAGGER_MS = 70;    // gap between the 4 simultaneous requests
    var ENDPOINTS = ['/users', '/profile', '/orders', '/dashboard'];
    var CANCEL = { cancelled: true };  // thrown by work from a run that was reset

    var el = {
      mode: root.querySelector('[data-mode-group]'),
      refresh: root.querySelector('[data-refresh-group]'),
      store: root.querySelector('[data-store]'),
      stats: root.querySelector('[data-stats]'),
      requests: root.querySelector('[data-requests]'),
      banner: root.querySelector('[data-banner]'),
      console: root.querySelector('.console')
    };

    var settings = { mode: 'naive', refreshValid: true };
    var run = null;  // everything that belongs to the current simulation

    function newRun() {
      return {
        mode: settings.mode,
        startedAt: 0,
        version: 1,                 // token-v1 is the (expired) starting token
        clientToken: 'token-v1',    // what the app has stored
        refreshToken: settings.refreshValid ? 'valid' : 'expired',
        validTokens: {},            // access tokens the server accepts
        refreshCalls: 0,
        serverHits: 0,
        fired: 0,
        succeeded: 0,
        pending: 0,
        nextEndpoint: 0,
        loggedOut: false,
        // the refresh-queue pattern
        isRefreshing: false,
        failedQueue: []
      };
    }

    // ---------- Small helpers ----------

    function sleep(r, ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); })
        .then(function () { if (r !== run) throw CANCEL; });
    }

    function elapsed(r) {
      return ((performance.now() - r.startedAt) / 1000).toFixed(2) + 's';
    }

    function log(r, text, kind) {
      if (r !== run) return;
      var empty = el.console.querySelector('.console__empty');
      if (empty) empty.remove();
      var line = document.createElement('div');
      line.className = 'console__line' + (kind === 'error' ? ' is-error' : '');
      line.textContent = '[' + elapsed(r) + '] ' + text;
      el.console.appendChild(line);
      el.console.scrollTop = el.console.scrollHeight;
    }

    // Adds one step pill to a request's row
    function step(r, config, text, kind) {
      if (r !== run) return;
      var pill = document.createElement('span');
      pill.className = 'pill' + (kind ? ' pill--' + kind : '');
      pill.textContent = text;
      config.row.querySelector('.req__trail').appendChild(pill);
    }

    // ---------- Rendering ----------

    function renderStore() {
      var r = run;
      var access = r.clientToken
        ? '<div class="mem__val ' + (r.validTokens[r.clientToken] ? 'is-fresh' : 'is-expired') + '">' + r.clientToken + (r.validTokens[r.clientToken] ? '' : ' (expired)') + '</div>'
        : '<div class="mem__val is-undefined">cleared</div>';
      var refreshCls = r.refreshToken === 'valid' ? 'is-fresh' : r.refreshToken === 'expired' ? 'is-expired' : 'is-undefined';

      el.store.innerHTML =
        '<div class="mem__key">accessToken</div>' + access +
        '<div class="mem__key">refreshToken</div><div class="mem__val ' + refreshCls + '">' + r.refreshToken + '</div>' +
        '<div class="mem__key">isRefreshing</div><div class="mem__val">' + (r.mode === 'queue' ? String(r.isRefreshing) : 'n/a (naive)') + '</div>' +
        '<div class="mem__key">failedQueue</div><div class="mem__val">' + (r.mode === 'queue' ? r.failedQueue.length + ' waiting' : 'n/a (naive)') + '</div>';
    }

    function renderStats() {
      var r = run;
      var refreshCls = r.refreshCalls > 1 ? 'is-bad' : r.refreshCalls === 1 ? 'is-good' : '';
      var okCls = r.fired && r.pending === 0 ? (r.succeeded === r.fired ? 'is-good' : 'is-bad') : '';
      el.stats.innerHTML =
        '<div class="' + refreshCls + '"><b>' + r.refreshCalls + '</b><span>refresh calls</span></div>' +
        '<div><b>' + r.serverHits + '</b><span>API requests sent</span></div>' +
        '<div class="' + okCls + '"><b>' + r.succeeded + ' / ' + r.fired + '</b><span>succeeded</span></div>';
    }

    function render() { renderStore(); renderStats(); }

    // ---------- Fake network ----------

    // The API server: accepts only access tokens it has issued and not expired
    function server(r, config) {
      r.serverHits++;
      renderStats();
      return sleep(r, REQUEST_MS).then(function () {
        var token = (config.headers.Authorization || '').replace('Bearer ', '');
        if (r.validTokens[token]) return { status: 200, config: config };
        throw { response: { status: 401 }, config: config };
      });
    }

    // POST /auth/refresh with the refresh token
    function refreshAccessToken(r) {
      r.refreshCalls++;
      render();
      log(r, 'POST /auth/refresh  (call #' + r.refreshCalls + ')');

      return sleep(r, REFRESH_MS).then(function () {
        if (r.refreshToken !== 'valid') throw { refreshFailed: true };

        r.version++;
        var token = 'token-v' + r.version;
        r.validTokens[token] = true;
        r.clientToken = token;        // "store new token"
        log(r, 'refresh OK → new access token ' + token);
        render();
        return token;
      });
    }

    function logout(r) {
      log(r, 'logout(): clear tokens, navigate to Login', 'error');
      if (r.loggedOut) return;
      r.loggedOut = true;
      r.clientToken = null;
      r.refreshToken = 'cleared';
      el.banner.hidden = false;
      render();
    }

    // ---------- The pattern (mirrors the Axios code on the page) ----------

    function processQueue(r, error, token) {
      r.failedQueue.forEach(function (item) {
        if (error) item.reject(error);
        else item.resolve(token);
      });
      r.failedQueue = [];
      render();
    }

    // Request interceptor + "send"
    function api(r, config) {
      if (r !== run) return Promise.reject(CANCEL);

      config.headers = config.headers || {};
      if (r.clientToken) config.headers.Authorization = 'Bearer ' + r.clientToken;
      else delete config.headers.Authorization;

      step(r, config, (config._retry ? 'retry · ' : 'sent · ') + (r.clientToken || 'no token'), config._retry ? 'retry' : null);
      log(r, 'GET ' + config.url + (config._retry ? '  (retry)' : '') + ' with ' + (r.clientToken || 'no token'));

      return server(r, config).then(function (response) {
        step(r, config, '200 OK', 'ok');
        log(r, 'GET ' + config.url + ' → 200');
        return response;
      }, function (error) {
        if (error === CANCEL) throw error;
        step(r, config, '401', '401');
        log(r, 'GET ' + config.url + ' → 401 Unauthorized');
        return onResponseError(r, error);
      });
    }

    // Response interceptor (error branch)
    function onResponseError(r, error) {
      var original = error.config;

      if (error.response.status !== 401) return Promise.reject(error);

      // Already retried once: don't refresh again (prevents an infinite loop)
      if (original._retry) {
        step(r, original, 'already retried', 'fail');
        return Promise.reject(error);
      }
      original._retry = true;

      // Refresh queue: someone else is already refreshing, so wait for them
      if (r.mode === 'queue' && r.isRefreshing) {
        step(r, original, 'queued', 'queued');
        return new Promise(function (resolve, reject) {
          r.failedQueue.push({ resolve: resolve, reject: reject });
          render();
        }).then(function (token) {
          original.headers.Authorization = 'Bearer ' + token;
          return api(r, original);
        });
      }

      if (r.mode === 'queue') { r.isRefreshing = true; render(); }
      step(r, original, 'refresh', 'refresh');

      return refreshAccessToken(r).then(function (newToken) {
        processQueue(r, null, newToken);
        original.headers.Authorization = 'Bearer ' + newToken;
        return api(r, original);
      }, function (refreshError) {
        if (refreshError === CANCEL) throw refreshError;
        step(r, original, 'refresh failed', 'fail');
        log(r, 'refresh failed: refresh token ' + r.refreshToken, 'error');
        processQueue(r, refreshError);
        logout(r);
        return Promise.reject(refreshError);
      }).finally(function () {
        if (r === run && r.mode === 'queue') { r.isRefreshing = false; render(); }
      });
    }

    // ---------- Firing requests ----------

    function addRow(url) {
      var empty = el.requests.querySelector('.sim__empty');
      if (empty) empty.remove();
      var row = document.createElement('div');
      row.className = 'req';
      row.innerHTML = '<div class="req__name">GET ' + url + '</div><div class="req__trail"></div>';
      el.requests.appendChild(row);
      return row;
    }

    function fire(url) {
      var r = run;
      if (!r.startedAt) r.startedAt = performance.now();

      var config = { url: url, row: addRow(url) };
      r.fired++;
      r.pending++;
      renderStats();

      api(r, config).then(function () {
        r.succeeded++;
      }, function (error) {
        if (error === CANCEL) throw error;
        step(r, config, 'rejected', 'fail');
      }).then(function () {
        r.pending--;
        render();
        if (r.pending === 0) {
          log(r, 'Done: ' + r.succeeded + ' of ' + r.fired + ' succeeded, ' +
            r.refreshCalls + ' refresh call' + (r.refreshCalls === 1 ? '' : 's') + '.');
        }
      }).catch(function () { /* cancelled by reset */ });
    }

    function fireAll() {
      ENDPOINTS.forEach(function (url, i) {
        setTimeout(function () { fire(url); }, i * STAGGER_MS);
      });
    }

    function fireOne() {
      fire(ENDPOINTS[run.nextEndpoint]);
      run.nextEndpoint = (run.nextEndpoint + 1) % ENDPOINTS.length;
    }

    function expireAccessToken() {
      run.validTokens = {};
      if (!run.startedAt) run.startedAt = performance.now();
      log(run, 'access token expired on the server');
      render();
    }

    function reset() {
      run = newRun();
      el.requests.innerHTML = '<p class="sim__empty">No requests yet. The stored access token has already expired.</p>';
      el.console.innerHTML = '<div class="console__empty">Press a button to start.</div>';
      el.banner.hidden = true;
      render();
    }

    // ---------- Controls ----------

    function buttonGroup(container, attr, onPick) {
      container.addEventListener('click', function (e) {
        var button = e.target.closest('[' + attr + ']');
        if (!button) return;
        container.querySelectorAll('[' + attr + ']').forEach(function (b) {
          b.setAttribute('aria-selected', String(b === button));
        });
        onPick(button.getAttribute(attr));
      });
    }

    buttonGroup(el.mode, 'data-mode', function (mode) { settings.mode = mode; reset(); });
    buttonGroup(el.refresh, 'data-refresh', function (value) { settings.refreshValid = value === 'valid'; reset(); });

    root.querySelector('[data-fire-all]').addEventListener('click', fireAll);
    root.querySelector('[data-fire-one]').addEventListener('click', fireOne);
    root.querySelector('[data-expire]').addEventListener('click', expireAccessToken);
    root.querySelector('[data-reset]').addEventListener('click', reset);

    reset();
  })();
})(window.EC);
