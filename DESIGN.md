# Design

## Theme

**Mode:** Dual — light and dark, toggled via `html[data-theme="dark"]`. Dark is first-class, not an afterthought.

**Register:** Product — operational field-service tool. The interface disappears into the task. Orange brand accent is the single non-neutral; it signals action and active state only, never decoration.

**Color strategy:** Restrained. Tinted-neutral surfaces with one saturated accent (`primary-500`, orange). Semantic roles for state (error/warning/success/info) consume color budget separately.

---

## Color Palette

All tokens are PrimeNG surface/primary primitives consumed via Tailwind utilities. No OKLCH overrides yet — the palette is fully delegated to PrimeNG's design token system. The primary ramp is **orange** (`fireguard.preset.ts`), matching the PRODUCT.md brand mandate.

### Surface scale (light → dark pair)

| Role                   | Light token                           | Dark token           | Usage                                     |
| ---------------------- | ------------------------------------- | -------------------- | ----------------------------------------- |
| Page background        | `bg-surface-0`                        | `bg-surface-950`     | Full-bleed shell, header, primary sidebar |
| Elevated surface       | `bg-surface-0` (card)                 | `bg-surface-900/40`  | Cards, dialogs, drawers                   |
| Secondary surface      | `bg-surface-50/50`                    | `bg-surface-900/40`  | Context panel, muted aside panels         |
| Border                 | `border-surface-200`                  | `border-surface-800` | All dividers, card edges, input borders   |
| Muted icon tray        | `bg-surface-0` + `border-surface-200` | same                 | Metric card icon container                |
| Body text              | `text-surface-950`                    | `text-surface-50`    | Page-level headings, sidebar labels       |
| Secondary text         | `text-surface-500`                    | `text-surface-400`   | Descriptions, meta labels                 |
| Tertiary / placeholder | `text-surface-400`                    | `text-surface-500`   | Timestamps, helper copy                   |
| Icon default           | `text-surface-500`                    | `text-surface-400`   | Nav icons, metric icons                   |

### Accent

| Role                 | Token                                                 | Notes                                                                                                                                       |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary action       | `bg-primary` (`orange.600` light / `orange.400` dark) | Buttons carry **dark ink** labels in both schemes (`primary.contrastColor`): white on orange fails the 4.5:1 AA floor at button label sizes |
| Primary shadow       | `shadow-primary-500/30`                               | Badge shadow on splash screen only                                                                                                          |
| Ambient halo         | `bg-primary-500/5` (light) / `/10` (dark)             | Splash screen only; decorative                                                                                                              |
| Active arc / spinner | `text-primary-500`                                    | Splash screen progress ring                                                                                                                 |
| Focus ring           | `outline-primary`                                     | Focusable interactive elements                                                                                                              |

### Semantic state colors

| State                    | Color                                | Usage                        |
| ------------------------ | ------------------------------------ | ---------------------------- |
| Success / positive trend | `text-green-500`                     | Up-trend arrow               |
| Error / negative trend   | `text-red-500`                       | Down-trend arrow             |
| Tag severity             | resolved via tag descriptor registry | Intervention tags and badges |

---

## Typography

**Base size:** `14px` set on `html`. All `rem` values are relative to this.

**Family:** **Inter Variable** for sans (`--font-sans`) and **JetBrains Mono Variable**
for mono (`--font-mono`), both self-hosted via `@fontsource-variable/*` and imported in
`src/styles.css` (offline-safe, cached by the service worker). Each falls back to the
system UI stack.

**Scale (approximate, relative to 14px root):**

| Step | Class       | Rendered size (14px root)                                                                   | Usage                                          |
| ---- | ----------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| xs   | `text-xs`   | 10.5px — decorative icons only; **below the 12px text floor**, do not use for readable text | Tiny glyphs paired with a larger count/label   |
| sm   | `text-sm`   | 12.25px                                                                                     | Meta text, timestamps, tag labels, form labels |
| base | `text-base` | 14px                                                                                        | Body copy                                      |
| lg   | `text-lg`   | 15.75px                                                                                     | Card title headings (section h2)               |
| 2xl  | `text-2xl`  | 21px                                                                                        | Splash screen status title                     |
| 5xl  | `text-5xl`  | 42px                                                                                        | Metric card primary value                      |

