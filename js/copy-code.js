/*
 * Copy-to-clipboard for code blocks
 * ---------------------------------
 * Every .code-block__copy button copies the text of the <pre> in its block.
 * Uses one listener on the document, so it also works for code blocks
 * added later (e.g. inside explainer panels).
 */
(function () {
  var RESET_AFTER_MS = 1500;

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.code-block__copy');
    if (!button || !navigator.clipboard) return;

    var pre = button.closest('.code-block').querySelector('pre');
    if (!pre) return;

    navigator.clipboard.writeText(pre.innerText).then(function () {
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = 'Copy'; }, RESET_AFTER_MS);
    });
  });
})();
