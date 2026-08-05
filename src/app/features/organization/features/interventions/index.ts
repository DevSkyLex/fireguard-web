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

/**
 * The transport service, for the parent feature's dashboard attention panel
 * (ARCHITECTURE.md §4: parent and nested child depend on each other only through
 * an explicit public API).
 *
 * Exported from its implementation path on purpose, NOT through `./data-access`:
 * that barrel also re-exports `InterventionOfflineService` and
 * `InterventionDatabaseService`, so importing through it would drag the IndexedDB
 * layer into the organization dashboard bundle — the exact cost this file exists
 * to avoid. `intervention.service.ts` itself imports only `@core/api` and types.
 */
export { InterventionService } from './data-access/services/intervention/intervention.service';
