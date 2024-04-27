- when (next) inline style is disabled (line-through), remove disabled state
  from previous ones (which are now applied)
- line-through on atomic class row declaration when there's an inline style
  declaration for the same prop (unless atomic has important, unless style has
  important)

- compactCss inline style
- color picker on color previews ?
- on selector click, show a new panel with the selector and the matching
  elements -> allow editing the selector from there, allow adding styles in that
  selector

- add "link effect" on `var(--here)` with tooltip showing computed value
- add title attribute when possible (and there is not tooltip already)
- copy raw value on click sur computed value hint
- light mode
- blue highlight (in the browser host website) for every elements matching the
  hovered selector
- (firefox) button to highlight all elements matching a selector (like the
  previous one but click to toggle it)
- (firefox) red filter input on no results
- (firefox) green highlight (like git diff) on overrides (added inline
  styles/updated values)

- exclude list (of selectors), save in idb
- highlight part of the selector matching current element
  (`.dark xxx, xxx .dark`) + parseSelectors from panda
- right click (context menu) + mimic the one from `Styles` devtools panel (Copy
  all declarations as CSS/JS, Copy all changes, Revert to default, etc)
- right click copy computed styles (of a given DeclarationGroup, ex: every
  styles in @layer utilities using the computed values as a JS object)
- edit component styles (match all elements with the same classes as the current
  element, allow updating class names that are part of the class list)
- EditableValue for property name
- allow toggling any declaration (not just atomic) (just use an override)
- auto-completions for property names
- auto-completions for CSS vars
- toggle show source (next to layer/media)
- toggle btn to remove selectors with `*`
- CSS vars
- only atomic (filter out rules with more than 1 declaration)
- revert all to default (by group = only in X layer/media/or all if not
  grouped?)
- collapse/expand all
- save preferences in idb ?
- when adding inlien styles, add warning icon + line-though if property name is
  invalid ?
- when property value is using a known number/amount unit, use NumberInput +
  Scrubber
- when property value is using a known number/amount unit, allow shortcuts to
  change the step (0.1, 1, 10, 100)
- (firefox) IF we want to show the property rules stack (like in Computed
  devtools panel), use firefox styling
- toggle to sort alphabetically based on property names
