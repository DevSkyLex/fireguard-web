import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, merge, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  CreateFacilityInput,
  FacilityOutput,
  FacilityTreeOutput,
} from '@features/organization/features/facilities/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { resolveComplianceBucket, type FacilityMapStats } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import {
  buildFacilityMapStats,
  resolveFacilityCity,
  toFacilityCityMetadata,
} from '@features/organization/utils';
import type { MapMarker, MapMarkerDetail } from '@shared/components';

/**
 * A map viewport center, in decimal degrees.
 *
 * @since 1.0.0
 */
export interface MapCenter {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * State of the organization map's shared facility data and UI coordination.
 *
 * @since 1.0.0
 */
interface MapFacilitiesState {
  readonly listCallState: CallState<readonly FacilityOutput[]>;
  readonly treeCallState: CallState<FacilityTreeOutput>;
  readonly createCallState: CallState<FacilityOutput>;
  readonly search: string;
  readonly selectedFacilityId: string | null;
  readonly showAddForm: boolean;
  readonly actionError: string | null;
  readonly mapCenter: MapCenter | null;
  /** Incremented on every fit-all request; the page watches it to re-frame the map. */
  readonly fitAllRequestId: number;
}

const INITIAL_STATE: MapFacilitiesState = {
  listCallState: idleCallState(),
  treeCallState: idleCallState(),
  createCallState: idleCallState(),
  search: '',
  selectedFacilityId: null,
  showAddForm: false,
  actionError: null,
  mapCenter: null,
  fitAllRequestId: 0,
};

/**
 * Returns the list with one facility's coordinates swapped by id.
 */
function replaceFacilityPosition(
  facilities: readonly FacilityOutput[],
  facilityId: string,
  latitude: number,
  longitude: number,
): readonly FacilityOutput[] {
  return facilities.map(
    (facility: FacilityOutput): FacilityOutput =>
      facility.id === facilityId ? { ...facility, latitude, longitude } : facility,
  );
}

/**
 * Store MapFacilitiesStore
 * @const MapFacilitiesStore
 *
 * @description
 * The single owner of the organization map's located-facility data — the
 * base facility list, the compliance/buildings tree, search, selection, the
 * inline add-facility flow and the map's current center. Provided once per
 * dashboard shell by `provideOrganizationFeature()` — NOT root, because its
 * hooks inject the organization ports bound in that same route injector —
 * and shared by the two surfaces that render it at once now that the
 * sidebar is a shell panel: the `OrganizationMapPage` (the canvas) and
 * `MapFacilitiesPanel` (the right-hand panel). Two instances would show a
 * pin the panel does not know about, or a card the map cannot select.
 *
 * Loads itself: it watches the active organization through the context port
 * and only fetches when the member holds `facilities.read`. The compliance
 * tree is fetched alongside but degrades independently — a member without
 * `compliance.read` simply sees every pin/card as unmeasured rather than the
 * whole map failing (see the facilities feature's FEATURE.md on the
 * asymmetric permission).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MapFacilitiesStore = signalStore(
  //#region State
  withState<MapFacilitiesState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed facilities
     *
     * @type {Signal<readonly FacilityOutput[]>}
     */
    facilities: computed<readonly FacilityOutput[]>(() => store.listCallState().data ?? []),

    /**
     * Computed isLoaded
     *
     * @description
     * True once the facility list request has settled, success or error —
     * distinct from "still loading".
     *
     * @type {Signal<boolean>}
     */
    isLoaded: computed<boolean>(() => {
      const status = store.listCallState().status;
      return status === 'success' || status === 'error';
    }),

    /**
     * Computed creating
     *
     * @type {Signal<boolean>}
     */
    creating: computed<boolean>(() => isCallPending(store.createCallState())),

