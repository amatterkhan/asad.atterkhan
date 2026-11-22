<script setup lang="ts">
// The command palette (/ or Ctrl+K) and the shortcut overlay (?). Rendered once at build time;
// behaviors/palette.ts opens them, filters the list and fetches Lab entries from /search.json
// the first time the palette opens. Without JavaScript neither can open, and nothing is lost:
// every destination is also in the navigation.
const pages = [
  ["/", "Home"],
  ["/lab", "The Lab"],
  ["/workbench", "Workbench"],
  ["/experience", "Experience"],
  ["/achievements", "Achievements"],
  ["/about", "About"],
  ["/disclosure", "Disclosure"],
] as const;
</script>
<template>
  <dialog class="palette" aria-label="Jump to a page or entry" data-palette>
    <label class="sr-only" for="palette-input">Jump to</label>
    <input
      id="palette-input"
      type="text"
      role="combobox"
      aria-expanded="true"
      aria-controls="palette-list"
      aria-autocomplete="list"
      autocomplete="off"
      spellcheck="false"
      placeholder="Jump to a page or Lab entry…"
      data-palette-input
    />
    <ul id="palette-list" role="listbox" aria-label="Results" data-palette-list>
      <li v-for="[href, label] in pages" :key="href" role="option" aria-selected="false" :data-href="href" data-kind="Page">
        <span>{{ label }}</span><small>Page</small>
      </li>
    </ul>
    <p class="palette-foot" aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p>
    <p class="sr-only" role="status" data-palette-status />
  </dialog>
  <dialog class="shortcuts" aria-labelledby="shortcuts-title" data-shortcuts>
    <h2 id="shortcuts-title">Keyboard shortcuts</h2>
    <dl>
      <div><dt><kbd>/</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Jump to a page or Lab entry</dd></div>
      <div><dt><kbd>?</kbd></dt><dd>Show this list</dd></div>
      <div><dt><kbd>Esc</kbd></dt><dd>Close a dialog</dd></div>
    </dl>
    <form method="dialog"><button type="submit">Close</button></form>
  </dialog>
</template>
