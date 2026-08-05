---
name: fireguard-naming
description: Lookup table for FireGuard Web naming — which file suffix, folder, class name, and selector a given kind of unit takes, plus the five transitional deviations that must not be copied. Use when creating any new file in src/app, or when unsure whether an existing name is the target or a legacy artifact.
---

# Naming lookup

`ARCHITECTURE.md` **§9** is the normative reference — _"when two passages seem to disagree, this section wins."_ This skill is the fast lookup; §9 is the authority.

## The one-line rule

`kebab-case` files and folders · `PascalCase` classes and types (**never an `I` prefix**) · `camelCase` functions, members, signals · `SCREAMING_SNAKE_CASE` module-level consts, injection tokens, route consts. **TypeScript `enum` is banned entirely** — use a literal union (`.type.ts`) or a const-enum catalog (`.model.ts`).

The type separator is a **dot**: `auth.guard.ts`, never `auth-guard.ts`. One declaration per file.

## Kind → file → class → selector

| You are creating         | File                                                       | Class                                                                           | Selector               |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| route page               | `<name>-page.component.ts` in `ui/pages/<name>-page/`      | `<Name>Page` — **always** `Page`                                                | `app-<folder-name>`    |
| presentational component | `<name>.component.ts`                                      | `<Name>` + role suffix, **no `Component`**                                      | `app-<folder-name>`    |
| directive                | `<name>.directive.ts`                                      | `<Name>Directive` — **keeps** the suffix                                        | `[appCamelCase]`       |
| pipe                     | `<name>.pipe.ts`                                           | `<Name>Pipe`                                                                    | `name: 'appCamelCase'` |
| transport service        | `<concern>.service.ts`                                     | `<Concern>Service`                                                              | —                      |
| store                    | `<slice>.store.ts`                                         | `<Slice>Store` (+ `<Slice>StoreType`; `Active` prefix for single-active-entity) | —                      |
| guard                    | `<name>.guard.ts`                                          | `camelCaseGuard: CanActivateFn` — a **function**                                | —                      |
| resolver                 | `<name>.resolver.ts`                                       | `camelCaseResolver: ResolveFn<T>` — a **function**                              | —                      |
| routes                   | `<feature>.routes.ts`                                      | `FEATURE_ROUTES: Routes`                                                        | —                      |
| port                     | `<port>.interface.ts` + `<port>.token.ts`                  | `interface <Name>Port` + `const <NAME>_PORT`                                    | —                      |
| pure function            | `<name>.utils.ts` in `utils/<name>/`                       | `camelCase` function                                                            | —                      |
| fixed value              | `<name>.constants.ts` (flat)                               | `SCREAMING_SNAKE` const                                                         | —                      |
| UI option set            | `<name>.constants.ts` in `options/` (flat)                 | `SCREAMING_SNAKE` const                                                         | —                      |
| API DTO                  | `<name>-input.interface.ts` / `<name>-output.interface.ts` | `<Name>Input` / `<Name>Output`                                                  | —                      |
| domain enum              | `<name>.type.ts`                                           | `type <Name>` — literal union                                                   | —                      |
| const-enum catalog       | `<name>.model.ts`                                          | `SCREAMING_SNAKE` const + derived `PascalCase` type                             | —                      |
| spec                     | `<subject-file>.spec.ts` in `testing/`                     | `describe('<ExactSymbol>')`                                                     | —                      |
| Playwright page object   | `<name>.page.ts` in `e2e/support/pages/`                   | `<Name>Page`                                                                    | —                      |

**The selector uses the FOLDER name, not the class name.** Folder `organization-members/` → `app-organization-members`, even though the class is `OrganizationMembersPage`. `app` is the only permitted prefix.

**Role suffixes for components** (§9.3): `…Page` `…Form` `…Table` `…Dataview` `…Dialog` `…Drawer` `…Panel` `…Card` `…Chart` `…Layout` `…Stepper` `…Toolbar`. A generic widget may be a bare noun (`Board`, `Calendar`).

## Banned suffixes (§9.2)

`.module.ts` (standalone-only) · `.enum.ts` (no TS enums) · `.dto.ts` (use `…Input`/`…Output`) · `.page.ts` **inside `src/app`** (reserved for Playwright page objects) · bare `types.ts` / `constants.ts` with no concept prefix.

## `.utils.ts` vs `.util.ts`

Plural `.utils.ts` inside a `utils/` folder — the normal case. Singular `.util.ts` **only** for the resolver of a `<concept>-tag/` presentation registry inside `models/` (`intervention-tag.util.ts`). The suffix follows where the file lives.

## State naming (§9.6)

Call-state fields are `<verb>CallState` (`listCallState`, `createCallState`) · `rxMethod` methods are bare verbs, no `on`/`handle`/`do` (`load`, `create`, `remove`) · event groups are `camelCase` + `StoreEvents` with a Title Case `source` (`'Organization Members Store'`) · event keys are `<verb>Succeeded` / `<verb>Failed` · `withEntities` collections are **singular** (`collection: 'member'` → `memberEntities()`) · the seed constant is module-private `INITIAL_STATE`.

## Component members (§9.7)

Explicit access modifier + explicit type + `readonly`. `public` for `input()`/`output()`, `protected` for anything the template reads, `private` for injected collaborators the template never touches.

Booleans are `is…`/`has…`/`can…` · overlay visibility is `<thing>Visible` · **outputs are past-tense or noun** (`submitted`, `cancelled`, `visibleChange`, `pageChange`) — never `submit`, never `onSubmit` · the `_` prefix is reserved for `withQueryState` internals.

## i18n and test hooks (§9.10)

Every user-visible string is `$localize` with an **explicit dotted id**:

```ts
$localize`:@@org.members.loadError:Could not load members`;
```

Page and section roots carry a kebab-case DOM `id` as the e2e hook (`id="login-page"`). `data-testid` is kebab-case, prefixed by the owning component (`account-mfa-confirm-code`).

## The five transitional deviations — do NOT copy (§9.11)

These exist in the codebase, are **not** the target, and must never be used as precedent:

1. two form specs sit flat beside their subject instead of in `testing/` (`inspection-form`, `non-conformity-form`),
2. two account state slices use `<name>-state.model.ts` instead of `state.interface.ts`,
3. five features (`auth`, `account`, `error`, `maintenance`, `onboarding`) suffix page folders with `-page` — the target is the bare screen name; **do not add the suffix to new pages, and do not rename the existing ones wholesale**,
4. one state aggregate uses bare `utils/constants.ts` and `models/types.ts`,
5. one store file differs from its slice folder name (`state/organization-list/organization.store.ts`).

Seeing one of these in a neighbouring file is not permission to repeat it.
