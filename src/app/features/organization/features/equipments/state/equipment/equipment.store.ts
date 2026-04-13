import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import type { RequestOptions } from '@core/services/hydra-api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentOutput,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  AssignToFacilityInput,
  EquipmentAttachmentOutput,
  AddAttachmentInput,
  EquipmentTagOutput,
  AddTagInput,
} from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '../active-equipment/active-equipment.store';
import type { EquipmentState } from './equipment-state.interface';
import { equipmentStoreEvents } from './equipment.events';

//#region Initial State
/**
 * Constant INITIAL_EQUIPMENT_STATE
 * @const INITIAL_EQUIPMENT_STATE
 *
 * @description
 * Initial state for the EquipmentStore. Entity state (`equipmentEntities`,
 * `equipmentEntityMap`, `equipmentIds`) is initialised by `withEntities`.
 * This constant only seeds the auxiliary state managed in `EquipmentState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_EQUIPMENT_STATE: EquipmentState = {
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  totalEquipment: 0,
  listCallState: idleCallState(),
  assignToFacilityCallState: idleCallState(),
  unassignFromFacilityCallState: idleCallState(),
  commissionCallState: idleCallState(),
  decommissionCallState: idleCallState(),
  maintenanceCallState: idleCallState(),
  totalAttachments: 0,
  attachmentsListCallState: idleCallState(),
  addAttachmentCallState: idleCallState(),
  deleteAttachmentCallState: idleCallState(),
  totalTags: 0,
  tagsListCallState: idleCallState(),
  addTagCallState: idleCallState(),
  removeTagCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store EquipmentStore
 * @const EquipmentStore
 *
 * @description
 * Component-scoped NgRx SignalStore for equipment list management, CRUD,
 * lifecycle transitions, attachments and tags.
 * Designed to be provided at **component level** (no `providedIn: 'root'`), so
 * each consumer gets an independent instance tied to its own lifecycle.
 *
 * Entity state is managed by `withEntities<EquipmentOutput>({ collection:
 * 'equipment' })`, which provides O(1) lookups via `equipmentEntityMap`
 * and keeps insertions/deletions efficient via normalized storage.
 *
 * For reading the currently active/selected equipment use the root-level
 * {@link ActiveEquipmentStore} instead.
 *
 * @example
 * ```typescript
 * @Component({ providers: [EquipmentStore] })
 * export class EquipmentListPage {
 *   readonly store = inject(EquipmentStore);
 * }
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const EquipmentStore = signalStore(
  //#region Features
  /**
   * Feature withEntities
   *
   * @description
   * Adds NgRx entity state and entity-adapter updater functions for
   * `EquipmentOutput`, `EquipmentAttachmentOutput`, and `EquipmentTagOutput`
   * objects keyed by their `id` field.
   *
   * @since 2.0.0
   *
   * @returns {object} Entity state slices and updater helpers.
   */
  withEntities({ entity: type<EquipmentOutput>(), collection: 'equipment' }),
  withEntities({ entity: type<EquipmentAttachmentOutput>(), collection: 'attachment' }),
  withEntities({ entity: type<EquipmentTagOutput>(), collection: 'tag' }),

  /**
   * Feature withState
   *
   * @description
   * Adds auxiliary state to the store. Entity state is handled separately by
   * `withEntities`.
   *
   * @since 1.0.0
   *
   * @returns {object} The initial auxiliary state for the equipment store.
   */
  withState<EquipmentState>(INITIAL_EQUIPMENT_STATE),

  /**
   * Feature withComputed
   *
   * @description
   * Adds computed properties to the store for common derived state
   * related to the equipment list and its operations.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the computed properties will be added.
   *
   * @returns {object} An object containing the computed properties to add to the store.
   */
  withComputed((store) => {
    /**
     * Constant activeEquipmentStore
     * @const activeEquipmentStore
     *
     * @description
     * The root-level store that tracks the currently active equipment and
     * its associated loading state.
     *
     * @type {ActiveEquipmentStore} The injected ActiveEquipmentStore instance.
     */
    const activeEquipmentStore: ActiveEquipmentStore =
      inject<ActiveEquipmentStore>(ActiveEquipmentStore);

    return {
      /**
       * Property equipmentList
       *
       * @description
       * All cached equipment from the entity collection, in insertion order.
       * Reads from `equipmentEntities` provided by `withEntities`.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<EquipmentOutput>} The current page of equipment.
       */
      equipmentList: computed<ReadonlyArray<EquipmentOutput>>(() => store.equipmentEntities()),

      /**
       * Property attachments
       *
       * @description
       * All cached attachments from the entity collection.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<EquipmentAttachmentOutput>}
       */
      attachments: computed<ReadonlyArray<EquipmentAttachmentOutput>>(() =>
        store.attachmentEntities(),
      ),

      /**
       * Property tags
       *
       * @description
       * All cached tags from the entity collection.
       *
       * @since 1.0.0
       *
       * @type {ReadonlyArray<EquipmentTagOutput>}
       */
      tags: computed<ReadonlyArray<EquipmentTagOutput>>(() => store.tagEntities()),

      /**
       * Property isEmpty
       *
       * @description
       * True when the entity collection is empty and no list request is
       * currently in-flight.
       *
       * @since 2.0.0
       *
       * @type {boolean}
       */
      isEmpty: computed<boolean>(
        () => store.equipmentIds().length === 0 && store.listCallState().status !== 'pending',
      ),

      /**
       * Property selectedEquipment
       *
       * @description
       * Proxied from {@link ActiveEquipmentStore} so consumers can read
       * the currently active equipment without an extra injection.
       *
       * @since 1.0.0
       *
       * @type {EquipmentOutput | null}
       */
      selectedEquipment: computed<EquipmentOutput | null>(() =>
        activeEquipmentStore.selectedEquipment(),
      ),

      /**
       * Property isLoadingEquipment
       *
       * @description
       * Alias for `isLoading()` — matches naming used in templates.
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isLoadingEquipment: computed<boolean>(() => store.listCallState().status === 'pending'),

      /**
       * Property isLoadingEquipmentDetail
       *
       * @description
       * Proxied from {@link ActiveEquipmentStore} — true while the
       * equipment is being resolved (e.g., by the route resolver).
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isLoadingEquipmentDetail: computed<boolean>(() => activeEquipmentStore.isLoadingEquipment()),

      /**
       * Property isCreating
       *
       * @description
       * True while a create operation is in-flight.
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),

      /**
       * Property isUpdating
       *
       * @description
       * True while an update operation is in-flight.
       *
       * @since 1.0.0
       *
       * @type {boolean}
       */
      isUpdating: computed<boolean>(() => store.updateCallState().status === 'pending'),

      /**
       * Property createError
       *
       * @description
       * Error from the last create operation, if any.
       *
       * @since 1.0.0
       *
       * @type {StoreError | null}
       */
      createError: computed<StoreError | null>(() => store.createCallState().error),
    };
  }),

  /**
   * Feature withMethods
   *
   * @description
   * Adds methods to the store for managing the equipment list, including
   * loading a paginated list, creating, updating, lifecycle transitions,
   * attachments, tags, and resetting operations.
   *
   * @since 1.0.0
   *
   * @param {SignalStore} store - The store instance to which the methods will be added.
   * @param {ActiveEquipmentStore} activeEquipmentStore - The root store tracking the currently active equipment.
   * @param {Dispatcher} dispatcher - The NgRx Signals event dispatcher, used to dispatch events on errors.
   * @param {EquipmentService} equipmentService - The service used to interact with the equipment API.
   *
   * @returns {object} An object containing the methods to add to the store.
   */
  //#region Methods
  withMethods(
    (
      store,
      activeEquipmentStore: ActiveEquipmentStore = inject<ActiveEquipmentStore>(
        ActiveEquipmentStore,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService),
    ) => {
      /**
       * Constant loadFn
       * @const loadFn
       *
       * @description
       * Shared rxMethod implementation for loading a paginated equipment list.
       * Uses `switchMap` so that a new request cancels any previous in-flight one.
       * Exposed under two names: {@link load} (table / generic usage) and
       * {@link loadEquipment} (page usage).
       *
       * @since 2.0.0
       *
       * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
       */
      const loadFn = rxMethod<{ organizationId: string; options?: RequestOptions }>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, options }) =>
            equipmentService.list(organizationId, options).pipe(
              tapResponse({
                next: (response: HydraCollection<EquipmentOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'equipment' }),
                    {
                      totalEquipment: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    equipmentStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load equipment'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      );

      return {
        // ── Equipment List ─────────────────────────────────────────────────────

        /**
         * Method load
         * @method load
         *
         * @description
         * Fetches one page of equipment from the API. Cancels any in-flight
         * request via `switchMap`. Alias: {@link loadEquipment}.
         *
         * @since 2.0.0
         *
         * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
         */
        load: loadFn,

        /**
         * Method loadEquipment
         * @method loadEquipment
         *
         * @description
         * Alias for {@link load} — kept for backward-compatibility.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
         */
        loadEquipment: loadFn,

        // ── Equipment CRUD ─────────────────────────────────────────────────────

        /**
         * Method create
         * @method create
         *
         * @description
         * Creates a new equipment via the API. Uses `exhaustMap` to prevent
         * concurrent submissions. On success the `createOperation` transitions
         * to a success state carrying the newly created entity.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; input: CreateEquipmentInput }>}
         */
        create: rxMethod<{ organizationId: string; input: CreateEquipmentInput }>(
          pipe(
            tap((): void => {
              patchState(store, { createCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, input }) =>
              equipmentService.create(organizationId, input).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, addEntity(equipment, { collection: 'equipment' }), {
                      totalEquipment: store.totalEquipment() + 1,
                      createCallState: successCallState(equipment),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { createCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.createFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to create equipment'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method update
         * @method update
         *
         * @description
         * Updates an existing equipment via the API. Uses `exhaustMap` to prevent
         * concurrent submissions. On success, updates the entity in the collection
         * and synchronises the {@link ActiveEquipmentStore} if the updated entity
         * is the currently active one.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; input: UpdateEquipmentInput }>}
         */
        update: rxMethod<{
          organizationId: string;
          equipmentId: string;
          input: UpdateEquipmentInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { updateCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId, input }) =>
              equipmentService.update(organizationId, equipmentId, input).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, setEntity(equipment, { collection: 'equipment' }), {
                      updateCallState: successCallState(equipment),
                    });
                    activeEquipmentStore.setEquipment(equipment);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { updateCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.updateFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to update equipment'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Lifecycle ──────────────────────────────────────────────────────────

        /**
         * Method assignToFacility
         * @method assignToFacility
         *
         * @description
         * Assigns an equipment to a facility. Uses `exhaustMap` to prevent
         * concurrent submissions. On success, updates the entity in the
         * collection and synchronises the {@link ActiveEquipmentStore}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; input: AssignToFacilityInput }>}
         */
        assignToFacility: rxMethod<{
          organizationId: string;
          equipmentId: string;
          input: AssignToFacilityInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { assignToFacilityCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId, input }) =>
              equipmentService.assignToFacility(organizationId, equipmentId, input).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, setEntity(equipment, { collection: 'equipment' }), {
                      assignToFacilityCallState: successCallState(equipment),
                    });
                    activeEquipmentStore.setEquipment(equipment);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { assignToFacilityCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.assignToFacilityFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to assign equipment to facility',
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
         * Method unassignFromFacility
         * @method unassignFromFacility
         *
         * @description
         * Removes a facility assignment from an equipment. Uses `exhaustMap`
         * to prevent concurrent submissions. On success, updates the entity
         * in the collection and synchronises the {@link ActiveEquipmentStore}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string }>}
         */
        unassignFromFacility: rxMethod<{ organizationId: string; equipmentId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { unassignFromFacilityCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId }) =>
              equipmentService.unassignFromFacility(organizationId, equipmentId).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, setEntity(equipment, { collection: 'equipment' }), {
                      unassignFromFacilityCallState: successCallState(equipment),
                    });
                    activeEquipmentStore.setEquipment(equipment);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      unassignFromFacilityCallState: errorCallState(storeError),
                    });
                    dispatcher.dispatch(
                      equipmentStoreEvents.unassignFromFacilityFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to unassign equipment from facility',
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
         * Method commission
         * @method commission
         *
         * @description
         * Commissions an equipment. Uses `exhaustMap` to prevent
         * concurrent submissions. On success, updates the entity
         * in the collection and synchronises the {@link ActiveEquipmentStore}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string }>}
         */
        commission: rxMethod<{ organizationId: string; equipmentId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { commissionCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId }) =>
              equipmentService.commission(organizationId, equipmentId).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, setEntity(equipment, { collection: 'equipment' }), {
                      commissionCallState: successCallState(equipment),
                    });
                    activeEquipmentStore.setEquipment(equipment);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { commissionCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.commissionFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to commission equipment'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method decommission
         * @method decommission
         *
         * @description
         * Decommissions an equipment. Uses `exhaustMap` to prevent
         * concurrent submissions. On success, updates the entity
         * in the collection and synchronises the {@link ActiveEquipmentStore}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string }>}
         */
        decommission: rxMethod<{ organizationId: string; equipmentId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { decommissionCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId }) =>
              equipmentService.decommission(organizationId, equipmentId).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, setEntity(equipment, { collection: 'equipment' }), {
                      decommissionCallState: successCallState(equipment),
                    });
                    activeEquipmentStore.setEquipment(equipment);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { decommissionCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.decommissionFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to decommission equipment'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method maintenance
         * @method maintenance
         *
         * @description
         * Sets an equipment to maintenance mode. Uses `exhaustMap` to prevent
         * concurrent submissions. On success, updates the entity
         * in the collection and synchronises the {@link ActiveEquipmentStore}.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string }>}
         */
        maintenance: rxMethod<{ organizationId: string; equipmentId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { maintenanceCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId }) =>
              equipmentService.maintenance(organizationId, equipmentId).pipe(
                tapResponse({
                  next: (equipment: EquipmentOutput): void => {
                    patchState(store, setEntity(equipment, { collection: 'equipment' }), {
                      maintenanceCallState: successCallState(equipment),
                    });
                    activeEquipmentStore.setEquipment(equipment);
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { maintenanceCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.maintenanceFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to set equipment to maintenance',
                        ),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Attachments ────────────────────────────────────────────────────────

        /**
         * Method loadAttachments
         * @method loadAttachments
         *
         * @description
         * Loads paginated attachments for a given equipment. Uses `switchMap`
         * to cancel any previous in-flight request.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; options?: RequestOptions }>}
         */
        loadAttachments: rxMethod<{
          organizationId: string;
          equipmentId: string;
          options?: RequestOptions;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { attachmentsListCallState: pendingCallState() });
            }),
            switchMap(({ organizationId, equipmentId, options }) =>
              equipmentService.listAttachments(organizationId, equipmentId, options).pipe(
                tapResponse({
                  next: (response: HydraCollection<EquipmentAttachmentOutput>): void => {
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'attachment' }),
                      {
                        totalAttachments: response.totalItems,
                        attachmentsListCallState: successCallState(null),
                      },
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { attachmentsListCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.attachmentsListFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load attachments'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method addAttachment
         * @method addAttachment
         *
         * @description
         * Adds an attachment to an equipment. Uses `exhaustMap` to prevent
         * concurrent submissions.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; input: AddAttachmentInput }>}
         */
        addAttachment: rxMethod<{
          organizationId: string;
          equipmentId: string;
          input: AddAttachmentInput;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { addAttachmentCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId, input }) =>
              equipmentService.addAttachment(organizationId, equipmentId, input).pipe(
                tapResponse({
                  next: (attachment: EquipmentAttachmentOutput): void => {
                    patchState(store, addEntity(attachment, { collection: 'attachment' }), {
                      totalAttachments: store.totalAttachments() + 1,
                      addAttachmentCallState: successCallState(attachment),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { addAttachmentCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.addAttachmentFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to add attachment'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method deleteAttachment
         * @method deleteAttachment
         *
         * @description
         * Deletes an attachment from an equipment. Uses `exhaustMap` to prevent
         * concurrent submissions.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; attachmentId: string }>}
         */
        deleteAttachment: rxMethod<{
          organizationId: string;
          equipmentId: string;
          attachmentId: string;
        }>(
          pipe(
            tap((): void => {
              patchState(store, { deleteAttachmentCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId, attachmentId }) =>
              equipmentService.deleteAttachment(organizationId, equipmentId, attachmentId).pipe(
                tapResponse({
                  next: (): void => {
                    patchState(store, removeEntity(attachmentId, { collection: 'attachment' }), {
                      totalAttachments: Math.max(0, store.totalAttachments() - 1),
                      deleteAttachmentCallState: successCallState(null),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { deleteAttachmentCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.deleteAttachmentFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to delete attachment'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Tags ───────────────────────────────────────────────────────────────

        /**
         * Method loadTags
         * @method loadTags
         *
         * @description
         * Loads the organization tag catalog used by equipment tag pickers.
         * Uses `switchMap` to cancel any previous in-flight request.
         *
         * @since 1.0.0
         */
        loadTags: rxMethod<{ organizationId: string; search?: string; options?: RequestOptions }>(
          pipe(
            tap((): void => {
              patchState(store, { tagsListCallState: pendingCallState() });
            }),
            switchMap(({ organizationId, search, options }) =>
              equipmentService.listTagCatalog(organizationId, search, options).pipe(
                tapResponse({
                  next: (response: HydraCollection<EquipmentTagOutput>): void => {
                    patchState(store, setAllEntities([...response.member], { collection: 'tag' }), {
                      totalTags: response.totalItems,
                      tagsListCallState: successCallState(null),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      tagsListCallState: errorCallState(storeError),
                    });
                    dispatcher.dispatch(
                      equipmentStoreEvents.tagsListFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load tags'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method addTag
         * @method addTag
         *
         * @description
         * Adds a tag to an equipment. Uses `exhaustMap` to prevent
         * concurrent submissions.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; input: AddTagInput }>}
         */
        addTag: rxMethod<{ organizationId: string; equipmentId: string; input: AddTagInput }>(
          pipe(
            tap((): void => {
              patchState(store, { addTagCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId, input }) =>
              equipmentService.addTag(organizationId, equipmentId, input).pipe(
                tapResponse({
                  next: (tag: EquipmentTagOutput): void => {
                    patchState(store, addEntity(tag, { collection: 'tag' }), {
                      totalTags: store.totalTags() + 1,
                      addTagCallState: successCallState(tag),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { addTagCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.addTagFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to add tag'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method removeTag
         * @method removeTag
         *
         * @description
         * Removes a tag from an equipment. Uses `exhaustMap` to prevent
         * concurrent submissions.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{ organizationId: string; equipmentId: string; tagId: string }>}
         */
        removeTag: rxMethod<{ organizationId: string; equipmentId: string; tagId: string }>(
          pipe(
            tap((): void => {
              patchState(store, { removeTagCallState: pendingCallState() });
            }),
            exhaustMap(({ organizationId, equipmentId, tagId }) =>
              equipmentService.removeTag(organizationId, equipmentId, tagId).pipe(
                tapResponse({
                  next: (): void => {
                    patchState(store, removeEntity(tagId, { collection: 'tag' }), {
                      totalTags: Math.max(0, store.totalTags() - 1),
                      removeTagCallState: successCallState(null),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { removeTagCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      equipmentStoreEvents.removeTagFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to remove tag'),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        // ── Sync Helpers ───────────────────────────────────────────────────────

        /**
         * Method resetCreateOperation
         * @method resetCreateOperation
         *
         * @description
         * Resets the create operation back to its idle state.
         * Call this after the create form is dismissed or the dialog is closed.
         *
         * @since 1.0.0
         *
         * @returns {void} No return value.
         */
        resetCreateOperation(): void {
          patchState(store, { createCallState: idleCallState() });
        },

        /**
         * Method resetUpdateOperation
         * @method resetUpdateOperation
         *
         * @description
         * Resets the update operation back to its idle state.
         * Call this after the update form is dismissed or the dialog is closed.
         *
         * @since 1.0.0
         *
         * @returns {void} No return value.
         */
        resetUpdateOperation(): void {
          patchState(store, { updateCallState: idleCallState() });
        },
      };
    },
  ),
  //#endregion
);

/**
 * Type EquipmentStore
 * @type EquipmentStore
 *
 * @description
 * Instance type of the {@link EquipmentStore} signal store.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type EquipmentStore = InstanceType<typeof EquipmentStore>;