**Weight conventions:**

- `font-medium` — section labels, card titles at sm, icon tray title
- `font-semibold` — card h2, splash status title, badge text, metric values, comparison values
- `font-semibold` is the weight ceiling for content. `font-bold` is reserved for the
  brand wordmark only (`auth-showcase`, `onboarding-showcase`, sidebar header) — never for
  page or section headings.

**Tracking:**

- `tracking-tight` — splash screen h2 only
- No negative tracking overrides elsewhere

**Line height:** defaults; `leading-relaxed` on splash screen detail paragraph only.

---

## Spacing & Layout

**Base unit:** 4px (Tailwind default). Spacing follows multiples of 4.

**Shell dimensions:**

- Header height: `h-16` (64px)
- Primary sidebar collapsed: 64px wide (icon-only)
- Primary sidebar expanded: 250px wide
- Context panel: resizable, user-controlled (range tracked in `sidebarService`)

**Card anatomy:**

- PrimeNG `p-card` with `[pt]` passthrough for custom header/content/footer padding
- Icon tray in metric card: `rounded-lg border border-surface-200 p-2`
- Card body follows PrimeNG defaults (no overrides in shared component itself)

**Gap rhythm:**

- Sidebar header/footer sections: `shrink-0`, content fills `flex-1 min-h-0 overflow-y-auto`
- Header inner sections: `px-5` horizontal, `gap-2` between action items
- Metric card header: `gap-3` between icon tray and label group, `gap-1` between value and comparison text

---

## Components

### Shell

**Dashboard layout:** `flex h-dvh overflow-hidden` — fixed full-height shell, no scroll on the shell itself. Overflow belongs to individual panels and the main content scroll area.

**Header:** `h-16 border-b` — breadcrumb in the flex-1 center, actions pinned right. Mobile: hamburger replaces the sidebar area.

**Primary sidebar:** Hidden below `lg` breakpoint. Animates width (`transition-[width] duration-200`) between icon-only (64px) and expanded (250px).

**Context panel:** Resizable via drag handle (`cursor-col-resize`, `w-3` handle). Sits between primary sidebar and the right content column. Hidden on mobile.

**Mobile sidebar:** PrimeNG `p-drawer` with headless template — full custom content, no PrimeNG chrome.

### Cards

Cards are the **native PrimeNG `p-card`** styled through `[pt]` + Tailwind (there is no
`app-card` wrapper). The card border is a Tailwind class on `styleClass`
(`border border-surface-200 dark:border-surface-800`); padding is zeroed on `body`/`content`
via `[pt]` when the card hosts a full-bleed table.

**`app-metric-card`:** Icon tray (bordered square) + title row, then large `text-5xl` value
with optional up/down comparison. Skeleton loading state via `p-skeleton`.

### Tables

Every entity table is a **`p-table` inside a `p-card`** with the shared shell recipe (the
`session-table` is the reference): `styleClass="flex min-h-0 flex-col overflow-hidden border
border-surface-200 dark:border-surface-800"` and a `[pt]` that zeroes `body`/`content`
padding (`p-0`) and gives the `header` a `border-b … px-4 py-3` bar. The card header hosts
the title + toolbar; the empty state is `app-empty-state` in `pTemplate="emptymessage"`.
Preferred skeleton strategy is `pTemplate="loadingbody"` with `p-skeleton` rows. Do **not**
hand-roll a bordered `<section>` shell for a table.

### Tag / Badge

**`app-tag`:** Two variants — `badge` (pill: `h-7 rounded-full border px-2.5 text-xs`) and plain (inline icon + label). It consumes a resolved `TagDescriptor` (`label` + `severity` + `icon`); components never branch on enum values.

**Single source for status presentation.** Every domain enum's label, severity and icon is
owned by that feature's `models/<concept>-tag/` registry — a descriptor interface, a kind
type, and a `resolve<Concept>Tag(kind, value)` resolver, per `ARCHITECTURE.md` §9.6. Current
registries: `facility-tag`, `inspection-tag`, `equipment-status-tag`, `intervention-tag`,
`invitation-tag`, `billing-tag`. A value must render identically on its list, detail header,
panel and dataview — always through `<app-tag [descriptor]="resolve…Tag('status', value)">`.
**Do not** use raw `<p-tag severity=…>` for a domain status/result/severity enum; raw
`p-tag` is only for non-registry accents (e.g. a facility _type_ chip with no severity meaning).

