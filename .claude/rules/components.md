---
paths:
  - 'src/app/**/*.component.ts'
  - 'src/app/**/*.component.html'
---

# Angular components

- **No `Component` suffix on the class.** `OrganizationUsagePanel`, not `OrganizationUsagePanelComponent`. Route pages end in `Page`; other roles take `…Panel`, `…Card`, `…Form`, `…Table`, `…Dataview`, `…Dialog`, `…Drawer` (§9.3).
- **The selector is `app-` + the FOLDER name**, never the class name: folder `organization-members/` → `app-organization-members` (§9.4).
- `ChangeDetectionStrategy.OnPush` on **every** component. External `templateUrl`, never an inline `template:`. No `styleUrl` (§1.1).
- **No `standalone: true`** — it is the Angular 21 default and appears nowhere in this codebase.
- Members carry an explicit access modifier, an explicit type, and `readonly`: `public` for `input()`/`output()`, `protected` for what the template reads, `private` for injected collaborators (§9.7).
- **Outputs are past-tense or nouns** — `submitted`, `cancelled`, `visibleChange`. Never `submit`, never `onSubmit`.
- Every user-visible string is `$localize` with an explicit dotted id: `` $localize`:@@org.members.loadError:…` `` (§9.10).
- **Only a page may inject a store or call a service.** A table, dataview, form, dialog, or drawer takes inputs and emits outputs — nothing else (§10.3, §10.5).
- Tailwind classes must be **literal strings**; a computed class name produces no CSS. Dark mode is `html[data-theme="dark"]` — pair every surface colour with a `dark:` counterpart.
- Never branch on an enum in a template. Resolve it through the feature's `models/<concept>-tag/` registry (§10.10).

Details: the `fireguard-naming` and `primeng-styling` skills.
