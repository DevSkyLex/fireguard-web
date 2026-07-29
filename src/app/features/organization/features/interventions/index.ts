/**
 * Interventions feature public API.
 *
 * Deliberately narrow: only the bootstrap provider and the shell contributions,
 * which is all any external consumer needs.
 *
 * It used to `export *` the models, data-access, state and services trees. The two
 * consumers — `app.config.ts` and `workspace.routes.ts` — import providers only,
 * but a barrel that re-exports everything drags the IndexedDB repositories and the
 * sync coordinator along with them, welding the whole offline graph into the
 * initial bundle for every visitor. Internal code imports the deep paths directly;
 * nothing needs them from here.
 */
export { provideInterventionsFeature } from './interventions.feature';
export { withInterventionHeaderActions, withInterventionSyncChip } from './providers';
