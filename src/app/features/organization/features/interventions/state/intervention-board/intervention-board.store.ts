import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type } from '@ngrx/signals';
import { withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, mergeMap, pipe } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { INTERVENTION_BOARD_COLUMNS } from '@features/organization/features/interventions/constants';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionListOptions,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import type {
  InterventionBoardColumnState,
  InterventionBoardState,
} from './models/state.interface';

/**
 * Function emptyColumn
 * @description Initial request state for a status.
 * @access private
 * @since 1.0.0
 * @returns {InterventionBoardColumnState}
 */
const emptyColumn = (): InterventionBoardColumnState => ({
  ids: [],
  page: 0,
  total: 0,
  callState: idleCallState(),
});
/**
 * Constant INITIAL_STATE
 * @description Independent query and mutation state for the intervention board.
 * @since 1.0.0
 * @type {InterventionBoardState}
 */
const INITIAL_STATE: InterventionBoardState = {
  columns: {},
  organizationId: '',
  options: {},
  moves: {},
  revision: 0,
};
/**
 * Store InterventionBoardStore
 * @description Loads status columns independently in pages of 30 and never presents page counts as collection totals.
 * @since 1.0.0
 */
export const InterventionBoardStore = signalStore(
  withEntities({ entity: type<InterventionOutput>(), collection: 'boardIntervention' }),
  withState(INITIAL_STATE),
  withMethods((store, service = inject(InterventionService)) => {
    let generation = 0;
    const requests: Partial<Record<InterventionStatus, number>> = {};
    /**
     * Method loadPage
     * @description Reads one status page; stale query responses never modify current membership.
     * @access private
     * @since 1.0.0
     * @param {{ status: InterventionStatus; page: number }} request - Requested page.
     * @returns {void}
     */
    const loadPage = rxMethod<{ status: InterventionStatus; page: number; refresh?: boolean }>(
      pipe(
        mergeMap(({ status, page, refresh }) => {
          const previous = store.columns()[status] ?? emptyColumn();
          if (previous.callState.status === 'pending' && !refresh) return EMPTY;
          const requestId = (requests[status] ?? 0) + 1;
          requests[status] = requestId;
          const expected = generation;
          patchState(store, {
            columns: {
              ...store.columns(),
              [status]: { ...previous, callState: pendingCallState() },
            },
          });
          return service
            .list(store.organizationId(), { ...store.options(), status, page, itemsPerPage: 30 })
            .pipe(
              tapResponse({
                next: (collection) => {
                  if (generation !== expected || requests[status] !== requestId) return;
                  const ids = [
                    ...new Set([
                      ...(page === 1 ? [] : previous.ids),
                      ...collection.member.map((item) => item.id),
                    ]),
                  ];
                  patchState(
                    store,
                    setEntities([...collection.member], { collection: 'boardIntervention' }),
                    {
                      columns: {
                        ...store.columns(),
                        [status]: {
                          ids,
                          page,
                          total: collection.totalItems,
                          callState: successCallState(null),
                        },
                      },
                    },
                  );
                },
                error: (error: unknown) => {
                  if (generation === expected && requests[status] === requestId)
                    patchState(store, {
                      columns: {
                        ...store.columns(),
                        [status]: { ...previous, callState: errorCallState(toStoreError(error)) },
                      },
                    });
                },
              }),
            );
        }),
      ),
    );
    return {
      /**
       * Method load
       * @description Starts a new board query with one bounded page per status.
       * @access public
       * @since 1.0.0
       * @param {{ organizationId: string; options: InterventionListOptions }} request - Active query.
       * @returns {void}
       */
      load(request: { organizationId: string; options: InterventionListOptions }): void {
        generation++;
        patchState(store, removeAllEntities({ collection: 'boardIntervention' }), {
          ...INITIAL_STATE,
          ...request,
          revision: store.revision(),
        });
        for (const status of INTERVENTION_BOARD_COLUMNS) loadPage({ status, page: 1 });
      },
      /**
       * Method loadMore
       * @description Loads the next missing page or retries the previously failed request.
       * @access public
       * @since 1.0.0
       * @param {InterventionStatus} status - Column.
       * @returns {void}
       */
      loadMore(status: InterventionStatus): void {
        const column = store.columns()[status] ?? emptyColumn();
        if (column.page > 0 && column.ids.length >= column.total) return;
        loadPage({ status, page: column.page + 1 });
      },
      /**
       * Method move
       * @description Commits one authorized move and reconciles the source and destination pages after success.
       * @access public
       * @since 1.0.0
       * @param {{ intervention: InterventionOutput; status: InterventionStatus }} request - Requested transition.
       * @returns {void}
       */
      move: rxMethod<{ intervention: InterventionOutput; status: InterventionStatus }>(
        pipe(
          mergeMap(({ intervention, status }) => {
            if (store.moves()[intervention.id]?.status === 'pending') return EMPTY;
            const expected = generation;
            patchState(store, {
              moves: { ...store.moves(), [intervention.id]: pendingCallState() },
            });
            return service.update(intervention.id, { status }, intervention.revision).pipe(
              tapResponse({
                next: (updated) => {
                  if (generation !== expected) return;
                  patchState(store, setEntities([updated], { collection: 'boardIntervention' }), {
                    moves: { ...store.moves(), [intervention.id]: successCallState(null) },
                    revision: store.revision() + 1,
                  });
                  loadPage({ status: intervention.status, page: 1, refresh: true });
                  loadPage({ status, page: 1, refresh: true });
                },
                error: (error: unknown) => {
                  if (generation === expected)
                    patchState(store, {
                      moves: {
                        ...store.moves(),
                        [intervention.id]: errorCallState(toStoreError(error)),
                      },
                    });
                },
              }),
            );
          }),
        ),
      ),
    };
  }),
);
