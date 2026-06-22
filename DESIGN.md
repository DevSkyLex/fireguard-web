# Design

## Theme

**Mode:** Dual — light and dark, toggled via `html[data-theme="dark"]`. Dark is first-class, not an afterthought.

**Register:** Product — operational field-service tool. The interface disappears into the task. Orange brand accent is the single non-neutral; it signals action and active state only, never decoration.

**Color strategy:** Restrained. Tinted-neutral surfaces with one saturated accent (`primary-500`, orange). Semantic roles for state (error/warning/success/info) consume color budget separately.

---

## Color Palette

All tokens are PrimeNG surface/primary primitives consumed via Tailwind utilities. No OKLCH overrides yet — the palette is fully delegated to PrimeNG's design token system.

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

| Role                 | Token                                     | Notes                              |
| -------------------- | ----------------------------------------- | ---------------------------------- |
| Primary action       | `bg-primary-500`                          | Buttons, active nav indicator, FAB |
| Primary shadow       | `shadow-primary-500/30`                   | Badge shadow on splash screen only |
| Ambient halo         | `bg-primary-500/5` (light) / `/10` (dark) | Splash screen only; decorative     |
| Active arc / spinner | `text-primary-500`                        | Splash screen progress ring        |
| Focus ring           | `outline-primary`                         | Focusable interactive elements     |

### Semantic state colors

| State                    | Color                                | Usage                        |
| ------------------------ | ------------------------------------ | ---------------------------- |
| Success / positive trend | `text-green-500`                     | Up-trend arrow               |
| Error / negative trend   | `text-red-500`                       | Down-trend arrow             |
| Tag severity             | resolved via tag descriptor registry | Intervention tags and badges |

---

## Typography

**Base size:** `14px` set on `html`. All `rem` values are relative to this.

**Family:** PrimeNG / browser default sans-serif stack. No custom web font loaded.

**Scale (approximate, relative to 14px root):**

| Step | Class       | Approx size | Usage                                                 |
| ---- | ----------- | ----------- | ----------------------------------------------------- |
| xs   | `text-xs`   | 12px        | Helper copy, timestamps, tag labels, secondary meta   |
| sm   | `text-sm`   | 14px        | Body copy, card descriptions, nav labels, form labels |
| base | `text-base` | 16px        | (rarely used directly)                                |
| lg   | `text-lg`   | 18px        | Card title headings (section h2)                      |
| 2xl  | `text-2xl`  | 24px        | Splash screen status title                            |
| 5xl  | `text-5xl`  | ~56px       | Metric card primary value                             |

**Weight conventions:**

- `font-medium` — section labels, card titles at sm, icon tray title
- `font-semibold` — card h2, splash status title, badge text, metric values, comparison values
- No bold (`font-bold`) in use; semibold is the ceiling

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

**`app-card`:** PrimeNG card wrapper with consistent header (title + optional description + optional action slot), content and footer slots.

**`app-metric-card`:** Extends card pattern. Icon tray (bordered square) + title row, then large `text-5xl` value with optional up/down comparison. Skeleton loading state via `p-skeleton`.

### Tag / Badge

**`app-tag`:** Two variants — `badge` (pill: `h-7 rounded-full border px-2.5 text-xs`) and plain (inline icon + label). Both resolve label and icon from a feature-owned descriptor registry; components never branch on enum values.

### Splash Screen

Full-screen overlay (`fixed inset-0 z-50`). SVG progress arc around a filled `bg-primary-500 rounded-full` badge. Fades out via `opacity-0 transition-opacity duration-300 ease-out`. Ambient halo via blurred circle. `motion-reduce:animate-none` on the spin animation.

### Empty State

Exists as `app-empty-state` (HTML not deeply analyzed yet — candidate for `$impeccable audit`).

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

- Splash spinner: `animate-spin [animation-duration:1.4s]` — disabled via `motion-reduce:animate-none`
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
