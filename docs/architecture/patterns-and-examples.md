# Frontend patterns and examples

Use these generic examples to apply the normative ownership rules. Replace example names with the owning feature; an example never grants a new dependency.

**Authoritative references:** [Architecture](../../ARCHITECTURE.md).

## Ownership-first placement

```text
src/app/features/example/
  FEATURE.md
  data-access/services/items/
  models/item/
  state/items/
  ui/pages/items/
  ui/forms/item/
```

Create only concerns that exist. Put the business contract in the feature, even
when a layout renders it. Publish a narrow barrel for external consumers. A port
belongs to its behavior's owner and is justified by a consumer outside that owner.
Bind an existing adapter with `useExisting` to retain one instance.

## State and rendering

Pages orchestrate route context and stores. Forms manage Signal Forms and emit
submission; collection views emit queries/actions. Neither calls the API directly.
API services extend `HydraApiService`; stores normalize transport into owned view
models and expose named request states for independent operations. Collections use
entity helpers where appropriate. Typed events coordinate cross-layer consequences.

Keep permission decisions at the owner and publish their projections. The API
still authorizes the mutation. Preserve draft state on failure; retry and conflict
decisions belong to the workflow owning the revision or idempotency contract.

## SSR-safe behavior

Browser-only storage and resources start after hydration or explicit user action.
Keep one loading path for route-critical data and transfer only the targeted public
handoff approved by the contract. Release listeners/resources with their lifecycle.
See [SSR and hydration](../guides/ssr-and-hydration.md).

## State example 1

```typescript
// state/<slice>/models/state.interface.ts
export interface FeatureState {
  createCallState: CallState<FeatureOutput>;
  listCallState: CallState<FeatureOutput[]>;
}

const INITIAL_STATE: FeatureState = {
  createCallState: idleCallState(),
  listCallState: idleCallState(),
};

// state/<slice>/<slice>.store.ts
export const FeatureStore = signalStore(
  withEntities({ entity: type<FeatureOutput>(), collection: 'entity' }), // optional
  withState<FeatureState>(INITIAL_STATE), // 1. raw state (CallState fields + filter state)

  withComputed((store) => ({
    // 2. derived signals
    isLoading: computed(() => isCallPending(store.listCallState())),
    items: computed(() => {
      const state = store.listCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
  })),

  withMethods((store, service = inject(FeatureService), dispatcher = inject(Dispatcher)) => ({
    // 3. actions
    load: rxMethod<RequestOptions>(
      pipe(
        tap(() =>
          patchState(store, {
            listCallState: pendingCallState(store.listCallState().data ?? []),
          }),
        ),
        switchMap((options) =>
          service.getAll(options).pipe(
            tapResponse({
              next: (res) =>
                patchState(store, {
                  listCallState: successCallState(res.member),
                }),
              error: (err: unknown) =>
                patchState(store, {
                  listCallState: errorCallState(
                    toStoreError(err),
                    store.listCallState().data ?? [],
                  ),
                }),
            }),
          ),
        ),
      ),
    ),
  })),

  withHooks((store) => ({
    // 4. lifecycle wiring
    onInit(): void {
      store.load({});
    },
  })),
);
```

## State example 2

```typescript
export const TrendStore = signalStore(
  withQueryState<TrendResource>(), // 1. async query state
  withState<TrendFilterState>(INITIAL_FILTER_STATE), // 2. local filter/UI state
  withComputed((store) => ({/* 3. derived signals */})),
  withMethods((store, service = inject(FeatureService)) => ({
    // 4. actions
    load: rxMethod<Params | undefined>(
      pipe(
        switchMap((params) => {
          if (!params) return EMPTY;
          patchState(store, setPendingQuery());
          return service.get(params).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),
  })),
  withHooks((store) => ({/* 5. lifecycle wiring */})),
);
```

## State example 3

```typescript
withMethods((store, dispatcher = inject(Dispatcher)) => ({
  login: rxMethod<LoginInput>(
    pipe(
      tapResponse({
        next: () => {
          /* … */
        },
        error: (err) => {
          const storeError = toStoreError(err);
          patchState(store, { loginCallState: errorCallState(storeError) });
          dispatcher.dispatch(
            authStoreEvents.loginFailed(toStoreFailureEventPayload(storeError, 'Login failed')),
          );
        },
      }),
    ),
  ),
}));
```

## Intervention enum rendering reference

