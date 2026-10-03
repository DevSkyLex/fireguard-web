import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
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
  removeAllEntities,
  removeEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  concatMap,
  defer,
  EMPTY,
  forkJoin,
  from,
  map,
  pipe,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import {
  FacilityModelService,
  FacilityService,
} from '@features/organization/features/facilities/data-access';
import type {
  FacilityModelInput,
  FacilityModelOutput,
  FacilityModelUploadInput,
  FacilityOption,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import { resolveFacilityStatusTag } from '@features/organization/features/facilities/models';
import { FacilityModelAssetService } from '@features/organization/features/facilities/services';
import {
  readFacilityGlb,
  toFacilityOption,
} from '@features/organization/features/facilities/utils';
import { facilityModelsStoreEvents } from './events/events';
import type { FacilityModelCommand, FacilityModelsState } from './models/state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seeds independent model request states without serializing browser resources for SSR.
 */
const INITIAL_STATE: FacilityModelsState = {
  bindingFacilities: [],
  optionsCallState: idleCallState(),
  organizationId: null,
  buildingId: null,
  scopeRevision: 0,
  selectedModelId: null,
  selectedNodeIndex: null,
  previewAsset: null,
  settingsSavedToken: 0,
  listCallState: idleCallState(),
  uploadCallState: idleCallState(),
  updateCallState: idleCallState(),
  previewCallState: idleCallState(),
  activateCallState: idleCallState(),
  removeCallState: idleCallState(),
  downloadCallState: idleCallState(),
};

/**
 * Function resolveBindingFloorId
 *
 * @description
 * Resolves the nearest floor only when the complete ancestry reaches the selected owning building.
 *
 * @access private
 *
 * @param {FacilityOutput} facility - Candidate binding target.
 * @param {ReadonlyMap<string, FacilityOutput>} facilities - Loaded building and descendant records.
 * @param {string | null} organizationId - Selected organization scope.
 * @param {string | null} buildingId - Selected owning building.
 *
 * @returns {string | null | undefined} Nearest floor, no floor for a valid target, or invalid
 *   ancestry.
 */
function resolveBindingFloorId(
  facility: FacilityOutput,
  facilities: ReadonlyMap<string, FacilityOutput>,
  organizationId: string | null,
  buildingId: string | null,
): string | null | undefined {
  const seen = new Set<string>();
  let current = facility;
  let floorId: string | null = null;
  let reachesBuilding = false;
  while (!seen.has(current.id) && current.organizationId === organizationId) {
    seen.add(current.id);
    if (current.type === 'floor' && floorId === null) floorId = current.id;
    if (current.id === buildingId) {
      reachesBuilding = true;
      break;
    }
    if (current.type === 'building') break;
    const parent = current.parentFacilityId ? facilities.get(current.parentFacilityId) : undefined;
    if (!parent) break;
    current = parent;
  }
  return reachesBuilding ? floorId : undefined;
}

/**
 * Constant FacilityModelsStore
 *
 * @description
 * Page-scoped GLB workflow, preserving failed settings drafts and cancelling abandoned reads.
 */
export const FacilityModelsStore = signalStore(
  withEntities({ entity: type<FacilityModelOutput>(), collection: 'model' }),
  withState(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * @description
     * Resolves nearest floors only inside this building, stopping at nested buildings and cycles.
     */
    bindingFloorIds: computed<Readonly<Record<string, string | null>>>(() => {
      const facilities = new Map(
        store.bindingFacilities().map((facility) => [facility.id, facility]),
      );
      const result: Record<string, string | null> = {};
      for (const facility of facilities.values()) {
        const floorId = resolveBindingFloorId(
          facility,
          facilities,
          store.organizationId(),
          store.buildingId(),
        );
        if (floorId !== undefined) result[facility.id] = floorId;
      }
      return result;
    }),
    selectedModel: computed(
      () => store.modelEntities().find((model) => model.id === store.selectedModelId()) ?? null,
    ),
    isListPending: computed(() => isCallPending(store.listCallState())),
    isUploadPending: computed(() => isCallPending(store.uploadCallState())),
    isUpdatePending: computed(() => isCallPending(store.updateCallState())),
    isPreviewPending: computed(() => isCallPending(store.previewCallState())),
    isActivatePending: computed(() => isCallPending(store.activateCallState())),
    isRemovePending: computed(() => isCallPending(store.removeCallState())),
    isDownloadPending: computed(() => isCallPending(store.downloadCallState())),
  })),
  withComputed((store) => ({
    /**
     * @description
     * Offers binding choices within the nearest owning building, independently of drawn outlines.
     */
    facilityOptions: computed<readonly FacilityOption[]>(() =>
      store
        .bindingFacilities()
        .filter((facility) => Object.hasOwn(store.bindingFloorIds(), facility.id))
        .map((facility) => {
          const option = toFacilityOption(facility);
          return facility.status === 'archived'
            ? Object.assign(option, {
                label: `${option.label} (${resolveFacilityStatusTag(facility.status).label})`,
              })
            : option;
        }),
    ),
  })),
  withMethods(
    (
      store,
      service = inject(FacilityModelService),
      facilities = inject(FacilityService),
      assets = inject(FacilityModelAssetService),
      dispatcher = inject(Dispatcher),
      platformId = inject(PLATFORM_ID),
    ) => {
      const readCancelled: Subject<void> = new Subject<void>();
      const previewCancelled: Subject<void> = new Subject<void>();
      const acceptedRevisions: Map<string, number> = new Map();
      const isCurrent = (revision: number): boolean => revision === store.scopeRevision();
      const clearPreview = (): void => {
        previewCancelled.next();
        assets.dispose(store.previewAsset());
        patchState(store, {
          previewAsset: null,
          previewCallState: idleCallState(),
          selectedNodeIndex: null,
        });
      };
      const fail = (error: unknown): void => {
        dispatcher.dispatch(
          facilityModelsStoreEvents.failed(
            toStoreFailureEventPayload(
              toStoreError(error),
              $localize`:@@facility.model.actionError:The model action could not be completed.`,
            ),
          ),
        );
      };
      const preview = rxMethod<string>(
        pipe(
          switchMap((id) => {
            clearPreview();
            const revision = store.scopeRevision();
            if (!isPlatformBrowser(platformId) || !store.modelEntityMap()[id]) return EMPTY;
            patchState(store, { previewCallState: pendingCallState() });
            return service.download(id).pipe(
              switchMap((blob) => assets.load(blob)),
              takeUntil(previewCancelled),
              tapResponse({
                next: (asset) => {
                  if (!isCurrent(revision) || store.selectedModelId() !== id) {
                    assets.dispose(asset);
                    return;
                  }
                  patchState(store, {
                    previewAsset: asset,
                    previewCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  if (!isCurrent(revision) || store.selectedModelId() !== id) return;
                  patchState(store, { previewCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const select = (id: string): void => {
        if (!store.modelEntityMap()[id]) return;
        if (store.selectedModelId() === id && store.previewAsset()) return;
        patchState(store, { selectedModelId: id, updateCallState: idleCallState() });
        preview(id);
      };
      const loadOptions = rxMethod<void>(
        pipe(
          switchMap(() => {
            const organizationId = store.organizationId();
            const buildingId = store.buildingId();
            const revision = store.scopeRevision();
            if (!isPlatformBrowser(platformId) || !organizationId || !buildingId) return EMPTY;
            patchState(store, { optionsCallState: pendingCallState() });
            return forkJoin({
              building: facilities.get(organizationId, buildingId),
              descendants: facilities.listDescendants(organizationId, buildingId, {
                includeArchived: true,
              }),
            }).pipe(
              takeUntil(readCancelled),
              tapResponse({
                next: ({ building, descendants }) => {
                  if (!isCurrent(revision)) return;
                  patchState(store, {
                    bindingFacilities: [building, ...descendants.member],
                    optionsCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  if (!isCurrent(revision)) return;
                  patchState(store, { optionsCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      const refresh = rxMethod<void>(
        pipe(
          switchMap(() => {
            const organizationId = store.organizationId();
            const buildingId = store.buildingId();
            const revision = store.scopeRevision();
            if (!isPlatformBrowser(platformId) || !organizationId || !buildingId) return EMPTY;
            patchState(store, { listCallState: pendingCallState() });
            return service.list(organizationId, buildingId).pipe(
              takeUntil(readCancelled),
              tapResponse({
                next: (response) => {
                  if (!isCurrent(revision)) return;
                  patchState(store, setAllEntities([...response.member], { collection: 'model' }), {
                    listCallState: successCallState(null),
                  });
                  const selectedId = store.selectedModelId();
                  if (selectedId && store.modelEntityMap()[selectedId]) {
                    if (!store.previewAsset() && !store.isPreviewPending()) preview(selectedId);
                    if (store.optionsCallState().status === 'error') loadOptions();
                    return;
                  }
                  clearPreview();
                  patchState(store, { selectedModelId: null });
                  const model = response.member.find((item) => item.active) ?? response.member[0];
                  if (model) select(model.id);
                },
                error: (error: unknown) => {
                  if (!isCurrent(revision)) return;
                  patchState(store, { listCallState: errorCallState(toStoreError(error)) });
                  fail(error);
                },
              }),
            );
          }),
        ),
      );
      const command = rxMethod<FacilityModelCommand>(
        pipe(
          concatMap((request) => {
            const stateKey = `${request.kind}CallState` as
              | 'uploadCallState'
              | 'updateCallState'
              | 'activateCallState'
              | 'removeCallState';
            if (isCurrent(request.scopeRevision))
              patchState(store, { [stateKey]: pendingCallState() });
            const model = request.kind === 'upload' ? null : store.modelEntityMap()[request.id];
            const revision =
              request.kind === 'upload'
                ? null
                : ((isCurrent(request.scopeRevision) ? model?.revision : undefined) ??
                  acceptedRevisions.get(request.id) ??
                  request.revision);
            if (request.kind !== 'upload' && revision === null) {
              if (isCurrent(request.scopeRevision))
                patchState(store, { [stateKey]: idleCallState() });
              return EMPTY;
            }
            const action = defer(() => {
              if (request.kind === 'upload') {
                if (
                  request.input.file.size > 10 * 1024 * 1024 ||
                  !request.input.fileName.toLowerCase().endsWith('.glb')
                ) {
                  throw new Error(
                    $localize`:@@facility.model.uploadType:Choose an autonomous GLB file no larger than 10 MiB.`,
                  );
                }
                return from(request.input.file.arrayBuffer()).pipe(
                  map((bytes) => readFacilityGlb(bytes)),
                  concatMap(() =>
                    service.upload(
                      request.organizationId,
                      request.buildingId,
                      request.input.file,
                      request.input.fileName,
                    ),
                  ),
                );
              }
              if (revision === null) return EMPTY;
              if (request.kind === 'update')
                return service.update(request.id, request.input, revision);
              if (request.kind === 'activate') return service.activate(request.id, revision);
              return service.remove(request.id, revision).pipe(map(() => null));
            });
            return action.pipe(
              tapResponse({
                next: (result) => {
                  if (result) acceptedRevisions.set(result.id, result.revision);
                  if (!isCurrent(request.scopeRevision)) return;
                  patchState(store, { [stateKey]: successCallState(null) });
                  if (result) {
                    patchState(store, setEntity(result, { collection: 'model' }));
                    if (request.kind === 'upload') select(result.id);
                    if (request.kind === 'update')
                      patchState(store, { settingsSavedToken: store.settingsSavedToken() + 1 });
                  } else if (request.kind === 'remove') {
                    patchState(store, removeEntity(request.id, { collection: 'model' }));
                    if (store.selectedModelId() === request.id) {
                      clearPreview();
                      patchState(store, { selectedModelId: null });
                    }
                  }
                  dispatcher.dispatch(
                    facilityModelsStoreEvents.changed({
                      buildingId: request.buildingId,
                      modelId: result?.id ?? ('id' in request ? request.id : ''),
                    }),
                  );
                  if (request.kind === 'activate' || request.kind === 'remove') refresh();
                },
                error: (error: unknown) => {
                  if (!isCurrent(request.scopeRevision)) return;
                  patchState(store, { [stateKey]: errorCallState(toStoreError(error)) });
                  if (toStoreError(error).code === 409 || toStoreError(error).code === 412)
                    refresh();
                  if (store.optionsCallState().status !== 'success') loadOptions();
                  fail(error);
                },
              }),
            );
          }),
        ),
      );
      const submitCommand = (
        request:
          | { readonly kind: 'upload'; readonly input: FacilityModelUploadInput }
          | { readonly kind: 'update'; readonly id: string; readonly input: FacilityModelInput }
          | { readonly kind: 'activate' | 'remove'; readonly id: string },
      ): void => {
        const organizationId = store.organizationId();
        const buildingId = store.buildingId();
        if (!isPlatformBrowser(platformId) || !organizationId || !buildingId) return;
        const revision =
          request.kind === 'upload' ? null : (store.modelEntityMap()[request.id]?.revision ?? null);
        if (request.kind !== 'upload' && revision === null) return;
        command({
          ...request,
          organizationId,
          buildingId,
          revision,
          scopeRevision: store.scopeRevision(),
        });
      };
      return {
        /**
         * @description
         * Loads browser-only model resources, clearing stale scope immediately.
         */
        load(context: { readonly organizationId: string; readonly buildingId: string }): void {
          if (!isPlatformBrowser(platformId)) return;
          if (
            store.organizationId() !== context.organizationId ||
            store.buildingId() !== context.buildingId
          ) {
            readCancelled.next();
            clearPreview();
            patchState(store, removeAllEntities({ collection: 'model' }), {
              ...INITIAL_STATE,
              organizationId: context.organizationId,
              buildingId: context.buildingId,
              scopeRevision: store.scopeRevision() + 1,
            });
          }
          refresh();
          if (store.optionsCallState().status !== 'success') loadOptions();
        },
        select,
        /**
         * @description
         * Retry a failed collection read without discarding the current draft.
         */
        refresh,
        loadOptions,
        /**
         * @description
         * Selects only a source node belonging to the immutable selected file.
         */
        selectNode(index: number): void {
          if (!store.selectedModel()?.nodes.some((node) => node.index === index)) return;
          patchState(store, { selectedNodeIndex: index });
        },
        /**
         * @description
         * Clears source-node selection while preserving the imported model and its draft.
         */
        clearNodeSelection(): void {
          patchState(store, { selectedNodeIndex: null });
        },
        /**
         * @description
         * Creates an independent immutable model draft.
         */
        upload(input: FacilityModelUploadInput): void {
          submitCommand({ kind: 'upload', input });
        },
        /**
         * @description
         * Saves the selected model's settings, retaining failed form data in the form.
         */
        update(input: FacilityModelInput): void {
          const id = store.selectedModelId();
          if (id) submitCommand({ kind: 'update', id, input });
        },
        /**
         * @description
         * Makes a selected model active with its latest observed revision.
         */
        activate(id: string): void {
          if (store.modelEntities().find((model) => model.id === id)?.bindingIssues.length) return;
          submitCommand({ kind: 'activate', id });
        },
        /**
         * @description
         * Deletes a model after the page has collected explicit UI confirmation.
         */
        remove(id: string): void {
          submitCommand({ kind: 'remove', id });
        },
        /**
         * @description
         * Downloads authenticated bytes for the page's native file action.
         */
        download: rxMethod<string>(
          pipe(
            switchMap((id) => {
              const revision = store.scopeRevision();
              const model = store.modelEntityMap()[id];
              if (!isPlatformBrowser(platformId) || !model) return EMPTY;
              patchState(store, { downloadCallState: pendingCallState() });
              return service.download(id).pipe(
                takeUntil(readCancelled),
                tapResponse({
                  next: (blob) => {
                    if (isCurrent(revision))
                      patchState(store, {
                        downloadCallState: successCallState({ blob, fileName: model.fileName }),
                      });
                  },
                  error: (error: unknown) => {
                    if (isCurrent(revision))
                      patchState(store, { downloadCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
            }),
          ),
        ),
        /**
         * @description
         * Disposes source resources and cancels in-flight reads at scope teardown.
         */
        destroyAssets(): void {
          readCancelled.next();
          clearPreview();
          readCancelled.complete();
          previewCancelled.complete();
        },
      };
    },
  ),
  withHooks({
    onDestroy(store): void {
      store.destroyAssets();
    },
  }),
);

/**
 * Type FacilityModelsStoreType
 *
 * @description
 * Injection type of the page-scoped imported-model workflow.
 *
 * @type {FacilityModelsStoreType}
 */
export type FacilityModelsStoreType = InstanceType<typeof FacilityModelsStore>;
