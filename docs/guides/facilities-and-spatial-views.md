# Facilities and spatial views

Facility owns estate hierarchy and spatial workflows. Generic map primitives do not own facility decisions or access.

**Authoritative references:** [Facilities](../../src/app/features/organization/features/facilities/FEATURE.md) · [Equipment](../../src/app/features/organization/features/equipments/FEATURE.md).

## Estate ownership

Facilities define the estate context used by equipment, inspections and interventions.
Keep parent/child hierarchy, archival behavior and organization isolation at their
owners. Shared UI receives explicit presentation inputs and emits actions.

## Maps, QR and building scenes

MapLibre, QR generation and Three rendering load on their browser-only boundaries.
Do not import those resources into a server request or eager application bundle.
The facility contract defines editing/read-only modes, geometry, navigation and
public scene boundaries; the generic map remains under shared ownership.

## Verification

Unit tests exercise owned geometry/data and replace the GPU boundary. Browser tests
are needed for actual GPU rendering, focus and pointer interaction. A jsdom result
does not establish visual quality or device behavior. Keep captures dated and scoped.

## Building scene reference

The owner contract is [Building 3D View](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

`/:facilityId/3d` (`ui/pages/facility-building-3d-page`, `FacilityBuilding3dPage`)
is a dedicated, full-space route — not a tab of `FacilityDetailPage` — over
`FacilityBuilding3dStore` (`state/facility-building-3d`) and
`FacilityService.getBuildingModel`. The page renders one of five states — a
full-frame skeleton while the model is unresolved (also the exact SSR output,
since the store's fetch is browser-only), the Spartan `hlmEmpty` error composition with a retry,
the Spartan `hlmEmpty` composition when the building has no floors (a `FACILITIES_WRITE`-gated
"Go to Plans" call to action), a dedicated incompatible-device state when this
browser lacks WebGL (probed inline via
`canvas.getContext('webgl2') ?? canvas.getContext('webgl')`, never a shared
`utils/` helper for a three-line check), and — once loaded and WebGL-capable —
`ui/components/facility-building-3d-scene` (`FacilityBuilding3dScene`, P1)
beside a toolbar wired to the store (reset camera, toggle exploded layout,
link to the 2D plan, back to the record). The scene is presentational
(inputs/outputs only, `ARCHITECTURE.md` §10.3) — the page owns every store
call its outputs trigger, and reacts to its `renderingUnavailable` output by
falling back to the same incompatible-device state (a `getContext` failure
the page's own inline probe did not catch, or a lost WebGL context later).

### Scene rendering (P1)

`FacilityBuilding3dScene` mounts `three` and `OrbitControls` through
`await import()`, browser-only, so neither ships in this route's initial
chunk (measured: `three` lands in its own ~726 KB lazy chunk, not the
initial bundle). One `THREE.Group` per floor (`buildFloorGroup`) is lit by a
`HemisphereLight` and a directional light over the geometry utils'
`MeshStandardMaterial` — the utils are consumed as given, not rewritten, so
"no PBR" is honoured in spirit (metalness defaults to `0`, lighting like a
diffuse surface) rather than by material type. A room's tint comes from
`ROOM_TYPE_HUE_OFFSET`, a hue rotation of the theme's resolved `roomFill` per
`FacilityType`, so it distinguishes room types at a glance without ever
standing in for `status` — reserved for the P2 detail panel, never scene
colour alone (`PRODUCT.md`).

**Lifecycle invariant.** A monotonic `generation` counter guards every
asynchronous continuation (`await import('three')`, `await import(OrbitControls)`):
a mount that resolves after the component already tore down checks its
captured generation and aborts rather than attaching a live renderer to a
dead scene. Teardown (the mount effect's cleanup, i.e. component destroy, and
`webglcontextlost`) bumps the counter first, cancels every pending
`requestAnimationFrame`, disconnects the `ResizeObserver`, removes every
canvas listener, disposes `OrbitControls` and the renderer, and walks the
building group exactly once (`disposeBuildingGroup`) disposing each distinct
geometry and material a single time — the utils share materials across
meshes, so a naive per-mesh `dispose()` would double-free some and miss
others. Acceptance criterion: five route round-trips leave
`WebGLRenderer.info.memory` back at its starting counters and no listener,
observer, or RAF outstanding.

**Rendering is on demand**, never a permanent `requestAnimationFrame` loop.
`invalidate()` coalesces any number of triggers (an `OrbitControls` `change`
event, a resize, a selection/isolation/theme change, a coalesced hover
raycast) into at most one `renderer.render` per animation frame. The only
bounded loop is the exploded-layout tween, which stops itself once its
duration elapses and is skipped outright — jumping straight to the target —
under `prefers-reduced-motion`. Isolation dims a non-isolated floor's
materials rather than hiding the group; picking exclusion by floor is
already `pickTarget`'s job. Hover is coalesced to at most one raycast per
frame and never touches a store (`roomHovered` is the only trace it leaves);
a tap is disambiguated from an `OrbitControls` drag by travel distance alone
(`TAP_THRESHOLD_PX`, duplicated locally from `FacilityPlanEditor`'s own
constant — only two call sites so far), so a tablet with no hover still
selects directly on tap. The canvas carries `role="img"` and an `aria-label`
naming the building and its floor count.

Selection is never colour-only (`PRODUCT.md`): alongside the `roomSelected`
fill tint, `applySelection` builds an `EdgesGeometry` outline — in a new
`selectionOutline` palette token sourced from `--ring` — as a sibling of the
selected room mesh or floor slab, so the same geometry it already builds for
a floor's edges also carries the selected state without depending on hue.

Scene tests cover the SSR skeleton, unavailable WebGL and accessible labels.
Additional lifecycle tests retain real Three geometry and materials while
substituting the GPU and controls boundaries: they verify selection outlines,
isolation, reduced motion, bounded rendering, pointer outputs and disposal.
These tests do not prove actual GPU rendering. The page-level ready-branch spec
uses a minimal scene stub to verify page orchestration separately.

### Room selection and its keyboard-accessible surface (P2)

The canvas is structurally unreachable from a keyboard — `role="img"`, no
`tabindex`, no key handler — and the only way to select a room is the
scene's pointer-only `roomActivated`. A panel gated on **room** selection
would therefore have had no keyboard entry path at all (WCAG 2.1.1). P2's
surface is instead gated on **floor** selection, and
`FacilityBuilding3dStore.loadModel` selects the model's first floor
(server order) by default whenever nothing is selected yet — so the panel
below is always mounted, with no prior pointer interaction required:

- **`ui/components/facility-building-3d-room-panel`**
  (`FacilityBuilding3dRoomPanel`) mounts as soon as a floor is selected and
  always renders a floor selector (`role="group"`, one button per floor,
  `aria-current` on the active one — same pattern as `organization-nav`'s
  active link) and the floor's room roster. The room **detail** block —
  name, type (`FACILITY_TYPE_OPTIONS`, the same catalog the create form's
  type picker draws from), status through the feature's own
  `facility-status-tag` registry, a "View on 2D plan" action, and its own
  close control — renders only once a room is actually selected; closing it
  deselects the room alone (`store.selectRoom(null)`), leaving the floor
  selection — and this panel — untouched. Desktop uses a card; the central mobile
  interaction mode uses a dismissible bottom sheet at every width. The page's explicit
  panel opener restores the keyboard path after dismissal. Presentational, inputs/outputs only
  (`ARCHITECTURE.md` §10.3); the page owns every store call its outputs
  trigger.
- **`ui/components/facility-plan-item-list`** (`FacilityPlanItemList`) is the
  roster's actual accessible payload — extracted from this component's own
  former private `facility-building-3d-room-list` once the 2D Plans tab
  needed the identical list, then generalized a second time (from
  zone-only `FacilityZoneList` to a generic `PlanItemListOption<T>` row)
  once that tab's own equipment roster turned out to duplicate the same
  `listbox`/`option` pattern by hand, badly, in the same panel; see "Plans
  Tab Parity With The 3D View" below for both steps. A hand-built
  `role="listbox"` over a real, focus-moving roving tabindex
  (`FocusKeyManager` from `@angular/cdk/a11y`) rather than the spartan
  `command` combobox — `command`'s arrow-key navigation only wires up while
  its search input holds focus, and its `Enter`-only activation swallows
  `Space` as a filter character, neither fitting a plain browse-and-pick
  list. Browsing (arrow keys, Home/End) and selecting (`Enter`/`Space`, or a
  click — real DOM focus needs no extra activation wiring) are deliberately
  distinct: the roving position follows the selection whenever it changes
  from outside, but moves freely under browsing until committed. The
  selected row itself carries a leading check glyph beside its background
  tint — the same non-colour-only rule as the canvas.
- `FacilityBuilding3dPage` owns focus management around the room **detail**
  block: selecting a room captures `document.activeElement` and moves focus
  onto the detail's close control once it renders; deselecting it (that
  control, `backgroundActivated`, or `Escape` — none of which touch the
  floor selection) restores focus to whatever was captured, or the page's
  own root (`#pageRoot`, named via `aria-label` so a focus landing there on
  this last-resort path is never silent) when that element is gone — never
  left to fall back to `body`.
- A `sr-only`, `aria-live="polite"` region announces the room and floor
  names on every selection change — what makes the scene followable without
  seeing it.
- The scene's existing `roomHovered` output now also feeds a discreet,
  `aria-hidden` hover-preview label on the page (never announced — the
  keyboard-accessible list already covers browsing for anyone not using a
  pointer). Nothing on the tap-only tablet path assumes a prior hover.

The route reuses `facilityResolver` and `facilityTitleResolver` unchanged and
additionally provides `FacilityStore` and `FacilityBuilding3dStore`.

`FacilityDetailPage.activeTab` follows the `?tab=` query parameter (bound
through `withComponentInputBinding()`), normalizing any absent or
unrecognized value to `overview`; a tab click writes the parameter back with
`replaceUrl: true` so switching tabs never grows browser history. This is
what lets this route's "Go to Plans"/"View 2D plan"/"Back to facility" links
(`?tab=plans`) land on the Plans tab. The Plans tab itself offers a **3D
view** action, shown only when `facility.type === 'building'` — the
endpoint's own `409` on any other type is the filet, this client-side gate is
the real guard.

Floors carry an optional `levelIndex` (`number | null`, `[-100, 200]`,
ground floor `0`, a basement level negative) — their stacking order for this
view. It is editable only where it means something: the create form and
`FacilityInformationPanel`'s in-place editor both show it only when `type`
is `floor`. Siblings are not required to have distinct values.

The list toolbar's **Export** button downloads a server-side CSV
(`FacilityService.exportCsv`, `GET
/api/organizations/{organizationId}/facilities/export`, mirroring
`InterventionService.exportCsv`: direct `this.http` call, `responseType:
'blob'`, saved through `BrowserDownloadService`). The screen's whole
narrowing — free-text search and "show archived" — is part of the export's
contract and is forwarded, so no "filters dropped" warning ever fires here;
`rootsOnly` is deliberately **not** sent, the file covers the whole tree,
not only the visible roots. The server caps the collection at 50,000 rows;
the resulting 422's RFC 7807 `detail` (read back through
`resolveCsvExportErrorDetail`, `@features/organization/utils`) is surfaced
as the error toast.

Facility detail routes **seed** facility context without blocking activation:
`facilityResolver` fires the fetch into `ActiveFacilityStore` and returns
immediately, the detail page paints a full-page skeleton from the store's
pending state (first-order on slow field connections), the title resolver
answers synchronously with a neutral label until the record lands (the page
then re-sets the document title through `TitleService`), and a load failure
toasts globally and returns to the organization landing page from the page.
The resolver stays the single loading path for the record — the page never
re-fetches it.

Facility coordinates come from the backend `latitude`/`longitude` fields
(optional on `FacilityOutput`), enforced both-or-neither. They may be set at
creation (`ui/forms/facility-create-form`) or afterward, in place, on the
record's Information tab (`ui/components/facility-information-panel`) — there
is no separate coordinates form.

A generic, domain-agnostic map primitive exists at `shared/map/`
(`ARCHITECTURE.md` §8.5): MapLibre GL JS over OpenFreeMap's public vector
tiles, with self-hosted, achromatic (grayscale) light/dark style JSONs under
`public/map/` built from OpenFreeMap's Positron style
(`tools/map-style/build-map-styles.mjs`). No geocoding. `maplibre-gl` is
imported dynamically and browser-only by that primitive's single component —
the documented `ARCHITECTURE.md` §1.1 dependency addition.

This subfeature is the primitive's first consumer, in two places:

- **`ui/pages/facility-map-page`** (`FacilityMapPage`,
  `facilities/map`) renders every facility with both coordinates set
  (`FacilityMapStore.loadMapped`, `hasCoordinates: true`) as a marker — a
  sanctioned full drain under DESIGN.md § Collections' Server Rule: a map
  needs every marker at once, so the store drains all pages server-filtered
  on `hasCoordinates` rather than paginating. Selecting a marker navigates
  to that facility's record. A discreet banner names
  how many facilities still lack coordinates (`loadUnplacedCount`, read from
  a single-item page's `totalItems` rather than a second full fetch) and
  links back to the list; when no facility has coordinates at all, an
  the Spartan `hlmEmpty` composition replaces the map entirely. `facility.status` maps onto
  the primitive's severity-free vocabulary — `active` as `neutral`,
  `archived` as `muted` (`utils/facility-marker`) — since a facility carries
  no severity of its own.
- **`ui/dialogs/facility-map-picker-dialog`** (`FacilityMapPickerDialog`) is
  the "Pick on map" affordance shared by `FacilityCreateForm` and
  `FacilityInformationPanel`'s coordinates editor: an `hlm-dialog` hosting an
  interactive `app-map`; a click patches the caller's latitude/longitude
  drafts and closes the dialog. The numeric inputs remain the field of
  record — they stay editable and are what actually gets submitted; the
  picker only ever pre-fills them. `utils/facility-map-center` resolves
  where it opens: the draft's own coordinates once both are filled, else (on
  the create form only, since the data is already loaded for the parent
  combobox) the average of the organization's other located facilities, else
  the primitive's own neutral default — never a fetch made just for this.
- **"Locate address"** is the geocoding affordance beside "Pick on map",
  shared the same way by `FacilityCreateForm` (next to the address field)
  and `FacilityInformationPanel`'s coordinates editor (using the record's
  stored address; hidden while the record has none). Both stay
  presentational: the component emits `geocodeRequested(address)` and the
  hosting page (`FacilityCreatePage`, `FacilityDetailPage`) performs the
  one-shot `FacilityService.geocode` call
  (`GET /api/organizations/{organizationId}/facilities/geocode?address=…`)
  and answers back through the `geocodePending` / `geocodeResult` /
  `geocodeNotFound` inputs. A match fills the latitude/longitude drafts —
  which remain the field of record, still editable — and its `displayName`
  renders as help in a polite live region; a `404` renders inline as
  "Address not found", non-blocking; any other refusal (the endpoint's
  per-user `429` rate limit, a `400`) surfaces its RFC 7807 `detail` as an
  error toast. The button is `aria-disabled` (never `disabled`) while a
  lookup is in flight.