The owner contract is [Status / enum presentation (badges & select options)](../../src/app/features/organization/features/interventions/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

Every intervention enum (`priority`, `status`, `type`, `workItemAction`,
`workItemStatus`, `issueSeverity`, `changeStatus`, `inspectionResult`) renders
from a single source of truth, so the same value looks identical everywhere and
status is never conveyed by colour alone (icon + label always present).

Three more kinds extend the same registry for the Linked tabs'
sibling-feature statuses — `inspectionStatus`, `facilityStatus`,
`equipmentStatus` — cross-importing `InspectionStatus`/`FacilityStatus`/`EquipmentStatus`
from their owning features' `models` barrels the same way `inspectionResult`
already did. This is the established pattern, not a new one: extend the
registry rather than inventing a per-feature tag component when this
feature already renders another feature's enum.

- `models/intervention-tag/` — the vocabulary (plain TS, no Angular), exported
  through the feature `models/` barrel: the descriptor interface, the kind and
  severity unions, and `resolveInterventionTag(kind, value)` with a graceful
  fallback for unknown values. This is one of the two sanctioned runtime
  exceptions inside `models/` (ARCHITECTURE.md §10.10).
- `ui/components/intervention-tag/` — `<app-intervention-tag kind value />`, the
  one rendering. An `outline` `hlm-badge` where only the glyph carries the tone;
  `asOption` drops the badge and renders the same icon and label as a plain row,
  for use inside a select or combobox item.
- The severity tints are the theme's status tokens (`text-success`,
  `text-warning`, `text-info`, `text-destructive`, `text-muted-foreground` —
  `DESIGN.md` §Colors), mapped in that component's own `constants/`. That file
  is private to the tag: other surfaces keep their own severity map rather than
  reaching into it (§2.8).

To add a new enum value, extend the relevant descriptor map only — every consumer
follows.

</details>

## Intervention form and collection reference

