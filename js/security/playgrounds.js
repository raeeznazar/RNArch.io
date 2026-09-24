/*
 * SSL / TLS security page interactions
 * ------------------------------------
 *   #puzzle      warm-up: "the app uses HTTPS, so is AsyncStorage safe?"
 *   #wire        what an eavesdropper on public Wi-Fi sees: HTTP vs HTTPS
 *   #certCheck   certificate checker: pick a server scenario and a pinning
 *                mode, see which checks pass and whether the app connects
 *   #qaGrid      interview questions with a reveal button
 */
(function (EC) {
  function $(id) { return document.getElementById(id); }

  // Radio-style button group: marks the clicked button selected, calls onPick(value)
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

  /* ---------- Warm-up puzzle ---------- */

  (function () {
    var puzzle = $('puzzle');
    if (!puzzle) return;

    var CORRECT = 'no';
    var choices = puzzle.querySelectorAll('[data-answer]');
    var feedback = puzzle.querySelector('.puzzle__feedback');

    var MESSAGES = {
      right: 'Correct. HTTPS protects data <em>in transit</em>. Once the token is on the phone, how it\'s stored is a separate problem.',
      wrong: 'Not quite. HTTPS only protects data while it travels over the network. A token saved in AsyncStorage is stored unencrypted in the app\'s storage, which is a separate security concern.'
    };

    choices.forEach(function (button) {
      button.addEventListener('click', function () {
        var isRight = button.dataset.answer === CORRECT;
        choices.forEach(function (b) { b.classList.remove('is-right', 'is-wrong'); });
        button.classList.add(isRight ? 'is-right' : 'is-wrong');
        if (!isRight) puzzle.querySelector('[data-answer="' + CORRECT + '"]').classList.add('is-right');
        feedback.innerHTML = MESSAGES[isRight ? 'right' : 'wrong'] + ' <a href="#storage">See token storage</a>.';
      });
    });
  })();

  /* ---------- Eavesdropper view ---------- */

  (function () {
    var root = $('wire');
    if (!root) return;

    var view = root.querySelector('[data-view]');
    var note = root.querySelector('[data-note]');

    var PLAIN = [
      'POST /login HTTP/1.1',
      'Host: api.example.com',
      'Content-Type: application/json',
      '',
      '{"username":"john","password":"123456"}'
    ].join('\n');

    function cipherText() {
      var hex = '0123456789abcdef';
      var lines = [];
      for (var l = 0; l < 5; l++) {
        var line = '';
        for (var i = 0; i < 32; i++) line += hex[Math.floor(Math.random() * 16)] + (i % 2 ? ' ' : '');
        lines.push(line.trim());
      }
      return lines.join('\n');
    }

    var MODES = {
      http: {
        text: function () { return PLAIN; },
        cls: 'is-plain',
        note: '😱 Everything is readable: the path, the headers and the password. Anyone on the same network, or any hop along the way, could read or even change it.'
      },
      https: {
        text: function () {
          return 'TLS 1.3 · to api.example.com (IP + server name are visible)\n\n' + cipherText();
        },
        cls: 'is-cipher',
        note: '🔐 Only encrypted bytes. An observer can still see which server you connect to and roughly how much data moves, but not the URL path, headers or body, and any tampering is detected.'
      }
    };

    function show(mode) {
      var m = MODES[mode];
      view.className = 'wire__view ' + m.cls;
      view.textContent = m.text();
      note.textContent = m.note;
    }

    buttonGroup(root, 'data-mode', show);
    show('http');
  })();

  /* ---------- Certificate checker ---------- */

  (function () {
    var root = $('certCheck');
    if (!root) return;

    var APP_HOST = 'api.example.com';
    var PINNED_CERT = 'cert-A';
    var PINNED_KEYS = ['key-9C', 'key-51']; // current + backup

    var SCENARIOS = {
      legit: {
        story: 'The real server, with a normal certificate.',
        domain: APP_HOST, issuer: 'Let\'s Encrypt → trusted root', trusted: true, valid: true, expires: 'in 60 days',
        cert: 'cert-A', key: 'key-9C'
      },
      expired: {
        story: 'The real server, but someone forgot to renew the certificate.',
        domain: APP_HOST, issuer: 'Let\'s Encrypt → trusted root', trusted: true, valid: false, expires: '3 days ago',
        cert: 'cert-A', key: 'key-9C'
      },
      mismatch: {
        story: 'A certificate that is valid, but for a different domain.',
        domain: 'otherdomain.com', issuer: 'DigiCert → trusted root', trusted: true, valid: true, expires: 'in 200 days',
        cert: 'cert-X', key: 'key-X'
      },
      untrusted: {
        story: 'A self-signed certificate that no trusted CA vouches for.',
        domain: APP_HOST, issuer: 'Self-signed (no trusted CA)', trusted: false, valid: true, expires: 'in 365 days',
        cert: 'cert-S', key: 'key-S'
      },
      mitm: {
        story: 'Man-in-the-middle: an attacker presents a certificate for api.example.com signed by a CA the device trusts (a compromised CA, or a rogue CA installed on a rooted or managed device).',
        domain: APP_HOST, issuer: 'Rogue CA (trusted by this device)', trusted: true, valid: true, expires: 'in 90 days',
        cert: 'cert-EVIL', key: 'key-EVIL', attacker: true
      },
      renewed: {
        story: 'The real server renewed its certificate. New certificate, same key pair.',
        domain: APP_HOST, issuer: 'Let\'s Encrypt → trusted root', trusted: true, valid: true, expires: 'in 90 days',
        cert: 'cert-B', key: 'key-9C'
      },
      rotated: {
        story: 'The real server rotated to a new key pair, the one kept as a backup pin.',
        domain: APP_HOST, issuer: 'Let\'s Encrypt → trusted root', trusted: true, valid: true, expires: 'in 90 days',
        cert: 'cert-C', key: 'key-51'
      }
    };

    var PIN_LABELS = {
      off: 'No pinning',
      cert: 'Pinned certificate: ' + PINNED_CERT,
      key: 'Pinned public keys: ' + PINNED_KEYS.join(', ') + ' (current + backup)'
    };

    var state = { scenario: 'legit', pin: 'off' };

    var el = {
      story: root.querySelector('[data-story]'),
      cert: root.querySelector('[data-cert]'),
      pins: root.querySelector('[data-pins]'),
      checks: root.querySelector('[data-checks]'),
      verdict: root.querySelector('[data-verdict]')
    };

    function certHTML(s) {
      var rows = [
        ['Domain', s.domain],
        ['Issuer', s.issuer],
        ['Valid until', s.expires],
        ['Certificate', s.cert],
        ['Public key', s.key]
      ];
      return '<div class="mem">' + rows.map(function (r) {
        return '<div class="mem__key">' + r[0] + '</div><div class="mem__val">' + EC.escape(r[1]) + '</div>';
      }).join('') + '</div>';
    }

    function evaluate(s, pin) {
      var checks = [
        { label: 'Chain leads to a trusted root CA', ok: s.trusted },
        { label: 'Hostname matches ' + APP_HOST, ok: s.domain === APP_HOST },
        { label: 'Certificate is within its validity period', ok: s.valid }
      ];
      var normalOk = checks.every(function (c) { return c.ok; });

      if (pin === 'cert') checks.push({ label: 'Certificate matches the pinned certificate', ok: s.cert === PINNED_CERT });
      if (pin === 'key')  checks.push({ label: 'Public key matches a pinned key', ok: PINNED_KEYS.indexOf(s.key) !== -1 });
      if (pin === 'off')  checks.push({ label: 'Pin check', ok: null });

      var allOk = checks.every(function (c) { return c.ok !== false; });
      return { checks: checks, normalOk: normalOk, allOk: allOk };
    }

    function verdict(s, r, pin) {
      if (!r.normalOk) {
        return { cls: 'is-blocked', text: '❌ Connection rejected by normal certificate validation. Pinning isn\'t even needed here.' };
      }
      if (r.allOk && s.attacker) {
        return { cls: 'is-danger', text: '⚠️ Connected… to the attacker. The certificate looks valid to the device, so without pinning the app happily sends data through the man in the middle.' };
      }
      if (r.allOk) {
        var extra = pin === 'key' && s.key === 'key-51' ?' The backup pin saved the day: the app keeps working after a key rotation.' : '';
        return { cls: 'is-ok', text: '✅ Secure connection established.' + extra };
      }
      if (s.attacker) {
        return { cls: 'is-blocked', text: '🛡️ Pinning caught it. The certificate looked trusted, but its ' + (pin === 'cert' ? 'certificate' : 'public key') + ' isn\'t the one the app expects. Connection rejected.' };
      }
      return { cls: 'is-danger', text: '🔥 Outage! The legitimate server is rejected because the app only accepts the old ' + (pin === 'cert' ? 'certificate' : 'key') + '. Users can\'t log in until they update the app. This is the rotation risk of pinning.' };
    }

    function render() {
      var s = SCENARIOS[state.scenario];
      var r = evaluate(s, state.pin);
      var v = verdict(s, r, state.pin);

      el.story.textContent = s.story;
      el.cert.innerHTML = certHTML(s);
      el.pins.textContent = PIN_LABELS[state.pin];
      el.checks.innerHTML = r.checks.map(function (c) {
        var icon = c.ok === null ? '–' : (c.ok ? '✓' : '✗');
        var cls = c.ok === null ? 'is-skip' : (c.ok ? 'is-pass' : 'is-fail');
        return '<li class="' + cls + '"><span class="checks__icon">' + icon + '</span>' + EC.escape(c.label) +
          (c.ok === null ? ' <small>(pinning off)</small>' : '') + '</li>';
      }).join('');
      el.verdict.className = 'verdict ' + v.cls;
      el.verdict.textContent = v.text;
    }

    buttonGroup(root.querySelector('[data-scenarios]'), 'data-scenario', function (v) { state.scenario = v; render(); });
    buttonGroup(root.querySelector('[data-pin-modes]'), 'data-pin', function (v) { state.pin = v; render(); });
    render();
  })();

  /* ---------- Interview Q&A ---------- */

  (function () {
    var grid = $('qaGrid');
    if (!grid) return;

    var QA = [
      ['What is SSL?', 'SSL is an older security protocol; modern HTTPS uses TLS to encrypt and authenticate network communication.'],
      ['What is HTTPS?', 'HTTPS is HTTP transmitted over TLS.'],
      ['What does TLS provide?', 'Confidentiality (encryption), integrity, and server authentication.'],
      ['What is SSL pinning?', 'Pinning makes the app expect a specific server certificate or public-key identity, in addition to normal certificate validation.'],
      ['Why use SSL pinning?', 'It can reduce the risk of certain man-in-the-middle attacks, particularly in high-security applications.'],
      ['Where should you store an auth token in React Native?', 'For sensitive tokens, use platform-backed secure storage such as the iOS Keychain or Android Keystore-backed mechanisms, rather than treating ordinary app storage as a secure secret store.'],
      ['Does HTTPS protect a token stored on the phone?', 'No. HTTPS protects data in transit. Token storage needs a separate security mechanism.'],
      ['Can HTTPS prevent all attacks?', 'No. It protects communication in transit, but not insecure token storage, broken authorization, compromised devices, malicious app code, or server-side vulnerabilities.']
    ];

    grid.innerHTML = QA.map(function (qa, i) {
      return '<div class="this-card">' +
        '<h3 class="this-card__title">' + EC.escape(qa[0]) + '</h3>' +
        '<button class="btn" type="button" aria-expanded="false" aria-controls="qaAnswer' + i + '">Reveal answer</button>' +
        '<p class="this-card__answer" id="qaAnswer' + i + '" hidden>' + EC.escape(qa[1]) + '</p>' +
      '</div>';
    }).join('');

    grid.addEventListener('click', function (e) {
      var button = e.target.closest('[aria-controls]');
      if (!button) return;
      var answer = $(button.getAttribute('aria-controls'));
      var open = answer.hidden;
      answer.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Hide answer' : 'Reveal answer';
    });
  })();
})(window.EC);
