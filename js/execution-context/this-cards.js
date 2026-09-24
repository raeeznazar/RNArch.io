/*
 * `this` cards
 * ------------
 * Four snippets; the reader guesses what `this` is, then reveals the answer.
 * Edit THIS_CASES to change or add cards.
 */
(function (EC) {
  var grid = document.getElementById('thisGrid');
  if (!grid) return;

  var THIS_CASES = [
    {
      title: 'At the top level of a script',
      code: 'console.log(this);',
      answer: '<b>window</b> in a browser. The Global context sets this to the global object. (Inside an ES module, top-level this is undefined.)'
    },
    {
      title: 'A plain function call',
      code: 'function show() {\n  console.log(this);\n}\nshow();',
      answer: '<b>window</b> in normal mode, <b>undefined</b> in strict mode. Nothing is to the left of the dot, so there is no object to bind to.'
    },
    {
      title: 'Called as a method',
      code: 'const user = {\n  name: "Ava",\n  show() { console.log(this.name); }\n};\nuser.show();',
      answer: 'Prints <b>"Ava"</b>. When called as user.show(), the object to the left of the dot becomes this.'
    },
    {
      title: 'An arrow function as a method',
      code: 'const user = {\n  name: "Ava",\n  show: () => console.log(this.name)\n};\nuser.show();',
      answer: 'Prints <b>undefined</b>. Arrow functions don\'t get their own this in their context. They use the this of where they were written, which here is the global scope.'
    }
  ];

  grid.innerHTML = THIS_CASES.map(function (item, i) {
    return '<div class="this-card">' +
      '<h3 class="this-card__title">' + item.title + '</h3>' +
      '<pre><code>' + EC.highlightBlock(item.code) + '</code></pre>' +
      '<button class="btn" type="button" aria-expanded="false" aria-controls="thisAnswer' + i + '">Reveal this</button>' +
      '<p class="this-card__answer" id="thisAnswer' + i + '" hidden>' + item.answer + '</p>' +
    '</div>';
  }).join('');

  grid.addEventListener('click', function (e) {
    var button = e.target.closest('[aria-controls]');
    if (!button) return;

    var answer = document.getElementById(button.getAttribute('aria-controls'));
    var open = answer.hidden;
    answer.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Hide answer' : 'Reveal this';
  });
})(window.EC);
