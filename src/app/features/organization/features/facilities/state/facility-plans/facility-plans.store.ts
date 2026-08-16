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
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  errorFeedback,
  idleCallState,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import {
  FacilityAttachmentService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  FacilityAttachmentOutput,
  FacilityOutput,
  FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';
import { facilityPlansStoreEvents } from './events';
import type { FacilityPlansState } from './models';

/** Facility types eligible as a `draw-zone` target — a zone outline is drawn for a zone or an area. */
const ZONE_CANDIDATE_TYPES: ReadonlySet<string> = new Set(['zone', 'area']);

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
  facilityId: null,
  overlayCallState: idleCallState(),
  overlay: null,
  showZones: true,
  showEquipment: true,
  editMode: 'none',
  drawTargetFacilityId: null,
  draftPoints: [],
  placeEquipmentId: null,
  saveZoneGeometryCallState: idleCallState(),
  savePinPositionCallState: idleCallState(),
  zoneCandidates: [],
  zoneCandidatesCallState: idleCallState(),
  facilityEquipment: [],
  facilityEquipmentCallState: idleCallState(),
};
//#endregion

/**
 * Store FacilityPlansStore
 * @const FacilityPlansStore
 *
 * @description
 * Component-scoped store for the facility detail page's Plans tab: the
 * floor-plan attachments (kind: 'floor_plan') of one facility, their
 * upload, primary selection and deletion, plus the zone/equipment overlay —
 * both its read side (zone polygons, equipment pins) and its editor half
 * (drawing a zone outline, placing/moving/removing an equipment pin).
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
 * The same effect also fetches the selected plan's overlay via
 * `FacilityService.getPlanOverlay`, re-triggered after a successful editor
 * write so the overlay reflects the change without a page reload.
 * `showZones`/`showEquipment` are page-driven visibility toggles for its two
 * layers, both default true.
 *
 * The editor half drives `FacilityPlanEditor`'s pointer affordances and the
 * two coordinate-editing dialogs: `editMode`/`draftPoints` track an
 * in-progress `draw-zone` outline; `saveZoneGeometry`/`savePinPosition`
 * write through `FacilityService.setPlanGeometry` /
 * `EquipmentService.setPlanPosition`. `EquipmentService` is injected
 * directly — the same cross-feature dependency `FacilityOverviewStore`
 * already takes on the `equipments` subfeature's data-access — since
 * equipment placement is organization-scoped equipment data, not facility
 * data.
 *
 * @version 1.4.0
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

    /** True while a zone outline write (draw finish or clear) is in flight. */
    isSavingZoneGeometry: computed<boolean>(
      () => store.saveZoneGeometryCallState().status === 'pending',
    ),

    /** True while an equipment pin write (place, drag-move, or remove) is in flight. */
    isSavingPinPosition: computed<boolean>(
      () => store.savePinPositionCallState().status === 'pending',
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

    /**
     * Property availableZoneCandidates
     * @readonly
     *
     * @description
     * `zoneCandidates` narrowed to those the selected plan's overlay does
     * not already show as a zone — the `draw-zone` picker's option list.
     *
     * @since 1.4.0
     * @type {Signal<ReadonlyArray<FacilityOutput>>}
     */
    availableZoneCandidates: computed<ReadonlyArray<FacilityOutput>>(() => {
      const drawnIds: ReadonlySet<string> = new Set(
        (store.overlay()?.zones ?? []).map((zone) => zone.facilityId),
      );

      return store.zoneCandidates().filter((candidate) => !drawnIds.has(candidate.id));
    }),

    /**
     * Property availableEquipmentCandidates
     * @readonly
     *
     * @description
     * `facilityEquipment` narrowed to those the selected plan's overlay does
     * not already show as a pin — the `place-pin` picker's option list.
     *
     * @since 1.4.0
     * @type {Signal<ReadonlyArray<EquipmentOutput>>}
     */
    availableEquipmentCandidates: computed<ReadonlyArray<EquipmentOutput>>(() => {
      const pinnedIds: ReadonlySet<string> = new Set(
        (store.overlay()?.equipment ?? []).map((pin) => pin.equipmentId),
      );

      return store.facilityEquipment().filter((candidate) => !pinnedIds.has(candidate.id));
    }),
  })),

  withMethods(
    (
      store,
      service: FacilityAttachmentService = inject(FacilityAttachmentService),
      facilityService: FacilityService = inject(FacilityService),
      equipmentService: EquipmentService = inject(EquipmentService),
      dispatcher: Dispatcher = inject(Dispatcher),
      platformId: object = inject(PLATFORM_ID),
    ) => {
      /**
       * Constant loadOverlayFn
       * @const loadOverlayFn
       *
       * @description
       * Shared rxMethod implementation fetching the selected plan's overlay.
       * Exposed as {@link loadOverlay} and called internally by
       * {@link saveZoneGeometryFn}/{@link savePinPositionFn} on a successful
       * write so the overlay reflects it without a page reload.
       *
       * @since 1.4.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string; attachmentId: string }>}
       */
      const loadOverlayFn = rxMethod<{
        organizationId: string;
        facilityId: string;
        attachmentId: string;
      }>(
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
      );

      /**
       * Constant loadZoneCandidatesFn
       * @const loadZoneCandidatesFn
       *
       * @description
       * Fetches this facility's direct children of type `zone`/`area`
       * (`draw-zone`'s picker options). Exposed as
       * {@link ensureZoneCandidatesLoaded}, guarded against duplicate fetches.
       *
       * @since 1.4.0
       *
       * @type {RxMethod<void>}
       */
      const loadZoneCandidatesFn = rxMethod<void>(
        pipe(
          tap((): void => {
            patchState(store, { zoneCandidatesCallState: pendingCallState() });
          }),
          switchMap(() => {
            const organizationId: string | null = store.organizationId();
            const facilityId: string | null = store.facilityId();
            if (!organizationId || !facilityId) return EMPTY;

            return facilityService.listChildren(organizationId, facilityId, {
              itemsPerPage: 200,
            });
          }),
          tapResponse({
            next: (response: HydraCollection<FacilityOutput>): void => {
              patchState(store, {
                zoneCandidates: response.member.filter((candidate) =>
                  ZONE_CANDIDATE_TYPES.has(candidate.type),
                ),
                zoneCandidatesCallState: successCallState(null),
              });
            },
            error: (error: unknown): void => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { zoneCandidatesCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                facilityPlansStoreEvents.zoneCandidatesFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load candidate zones'),
                ),
              );
            },
          }),
        ),
      );

      /**
       * Constant loadFacilityEquipmentFn
       * @const loadFacilityEquipmentFn
       *
       * @description
       * Fetches this facility's assigned equipment (`place-pin`'s picker
       * options, and the source for each pin's dialog rows). Exposed as
       * {@link ensureFacilityEquipmentLoaded}, guarded against duplicate
       * fetches.
       *
       * @since 1.4.0
       *
       * @type {RxMethod<void>}
       */
      const loadFacilityEquipmentFn = rxMethod<void>(
        pipe(
          tap((): void => {
            patchState(store, { facilityEquipmentCallState: pendingCallState() });
          }),
          switchMap(() => {
            const organizationId: string | null = store.organizationId();
            const facilityId: string | null = store.facilityId();
            if (!organizationId || !facilityId) return EMPTY;

            return equipmentService.listByFacility(organizationId, facilityId, {
              itemsPerPage: 200,
            });
          }),
          tapResponse({
            next: (response: HydraCollection<EquipmentOutput>): void => {
              patchState(store, {
                facilityEquipment: [...response.member],
                facilityEquipmentCallState: successCallState(null),
              });
            },
            error: (error: unknown): void => {
              const storeError: StoreError = toStoreError(error);
              patchState(store, { facilityEquipmentCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                facilityPlansStoreEvents.facilityEquipmentFailed(
                  toStoreFailureEventPayload(
                    storeError,
                    "Failed to load this facility's equipment",
                  ),
                ),
              );
            },
          }),
        ),
      );

      /**
       * Constant saveZoneGeometryFn
       * @const saveZoneGeometryFn
       *
       * @description
       * Shared rxMethod implementation writing (or clearing, when `points`
       * is `null`) one facility's outline on the selected plan. On success,
       * leaves `draw-zone` mode (a no-op when called from the dialog or the
       * clear action), invalidates the cached candidate lists so they
       * re-fetch on next open, and reloads the overlay. A 409 is reworded
       * into the ancestry constraint the backend enforces, since its own
       * `detail` is written for logs, not necessarily for a member.
       *
       * @since 1.4.0
       *
       * @type {RxMethod<{ organizationId: string; facilityId: string; attachmentId: string | null; points: ReadonlyArray<readonly [number, number]> | null }>}
       */
      const saveZoneGeometryFn = rxMethod<{
        organizationId: string;
        facilityId: string;
        attachmentId: string | null;
        points: ReadonlyArray<readonly [number, number]> | null;
      }>(
        pipe(
          tap((): void => {
            patchState(store, { saveZoneGeometryCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, facilityId, attachmentId, points }) =>
            facilityService
              .setPlanGeometry(organizationId, facilityId, { attachmentId, points })
              .pipe(
                tapResponse({
                  next: (): void => {
                    patchState(store, {
                      saveZoneGeometryCallState: successCallState(null),
                      editMode: 'none',
                      drawTargetFacilityId: null,
                      draftPoints: [],
                      zoneCandidatesCallState: idleCallState(),
                    });
                    dispatcher.dispatch(
                      facilityPlansStoreEvents.zoneGeometrySaveSucceeded(
                        successFeedback(
                          points === null
                            ? $localize`:@@facility.plans.editor.toast.zoneCleared:Zone outline cleared`
                            : $localize`:@@facility.plans.editor.toast.zoneSaved:Zone outline saved`,
                        ),
                      ),
                    );

                    const currentFacilityId: string | null = store.facilityId();
                    const plan: FacilityAttachmentOutput | null = store.selectedPlan();
                    if (currentFacilityId && plan) {
                      loadOverlayFn({
                        organizationId,
                        facilityId: currentFacilityId,
                        attachmentId: plan.id,
                      });
                    }
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { saveZoneGeometryCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      facilityPlansStoreEvents.zoneGeometrySaveFailed(
                        errorFeedback(
                          storeError.code === 409
                            ? $localize`:@@facility.plans.editor.error.zoneConflict:This floor plan is not part of this zone's facility ancestry.`
                            : (storeError.message ??
                                $localize`:@@facility.plans.editor.error.zoneSaveFailed:Failed to save the zone outline`),
                          {
                            code: storeError.code,
                            retryable: storeError.retryable,
                            timestamp: storeError.timestamp,
                          },
                        ),
                      ),
                    );
                  },
                }),
              ),
          ),
        ),
      );

      /**
       * Constant savePinPositionFn
       * @const savePinPositionFn
       *
       * @description
       * Shared rxMethod implementation writing (or clearing, when `x`/`y`
       * are `null`) one equipment item's pin on the selected plan. On
       * success, leaves `place-pin` mode when `exitPlaceMode` is set,
       * invalidates the cached equipment candidates, and reloads the
       * overlay. A 409 is reworded into the assignment constraint the
       * backend enforces.
       *
       * @since 1.4.0
       *
       * @type {RxMethod<{ organizationId: string; equipmentId: string; attachmentId: string | null; x: number | null; y: number | null; exitPlaceMode: boolean }>}
       */
      const savePinPositionFn = rxMethod<{
        organizationId: string;
        equipmentId: string;
        attachmentId: string | null;
        x: number | null;
        y: number | null;
        exitPlaceMode: boolean;
      }>(
        pipe(
          tap((): void => {
            patchState(store, { savePinPositionCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, equipmentId, attachmentId, x, y, exitPlaceMode }) =>
            equipmentService
              .setPlanPosition(organizationId, equipmentId, { attachmentId, x, y })
              .pipe(
                tapResponse({
                  next: (): void => {
                    patchState(store, {
                      savePinPositionCallState: successCallState(null),
                      ...(exitPlaceMode
                        ? { editMode: 'none' as const, placeEquipmentId: null }
                        : {}),
                      facilityEquipmentCallState: idleCallState(),
                    });
                    dispatcher.dispatch(
                      facilityPlansStoreEvents.pinPositionSaveSucceeded(
                        successFeedback(
                          attachmentId === null
                            ? $localize`:@@facility.plans.editor.toast.pinRemoved:Equipment removed from plan`
                            : $localize`:@@facility.plans.editor.toast.pinSaved:Equipment position saved`,
                        ),
                      ),
                    );

                    const currentFacilityId: string | null = store.facilityId();
                    const plan: FacilityAttachmentOutput | null = store.selectedPlan();
                    if (currentFacilityId && plan) {
                      loadOverlayFn({
                        organizationId,
                        facilityId: currentFacilityId,
                        attachmentId: plan.id,
                      });
                    }
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { savePinPositionCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      facilityPlansStoreEvents.pinPositionSaveFailed(
                        errorFeedback(
                          storeError.code === 409
                            ? $localize`:@@facility.plans.editor.error.pinConflict:This equipment is not assigned to a facility.`
                            : (storeError.message ??
                                $localize`:@@facility.plans.editor.error.pinSaveFailed:Failed to save the equipment position`),
                          {
                            code: storeError.code,
                            retryable: storeError.retryable,
                            timestamp: storeError.timestamp,
                          },
                        ),
                      ),
                    );
                  },
                }),
              ),
          ),
        ),
      );

      return {
        // ── Plans ──────────────────────────────────────────────────────────────

        /**
         * Method load
         * @method load
         *
         * @description
         * Fetches the facility's floor plans (kind=floor_plan). Cancels any
         * in-flight request via switchMap. Also records `organizationId` and
         * `facilityId`, which the overlay fetch and the editor's candidate
         * fetches need and have no other way to learn (their own triggers
         * are internal, not a page call that could pass them directly).
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ facilityId: string; organizationId: string }>}
         */
        load: rxMethod<{ facilityId: string; organizationId: string }>(
          pipe(
            tap(({ organizationId, facilityId }): void => {
              patchState(store, {
                listCallState: pendingCallState(),
                organizationId,
                facilityId,
              });
            }),
            switchMap(({ facilityId }) =>
              service.list(facilityId, 'floor_plan').pipe(
                tapResponse({
                  next: (response: HydraCollection<FacilityAttachmentOutput>): void => {
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'plan' }),
                      { listCallState: successCallState(null) },
                    );
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
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to load the floor plan image',
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
         * Method loadOverlay
         * @method loadOverlay
         *
         * @description Fetches one plan's zone/equipment overlay. See {@link loadOverlayFn}.
         * @since 1.2.0
         * @type {RxMethod<{ organizationId: string; facilityId: string; attachmentId: string }>}
         */
        loadOverlay: loadOverlayFn,

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

        // ── Editor: candidate lists ──────────────────────────────────────────────

        /**
         * Method ensureZoneCandidatesLoaded
         * @method ensureZoneCandidatesLoaded
         *
         * @description
         * Loads this facility's direct children of type `zone`/`area`
         * (`draw-zone`'s picker options) once, browser-only, guarded against a
         * duplicate fetch on repeated opens of the picker.
         *
         * @since 1.4.0
         * @returns {void}
         */
        ensureZoneCandidatesLoaded(): void {
          if (!isPlatformBrowser(platformId)) return;

          const callState = store.zoneCandidatesCallState();
          if (callState.status === 'pending' || callState.status === 'success') return;

          loadZoneCandidatesFn();
        },

        /**
         * Method ensureFacilityEquipmentLoaded
         * @method ensureFacilityEquipmentLoaded
         *
         * @description
         * Loads this facility's assigned equipment (`place-pin`'s picker
         * options, and the source for each pin's dialog rows) once,
         * browser-only, guarded against a duplicate fetch.
         *
         * @since 1.4.0
         * @returns {void}
         */
        ensureFacilityEquipmentLoaded(): void {
          if (!isPlatformBrowser(platformId)) return;

          const callState = store.facilityEquipmentCallState();
          if (callState.status === 'pending' || callState.status === 'success') return;

          loadFacilityEquipmentFn();
        },

        // ── Editor: mode and draft ───────────────────────────────────────────────

        /**
         * Method enterDrawZoneMode
         * @method enterDrawZoneMode
         *
         * @description Starts drawing a new outline for the given child facility.
         * @since 1.4.0
         * @param {string} targetFacilityId - The zone/area the outline belongs to.
         * @returns {void}
         */
        enterDrawZoneMode(targetFacilityId: string): void {
          patchState(store, {
            editMode: 'draw-zone',
            drawTargetFacilityId: targetFacilityId,
            placeEquipmentId: null,
            draftPoints: [],
          });
        },

        /**
         * Method enterPlacePinMode
         * @method enterPlacePinMode
         *
         * @description Starts placing the given equipment item on the plan.
         * @since 1.4.0
         * @param {string} equipmentId - The equipment to place.
         * @returns {void}
         */
        enterPlacePinMode(equipmentId: string): void {
          patchState(store, {
            editMode: 'place-pin',
            placeEquipmentId: equipmentId,
            drawTargetFacilityId: null,
            draftPoints: [],
          });
        },

        /**
         * Method cancelEditing
         * @method cancelEditing
         *
         * @description Leaves `draw-zone`/`place-pin` mode, discarding any in-progress draft.
         * @since 1.4.0
         * @returns {void}
         */
        cancelEditing(): void {
          patchState(store, {
            editMode: 'none',
            drawTargetFacilityId: null,
            placeEquipmentId: null,
            draftPoints: [],
          });
        },

        /**
         * Method addDraftVertex
         * @method addDraftVertex
         *
         * @description Appends a vertex to the in-progress `draw-zone` outline.
         * @since 1.4.0
         * @param {readonly [number, number]} point - The vertex, in normalized `[0, 1]` image coordinates.
         * @returns {void}
         */
        addDraftVertex(point: readonly [number, number]): void {
          if (store.editMode() !== 'draw-zone') return;

          patchState(store, { draftPoints: [...store.draftPoints(), point] });
        },

        /**
         * Method undoDraftVertex
         * @method undoDraftVertex
         *
         * @description Removes the last vertex of the in-progress `draw-zone` outline, if any.
         * @since 1.4.0
         * @returns {void}
         */
        undoDraftVertex(): void {
          patchState(store, { draftPoints: store.draftPoints().slice(0, -1) });
        },

        // ── Editor: writes ────────────────────────────────────────────────────────

        /**
         * Method finishDrawZone
         * @method finishDrawZone
         *
         * @description
         * Submits the in-progress outline (at least three vertices required) as
         * the draw target facility's geometry on the selected plan. A no-op
         * outside `draw-zone` mode or below the vertex minimum.
         *
         * @since 1.4.0
         * @returns {void}
         */
        finishDrawZone(): void {
          const organizationId: string | null = store.organizationId();
          const facilityId: string | null = store.drawTargetFacilityId();
          const plan: FacilityAttachmentOutput | null = store.selectedPlan();
          const points: ReadonlyArray<readonly [number, number]> = store.draftPoints();
          if (!organizationId || !facilityId || !plan || points.length < 3) return;

          saveZoneGeometryFn({ organizationId, facilityId, attachmentId: plan.id, points });
        },

        /**
         * Method clearZoneGeometry
         * @method clearZoneGeometry
         *
         * @description Clears an existing zone's outline (the "Clear geometry" action in its edit dialog).
         * @since 1.4.0
         * @param {string} facilityId - The zone to clear.
         * @returns {void}
         */
        clearZoneGeometry(facilityId: string): void {
          const organizationId: string | null = store.organizationId();
          if (!organizationId) return;

          saveZoneGeometryFn({ organizationId, facilityId, attachmentId: null, points: null });
        },

        /**
         * Method saveZoneGeometryFromDialog
         * @method saveZoneGeometryFromDialog
         *
         * @description The non-pointer "Edit coordinates" dialog's submit path.
         * @since 1.4.0
         * @param {string} facilityId - The zone whose outline is written.
         * @param {ReadonlyArray<readonly [number, number]>} points - The submitted vertices.
         * @returns {void}
         */
        saveZoneGeometryFromDialog(
          facilityId: string,
          points: ReadonlyArray<readonly [number, number]>,
        ): void {
          const organizationId: string | null = store.organizationId();
          const plan: FacilityAttachmentOutput | null = store.selectedPlan();
          if (!organizationId || !plan || points.length < 3) return;

          saveZoneGeometryFn({ organizationId, facilityId, attachmentId: plan.id, points });
        },

        /**
         * Method placePin
         * @method placePin
         *
         * @description
         * Places the `place-pin` mode's equipment at the given point. A
         * no-op outside `place-pin` mode.
         *
         * @since 1.4.0
         * @param {readonly [number, number]} point - The pin's position, in normalized `[0, 1]` image coordinates.
         * @returns {void}
         */
        placePin(point: readonly [number, number]): void {
          const organizationId: string | null = store.organizationId();
          const equipmentId: string | null = store.placeEquipmentId();
          const plan: FacilityAttachmentOutput | null = store.selectedPlan();
          if (!organizationId || !equipmentId || !plan) return;

          savePinPositionFn({
            organizationId,
            equipmentId,
            attachmentId: plan.id,
            x: point[0],
            y: point[1],
            exitPlaceMode: true,
          });
        },

        /**
         * Method movePin
         * @method movePin
         *
         * @description Moves an already-placed pin (drag-and-drop), independent of `editMode`.
         * @since 1.4.0
         * @param {string} equipmentId - The pin's equipment id.
         * @param {readonly [number, number]} point - The pin's new position, in normalized `[0, 1]` image coordinates.
         * @returns {void}
         */
        movePin(equipmentId: string, point: readonly [number, number]): void {
          const organizationId: string | null = store.organizationId();
          const plan: FacilityAttachmentOutput | null = store.selectedPlan();
          if (!organizationId || !plan) return;

          savePinPositionFn({
            organizationId,
            equipmentId,
            attachmentId: plan.id,
            x: point[0],
            y: point[1],
            exitPlaceMode: false,
          });
        },

        /**
         * Method removePinFromPlan
         * @method removePinFromPlan
         *
         * @description Clears an equipment item's pin (the "Remove from plan" action).
         * @since 1.4.0
         * @param {string} equipmentId - The pin's equipment id.
         * @returns {void}
         */
        removePinFromPlan(equipmentId: string): void {
          const organizationId: string | null = store.organizationId();
          if (!organizationId) return;

          savePinPositionFn({
            organizationId,
            equipmentId,
            attachmentId: null,
            x: null,
            y: null,
            exitPlaceMode: false,
          });
        },
      };
    },
  ),

  withHooks((store) => {
    let previousSelectedId: string | null = null;

    return {
      /**
       * Reacts to `selectedPlan` changes by fetching that plan's image bytes
       * (republished as an object URL, revoking whichever preceded it) and
       * its overlay, keyed on the same selection.
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