</details>

## Facility plan attachments reference

The owner contract is [Facility Attachments and Floor Plans (Plans Tab)](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

`FacilityAttachmentService` (`data-access/services/facility-attachment/`) owns
the attachment resources — `/api/facilities/{id}/attachments` (list, scoped
by `kind`; upload, multipart with an optional `kind` field) and
`/api/facility-attachments/{id}` (read, delete with `If-Match`) plus the
`/primary` action. It is a separate service from `FacilityService`: a
different, non-organization-scoped URL family, following the interventions
subfeature's `InterventionService.uploadAttachment`/`listAttachments`
precedent for the multipart shape.

`FacilityAttachmentOutput` (`models/facility-attachment/`) carries `kind`
(`'document' | 'floor_plan'`), `isPrimaryPlan`, and nullable
`imageWidth`/`imageHeight` — probed server-side for a `floor_plan`, null for
a `document`, an SVG, or a failed probe.

The Plans tab (`FacilityPlansStore`, `state/facility-plans/`) is
**tab-scoped**, provided on `FacilityDetailPage` alongside
`FacilityOverviewStore`, and loads only on first activation of the tab
(browser-only — secondary content, `ARCHITECTURE.md` §12.4). It lists
`kind=floor_plan` attachments only; plain documents are out of scope for this
pass. Named `CallState` fields track list/upload/setPrimary/delete
independently; `withEntities` (`collection: 'plan'`) backs the list so
setting a new primary can flip both the previous and the new plan's
`isPrimaryPlan` locally, mirroring the backend's atomic swap without a
re-fetch. `selectedPlan` defaults to the primary plan, then the first
uploaded one, until a row is explicitly selected.

The plan catalog stays an anchored Spartan popover on desktop and becomes a
bottom drawer in the central mobile interaction mode, where its row actions and long filenames have the
full viewport width. Selecting a plan closes that drawer through the same
`onPlanSelected` path that updates `selectedPlan`.

`FacilityAttachmentOutput` carries no download URL — bytes are only ever
served at `GET /api/facility-attachments/{id}/download`
(`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`,
bearer-authenticated), never as a resource field, mirroring
`InterventionAttachmentOutput`/`InterventionService.downloadAttachment`.
`FacilityAttachmentService.download` reads that route with `responseType:
'blob'`. `FacilityPlansStore` reacts to `selectedPlan` changing (a
`withHooks` effect) by fetching that plan's bytes and republishing them as a
browser object URL (`planImageUrl`), revoking the previous one on every
change and on destroy; `app-plan-viewer`'s `src` is fed `planImageUrl`, not
the attachment record.

</details>

## Facility overlay reference

The owner contract is [Plan Overlay (Read Side)](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

The same `withHooks` effect that fetches `planImageUrl` also fetches the
selected plan's **read-only** zone/equipment overlay through
`FacilityService.getPlanOverlay` (`GET
/api/organizations/{organizationId}/facilities/{facilityId}/plan-overlay?attachmentId=…`),
kept on `FacilityService` rather than `FacilityAttachmentService` because the
route is organization-scoped like the rest of that service, not part of the
attachment URL family. Not a Hydra item (no `@id`/`@type`), so the service
reads it directly through `HttpClient`, mirroring
`FacilityAttachmentService.download`. `FacilityPlansStore` now also holds
`organizationId` (set by `load`) purely so this effect — triggered
internally, not from a page call — can build the URL.

`FacilityPlanOverlayOutput` (`models/facility-plan-overlay/`) carries the
plan's `imageWidth`/`imageHeight` and two collections in **normalized 0–1
image coordinates**: `zones` (a child facility's polygon outline, `points`
in order) and `equipment` (a pinned equipment's `x`/`y`). `FacilityOutput`
separately gains an optional `planGeometry` (`models/facility/`) — one
facility's own outline on its parent's plan, detail-read only; not yet
consumed by any UI in this feature.

`ui/components/facility-plan-overlay` (`FacilityPlanOverlay`) renders the
overlay, projected into `app-plan-viewer`'s `overlayTemplate` from the Plans
tab so it inherits pan/zoom through the DOM. Zones are hatch-filled SVG
polygons (neutral per `DESIGN.md`'s glyph rule — zones carry no status colour) with a
name label at the polygon centroid (`utils/polygon-centroid`, a pure area-
weighted formula with a vertex-average fallback for a degenerate shape);
each is a focusable, keyboard-activatable SVG `<a role="button">` (Enter/Space)
since it navigates via an emitted output, not a real `href`. Equipment pins
are positioned `<button>`s, `utils/normalized-point` converting the wire
format to image-pixel coordinates; each pin is counter-scaled by
`1 / scale` (`scale` from `PlanViewerOverlayContext`) so it keeps a constant
on-screen size while the plan is zoomed, and coloured by status through a
**feature-owned** `models/equipment-status-tag/` registry — the equipment
status enum belongs to the sibling `equipments` feature, but this is the
only place this feature renders it, so it is duplicated locally rather than
imported, mirroring `interventions`' own `equipmentStatus` kind on
`intervention-tag.util.ts` (same `$localize` ids, three call sites, no
cross-feature registry import). The component is presentational — inputs
and outputs only, no store or service — and `zoneActivated`/`equipmentActivated`
are forwarded by the page to a **selection**, not a navigation: see "Plans
Tab Parity" below.

`showZones`/`showEquipment` are store-held visibility toggles (both default
`true`, `FacilityPlansStore.setShowZones`/`setShowEquipment`), rendered by
`app-facility-plan-toolbar`, shown only when
`FacilityPlansStore.overlayHasContent()` — no zones and no equipment renders
no toggle chrome at all.

</details>

## Facility plan selection reference

The owner contract is [Plans Tab Parity With The 3D View](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

The Plans tab was brought to the same interaction level as the Building 3D
View (`facility-building-3d-page`) without becoming a route of its own — it
stays a tab of `FacilityDetailPage`.

- **The viewer takes the available height.** `hlmTabsContent="plans"` and
  its ancestors up to the page root (`#facility-detail`, `hlm-tabs`) carry
  `flex min-h-0 flex-1` instead of the page's previous unconstrained
  document flow; the `overview`/`information` tab contents each gained their
  own `overflow-y-auto` so they keep scrolling exactly as before inside the
  now height-bound `hlm-tabs`. The plan viewer itself dropped its `h-[32rem]`
  fixed height for `flex-1` (with a `min-h-[24rem]` floor).
- **One toolbar** (`ui/components/facility-plan-toolbar`,
  `FacilityPlanToolbar`) replaces the three previously stacked blocks — the
  isolated "3D view" link, the zone/equipment layer switches, and the
  editor's picker/status bar — laid out like `FacilityBuilding3dPage`'s own
  toolbar (a left group, a right group, `lucide` icons). Presentational:
  inputs/outputs only, including the pickers' `null`-clearing `valueChange`,
  which it filters itself before emitting. The zone/equipment candidate
  catalogs can each contain up to 200 records: they remain Spartan selects on
  desktop and become searchable, scroll-contained bottom drawers in the central mobile interaction mode.
- **A side panel** (`ui/components/facility-plan-panel`, `FacilityPlanPanel`)
  is the tab's **only** browsing/editing surface for zones and equipment,
  mirroring `FacilityBuilding3dRoomPanel`'s central `hlm-card`/`hlm-sheet` presentation
  switch. This sheet is dismissible
  and carries its own visible close button, since the toolbar's own opener
  already reopens a dismissed sheet. It always renders two rosters, both
  `app-facility-plan-item-list` (see generalization below) — every zone on
  the selected plan, and every equipment pin (`equipment` input) — and, once
  a zone or pin is selected, a **detail** block: name, type for a zone,
  status through this feature's own registries, an explicit "View facility
  record"/"View equipment record" action, and — **the editor actions
  themselves**, gated exactly as before — "Edit coordinates" on a zone
  (`canWrite`) or "Edit position"/"Remove from plan" on a pin
  (`canEditEquipment`), disabled while a `draw-zone`/`place-pin` mode is
  active (`editModeActive`). A first pass at this consolidation kept a
  second, standing "Zones/Equipment on this plan" management roster beneath
  the viewer for these same actions — the same list rendered twice on
  screen, once to browse and once to edit — and was corrected before
  shipping: one roster per kind now carries both. The detail block's own
  close button is `FacilityPlanPanel.focus`'s target: `FacilityDetailPage`
  moves real focus onto it when a selection opens the block and restores
  whatever held it before once the block closes, mirroring
  `FacilityBuilding3dPage.syncSelectionFocus` — the button is removed from
  the DOM on close and would otherwise drop focus to `body`.
- **The plan itself marks what is selected, not only the panel's roster.**
  `FacilityDetailPage.selectedZoneId`/`selectedEquipmentId` are forwarded
  through `FacilityPlanEditor` to `FacilityPlanOverlay`: the matching zone
  polygon or equipment pin carries `aria-pressed="true"` plus a
  non-chromatic cue of its own (a thicker polygon outline, an added pin
  ring) — before this, a member selecting zones in sequence from the SVG
  itself had no way to tell, without opening the panel, which one had been
  picked. A zone's own `aria-label` now also carries its status
  (`resolveFacilityStatusTag`), matching the equipment pin's existing
  name+status pattern — reachable by keyboard without opening the panel.
- **Activating a zone or a pin now selects instead of navigating.**
  `FacilityDetailPage.onZoneSelected`/`onEquipmentSelected` — called from
  `FacilityPlanEditor`'s `zoneActivated`/`equipmentActivated` (a plan tap)
  or `FacilityPlanPanel`'s own `zoneActivated`/`equipmentActivated` (either
  roster) — write `selectedZoneId`/`selectedEquipmentId`, page-local
  `WritableSignal`s, never touching the router. Only the panel's explicit
  "View record" action (`onZoneRecordRequested`/`onEquipmentRecordRequested`)
  navigates, to the same absolute paths the old direct-navigation handlers
  used; "Edit coordinates"/"Edit position" open the same
  `FacilityPlanZoneGeometryDialog`/`FacilityPlanPinPositionDialog` the
  removed management roster used to
  (`onZoneEditRequested`/`onEquipmentEditRequested`), and "Remove from plan"
  (`onEquipmentRemoveRequested`) calls the same store write
  (`removePinFromPlan`) and clears the selection immediately rather than
  waiting on the overlay reload. The selection is cleared on the panel's own
  close control, on switching the shown plan (`onPlanSelected`), and on
  leaving the Plans tab (`activateTab`) — never stale across a plan or tab
  switch.
- **A fourth Plans-tab state.** Alongside loading, "no floor plan uploaded",
  and the normal content view, `FacilityPlansStore.overlayCallState()`
  reaching `'success'` with `overlayHasContent()` still `false` now renders
  the Spartan `hlmEmpty` composition inside the panel (`data-testid="facility-plan-no-content"`)
  — a plan with nothing drawn on it used to render silently. The plan
  **list** request failing also gained its own retryable Spartan `hlmEmpty` error composition
  (`data-testid="facility-plans-error"`), matching the 3D page's own
  load-failure state; it previously had none.
- **`aria-live="polite"`** (`facility-plan-selection-announcement`)
  announces the selected zone or equipment's name — `FacilityDetailPage
.planSelectionAnnouncement`, mirroring `FacilityBuilding3dPage
.selectionAnnouncement`. Re-picking the **same** zone or pin still changes
  the region's text: `planSelectionAnnouncement` folds the parity of a
  private `selectionAnnouncementNonce` counter — bumped on every
  `onZoneSelected`/`onEquipmentSelected` call regardless of whether the id
  actually changed — into a trailing zero-width space, since a `WritableSignal`
  set to its already-current value produces no new computed output on its
  own, and most screen readers only announce a region whose text content
  actually changed (WCAG 4.1.3).
- **`ui/components/facility-plan-item-list` (`FacilityPlanItemList`) was
  extracted, then generalized.** First extraction: from
  `facility-building-3d-room-panel`'s own private
  `facility-building-3d-room-list` once this tab needed the identical
  keyboard-navigable roster over the same `FacilityPlanOverlayZone` type
  (as `FacilityZoneList`). The rule of three (`ARCHITECTURE.md` §2.9)
  normally waits for a third consumer before extracting, but the two
  remaining options at two consumers — importing into another component's
  private folder (banned, §13.4) or duplicating the `FocusKeyManager`
  roving-tabindex implementation — were both worse than an early
  extraction; a deliberate, documented exception, not a precedent for
  extracting at two consumers generally. Second step, an a11y fix rather
  than a new consumer: this panel's own equipment roster was a hand-rolled
  `<button>` loop with no `listbox`/`option` roles and an invalid
  `aria-selected` on a plain button — generalizing the zone-only list to a
  `PlanItemListOption<T>` row (an id, a label, and the source record handed
  back to a content-projected `ng-template` decorator) let the equipment
  roster reuse the exact same roving-tabindex widget instead of a second,
  independent fix. `FacilityBuilding3dRoomPanel` itself is otherwise
  untouched: it still speaks of "rooms" throughout its own API, now
  rendering `app-facility-plan-item-list` internally instead of
  `app-facility-zone-list`.
- **The layer switches' accessible name comes from their visible `<label>`
  text alone.** `hlm-switch` renders a real `<button role="switch">`, a
  labelable element, so wrapping it in a `<label>` already gives it an
  implicit accessible name; the separate `aria-label`s
  (`facility.plans.overlay.toggleZonesAria`/`toggleEquipmentAria`) silently
  overrode that visible text with an equivalent-but-disconnected
  translation and were removed.

</details>

## Facility geometry editing reference

The owner contract is [Plan Editor (Write Side)](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

`FacilityService.setPlanGeometry` (`PUT
/api/organizations/{organizationId}/facilities/{facilityId}/plan-geometry`)
and `EquipmentService.setPlanPosition` (`PUT
/api/organizations/{organizationId}/equipment/{equipmentId}/plan-position`,
the sibling `equipments` feature's transport — this feature already depends
on its data-access for `FacilityOverviewStore`'s equipment summary, extended
here for the same reason: equipment placement is organization-scoped
equipment data, not facility data) write or clear a zone outline / an
equipment pin. Both bodies pass `null` fields to clear rather than delete
through a separate endpoint. `FacilityPlansStore` owns the write: named
`saveZoneGeometryCallState`/`savePinPositionCallState`, an `editMode: 'none'
| 'draw-zone' | 'place-pin'` with an in-progress `draftPoints` draft, and two
lazily-loaded, guarded candidate lists — `zoneCandidates` (this facility's
direct children of type `zone`/`area`, via `FacilityService.listChildren`)
and `facilityEquipment` (this facility's assigned equipment, via
`EquipmentService.listByFacility`) — each narrowed by a computed
(`availableZoneCandidates`/`availableEquipmentCandidates`) to the ones the
loaded overlay does not already show. A successful write reloads the
overlay (`loadOverlay`, the same rxMethod the `withHooks` effect uses) so
the plan reflects the change without a page refresh. Errors use stable API codes
for ancestry, assignment, decommissioning and revision conflicts. A 409/412 refreshes
the overlay while retaining drawing/placement context and the coordinate dialog draft.
Accepted writes are serialized; their observation does not cancel the server mutation.
Coordinate dialogs use Signal Forms and reseed only on opening. They close after
confirmed success and retain their draft across failed writes and refreshed inputs.

`ui/components/facility-plan-editor` (`FacilityPlanEditor`) wraps the
read-only `FacilityPlanOverlay` unchanged — that component stays exactly as
documented above, still presentational, still never navigating itself — and
adds the pointer affordances on top: an image-sized `#stage` element doubles
as the tap surface for `draw-zone`/`place-pin` (pointer-events toggled by
`editMode`) and as the geometry reference every screen-to-normalized
conversion reads (its rendered `getBoundingClientRect` already reflects the
current zoom, since it sits inside the same transformed stage). A tap is
distinguished from the plan viewer's own drag-pan by travel distance
(`utils/draft-polygon`'s `isTapGesture`) rather than by suppressing the
viewer's `pointerdown` — a stationary click produces a zero-delta pan the
viewer already no-ops, so both coexist. Double-click closes a `draw-zone`
outline at three or more vertices; the "Close polygon" toolbar button is the
same action without timing-sensitive gesture recognition, and is what the
e2e suite drives. Drag-to-move renders one transparent handle per existing
equipment pin (only when `canEditEquipment` and `editMode` is `'none'`); its
`pointerup` reinterprets a tap with no intervening `pointermove` as
`equipmentActivated` — the click the read pin button underneath would have
handled had the handle not intercepted it — so plain navigation still works
for equipment-write members, and only an actual drag emits `pinMoved`.
`FacilityPlanEditor` is presentational like its wrapped overlay: inputs and
outputs only, the page owns every store call.

The **non-pointer path** — required, not an afterthought — is two dialogs:
`ui/dialogs/facility-plan-zone-geometry-dialog` (`FacilityPlanZoneGeometryDialog`,
a table of percent x/y rows with add/remove, prefilled from the zone's
current outline, plus a "Clear geometry" action) and
`ui/dialogs/facility-plan-pin-position-dialog`
(`FacilityPlanPinPositionDialog`, two percent x/y fields plus "Remove from
plan"). Coordinates display as **percent (0–100%, one decimal step)** rather
than the wire format's raw `[0, 1]` — more legible for a member checking a
vertex by eye — converted at the dialog's input/output boundary; the
conversion is a same-file private function in each dialog rather than a
shared util (rule of three, `ARCHITECTURE.md` §2.9: two call sites so far).
Both coordinate dialogs use Signal Forms, including the dynamic polygon row array. Their draft is reseeded only on opening, retained through failed writes and closed only after confirmed success.

Every editor entry point is permission-gated: `canWrite`
(`FACILITIES_WRITE`) for drawing/editing/clearing a zone outline, a second
`canEditEquipment` (`EQUIPMENT_WRITE`) computed on the page for
placing/dragging/editing/removing an equipment pin — the toolbar, the picker
selects, the per-row "Edit coordinates"/"Edit position"/"Remove from plan"
buttons and the drag handles all read one or the other; a read-only member
sees no editor affordance at all, only the read overlay from the section
above. Escape (cancel) and Backspace (undo the last `draw-zone` vertex) are
listened globally on the page (`@HostListener('document:keydown', …)`)
rather than on the plan viewer stage, so they work regardless of which
control currently holds focus while a mode is active.

</details>

## Facility root collection reference

The owner contract is [Facility Listing (Roots-Only DataView)](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

The facility list page presents the organization's **root** facilities as a
flat, paginated dataview with a list/grid layout toggle:

- root facilities are loaded and paginated on init via
  `FacilityStore.loadRootFacilities`, which requests
  `GET /organizations/{orgId}/facilities?rootsOnly=true` (never combined with
  a parent filter; `includeArchived` defaults to `false`),
- the page is **roots-only**: nested children are no longer expanded inline.
  Hierarchy navigation (drill-down into children) is deferred to the facility
  detail page,
- the `hasChildren` boolean is still returned per item by the backend and is
  available for the detail page; the dedicated
  `GET /organizations/{orgId}/facilities/{facilityId}/children` endpoint and
  `FacilityStore.loadChildFacilities` / `FacilityService.listChildren` remain
  in place for direct-child lazy loading,
- the `/descendants` endpoint is used by the facility detail overview, not by
  the root listing.

Search and pagination operate on the **root level only** (the `?page=` query
param is synced for roots). Row actions are Open (into the record, which is
also the edit surface — there is no separate row-level edit action) and
Archive/Restore.

`FacilityTable`'s Name, Type, Code and Status heads are sortable — the
backend's own `order[<field>]` whitelist (`name`, `type`, `status`,
`createdAt`, `updatedAt`, `code`; `ListFacilitiesProvider`) intersected with
the columns this table renders. `FacilitiesPage.sortOrder` is sent through
the typed `RequestOptions.sort` option (`@core/api`, `HydraApiService.buildParams`
serializes it as `order[<field>]=<direction>`) rather than a hand-built params
entry, and is remembered across visits by
`FacilityListPreferencesService` (`fg-facility-list` cookie) — the same
cookie-preference shape `InterventionListPreferencesService` uses, kept
feature-local rather than shared (`ARCHITECTURE.md` §2.9). Sorting applies to
the one server-side dataset both the table and `FacilityGrid` read; the grid
has no sort controls of its own — sorting lives in the table's heads only.

</details>

## Facility hierarchy reference

The owner contract is [Facility Hierarchy (Detail Overview)](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

The facility detail page's **Overview** tab renders the descendant hierarchy
through `FacilityHierarchyChart`, built on the shared `shared/tree` `Tree`
primitive (`utils/facility-to-tree-node`'s `facilityToTreeNode` maps
`FacilityOutput` onto `TreeNode`; each row projects the facility's icon, name
and `FacilityStatusTag` through `Tree`'s `nodeTemplate`). Loading is based on
the backend descendants endpoint, not on `Tree`'s own lazy expansion:

- all descendants are auto-loaded once the facility resolves (only when
  `facility.hasChildren` is `true`), via an `effect` calling
  `FacilityStore.ensureFacilityDescendantsLoaded`,
- `FacilityService.listDescendants` calls
  `GET /organizations/{orgId}/facilities/{facilityId}/descendants`, then the
  store groups the flat Hydra `member` collection by `parentFacilityId` for
  `FacilityHierarchyChart`,
- because the whole subtree is already resolved before `Tree` renders,
  `Tree`'s `expandRequested` never fires in practice and is wired to a no-op;
  `loadingIds`/`failedIds` stay empty,
- `FacilityStore.loadChildFacilities` remains available for direct-child
  loading flows, but the detail overview uses `/descendants`,
- all secondary fetches are **browser-only** (no `TransferState`), and node
  selection navigates to the chosen facility's detail page.

The list page stays **roots-only**; hierarchy navigation lives here in the
detail Overview.

### Interventions on this site (Detail Overview)

The Overview tab's `FacilityOverviewStore` also loads a compact preview of
the interventions whose `site` is the open facility — the five most recently
updated, newest first — through `InterventionService.list` cross-imported
from `@features/organization/features/interventions` (see that feature's
`FEATURE.md` § Cross-Feature Dependencies for the read-only contract). Each
row links to the intervention's own record; a "See all" link opens
`/organizations/:organizationId/interventions?site=:facilityId`, the
canonical narrowing the interventions list page's own filter parsing already
supports. An empty result renders a quiet line rather than hiding the
section, unlike the equipment-status and recent-inspections cards above it.
The equipment detail and inspection detail pages each carry a labelled proxy
link into the same pre-filtered URL when the record has a facility, since
neither record's own list page supports a facility-scoped query param yet.

</details>

## Facility map compliance reference

The owner contract is [Compliance Layer (Facility Map)](../../src/app/features/organization/features/facilities/FEATURE.md). The reference below was
reviewed against the 2026-09-28 source baseline. Numbered delivery phases,
retired designs and measured bundle sizes describe that implementation history;
the current owner contract and code determine present behavior.

<details>
<summary>Implementation details and decision history</summary>

`ui/pages/facility-map-page` carries an optional, off-by-default
**compliance layer** (`FacilityMapStore.complianceVisible`), a switch beside
the list/map layout toggle. Switching it on the first time lazily loads the
Compliance-owned facility tree (`GET /api/organizations/{organizationId}/facility-tree`,
browser-only, never on page init) via a small local
`data-access/services/compliance-tree/ComplianceTreeService` — `FacilityService`
is the org-scoped-facilities family, but this route belongs to the Compliance
module and returns a different, recursive shape, so a dedicated,
narrowly-scoped service was judged cheaper than teaching `FacilityService` a
foreign resource. `utils/facility-tree-flatten` flattens the response into a
`facilityId -> complianceRate` map, joined onto `FacilityMapStore.mappedFacilities`
by id.

While the layer is on:

- each marker's bucket comes from `utils/compliance-bucket` (`≥90` positive,
  `60–89` warning, `<60` critical, no data muted — thresholds owned by the
  parent organization feature's
  `constants/compliance-bucket-thresholds.constants.ts`, the single source
  shared with the compliance-status vocabulary) instead of the
  facility's lifecycle status, and the rate is folded into the marker's label
  (`"{name} — {rate}% compliant"`, `utils/facility-compliance-marker`) so the
  signal is never colour/glyph-only,
- a compact **"worst sites"** ranking (`ui/components/facility-compliance-worst-sites`,
  fed by `FacilityMapStore.worstFacilities`, the five lowest-rate located
  facilities) renders beside the map; selecting a marker or a ranked entry
  both navigate to the facility's record. `@shared/map`'s `Map` primitive
  only ever reads its `center` input once, at mount — it has no way to
  re-center an already-mounted instance — so "click a worst site to focus
  the map" was not achievable as a live camera move; navigating to the
  record was chosen instead, and re-centering support is a `@shared/map`
  follow-up, not a defect here. While the tree load is pending, the ranking
  slot renders skeletons in a `role="status"` region instead of the
  confirmed-empty message.

**Known limitation:** during that fetch the map pins themselves stay in the
muted/"no data" state — the markers are a pure computed over
`complianceMap`, which is empty until the response lands, and the map
primitive has no per-layer pending state to show instead. Documented, not
fixed.

The facility map consumes its local compliance transport and the parent-owned bucket thresholds. The organization Assets surface owns the richer compliance explorer; do not infer ownership from a historical branch name.

</details>