### Splash Screen

Full-screen overlay (`fixed inset-0 z-50`). SVG progress arc around a filled `bg-primary-500 rounded-full` badge. Fades out via `opacity-0 transition-opacity duration-300 ease-out`. Ambient halo via blurred circle. `motion-reduce:animate-none` on the spin animation.

### Empty State

**`app-empty-state`:** centered icon + title + optional description + optional projected
CTA (`ng-content`). The single empty-state primitive for tables, dataviews and panels.
The full-screen error pages (403/404/500) share the same visual language through the
feature-local `error-content` shell (muted status glyph + title + description + action row).

### Buttons

All actions use `p-button`. **One severity per intent** — colour encodes the action's
meaning, never its feature:

| Intent                               | PrimeNG severity         | Example                         |
| ------------------------------------ | ------------------------ | ------------------------------- |
| Primary / positive workflow action   | default (orange primary) | Submit, Close, Commission, Save |
| Neutral / secondary (incl. **Edit**) | `secondary` `[outlined]` | Edit, Move, Cancel-editing      |
| Cautionary state transition          | `warn`                   | Maintenance                     |
| Destructive                          | `danger` `[outlined]`    | Decommission, Delete, Revoke    |

`success` (green) is **not** an action colour — green is reserved for positive _state_,
not for "Edit" or a generic go-action. **Size:** `size="small"` on table toolbars and
detail-header action bars; default size on form submit footers (the two contexts stay
internally consistent).

### Form Controls

Delegated entirely to PrimeNG (`p-button`, `p-select`, `p-drawer`, `p-divider`, `p-skeleton`, `p-card`, `p-ripple`). No custom form control overrides in shared yet.

---

## Iconography

**Library:** PrimeIcons v7 (`pi` class prefix — e.g. `pi pi-bars`, `pi pi-arrow-up-right`).

**Size conventions:**

- `text-xs` — resize handle grip dots, small contextual icons
- `text-lg` — metric card icon tray
- Inline icons in tags: sized via `gap-1.5` alignment, no explicit size class

---

## Motion

**Transitions:**

- Sidebar width: `transition-[width] duration-200 ease-in-out`
- Splash fade: `transition-opacity duration-300 ease-out`
- Shell color transitions: `transition-colors` (no duration specified — PrimeNG default)
- Context panel width: `200ms ease` (inline style, bypassed during drag)

**Animations:**

- Splash indicator: `animate-pulse` gated by `motion-reduce:animate-none`
- Skeleton loaders (`animate-pulse` on onboarding wizard and plan-selection steps) are all
  gated by `motion-reduce:animate-none`
- No page-load choreography on app surfaces

**Philosophy:** State feedback only. 150–200ms on interactive state changes. Nothing decorative.

---

## Dark Mode

Activated by `html[data-theme="dark"]`. Custom Tailwind variant: `dark` maps to `&:where(html[data-theme="dark"], html[data-theme="dark"] *)`.

Every surface, border, text, and icon token has an explicit dark pair (see color table above). No implicit color-scheme reliance.

---

## Accessibility

- **Target:** WCAG 2.1 AA
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`
- Reduced motion: `motion-reduce:animate-none` on splash spinner (extend to all animations)
- Roles: `role="status" aria-live="polite"` on splash screen; `role="separator" aria-orientation="vertical"` on resize handle
- Status never color-only: tags always pair icon + label with severity color
- Keyboard: sidebar resize handle is keyboard-operable (receives focus, has aria-value attrs)

---

## Z-Index Scale

| Layer                | z- value           | Usage                                |
| -------------------- | ------------------ | ------------------------------------ |
| Context panel handle | `z-10`             | Resize grip sits above panel content |
| Splash screen        | `z-50`             | Full-screen boot overlay             |
| (PrimeNG overlays)   | managed by PrimeNG | Dropdowns, modals, tooltips          |

No arbitrary `z-999` values in project code.
