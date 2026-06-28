import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, EMPTY, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { INTERVENTION_BOARD_COLUMNS } from '@features/organization/features/interventions/constants';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionBoardBucket,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { interventionBoardStoreEvents } from './events';
import type {
  InterventionBoardLoadRequest,
  InterventionBoardMoveCommand,
  InterventionBoardState,
} from './models';

/**
 * Constant BOARD_COLUMN_PAGE_SIZE
 * @const BOARD_COLUMN_PAGE_SIZE
 *
 * @description
 * Maximum number of cards loaded per lane. The lane count badge reads the
 * server total, so a lane can advertise more interventions than it renders.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const BOARD_COLUMN_PAGE_SIZE = 20;

/**
 * Constant BOARD_STATUSES
 * @const BOARD_STATUSES
 *
 * @description
 * Flat list of every workflow status backing a lane, queried once each on load.
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionStatus[]}
 */
const BOARD_STATUSES: readonly InterventionStatus[] = INTERVENTION_BOARD_COLUMNS.flatMap(
  (column) => column.statuses,
);

/**
 * Constant ZERO_TOTALS
 * @const ZERO_TOTALS
 *
 * @description
 * Per-status totals reset value.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<InterventionStatus, number>>}
 */
const ZERO_TOTALS: Readonly<Record<InterventionStatus, number>> = {
  draft: 0,
  planned: 0,
  in_progress: 0,
  submitted: 0,
  changes_requested: 0,
  published: 0,
  abandoned: 0,
};

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Initial state for the component-scoped {@link InterventionBoardStore}.
 *
 * @since 1.0.0
 *
 * @type {InterventionBoardState}
 */
const INITIAL_STATE: InterventionBoardState = {
  statusTotals: ZERO_TOTALS,
  loadCallState: idleCallState(),
  moveCallState: idleCallState(),
};

/**
 * Function shiftTotals
 *
 * @description
 * Returns a copy of the per-status totals with one intervention moved from
 * `from` to `to`, clamping the source at zero.
 *
 * @param {Readonly<Record<InterventionStatus, number>>} totals - Current totals.
 * @param {InterventionStatus} from - Source status.
 * @param {InterventionStatus} to - Target status.
 *
 * @returns {Record<InterventionStatus, number>} Adjusted totals.
 *
 * @since 1.0.0
 */
function shiftTotals(
  totals: Readonly<Record<InterventionStatus, number>>,
  from: InterventionStatus,
  to: InterventionStatus,
): Record<InterventionStatus, number> {
  if (from === to) return { ...totals };

  return {
    ...totals,
    [from]: Math.max(0, totals[from] - 1),
    [to]: totals[to] + 1,
  };
}

