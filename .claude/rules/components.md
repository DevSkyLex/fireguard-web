---
paths:
  - 'src/app/**/*.component.ts'
  - 'src/app/**/*.component.html'
---

# Angular components

- **No `Component` suffix on the class.** `OrganizationUsagePanel`, not `OrganizationUsagePanelComponent`. Route pages end in `Page`; other roles take `…Panel`, `…Card`, `…Form`, `…Table`, `…Dataview`, `…Dialog`, `…Sheet` (§9.3).
- **A route page carries `-page` on its folder AND its files**, not just on its class: `ui/pages/interventions-page/interventions-page.component.ts` → `InterventionsPage`, `app-interventions-page`. A page is identifiable from its path alone. No page folder in `src/app` is exempt (§9.3).
- **Name a component after what it renders, never after the relation that brought it there.** `intervention-equipment-table`, never `intervention-linked-equipment-table`. Relational qualifiers — `linked-`, `related-`, `associated-`, `attached-`, `parent-`, `child-` — belong to the state slice or the API concept that models the relation, not to the component that displays the rows (§9.3).
- **The selector is `app-` + the FOLDER name**, never the class name: folder `organization-members/` → `app-organization-members` (§9.4).
- `ChangeDetectionStrategy.OnPush` on **every** component. External `templateUrl`, never an inline `template:`. No `styleUrl` (§1.1).
- **No `standalone: true`** — it is the Angular 22 default and appears nowhere in this codebase.
- Members carry an explicit access modifier, an explicit type, and `readonly`: `public` for `input()`/`output()`, `protected` for what the template reads, `private` for injected collaborators (§9.7).
- **Outputs are past-tense or nouns** — `submitted`, `cancelled`, `visibleChange`. Never `submit`, never `onSubmit`.
- Every user-visible string is `$localize` with an explicit dotted id: `` $localize`:@@org.members.loadError:…` `` (§9.10).
- **Only a page may inject a store or call a service.** A table, dataview, form, dialog, or sheet takes inputs and emits outputs — nothing else (§10.3, §10.5).
- **Forms are Signal Forms** (`@angular/forms/signals`): `form()` over a `signal()` model, rules in the schema, fields bound with `[formField]`. `ReactiveFormsModule`, `FormBuilder`, `FormGroup`, `FormControl` and `ValidatorFn` are banned in new code (§10.4). Read state from the field — `field().touched()`, `.invalid()`, `.errors()` — never mirror it into parallel signals.
- **A reusable rule set is a validator**, in `.validator.ts`: the form's own `validators/` when private to it, the feature-level `validators/` when several of its forms share it (§10.4). Rules do not belong in `utils/`.
- Tailwind classes must be **literal strings**; a computed class name produces no CSS. Dark mode is `html[data-theme="dark"]` — pair every surface colour with a `dark:` counterpart.
- Never branch on an enum in a template. Resolve it through the feature's `models/<concept>-tag/` registry (§10.10).

- **The component library is spartan/ui.** Check `src/app/shared/ui` before hand-rolling anything;
  add a missing primitive with `npx ng g @spartan-ng/cli:ui <name>`. Import through `@shared/ui/<name>`.
- Style with the **semantic tokens** (`bg-background`, `text-foreground`, `bg-primary`, `border-border`),
  not raw palette values — that is what makes `html[data-theme="dark"]` work.

Details: the `fireguard-naming` and `spartan-ui` skills.
