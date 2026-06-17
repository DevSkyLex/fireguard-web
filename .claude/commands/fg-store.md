---
description: Create or modify an NgRx SignalStore slice following FireGuard's store patterns
argument-hint: '<slice name and what it manages> [target feature]'
---

Work on the SignalStore slice described by: **$ARGUMENTS**

Follow `ARCHITECTURE.md` §18 (Store Patterns Reference) and `AGENTS.md`
(State And Async Work):

- Slice-first folder `state/<slice>/` with a local `index.ts`; `state/index.ts`
  re-exports only stable public store APIs. State interfaces live in `state/`,
  not `models/`.
- Mutate with `patchState` only — never assign state directly.
- Async flows use `rxMethod` + `tapResponse`; expose explicit request state from
  `@core/state/request-state`. Use named `CallState` for multiple async actions,
  `withQueryState` only for a single primary query, `withEntities` for collections.
- Emit typed store events (`eventGroup`) for cross-layer consequences
  (navigation, toasts, sibling coordination).
- Do not use `rxResource`/`httpResource` as the store standard.

Add targeted specs and run `npx ng test --watch=false --include="<slice glob>"`,
then `npm run format` and `npm run lint`.
