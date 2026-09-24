/*
 * Explainer panels
 * ----------------
 * Clicking a [data-explain="name"] button opens the shared <dialog class="explainer">
 * filled with the contents of <template id="explain-name">.
 *
 * The template's first element may carry data-title / data-kicker to set the
 * panel heading; otherwise the button text is used.
 * Close with the × button, the Esc key, or by clicking the backdrop.
 */
(function () {
  var dialog = document.querySelector('.explainer');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var titleEl = dialog.querySelector('.explainer__title');
  var kickerEl = dialog.querySelector('.explainer__kicker');
  var bodyEl = dialog.querySelector('.explainer__body');
  var closeBtn = dialog.querySelector('.explainer__close');

  function open(name, trigger) {
    var template = document.getElementById('explain-' + name);
    if (!template) return;

    var content = template.content.cloneNode(true);
    var meta = template.dataset;

    titleEl.textContent = meta.title || trigger.textContent;
    kickerEl.textContent = meta.kicker || 'Explained';
    bodyEl.replaceChildren(content);

    dialog.showModal();
    bodyEl.scrollTop = 0;
    dialog.scrollTop = 0;
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-explain]');
    if (trigger) open(trigger.getAttribute('data-explain'), trigger);
  });

  closeBtn.addEventListener('click', function () { dialog.close(); });

  // A click that lands on the dialog element itself is a click on the backdrop.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });
})();
