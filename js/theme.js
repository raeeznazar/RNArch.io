/*
 * Theme (light / dark)
 * --------------------
 * Loaded in <head> without `defer` so the saved theme is applied before the
 * page paints (no flash of the wrong theme).
 *
 * With no saved choice the site follows the OS setting (see css/tokens.css).
 * Clicking any [data-theme-toggle] button flips the theme and remembers it.
 */
(function () {
  var STORAGE_KEY = 'rn-theme';
  var root = document.documentElement;

  function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function save(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* storage blocked */ }
  }

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function toggle() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    save(next);
  }

  // 1. Apply saved theme immediately.
  var saved = readSaved();
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  // 2. Wire up toggle buttons once the page exists.
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggle);
    });
  });
})();
