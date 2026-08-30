import type { CallState } from '@core/request-state';
import type {
  InterventionDuplicatePrefill,
  InterventionOutput,
  InterventionTemplateInstantiationOutput,
} from '@features/organization/features/interventions/models';

/**
 * Interface InterventionState
 * @interface InterventionState
 *
 * @description
 * Component-scoped state for intervention list and creation workflows. Intervention
 * entities are managed by the `withEntities` feature; this interface tracks
 * auxiliary request state and server totals.
 *
 * @version 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionState {
  //#region Properties
  /**
   * Property totalInterventions
   * @readonly
   *
   * @description
   * Server-reported number of interventions for the active organization.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalInterventions: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention listing.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property servedFromLocalCache
   * @readonly
   *
   * @description
   * Whether the interventions on screen came from this device's IndexedDB
   * snapshot rather than from the API, because the network failed. The list is
   * the entry point to everything else the field agent does, so answering a
   * lost connection with an error state made the offline-first detail page
   * unreachable by navigation — the contradiction `PRODUCT.md`'s third
   * principle exists to prevent.
   *
   * @since 6.0.0
   *
   * @type {boolean}
   */
  readonly servedFromLocalCache: boolean;

  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention creation.
   * Carries the created intervention on success so route pages can navigate.
   *
   * @since 1.0.0
   *
   * @type {CallState<InterventionOutput>}
   */
  readonly createCallState: CallState<InterventionOutput>;

  /**
   * Property transitionCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for a single-status-transition PATCH,
   * kept separate from {@link listCallState} so a transition in flight never
   * clobbers the list's own loading state.
   *
   * @since 1.2.0
   *
   * @type {CallState<InterventionOutput>}
   */
  readonly transitionCallState: CallState<InterventionOutput>;

  /**
   * Property transitioningInterventionIds
   * @readonly
   *
   * @description
   * Ids of the interventions whose status transition is currently in flight.
   * The optimistic patch only writes `status`, so until the server entity
   * lands an in-flight row's `allowedTransitions` and `revision` describe its
   * pre-transition state — consumers use this list to withhold that row's
   * transition controls for the duration instead of offering stale moves.
   *
   * @since 1.1.0
   *
   * @type {readonly string[]}
   */
  readonly transitioningInterventionIds: readonly string[];

  /**
   * Property deleteCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for intervention deletion. Shared across
   * concurrent deletes (single row or bulk selection), each keyed by its own
   * `mergeMap`'d request; a page reads it only to know whether *a* delete is
   * in flight, per-row outcome is carried by the dispatched success/failure
   * events instead.
   *
   * @since 4.1.0
   *
   * @type {CallState}
   */
  readonly deleteCallState: CallState;

  /**
   * Property assignCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for assigning a responsible member to a
   * cached intervention, kept separate from {@link transitionCallState} so a
   * concurrent status change never clobbers an in-flight assignment (and
   * vice versa).
   *
   * @since 4.2.0
   *
   * @type {CallState<InterventionOutput>}
   */
  readonly assignCallState: CallState<InterventionOutput>;

  /**
   * Property instantiateCallState
   * @readonly
   *
   * @description
   * Loading / success / error state for instantiating an intervention draft
   * from a template, kept separate from {@link createCallState} since the
   * two are alternative paths through the same creation sheet. Carries the
   * `{ interventionId, number }` handoff on success.
   *
   * @since 4.3.0
   *
   * @type {CallState<InterventionTemplateInstantiationOutput>}
   */
  readonly instantiateCallState: CallState<InterventionTemplateInstantiationOutput>;

  /**
   * Property pendingDuplicatePrefill
   * @readonly
   *
   * @description
   * A "Duplicate" prefill handed off across routes — set by
   * `InterventionDetailPage` before it navigates to the list with
   * `?create=1`, consumed once and cleared by `InterventionsPage`. `null`
   * otherwise, including for the list's own row-level "Duplicate" entry
   * point, which never leaves the page and never touches this field.
   *
   * @since 6.1.0
   *
   * @type {InterventionDuplicatePrefill | null}
   */
  readonly pendingDuplicatePrefill: InterventionDuplicatePrefill | null;
  //#endregion
}
