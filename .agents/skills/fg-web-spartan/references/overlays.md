# Overlay choice and behavior

Use this reference for selects, menus, popovers, pickers, commands, creation/editing panels,
confirmations, drawers, sheets and dialogs. Read DESIGN.md and the owning FEATURE.md.
Compose installed native primitives at the application boundary; do not edit Helm to encode
a feature or a responsive rule. Ordinary page reflow without a temporary surface needs no overlay.

## Choose from intent

Classify the interaction before writing markup:

1. Is it anchored assistance or a compact choice, or a blocking task?
2. Must the operator keep seeing the current page as context?
3. Is the task one decision, a short edit, or a longer workflow?
4. Is dismissal harmless, or could it discard work or confirm a consequential action?
5. Does a phone require more width, scrolling, search, richer rows or thumb-reachable actions?

Use the smallest surface that safely carries the task:

| Surface                          | Use when                                                                                                                          | Do not use when                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Select / dropdown menu / popover | The interaction is compact, anchored to its trigger and remains readable and operable in the available viewport.                  | It becomes clipped, needs a long searchable list, contains a form, or represents a workflow.            |
| Drawer                           | A phone needs a short, temporary choice or action list in the thumb zone; dismissal is harmless and the page remains the context. | The task is destructive confirmation, a long form, or contains unsaved work that a swipe could discard. |
| Sheet                            | A contextual create/edit/detail workflow needs more room while preserving the route and surrounding page context.                 | The task is one compact decision or a global blocking question unrelated to page context.               |
| Dialog                           | A short focused task or decision must interrupt the page and can finish without a persistent side context.                        | The task is a long workflow, dense browsing surface or consequential confirmation.                      |
| Alert dialog                     | The user must explicitly confirm a destructive, irreversible or high-consequence action.                                          | The content is informational, exploratory or safely dismissible.                                        |
| Command dialog                   | The user searches or invokes global commands across the workspace.                                                                | The options are a normal form field or a page-local action list.                                        |

“Modal” describes blocking behavior, not a separate visual component. In FireGuard it normally
maps to `hlm-dialog` or `hlm-alert-dialog`; a drawer or sheet can also be modal, but its spatial
role still determines whether it is appropriate.

## Detect an adaptive mobile overlay

Select the experience through `UI_EXPERIENCE_PORT` from
`@core/ui-experience`. Width, pointer modality, touch support or a user-agent token
alone are not a mobile gate. Phones and tablets retain mobile interactions when
wide; narrow desktop windows retain native desktop components and density. Honor
the centralized automatic result; do not expose or persist a manual mobile/desktop override.
Use the app's `mobile-ui:` variant for touch-only styling, including portal content.
Width/container queries may still arrange columns or fit content within that mode.
Read `src/app/core/README.md` for classification, SSR and ambiguity limits; do not
invent a second detector or import Signality internals.

Keep the native select, menu or popover on mobile when its options are short, its rows fit, its
touch targets are at least 44px and it neither clips nor hides important context. Do not convert
every overlay merely because the viewport is narrow.

Prefer a bottom drawer on mobile while retaining the native anchored surface on desktop when one
or more of these constraints materially affects use:

- the anchored overlay is clipped or forced into an unreadable width;
- options need search, scrolling, descriptions, icons, status or grouped sections;
- nested or hover-oriented menu behavior does not translate to touch;
- the trigger lives in a dense mobile toolbar and the choices need a stable full-width surface;
- one-handed operation benefits from actions entering from the bottom.

For two to seven short comparable choices, consider a native toggle or radio group before adding
an overlay. For a short enum, a select may remain the better mobile control.

When implementing a desktop/mobile surface pair, read
[adaptive composition](adaptive-composition.md).

## Overlay invariants

- Every drawer, sheet and dialog has a native title and description; use `sr-only` only when the
  visible design genuinely makes them redundant.
- Preserve the primitive's focus trap, Escape behavior, outside-click policy and focus restoration.
  Do not recreate them with document listeners or manual z-index values.
- Keep one typed value source and one request state. In forms, bind both presentations to the same
  Signal Forms field; otherwise use the owning store or component signal.
- Keep loading, empty, error, disabled and offline states inside the active surface. Retain the
  current selection while replacement data loads.
- Drawer and sheet bodies scroll independently; headers and optional footers must not cover the
  first or last option. Long labels wrap, including French and Spanish strings.
- Mobile actions and options have at least 44px touch targets. Selection and status are not
  conveyed by color alone.
- Use native Spartan anatomy: command or item rows for action menus, radio rows for short
  exclusive choices, checkbox rows plus an explicit Apply action for multi-select, and a searchable
  command list for long option catalogs.
- Separate a destructive action from routine choices and route it through an alert dialog when it
  needs confirmation.

## Verification

Use `fg-web-test` for state and output contracts, `fg-web-e2e` for real overlay behavior and
`fg-web-quality` for scoped gates. Verify at minimum:

- desktop and mobile select the same value or invoke the same action;
- opening, Escape/backdrop dismissal, successful selection and focus restoration;
- keyboard and touch operation, scroll containment and absence of document overflow;
- light/dark rendering, long localized labels, loading/empty/error states and relevant offline
  behavior;
- resizing does not strand an open overlay or leave focus on a removed trigger.

Report the chosen primitive, the evidence that justified it, the adaptive behavior, and the
actual browser sizes and checks performed.
