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

Compose the phone surface with `hlm-drawer direction="bottom"`, `hlmDrawerTrigger`, `*hlmDrawerPortal`,
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
registration or eager data loading. If only one branch may exist, use the project's centralized
`UI_EXPERIENCE_PORT.isMobileExperience` signal and its hydration-safe default, not a viewport
breakpoint. Never read `window`, `matchMedia` or viewport
dimensions during server rendering.

Give duplicated triggers unique IDs and accessible names. Only the visible trigger may be
focusable. Automatic classification is sampled once after rendering; resize, rotation, keyboard
attachment and recent touch input must not switch an anchored desktop surface into a drawer.
Do not remount a whole route or Signal Form just to change its presentation; preserve drafts.

## State flow

For a choice:

1. The trigger reads the shared selected value and label.
2. The desktop primitive emits its native value change into the shared handler.
3. A mobile row calls the same handler.
4. A successful single selection closes the drawer and restores focus.
5. A multi-select snapshots its draft once when opening and commits only through Apply; external
   updates while open must not reset the draft. Cancel leaves the shared value unchanged.

Emit the validated choice before explicitly closing the drawer. Do not combine a business
click handler with `hlmDrawerClose`; keep that directive for dismissal-only buttons.
When an action opens another overlay, close the current surface and open the next from
its `closed` event, keeping the primitive's focus lifecycle intact.

Preserve the native ancestor injector when rendering contributions inside a portal. Presentation
context must not replace it with an injector created outside the dialog: that hides the parent
`BrnDialogRef` and breaks close-then-open coordination. A global shortcut must belong to its
feature's browser lifetime, not to a trigger instantiated only while a drawer is open.

For actions, rows call the same permission-gated methods as the desktop menu. Use real RouterLink
anchors for destinations; route teardown closes the old surface. Do not imply that
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
available, including at 375px width and on a touch-capable Windows profile. Exercise a wide
tablet and reload stability. Verify that automatic classification exposes no manual override and
that no overlay, backdrop, draft or focus trap is stranded during the initial adaptive render.

Test focus cycling in both Chromium and WebKit, not just Escape. The installed CDK iOS heuristic
can miss radio/button-only content. When reproduced, use its public `cdkFocusRegionStart` and
`cdkFocusRegionEnd` markers on intentional, programmatically focusable boundaries (for example,
a title with `tabindex="-1"` and an always-enabled Close button). `autoFocus="first-heading"`
can make that initial focus explicit. Verify Tab, Shift+Tab, selection and focus return; do not
accept a hidden focus-trap sentinel as success or override the vendor's interaction checker.
