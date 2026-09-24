# PrepStack

_Attend interviews confidently._

Interview study notes, built as a static site. There's no build step: open `index.html` in a browser or serve the folder with any static host (e.g. GitHub Pages).

| Page | Topic |
| --- | --- |
| `index.html` | React Native Architecture: Bridge, JSI, Fabric, TurboModules, Codegen, FlatList performance |
| `execution-context.html` | JavaScript Execution Context: an interactive lesson with a step-by-step engine visualizer, `this` cards and a quiz |
| `closures.html` | JavaScript Closures |
| `threads.html` | JavaScript Threads & Event Loop |
| `token-refresh.html` | Axios Token Refresh: request/response interceptors, the refresh queue for simultaneous 401s, `_retry`, logout, secure storage, with a live refresh simulator |
| `ssl-security.html` | SSL/TLS & App Security |

All pages share the same CSS, sidebar and theme.

## Project structure

```
index.html                 React Native Architecture page
execution-context.html     JavaScript Execution Context page
closures.html              JavaScript Closures page
threads.html               Threads & Event Loop page
token-refresh.html         Axios Token Refresh page
ssl-security.html          SSL/TLS & App Security page
css/
  main.css                 Entry point, imports every file below in order
  tokens.css               Colours, fonts, radii; light and dark theme values
  base.css                 Reset and default typography (h2, p, ul, code…)
  layout.css               Two-column grid, hero header, section spacing
  components/
    sidebar.css            Topics (page links), table of contents, theme toggle, mobile menu
    diagram.css            Flow diagrams: .node, .arrow, .compare, .fork/.join, .layer
    code-block.css         Code blocks, copy button, syntax colour tokens
    callout.css            Tip / warning boxes
    cards.css              Chips, cards, cheat sheet, memory grid, phase cards
    table.css              Comparison tables
    answer.css             The quoted interview answer
    explainer.css          Clickable terms + the pop-up detail panel
    button.css             Generic .btn / .btn--primary
    visualizer.css         Execution-context player: code, console, call stack, closure
    practice.css           Warm-up puzzle, `this` reveal cards, quiz
    token-refresh.css      Refresh simulator: request rows, step pills, token store, stats
js/
  theme.js                 Light/dark toggle (loaded in <head> to avoid a flash)
  sidebar.js               Highlights the current section; mobile "Contents" menu
  copy-code.js             Copy-to-clipboard on code blocks
  explainer.js             Opens the detail panel for a clicked term
  execution-context/       Scripts for execution-context.html only
    highlight.js           Shared helpers (EC namespace, syntax highlighting)
    examples.js            The visualizer programs and their steps (pure data)
    visualizer.js          Draws and steps through an example
    puzzle.js              Warm-up puzzle
    this-cards.js          `this` cards (data + reveal)
    quiz.js                Quiz questions, answers and score
  token-refresh/           Scripts for token-refresh.html only
    playgrounds.js         Warm-up puzzle + refresh simulator (runs the real interceptor logic against a fake server)
    quiz-questions.js      Quiz data, read by execution-context/quiz.js
```

## Common edits

**Add a page:** copy `execution-context.html`, replace the content inside `<main>`, and add the new page to the `.topics` list in the sidebar of *every* page (mark the current one with `aria-current="page"`).

**Add a section:** copy an existing `<section class="section" id="...">` block, give it a new `id`, and add a matching `<li><a href="#id">` to the `.toc` list in the sidebar. The sidebar numbers itself automatically.

**Draw a diagram:** stack `.node` boxes and `.arrow` elements inside a `.flow`:

```html
<figure class="diagram">
  <div class="flow">
    <div class="node node--js">JavaScript</div>
    <div class="arrow"></div>
    <div class="node node--new">JSI</div>
  </div>
</figure>
```

Put two `.flow`s inside a `.compare` to show them side by side. Node colours: `node--js` (blue), `node--old` (amber), `node--new` (green).

**Change colours or fonts:** edit `css/tokens.css`. Each colour is written as `light-dark(<light value>, <dark value>)`.

**Add a click-to-explain popup** (like `keyExtractor` in the FlatList example):

1. Wrap the term in a button, `<button class="explain-link" type="button" data-explain="windowSize">windowSize</button>`.
2. Add `<template id="explain-windowSize" data-title="windowSize" data-kicker="FlatList prop">…</template>` next to the other templates at the bottom of `index.html`. Any existing component (code blocks, callouts, tables, `.answer`) works inside it.

**Add a visualizer program:** add an object to `EC.examples` in `js/execution-context/examples.js`. The comment at the top of that file explains every step field; a new tab appears automatically.

**Edit the quiz or `this` cards:** change the `QUESTIONS` array in `quiz.js` or the `THIS_CASES` array in `this-cards.js`.