The owner contract is [Conventions (apply to all work in this feature)](../../src/app/features/organization/features/interventions/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

- **Tech**: Angular 22 standalone components, signals (`input()`, `computed()`,
  `signal()`), `ChangeDetectionStrategy.OnPush`; Tailwind
  utilities for styling. **Never edit `src/styles.css`** — style with Tailwind
  classes and the spartan theme tokens; literal class strings only (Tailwind scans them).
- **Architecture**: keep the `models/` (interfaces, types and the small pure
  utils that operate on them) · `data-access/` (HTTP + local IndexedDB
  transport) · `services/` (behavior coordinators) · `state/` (SignalStore) ·
  `ui/` split. `ui/` holds `pages/`, `forms/`, `tables/`, `sheets/`,
  `dialogs/`, `components/`; one folder per unit with an `index.ts` barrel. **Shared types/data live in `models/`** —
  co-located in the unit's own `models/` folder, or in the feature-level
  `models/` when used across components. Do NOT invent sibling layers (e.g. a
  `presentation/` folder). Presentational components stay dumb (inputs/outputs
  only); orchestration lives in pages.
- **Docblocks**: every class, public/protected member and exported function
  carries the project JSDoc style (`@description`, `@access`, `@since`, `@type`,
  `@param`, `@returns`).
- **Strict TypeScript**: explicit types, `readonly` members, no `any`; reuse
  shared model types rather than redeclaring shapes.
- **Quality gate** before considering work done: `npm run format` (oxfmt),
  `npm run lint` (oxlint) and `npm run build` must pass, plus the feature specs.
- **UI notes**: `hlm-sheet` widths are one of three named sizes, an app-wide
  convention (not only this feature's sheets — `organization-role-permissions-sheet`
  and `channel-participants-sheet` follow it too) — `sm:w-[480px]` (default:
  work-item, request-changes, role-permissions, participants), `sm:w-[540px]`
  (create and recurrence, to fit the template picker) and `sm:w-[560px]` (discussion, to fit
  the message thread). Every width utility on `hlm-sheet-content` needs the
  `!` important marker (`w-full! sm:w-[…px]! sm:max-w-none!`) — `HlmSheetContent`'s
  own base classes carry `data-[side=right]:sm:max-w-sm` and `data-[side=right]:w-3/4`,
  which beat a plain same-specificity utility. The four form-sheets (create,
  recurrence, request-changes, work-item) pin their embedded form's submit row in a sticky
  `hlm-sheet-footer`: the form's own host is `flex min-h-0 flex-1 flex-col`,
  its `hlm-field-group` scrolls independently (`min-h-0 flex-1
overflow-y-auto`), and the footer sits outside that scroll region as the
  form's last flex child — the form keeps owning the buttons; only the sheet's
  layout changed. That footer stays `flex-col sm:flex-row` (never
  `flex-col-reverse`): DOM order, visual order and tab order must agree at
  every breakpoint (WCAG 2.4.3), so Cancel-first-in-DOM already puts Submit
  last — nearest the thumb on a bottom-anchored mobile sheet — without a
  reversed row.
- **All five sheets are bottom drawers below `sm`.** `[side]="side()"` on the
  `hlm-sheet` host, `side` bound to `@shared/sheet-side`'s `sheetSide()` — an
  SSR-safe `Signal<'right' | 'bottom'>` reading a `(max-width: 639px)`
  `matchMedia`, defaulting to `'right'` on the server and until the browser
  check resolves. `hlm-sheet-content` adds `max-sm:max-h-[85svh]` (plus
  `max-sm:overflow-y-auto` for the four form-sheets, whose `hlm-field-group`
  already owns the scroll region described above) so the sticky footer — the
  form's own — stays inside the viewport and in the thumb zone. **The
  discussion sheet holds no scroll region of its own** — `MessageThread` is
  documented as the app's only scroller — so it takes a real
  `max-sm:h-[85svh]!` instead of a max-height, `!`-forced past
  `HlmSheetContent`'s own `data-[side=bottom]:h-auto`; at `sm` and up it stays
  the base classes' plain `h-full`. Either way the column is bounded, which is
  what lets `SubjectDiscussion`'s `flex-1 min-h-0` host hand the thread a real
  height to scroll inside instead of the sheet itself scrolling — the earlier
  unconditional `overflow-y-auto` did the latter, and left the composer
  un-stuck in the bottom-drawer case. Its surface is also forced to
  `bg-background!`: `HlmSheetContent` is `bg-popover` by default, one shade
  lighter than `bg-background` in dark mode, which read as a seam under the
  thread's own `bg-background` composer footer; forcing the surface makes the
  panel read as the same chat surface `ChannelConversationPage` and
  `DirectConversationPage` render. No drag-to-dismiss, no snap points: the
  brain primitive supplies neither and this feature does not hand-roll them.
- **Padding ownership**: these same three form-sheets keep `px-4` on their
  own `hlm-field-group` rather than moving it to the sheet host, unlike the
  page/dialog-hosted create forms elsewhere in `organization` (which inherit
  their gutter from `hlmCard`/the dialog panel). `hlm-sheet-content` supplies
  no inset of its own — header and footer self-pad via their own component
  styles — so the scrollable field group is the only element that can own the
  scroll region's horizontal padding without either double-padding the footer
  or restructuring the sticky-footer-inside-the-form layout the paragraph
  above documents. Cross-referenced from `organization/FEATURE.md` § UI
  Conventions, where the create-surface placement rule lives.
- **Overlay dismissal**: the app-wide rule (DESIGN.md § Action Surfaces) is
  that a **dirty** overlay confirms before closing, via the shared
  abandon-confirmation primitive. This supersedes the earlier "Cancel always
  closes: the guard is against losing work by accident, never against leaving
  deliberately" doctrine still quoted in the create/request-changes dialog
  docblocks — those docblocks are updated when the shared guard lands. A
  pristine overlay still closes freely; `disableClose` continues to cover
  in-flight requests. **The discussion sheet is the first sheet to implement
  this without a route to hang `unsavedChangesGuard` off** — there is no
  `CanDeactivate` here, so `InterventionDiscussionSheet` hosts
  `app-unsaved-changes-dialog` itself and gates it on `SubjectDiscussion`'s
  own `dirtyChanged` (an unsent draft or a send still in flight — collaboration's
  `FEATURE.md` documents that output). `[disableClose]` is bound to the same
  signal, but cannot carry the guard alone: `BrnDialogRef` snapshots
  `disableClose` once, at the moment the panel opens, and a draft is never
  dirty at that exact instant — the composer has not been typed into yet.
  The real enforcement is in `onStateChanged`: an Escape or outside-click
  closing attempt that reaches it while dirty is undone through
  `HlmSheet.open()` (the panel's own `viewChild`), which resolves to
  `BrnDialogRef.reopen()` — a primitive the library exposes for exactly this
  "undo an in-progress close" case — before the confirmation opens, so the
  panel never actually disappears. The panel's vendored close button is
  swapped for a plain one (`[showCloseButton]="false"` on
  `hlm-sheet-content`) because it calls the dialog ref's `close()` directly
  rather than through this same guarded path.
- **Work-item search, status, mine-first ordering and pagination are server-side.**
  The detail query store reads one page through `listWorkItems`, passing Remaining as
  repeated statuses in a single query. The shared pagination uses the filtered API
  total; global progress remains based on the complete intervention. Search, filters,
  ordering and page-size changes return to page one; an invalidated last page is clamped.
  Retained rows keep their own pagination metadata through refresh errors. The workspace
  store still owns the complete unfiltered checklist for offline work and scan navigation.
  Saved queries filter and stably order that snapshot before slicing, with explicit saved
  provenance; a paginated API result must never replace the complete workspace snapshot.

</details>
