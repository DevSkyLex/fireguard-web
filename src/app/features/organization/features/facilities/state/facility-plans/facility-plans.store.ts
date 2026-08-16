import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
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
import {
  FacilityAttachmentService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  FacilityAttachmentOutput,
  FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';
import { facilityPlansStoreEvents } from './events';
import type { FacilityPlansState } from './models';

//#region Initial State
/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 *
 * @description
 * Seeds {@link FacilityPlansState}. Entity state (planEntities,
 * planEntityMap, planIds) is initialised by withEntities.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: FacilityPlansState = {
  listCallState: idleCallState(),
  uploadCallState: idleCallState(),
  setPrimaryCallState: idleCallState(),
  deleteCallState: idleCallState(),
  imageCallState: idleCallState(),
  settingPrimaryId: null,
  deletingId: null,
  selectedPlanId: null,
  planImageUrl: null,
  organizationId: null,
  overlayCallState: idleCallState(),
  overlay: null,
  showZones: true,
  showEquipment: true,
};
//#endregion

/**
 * Store FacilityPlansStore
 * @const FacilityPlansStore
 *
 * @description
 * Component-scoped store for the facility detail page's Plans tab: the
 * floor-plan attachments (kind: 'floor_plan') of one facility, their
 * upload, primary selection and deletion. Provided on the tab, not the
 * route, since the data is secondary content loaded only once the tab opens
 * (ARCHITECTURE.md section 12.4).
 *
 * The selected plan's image bytes are neither in the attachment's output DTO
 * nor reachable from a plain img src: GET
 * /api/facility-attachments/{id}/download is bearer-authenticated and
 * forces Content-Disposition: attachment. withHooks therefore fetches the
 * selected plan's bytes as a Blob whenever selectedPlan changes, and
 * exposes them to app-plan-viewer as a browser object URL (planImageUrl),
 * revoking the previous one on every change and on destroy. Browser-only:
 * URL.createObjectURL has no server counterpart, and the effect never fires
 * during SSR since load (the only way planEntities stops being empty) is
 * itself only ever called from the page once isBrowser is true.
 *
 * The same effect also fetches the selected plan's read-only overlay
 * (zone polygons, equipment pins) via `FacilityService.getPlanOverlay`,
 * exposed to `FacilityPlanOverlay` as `overlay`; `showZones`/`showEquipment`
 * are page-driven visibility toggles for its two layers, both default true.
 *
 * @version 1.2.0
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

    /**
     * Property overlayHasContent
     * @readonly
     *
     * @description
     * Whether the loaded overlay carries at least one zone or one equipment
     * pin — gates the page's toggle chips and the overlay's own chrome so an
     * empty overlay renders no noise.
     *
     * @since 1.2.0
     * @type {Signal<boolean>}
     */
    overlayHasContent: computed<boolean>(() => {
      const overlay: FacilityPlanOverlayOutput | null = store.overlay();

      return overlay !== null && (overlay.zones.length > 0 || overlay.equipment.length > 0);
    }),
  })),

  withMethods(
    (
      store,
      service: FacilityAttachmentService = inject(FacilityAttachmentService),
      facilityService: FacilityService = inject(FacilityService),
      dispatcher: Dispatcher = inject(Dispatcher),
      platformId: object = inject(PLATFORM_ID),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Fetches the facility's floor plans (kind=floor_plan). Cancels any
       * in-flight request via switchMap. Also records `organizationId`,
       * which the overlay fetch needs and has no other way to learn (its
       * own trigger is the `withHooks` effect below, not a page call).
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ facilityId: string; organizationId: string }>}
       */
      load: rxMethod<{ facilityId: string; organizationId: string }>(
        pipe(
          tap(({ organizationId }): void => {
            patchState(store, { listCallState: pendingCallState(), organizationId });
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
       * Uploads one image as a floor plan (kind: 'floor_plan').
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

      /**
       * Method loadImage
       * @method loadImage
       *
       * @description
       * Fetches one plan's binary content (GET
       * /api/facility-attachments/{id}/download) and republishes it as a
       * browser object URL in planImageUrl, revoking whichever object URL
       * was there before. A no-op outside the browser platform, since
       * URL.createObjectURL has no server counterpart.
       *
       * @since 1.1.0
       *
       * @type {RxMethod<{ attachmentId: string }>}
       */
      loadImage: rxMethod<{ attachmentId: string }>(
        pipe(
          tap((): void => {
            patchState(store, { imageCallState: pendingCallState() });
          }),
          switchMap(({ attachmentId }) =>
            service.download(attachmentId).pipe(
              tapResponse({
                next: (blob: Blob): void => {
                  if (!isPlatformBrowser(platformId)) return;

                  const previous: string | null = store.planImageUrl();
                  if (previous) URL.revokeObjectURL(previous);

                  patchState(store, {
                    planImageUrl: URL.createObjectURL(blob),
                    imageCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { imageCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.imageLoadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load the floor plan image'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method loadOverlay
       * @method loadOverlay
       *
       * @description
       * Fetches one plan's read-only zone/equipment overlay
       * (`FacilityService.getPlanOverlay`). Triggered from the same
       * `withHooks` effect as `loadImage`, alongside it, since both are keyed
       * on the selected plan.
       *
       * @since 1.2.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string; attachmentId: string }>}
       */
      loadOverlay: rxMethod<{ organizationId: string; facilityId: string; attachmentId: string }>(
        pipe(
          tap((): void => {
            patchState(store, { overlayCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, facilityId, attachmentId }) =>
            facilityService.getPlanOverlay(organizationId, facilityId, attachmentId).pipe(
              tapResponse({
                next: (overlay: FacilityPlanOverlayOutput): void => {
                  patchState(store, { overlay, overlayCallState: successCallState(null) });
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    overlay: null,
                    overlayCallState: errorCallState(storeError),
                  });
                  dispatcher.dispatch(
                    facilityPlansStoreEvents.overlayLoadFailed(
                      toStoreFailureEventPayload(
                        storeError,
                        'Failed to load the floor plan overlay',
                      ),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method setShowZones
       * @method setShowZones
       *
       * @description Toggles the overlay's zone-polygon layer.
       * @since 1.2.0
       * @param {boolean} value - Whether zones should render.
       * @returns {void}
       */
      setShowZones(value: boolean): void {
        patchState(store, { showZones: value });
      },

      /**
       * Method setShowEquipment
       * @method setShowEquipment
       *
       * @description Toggles the overlay's equipment-pin layer.
       * @since 1.2.0
       * @param {boolean} value - Whether equipment pins should render.
       * @returns {void}
       */
      setShowEquipment(value: boolean): void {
        patchState(store, { showEquipment: value });
      },
    }),
  ),

  withHooks((store) => {
    let previousSelectedId: string | null = null;

    return {
      /**
       * Reacts to `selectedPlan` changes by fetching that plan's image bytes
       * (republished as an object URL, revoking whichever preceded it) and
       * its read-only overlay, keyed on the same selection.
       */
      onInit(): void {
        effect((): void => {
          const selected: FacilityAttachmentOutput | null = store.selectedPlan();
          const nextId: string | null = selected?.id ?? null;
          if (nextId === previousSelectedId) return;

          previousSelectedId = nextId;
          untracked((): void => {
            if (nextId && selected) {
              store.loadImage({ attachmentId: nextId });

              const organizationId: string | null = store.organizationId();
              if (organizationId) {
                store.loadOverlay({
                  organizationId,
                  facilityId: selected.facilityId,
                  attachmentId: nextId,
                });
              }

              return;
            }

            const previous: string | null = store.planImageUrl();
            if (previous) URL.revokeObjectURL(previous);
            patchState(store, {
              planImageUrl: null,
              imageCallState: idleCallState(),
              overlay: null,
              overlayCallState: idleCallState(),
            });
          });
        });
      },
      /** Revokes the last live object URL so the store never leaks one. */
      onDestroy(): void {
        const url: string | null = store.planImageUrl();
        if (url) URL.revokeObjectURL(url);
      },
    };
  }),
);

/**
 * Type FacilityPlansStoreType
 * @type FacilityPlansStoreType
 *
 * @description
 * Instance type of the FacilityPlansStore signal store.
 *
 * @since 1.0.0
 */
export type FacilityPlansStoreType = InstanceType<typeof FacilityPlansStore>;