/**
 * Store InterventionBoardStore
 * @const InterventionBoardStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the intervention pipeline board. A
 * single {@link load} fetches a bounded page of cards per lane (one query per
 * workflow status) together with the per-status server totals, and {@link move}
 * applies an optimistic status transition with rollback on failure. Cards are
 * held in a flat `withEntities` collection and grouped into lanes by the
 * {@link columns} computed, so an optimistic move re-buckets the card with no
 * extra bookkeeping.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InterventionBoardStore = signalStore(
  withEntities({ entity: type<InterventionOutput>(), collection: 'intervention' }),
  withState<InterventionBoardState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Computed columns.
     *
     * @description
     * Lanes in display order, each carrying its grouped cards and server total.
     */
    columns: computed<readonly InterventionBoardBucket[]>(() => {
      const interventions: readonly InterventionOutput[] = store.interventionEntities();
      const totals: Readonly<Record<InterventionStatus, number>> = store.statusTotals();

      return INTERVENTION_BOARD_COLUMNS.map(
        (column): InterventionBoardBucket => ({
          id: column.id,
          items: interventions.filter((intervention) =>
            column.statuses.includes(intervention.status),
          ),
          total: column.statuses.reduce((sum, status) => sum + totals[status], 0),
        }),
      );
    }),

    /**
     * Computed loading.
     *
     * @description
     * True while the board is loading.
     */
    loading: computed<boolean>(() => store.loadCallState().status === 'pending'),

    /**
     * Computed isEmpty.
     *
     * @description
     * True when the board has no cards and is not loading.
     */
    isEmpty: computed<boolean>(
      () => store.interventionIds().length === 0 && store.loadCallState().status !== 'pending',
    ),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      service = inject<InterventionService>(InterventionService),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Loads a bounded page of cards for every lane plus the per-status totals.
       * Resolves to an empty board when no organization is active.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<InterventionBoardLoadRequest>}
       */
      load: rxMethod<InterventionBoardLoadRequest>(
        pipe(
          tap(() => patchState(store, { loadCallState: pendingCallState() })),
          switchMap(({ organizationId }) => {
            if (!organizationId) {
              patchState(
                store,
                setAllEntities([] as InterventionOutput[], { collection: 'intervention' }),
                { statusTotals: ZERO_TOTALS, loadCallState: successCallState(null) },
              );

              return EMPTY;
            }

            return forkJoin(
              BOARD_STATUSES.map((status) =>
                service.list(organizationId, {
                  status,
                  itemsPerPage: BOARD_COLUMN_PAGE_SIZE,
                  order: { updatedAt: 'desc' },
                }),
              ),
            ).pipe(
              tapResponse({
                next: (collections) => {
                  const members: InterventionOutput[] = collections.flatMap(
                    (collection) => collection.member,
                  );
                  const statusTotals: Record<InterventionStatus, number> = { ...ZERO_TOTALS };
                  BOARD_STATUSES.forEach((status, index) => {
                    statusTotals[status] = collections[index].totalItems;
                  });

                  patchState(store, setAllEntities(members, { collection: 'intervention' }), {
                    statusTotals,
                    loadCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { loadCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    interventionBoardStoreEvents.loadFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        'Failed to load the intervention board',
                      ),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method move
       * @method move
       *
       * @description
       * Applies an optimistic status transition: the card re-buckets immediately
       * and the lane totals shift, then the server PATCH confirms (replacing the
       * card with the returned revision) or the change is rolled back and a
       * failure event is dispatched. Moves are serialized to keep the optimistic
       * state consistent.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<InterventionBoardMoveCommand>}
       */
      move: rxMethod<InterventionBoardMoveCommand>(
        pipe(
          concatMap(({ intervention, toStatus }) => {
            const previousTotals: Readonly<Record<InterventionStatus, number>> =
              store.statusTotals();

            patchState(
              store,
              updateEntity(
                { id: intervention.id, changes: { status: toStatus } },
                { collection: 'intervention' },
              ),
              {
                statusTotals: shiftTotals(previousTotals, intervention.status, toStatus),
                moveCallState: pendingCallState(),
              },
            );

            return service
              .update(intervention.id, { status: toStatus }, intervention.revision)
              .pipe(
                tapResponse({
                  next: (updated: InterventionOutput) =>
                    patchState(
                      store,
                      updateEntity(
                        { id: updated.id, changes: updated },
                        { collection: 'intervention' },
                      ),
                      { moveCallState: successCallState(null) },
                    ),
                  error: (error: unknown) => {
                    const storeError = toStoreError(error);
                    patchState(
                      store,
                      updateEntity(
                        { id: intervention.id, changes: intervention },
                        { collection: 'intervention' },
                      ),
                      { statusTotals: previousTotals, moveCallState: errorCallState(storeError) },
                    );
                    dispatcher.dispatch(
                      interventionBoardStoreEvents.moveFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to move intervention'),
                      ),
                    );
                  },
                }),
              );
          }),
        ),
      ),
    }),
  ),
);

/**
 * Type InterventionBoardStoreType
 * @type InterventionBoardStoreType
 *
 * @description
 * Injectable instance type exposed by {@link InterventionBoardStore}.
 *
 * @since 1.0.0
 */
export type InterventionBoardStoreType = InstanceType<typeof InterventionBoardStore>;
