# Adaptive overlay composition

Read this reference only when one logical control uses an anchored Spartan surface on desktop and
a drawer on mobile.

## One contract, two presentations

Author the option or action model once. Both presentations consume the same typed source, current
value, permission decision, disabled reason and request state. Route both through the same handler;
do not duplicate business rules in template branches.

Keep the desktop primitive native:

- single choice: `hlm-select`;
- searchable choice: `hlm-combobox`;
- actions: `hlm-dropdown-menu`;
- anchored supporting controls: `hlm-popover`.

Compose the phone surface with `hlm-drawer`, `hlmDrawerTrigger`, `*hlmDrawerPortal`,
`hlm-drawer-content`, `hlm-drawer-header`, `hlmDrawerTitle`, `hlmDrawerDescription` and, when
needed, `hlm-drawer-footer` or `hlmDrawerClose`.

Do not move `hlm-select-item` or dropdown menu items into the drawer. Those directives require
their select or menu injection context. Render an equivalent native collection from the same
model:

- `hlm-radio-group` for a short exclusive choice;
- `hlm-command` and `button[hlmCommandItem]` for a searchable catalog;
- `hlm-item-group` with real buttons for an action list;
- checkbox rows with Apply and Cancel for multi-selection.

## Responsive ownership

Use CSS visibility when the two dormant presentations have no side effects, duplicate IDs, form
registration or eager data loading. If only one branch may exist, use the project's SSR-safe
viewport abstraction and a stable server default. Never read `window`, `matchMedia` or viewport
dimensions during server rendering.

Give duplicated triggers unique IDs and accessible names. Only the visible trigger may be
focusable. Do not switch surfaces while one is open: close it, restore focus, then allow the new
presentation after the breakpoint changes.

## State flow

For a choice:

1. The trigger reads the shared selected value and label.
2. The desktop primitive emits its native value change into the shared handler.
3. A mobile row calls the same handler.
4. A successful single selection closes the drawer and restores focus.
5. A multi-select stages a draft and commits only through Apply; Cancel leaves the shared value
   unchanged.

For actions, rows call the same permission-gated methods as the desktop menu. Close the drawer
before navigation unless the action must show a pending state in that drawer. Do not imply that
closing an overlay cancels an already-started server operation.

## Mobile layout

Use a bottom drawer for quick choices and action menus. Keep its title block left-aligned for
scannable operational tools, followed by one full-width list. Rows use icon, label, optional
description or trailing state in that order; they must not resemble compact header icon buttons.

Keep the first useful choice near the top, cap the scrollable body within the viewport, account for
safe-area insets, and ensure a footer never covers the final row or validation error. A search field
stays with the list it filters. Preserve grouped labels and separators when they improve scanning;
do not reproduce desktop submenus inside a drawer.

## Tests that catch the adaptation

In a mobile device project, assert that the trigger opens `hlm-drawer-content`, the selected row is
identifiable without color, selection updates the visible trigger, the drawer closes as intended,
and focus returns. Exercise enough options to prove internal scrolling and no document overflow.

In desktop Chromium, assert that the native select/menu/popover opens and the drawer trigger is not
available. If breakpoint logic is stateful rather than CSS-only, resize across the boundary and
verify no overlay, backdrop or focus trap is stranded.
