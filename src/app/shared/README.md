# Shared

## Purpose

`shared/` owns generic, domain-agnostic frontend artifacts.

It is the home for reusable primitives that have no business ownership:

- generic UI components,
- pure directives,
- pure validators,
- future pure pipes,
- future pure utilities.

`shared/` is not a fallback folder for code that happens to be reused.

## Allowed Dependencies

Artifacts in `shared/` may depend on:

- other `shared/` artifacts,
- Angular and framework libraries,
- neutral contracts published by an owning concern.

Artifacts in `shared/` must not depend on:

- feature stores,
- feature models,
- feature data-access services,
- concrete `core` service implementations,
- business workflows or orchestration.

When a shared UI primitive needs app-wide behavior, it must inject a neutral contract published by the owning concern instead of importing a concrete implementation directly.

Current examples:

- `ThemeSwitcher` consumes the theme contract.
- `SplashScreen` consumes the splash-screen contract.

## Public API

External consumers must import `shared` artifacts through public barrels only.

Preferred entry points:

- `@shared/components`
- `@shared/directives`
- `@shared/validators`

The root `@shared` barrel exists for discovery and composition, but concern-level barrels remain the default entry points for feature code.

Do not add deep imports to implementation files from outside the owning folder.

## Local Structure Rules

Each shared artifact starts with the smallest useful shape.

### Components

Default folder shape:

```text
components/
  <component-name>/
    index.ts
    <component-name>.component.ts
    <component-name>.component.html
    <component-name>.component.css        # optional
    components/                           # optional nested Angular subcomponents
    models/                               # optional local UI-only types and view models
    options/                              # optional static UI option sets
    utils/                                # optional pure helpers private to the component group
    testing/                              # optional test-only fixtures and helpers
```

Add nested folders only when the local area actually needs them.

### Directives

Default folder shape:

```text
directives/
  <directive-name>/
    index.ts
    <directive-name>.directive.ts
    utils/                                # optional private pure helpers
    testing/                              # optional test-only helpers
```

### Validators

Default folder shape:

```text
validators/
  <validator-name>/
    index.ts
    <validator-name>.validator.ts
    utils/                                # optional private constants and pure helpers
    testing/                              # optional test-only helpers
```

### Optional Concerns

The following concern folders are part of the target structure, but should only be created at the first concrete need:

- `pipes/`
- `utils/`

## Promotion Rules

Move an artifact into `shared/` only when all these statements are true:

1. It is generic by design, not just reused in multiple places.
2. It does not encode business rules or domain language.
3. It does not depend on feature-owned state, models, or services.
4. Its public API is stable enough to be consumed through a barrel.

If one of these conditions is false, the artifact should stay with its owning feature or in `core` if it is app-wide infrastructure.
