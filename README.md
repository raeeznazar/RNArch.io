# RN Architecture

Study notes on React Native's architecture (Bridge, JSI, Fabric, TurboModules, Codegen), built as a static site. There's no build step: open `index.html` in a browser or serve the folder with any static host (e.g. GitHub Pages).

## Project structure

```
index.html                 Page content, one <section> per topic
css/
  main.css                 Entry point, imports every file below in order
  tokens.css               Colours, fonts, radii; light and dark theme values
  base.css                 Reset and default typography (h2, p, ul, code…)
  layout.css               Two-column grid, hero header, section spacing
  components/
    sidebar.css            Table of contents, theme toggle, mobile menu
    diagram.css            Flow diagrams: .node, .arrow, .compare, .fork/.join, .layer
    code-block.css         Code blocks, copy button, syntax colour tokens
    callout.css            Tip / warning boxes
    cards.css              Chips, the four-pillar cards, cheat sheet
    table.css              Comparison tables
    answer.css             The quoted interview answer
    explainer.css          Clickable terms + the pop-up detail panel
js/
  theme.js                 Light/dark toggle (loaded in <head> to avoid a flash)
  sidebar.js               Highlights the current section; mobile "Contents" menu
  copy-code.js             Copy-to-clipboard on code blocks
  explainer.js             Opens the detail panel for a clicked term
```

## Common edits

**Add a section:** copy an existing `<section class="section" id="...">` block in `index.html`, give it a new `id`, and add a matching `<li><a href="#id">` to the `.toc` list in the sidebar. The sidebar numbers itself automatically.

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
