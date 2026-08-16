import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  setEntity,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { FacilityAttachmentService } from '@features/organization/features/facilities/data-access';
import type { FacilityAttachmentOutput } from '@features/organization/features/facilities/models';
import { facilityPlansStoreEvents } from './events';
import type { FacilityPlansState } from './models';

//#region Initial State
/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Seeds {@link FacilityPlansState}. Entity state (`planEntities`,
 * `planEntityMap`, `planIds`) is initialised by `withEntities`.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: FacilityPlansState = {
  listCallState: idleCallState(),
  uploadCallState: idleCallState(),
  setPrimaryCallState: idleCallState(),
  deleteCallState: idleCallState(),
  settingPrimaryId: null,
  deletingId: null,
  selectedPlanId: null,
};
//#endregion

/**
 * Store FacilityPlansStore
 * @const FacilityPlansStore
 *
 * @description
 * Component-scoped store for the facility detail page's Plans tab: the
 * floor-plan attachments (`kind: 'floor_plan'`) of one facility, their
 * upload, primary selection and deletion. Provided on the tab, not the
 * route, since the data is secondary content loaded only once the tab opens
 * (`ARCHITECTURE.md` §12.4).
 *
 * @example
 * ```typescript
 * @Component({ providers: [FacilityPlansStore] })
 * export class FacilityDetailPage {
 *   readonly plans = inject(FacilityPlansStore);
 * }
 * ```
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityPlansStore = signalStore(
  withEntities({ entity: type<FacilityAttachmentOutput>(), collection: 'plan' }),
  withState<FacilityPlansState>(INITIAL_STATE),

  withComputed((store) => ({
    /** The primary plan, or null when none is set yet. */
    primaryPlan: computed<FacilityAttachmentOutput | null>(
      () => store.planEntities().find((plan) => plan.isPrimaryPlan) ?? null,
    ),

    /** Plans in display order: the primary plan first, then upload order. */
    orderedPlans: computed<readonly FacilityAttachmentOutput[]>(() =>
      store.planEntities().toSorted((a, b) => Number(b.isPrimaryPlan) - Number(a.isPrimaryPlan)),
    ),

    /** True while the list request is in flight. */
    isLoading: computed<boolean>(() => store.listCallState().status === 'pending'),

    /** True while an upload is in flight. */
    isUploading: computed<boolean>(() => store.uploadCallState().status === 'pending'),

    /** True when the list has resolved and holds no plan. */
    isEmpty: computed<boolean>(
      () => store.planIds().length === 0 && store.listCallState().status === 'success',
    ),
  })),

  withComputed((store) => ({
    /**
     * Property selectedPlan
     * @readonly
     *
     * @description
     * The plan the tab is showing: the explicitly selected one when set and
     * still present, else the primary plan, else the first uploaded one.
     *
     * @since 1.0.0
     * @type {FacilityAttachmentOutput | null}
     */
    selectedPlan: computed<FacilityAttachmentOutput | null>(() => {
      const selectedId: string | null = store.selectedPlanId();
      const map = store.planEntityMap();
      if (selectedId && map[selectedId]) return map[selectedId];

      return store.primaryPlan() ?? store.orderedPlans()[0] ?? null;
    }),
  })),

  withMethods(
    (
      store,
      service: FacilityAttachmentService = inject(FacilityAttachmentService),
      dispatcher: Dispatcher = inject(Dispatcher),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Fetches the facility's floor plans (`kind=floor_plan`). Cancels any
       * in-flight request via `switchMap`.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ facilityId: string }>}
       */
      load: rxMethod<{ facilityId: string }>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ facilityId }) =>
            service.list(facilityId, 'floor_plan').pipe(
              tapResponse({
                next: (response: HydraCollection<FacilityAttachmentOutput>): void => {
                  patchState(store, setAllEntities([...response.member], { collection: 'plan' }), {
                    listCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load floor plans'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method upload
       * @method upload
       *
       * @description
       * Uploads one image as a floor plan (`kind: 'floor_plan'`).
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ facilityId: string; file: File }>}
       */
      upload: rxMethod<{ facilityId: string; file: File }>(
        pipe(
          tap((): void => {
            patchState(store, { uploadCallState: pendingCallState() });
          }),
          switchMap(({ facilityId, file }) =>
            service.upload(facilityId, file, file.name, 'floor_plan').pipe(
              tapResponse({
                next: (plan: FacilityAttachmentOutput): void => {
                  patchState(store, addEntity(plan, { collection: 'plan' }), {
                    uploadCallState: successCallState(plan),
                    selectedPlanId: plan.id,
                  });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.uploadSucceeded(
                      successFeedback(
                        $localize`:@@facility.plans.toast.uploaded:Floor plan uploaded`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { uploadCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.uploadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to upload floor plan'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method setPrimary
       * @method setPrimary
       *
       * @description
       * Sets one plan as the facility's primary plan. The backend atomically
       * unsets the previous primary; this store mirrors that swap locally on
       * success rather than re-fetching the list.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ attachmentId: string }>}
       */
      setPrimary: rxMethod<{ attachmentId: string }>(
        pipe(
          tap(({ attachmentId }): void => {
            patchState(store, {
              setPrimaryCallState: pendingCallState(),
              settingPrimaryId: attachmentId,
            });
          }),
          switchMap(({ attachmentId }) =>
            service.setPrimary(attachmentId).pipe(
              tapResponse({
                next: (plan: FacilityAttachmentOutput): void => {
                  const previousPrimaryId: string | undefined = store
                    .planEntities()
                    .find((entry) => entry.isPrimaryPlan && entry.id !== plan.id)?.id;

                  patchState(
                    store,
                    ...(previousPrimaryId
                      ? [
                          updateEntity(
                            { id: previousPrimaryId, changes: { isPrimaryPlan: false } },
                            { collection: 'plan' },
                          ),
                        ]
                      : []),
                    setEntity(plan, { collection: 'plan' }),
                    { setPrimaryCallState: successCallState(plan), settingPrimaryId: null },
                  );
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.setPrimarySucceeded(
                      successFeedback(
                        $localize`:@@facility.plans.toast.primarySet:Primary plan updated`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    setPrimaryCallState: errorCallState(storeError),
                    settingPrimaryId: null,
                  });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.setPrimaryFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to set the primary plan'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method remove
       * @method remove
       *
       * @description
       * Deletes one plan, pinned to its revision.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ attachmentId: string; revision: number }>}
       */
      remove: rxMethod<{ attachmentId: string; revision: number }>(
        pipe(
          tap(({ attachmentId }): void => {
            patchState(store, { deleteCallState: pendingCallState(), deletingId: attachmentId });
          }),
          switchMap(({ attachmentId, revision }) =>
            service.remove(attachmentId, revision).pipe(
              tapResponse({
                next: (): void => {
                  patchState(store, removeEntity(attachmentId, { collection: 'plan' }), {
                    deleteCallState: successCallState(null),
                    deletingId: null,
                    selectedPlanId:
                      store.selectedPlanId() === attachmentId ? null : store.selectedPlanId(),
                  });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.deleteSucceeded(
                      successFeedback(
                        $localize`:@@facility.plans.toast.deleted:Floor plan deleted`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    deleteCallState: errorCallState(storeError),
                    deletingId: null,
                  });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.deleteFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to delete floor plan'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method selectPlan
       * @method selectPlan
       *
       * @description
       * Selects the plan shown by the viewer.
       *
       * @since 1.0.0
       *
       * @param {string} planId - The plan to show.
       *
       * @returns {void}
       */
      selectPlan(planId: string): void {
        patchState(store, { selectedPlanId: planId });
      },
    }),
  ),
);

/**
 * Type FacilityPlansStoreType
 * @type FacilityPlansStoreType
 *
 * @description
 * Instance type of the {@link FacilityPlansStore} signal store.
 *
 * @since 1.0.0
 */
export type FacilityPlansStoreType = InstanceType<typeof FacilityPlansStore>;
