/*
 * Shared helpers for the execution-context page
 * ---------------------------------------------
 * Creates the `EC` namespace used by the other files in this folder:
 *   EC.escape(text)      → HTML-safe text
 *   EC.highlight(line)   → one line of JS with .tok-* syntax spans
 */
window.EC = window.EC || {};

(function (EC) {
  EC.escape = function (text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Groups: 1 comment, 2 string, 3 keyword, 4 number, 5 console/log
  var TOKENS = /(\/\/.*$)|("[^"]*"|'[^']*')|\b(var|let|const|function|return|new|this|async|await|while|for|if)\b|\b(\d+)\b|\b(console|log|setTimeout|Promise|resolve|then|queueMicrotask)\b/g;
  var CLASSES = [null, 'tok-comment', 'tok-string', 'tok-keyword', 'tok-type', 'tok-fn'];

  EC.highlight = function (src) {
    var out = '';
    var last = 0;
    var match;
    TOKENS.lastIndex = 0;

    while ((match = TOKENS.exec(src))) {
      out += EC.escape(src.slice(last, match.index));
      var group = 1;
      while (!match[group]) group++;
      out += '<span class="' + CLASSES[group] + '">' + EC.escape(match[0]) + '</span>';
      last = TOKENS.lastIndex;
    }
    return out + EC.escape(src.slice(last));
  };

  // Highlight a multi-line snippet
  EC.highlightBlock = function (code) {
    return code.split('\n').map(EC.highlight).join('\n');
  };
})(window.EC);