    /**
     * Computed mapStats
     * @readonly
     *
     * @description
     * Per-facility compliance rate and buildings count, indexed from the
     * facility tree. Empty (never an error) when the tree query has not
     * resolved yet or the member lacks `compliance.read` — every lookup then
     * falls back to "unmeasured".
     *
     * @type {Signal<ReadonlyMap<string, FacilityMapStats>>}
     */
    mapStats: computed<ReadonlyMap<string, FacilityMapStats>>(() =>
      buildFacilityMapStats(store.treeCallState().data?.nodes ?? []),
    ),
  })),
  //#endregion

  //#region Computed (derived from the above)
  withComputed((store) => ({
    /**
     * Computed placedFacilities
     * @readonly
     *
     * @description
     * Only facilities with both coordinates. One without is not an error — it
     * simply has no address on file — so it is dropped from the map and the
     * panel, not flagged.
     *
     * @type {Signal<readonly FacilityOutput[]>}
     */
    placedFacilities: computed<readonly FacilityOutput[]>(() =>
      store
        .facilities()
        .filter(
          (facility: FacilityOutput): boolean =>
            typeof facility.latitude === 'number' && typeof facility.longitude === 'number',
        ),
    ),
  })),
  //#endregion

  //#region Computed (markers + search, depend on placedFacilities)
  withComputed((store) => ({
    /**
     * Computed isEmpty
     * @readonly
     *
     * @description
     * True once loaded with nothing to place — distinct from "still loading".
     *
     * @type {Signal<boolean>}
     */
    isEmpty: computed<boolean>(() => store.isLoaded() && store.placedFacilities().length === 0),

    /**
     * Computed markers
     * @readonly
     *
     * @description
     * Located facilities as draggable, compliance-colored map pins. The color
     * is always a secondary cue: the popup `details` carry the same
     * compliance bucket as text, so meaning never rests on the pin's color
     * alone.
     *
     * @type {Signal<readonly MapMarker[]>}
     */
    markers: computed<readonly MapMarker[]>(() =>
      store.placedFacilities().map((facility: FacilityOutput): MapMarker => {
        const stats: FacilityMapStats | undefined = store.mapStats().get(facility.id);
        const complianceRate: number | null = stats?.complianceRate ?? null;
        const bucket = resolveComplianceBucket(complianceRate);
        const city: string | null = resolveFacilityCity(facility);
        const complianceValue: string =
          complianceRate === null
            ? bucket.label
            : `${Math.round(complianceRate)}% (${bucket.label})`;

        const details: readonly MapMarkerDetail[] = [
          {
            label: $localize`:@@map.popup.buildings:Buildings`,
            value: String(stats?.buildingsCount ?? 0),
          },
          {
            label: $localize`:@@map.popup.equipment:Equipment`,
            value: String(facility.equipmentCount ?? 0),
          },
          { label: $localize`:@@map.popup.compliance:Compliant`, value: complianceValue },
        ];

        return {
          id: facility.id,
          latitude: facility.latitude as number,
          longitude: facility.longitude as number,
          title: facility.name,
          subtitle: city ?? undefined,
          color: bucket.pinColor,
          draggable: true,
          details,
        };
      }),
    ),

    /**
     * Computed filteredFacilities
     * @readonly
     *
     * @description
     * Facilities matching the search, by name or city. Only placed facilities
     * are listed, so the panel and the map always describe the same set.
     *
     * @type {Signal<readonly FacilityOutput[]>}
     */
    filteredFacilities: computed<readonly FacilityOutput[]>(() => {
      const term: string = store.search().trim().toLowerCase();
      const placed: readonly FacilityOutput[] = store.placedFacilities();
      if (term === '') return placed;

      return placed.filter((facility: FacilityOutput): boolean => {
        const city: string = resolveFacilityCity(facility) ?? '';
        return `${facility.name} ${city}`.toLowerCase().includes(term);
      });
    }),
  })),
  //#endregion

  //#region Computed (isSearchEmpty, depends on filteredFacilities)
  withComputed((store) => ({
    /**
     * Computed isSearchEmpty
     * @readonly
     *
     * @description
     * True when a search excluded everything — distinct from having no
     * facilities at all.
     *
     * @type {Signal<boolean>}
     */
    isSearchEmpty: computed<boolean>(
      () => store.search().trim() !== '' && store.filteredFacilities().length === 0,
    ),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (store, service = inject(FacilityService), context = inject(ORGANIZATION_CONTEXT_PORT)) => {
      /**
       * Loads the base facility list and the compliance/buildings tree
       * together. Independent `merge`d streams: a tree failure (missing
       * `compliance.read`) must not block or roll back a successful facility
       * list, and vice versa.
       */
      const load = rxMethod<string | null>(
        pipe(
          switchMap((organizationId: string | null) => {
            if (organizationId === null) {
              patchState(store, { listCallState: idleCallState(), treeCallState: idleCallState() });
              return EMPTY;
            }

            patchState(store, {
              listCallState: pendingCallState(store.listCallState().data ?? []),
              treeCallState: pendingCallState(store.treeCallState().data),
            });

            return merge(
              service.listAll(organizationId).pipe(
                tapResponse({
                  next: (facilities: readonly FacilityOutput[]) =>
                    patchState(store, { listCallState: successCallState(facilities) }),
                  error: (error: unknown) =>
                    patchState(store, {
                      listCallState: errorCallState(
                        toStoreError(error),
                        store.listCallState().data ?? [],
                      ),
                    }),
                }),
              ),
              service.getTree(organizationId).pipe(
                tapResponse({
                  next: (tree: FacilityTreeOutput) =>
                    patchState(store, { treeCallState: successCallState(tree) }),
                  // Gracefully degrade: a 403 here (no `compliance.read`) must
                  // not read as "map failed" — `mapStats` already defaults to
                  // an empty map, so every marker/card falls back to
                  // "unmeasured".
                  error: (error: unknown) =>
                    patchState(store, { treeCallState: errorCallState(toStoreError(error)) }),
                }),
              ),
            );
          }),
        ),
      );

      /**
       * Creates a facility and appends it to the list on success.
       */
      const createFacility = rxMethod<{
        readonly organizationId: string;
        readonly input: CreateFacilityInput;
      }>(
        pipe(
          switchMap(
            ({
              organizationId,
              input,
            }: {
              readonly organizationId: string;
              readonly input: CreateFacilityInput;
            }) => {
              patchState(store, { createCallState: pendingCallState() });

              return service.create(organizationId, input).pipe(
                tapResponse({
                  next: (created: FacilityOutput) =>
                    patchState(store, {
                      createCallState: successCallState(created),
                      listCallState: successCallState([
                        ...(store.listCallState().data ?? []),
                        created,
                      ]),
                      showAddForm: false,
                      selectedFacilityId: created.id,
                      actionError: null,
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      createCallState: errorCallState(toStoreError(error)),
                      actionError: $localize`:@@map.error.addFailed:Couldn't add the facility. Try again.`,
                    }),
                }),
              );
            },
          ),
        ),
      );

      /**
       * Persists a dragged pin's new position optimistically, reverting and
       * surfacing an error if the request fails.
       */
      const dragMarker = rxMethod<Pick<MapMarker, 'id' | 'latitude' | 'longitude'>>(
        pipe(
          switchMap((position: Pick<MapMarker, 'id' | 'latitude' | 'longitude'>) => {
            const organizationId: string | undefined = context.selectedOrganization()?.id;
            const previous: FacilityOutput | undefined = (store.listCallState().data ?? []).find(
              (facility: FacilityOutput): boolean => facility.id === position.id,
            );

            if (organizationId === undefined || previous === undefined) return EMPTY;

            patchState(store, {
              listCallState: successCallState(
                replaceFacilityPosition(
                  store.listCallState().data ?? [],
                  position.id,
                  position.latitude,
                  position.longitude,
                ),
              ),
              actionError: null,
            });

            return service
              .update(organizationId, position.id, {
                latitude: position.latitude,
                longitude: position.longitude,
              })
              .pipe(
                tapResponse({
                  next: () => undefined,
                  error: () =>
                    patchState(store, {
                      listCallState: successCallState(
                        replaceFacilityPosition(
                          store.listCallState().data ?? [],
                          previous.id,
                          previous.latitude as number,
                          previous.longitude as number,
                        ),
                      ),
                      actionError: $localize`:@@map.error.moveFailed:Couldn't move the facility. Try again.`,
                    }),
                }),
              );
          }),
        ),
      );

      return {
        load,
        dragMarker,

        /**
         * Method setSearch
         *
         * @param {string} term - Free-text filter, name or city.
         *
         * @returns {void}
         */
        setSearch(term: string): void {
          patchState(store, { search: term });
        },

        /**
         * Method selectFacility
         *
         * @param {string | null} facilityId - The facility a pin or a card
         * represents, or `null` to clear the selection.
         *
         * @returns {void}
         */
        selectFacility(facilityId: string | null): void {
          patchState(store, { selectedFacilityId: facilityId });
        },

        /**
         * Method openAddForm
         *
         * @returns {void}
         */
        openAddForm(): void {
          patchState(store, { showAddForm: true, actionError: null });
        },

        /**
         * Method cancelAddForm
         *
         * @returns {void}
         */
        cancelAddForm(): void {
          patchState(store, { showAddForm: false });
        },

        /**
         * Method setMapCenter
         *
         * @description
         * Records the map's current viewport center, read by the page on
         * demand (when the add-facility form opens) rather than tracked
         * continuously.
         *
         * @param {MapCenter | null} center - The map's current center.
         *
         * @returns {void}
         */
        setMapCenter(center: MapCenter | null): void {
          patchState(store, { mapCenter: center });
        },

        /**
         * Method requestFitAll
         *
         * @description
         * Asks the page to re-frame the map on every pin. The page owns the
         * `MapCanvas` view child and does the actual framing; this only
         * signals the request across the page/panel boundary.
         *
         * @returns {void}
         */
        requestFitAll(): void {
          patchState(store, { fitAllRequestId: store.fitAllRequestId() + 1 });
        },

        /**
         * Method submitAddFacility
         *
         * @description
         * Creates the facility at the map's last-known center. City has no
         * dedicated backend field, so it rides in `metadata` (see
         * `resolveFacilityCity`/`toFacilityCityMetadata`).
         *
         * @param {{ readonly name: string; readonly city: string }} values - The submitted name and city.
         *
         * @returns {void}
         */
        submitAddFacility(values: { readonly name: string; readonly city: string }): void {
          const organizationId: string | undefined = context.selectedOrganization()?.id;
          const center: MapCenter | null = store.mapCenter();

          if (organizationId === undefined || center === null) {
            patchState(store, {
              actionError: $localize`:@@map.error.addFailed:Couldn't add the facility. Try again.`,
            });
            return;
          }

          const cityMetadata: Record<string, string> | undefined = toFacilityCityMetadata(
            values.city,
          );
          const input: CreateFacilityInput = {
            type: 'site',
            name: values.name,
            latitude: center.latitude,
            longitude: center.longitude,
            ...(cityMetadata ? { metadata: cityMetadata } : {}),
          };

          createFacility({ organizationId, input });
        },
      };
    },
  ),
  //#endregion

  //#region Hooks
  withHooks((store) => {
    const context = inject(ORGANIZATION_CONTEXT_PORT);
    const memberAccess = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

    return {
      /**
       * Follows the active organization, fetching only when the member may
       * read facilities — mirrors `ConversationInventoryStore`'s own gate.
       */
      onInit(): void {
        store.load(
          computed((): string | null => {
            const organization = context.selectedOrganization();
            if (!organization) return null;

            const granted: ReadonlySet<string> = new Set(memberAccess.permissions());
            const canRead: boolean =
              granted.has(ORGANIZATION_PERMISSION.FACILITIES_READ) ||
              Array.from(granted).some(
                (permission: string): boolean =>
                  permission.endsWith('.*') &&
                  ORGANIZATION_PERMISSION.FACILITIES_READ.startsWith(permission.slice(0, -1)),
              );

            return canRead ? organization.id : null;
          }),
        );
      },
    };
  }),
  //#endregion
);

/**
 * Type MapFacilitiesStoreType
 *
 * @description
 * Injectable instance type of {@link MapFacilitiesStore}.
 */
export type MapFacilitiesStoreType = InstanceType<typeof MapFacilitiesStore>;
