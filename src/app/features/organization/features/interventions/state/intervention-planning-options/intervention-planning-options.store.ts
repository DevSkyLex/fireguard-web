import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, mergeMap, pipe, timer, type Observable } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { OrganizationMemberService } from '@features/organization/data-access';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import {
  InterventionLabelService,
  InterventionTemplateService,
} from '@features/organization/features/interventions/data-access';
import type {
  SelectOption,
  PlanningCatalogueKind,
  PlanningCatalogueState,
  PlanningCatalogueRequest,
  MemberSelectOption,
  InterventionTemplateOutput,
} from '@features/organization/features/interventions/models';
import { toMemberSelectOption } from '@features/organization/utils';
import { interventionPlanningOptionsStoreEvents } from './events';
import type { InterventionPlanningOptionsState } from './models';

/** Constant INITIAL_STATE
 * @description Empty account-scoped selection caches and independent catalogue requests.
 * @since 1.0.0
 * @type {InterventionPlanningOptionsState}
 */
const INITIAL_STATE: InterventionPlanningOptionsState = {
  catalogues: {},
  selectionCallStates: {},
  sites: [],
  targets: [],
  members: [],
  labels: [],
  templates: [],
  loadCallState: idleCallState(),
};
/** Function emptyCatalogue
 * @description Initial coverage of a selection catalogue.
 * @access private
 * @since 1.0.0
 * @returns {PlanningCatalogueState} Empty request.
 */
const emptyCatalogue = (): PlanningCatalogueState => ({
  page: 0,
  total: 0,
  loaded: 0,
  callState: idleCallState(),
});
/** Function mergeOptions
 * @description Retains selected labels from previous pages and searches without duplicating values.
 * @access private
 * @since 1.0.0
 * @param {readonly T[]} current - Cached options.
 * @param {readonly T[]} next - Received options.
 * @returns {T[]} Merged options.
 */
const mergeOptions = <T extends SelectOption>(current: readonly T[], next: readonly T[]): T[] => [
  ...new Map([...current, ...next].map((value) => [value.value, value])).values(),
];

/** Store InterventionPlanningOptionsStore
 * @description Independent paginated catalogues. Successful sources are usable immediately; searches preserve cached selected labels.
 * @since 1.0.0
 */
export const InterventionPlanningOptionsStore = signalStore(
  withState(INITIAL_STATE),
  withComputed((store) => ({
    loading: computed(() => store.loadCallState().status === 'pending'),
    loadError: computed(() => store.loadCallState().error),
    selectionFailed: computed(() =>
      Object.values(store.selectionCallStates()).some((state) => state.status === 'error'),
    ),
    hasTemplates: computed(() => store.templates().length > 0),
  })),
  withMethods(
    (
      store,
      dispatcher = inject(Dispatcher),
      facilities = inject(FacilityService),
      equipment = inject(EquipmentService),
      members = inject(OrganizationMemberService),
      labels = inject(InterventionLabelService),
      templates = inject(InterventionTemplateService),
    ) => {
      let organization: string | null = null;
      let generation = 0;
      let labelsStatus = idleCallState();
      const requests: Partial<Record<PlanningCatalogueKind, number>> = {};
      /** Method summarize
       * @description Reports overall degradation without replacing each source's request state.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const summarize = (): void => {
        const states = [
          ...Object.values(store.catalogues()).map((value) => value.callState),
          labelsStatus,
        ];
        patchState(store, {
          loadCallState: states.some((state) => state.status === 'pending')
            ? pendingCallState()
            : states.every((state) => state.status === 'error')
              ? errorCallState(
                  states[0].error ?? toStoreError(new Error('Planning options unavailable')),
                )
              : successCallState(null),
        });
      };
      const loadLabels = rxMethod<string>(
        pipe(
          mergeMap((org) => {
            const expected = generation;
            labelsStatus = pendingCallState();
            return labels.list(`/api/organizations/${org}`).pipe(
              tapResponse({
                next: (collection) => {
                  if (expected === generation) {
                    labelsStatus = successCallState(null);
                    patchState(store, { labels: collection.member });
                    summarize();
                  }
                },
                error: (error: unknown) => {
                  if (expected === generation) {
                    labelsStatus = errorCallState(toStoreError(error));
                    summarize();
                  }
                },
              }),
            );
          }),
        ),
      );
      const loadPage = rxMethod<{
        kind: PlanningCatalogueKind;
        search?: string;
        restart?: boolean;
      }>(
        pipe(
          mergeMap(({ kind, search, restart }) => {
            const org = organization;
            const previous = store.catalogues()[kind] ?? emptyCatalogue();
            if (
              !org ||
              (!restart &&
                (previous.callState.status === 'pending' ||
                  (previous.page > 0 && previous.loaded >= previous.total)))
            )
              return EMPTY;
            const expected = generation;
            const sequence = (requests[kind] = (requests[kind] ?? 0) + 1);
            const query = search ?? previous.search ?? '';
            const baseline = restart ? { ...emptyCatalogue(), search: query } : previous;
            const page = baseline.page + 1;
            const options = { page, itemsPerPage: 100 };
            patchState(store, {
              catalogues: {
                ...store.catalogues(),
                [kind]: { ...baseline, callState: pendingCallState() },
              },
            });
            summarize();
            let source: Observable<{
              total: number;
              count: number;
              values: readonly SelectOption[];
              memberValues?: readonly MemberSelectOption[];
              templateValues?: readonly InterventionTemplateOutput[];
            }>;
            if (kind === 'sites' || kind === 'facilities')
              source = facilities
                .list(org, {
                  ...options,
                  ...(query ? { search: query } : {}),
                  ...(kind === 'sites' ? { rootsOnly: true } : {}),
                })
                .pipe(
                  map((collection) => ({
                    total: collection.totalItems,
                    count: collection.member.length,
                    values: collection.member.map((item) => ({
                      value: `/api/facilities/${item.id}`,
                      label: item.name,
                    })),
                  })),
                );
            else if (kind === 'equipment')
              source = equipment
                .list(org, { ...options, ...(query ? { params: { search: query } } : {}) })
                .pipe(
                  map((collection) => ({
                    total: collection.totalItems,
                    count: collection.member.length,
                    values: collection.member.map((item) => ({
                      value: `/api/equipment/${item.id}`,
                      label: [
                        EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === item.type)
                          ?.label ?? item.type,
                        item.serialNumber,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    })),
                  })),
                );
            else if (kind === 'members')
              source = (
                query ? members.list(org, options, { search: query }) : members.list(org, options)
              ).pipe(
                map((collection) => ({
                  total: collection.totalItems,
                  count: collection.member.length,
                  values: [],
                  memberValues: collection.member.map((item) => toMemberSelectOption(item, org)),
                })),
              );
            else
              source = templates
                .list(`/api/organizations/${org}`, {
                  ...options,
                  ...(query ? { search: query } : {}),
                })
                .pipe(
                  map((collection) => ({
                    total: collection.totalItems,
                    count: collection.member.length,
                    values: [],
                    templateValues: collection.member,
                  })),
                );
            return source.pipe(
              tapResponse({
                next: (result) => {
                  if (expected !== generation || requests[kind] !== sequence) return;
                  const catalogues = {
                    ...store.catalogues(),
                    [kind]: {
                      page,
                      search: query,
                      total: result.total,
                      loaded: baseline.loaded + result.count,
                      callState: successCallState(null),
                    },
                  };
                  if (kind === 'sites')
                    patchState(store, {
                      catalogues,
                      sites: mergeOptions(store.sites(), result.values),
                    });
                  else if (kind === 'members')
                    patchState(store, {
                      catalogues,
                      members: mergeOptions(store.members(), result.memberValues ?? []),
                    });
                  else if (kind === 'templates')
                    patchState(store, {
                      catalogues,
                      templates: [
                        ...new Map(
                          [...store.templates(), ...(result.templateValues ?? [])].map((item) => [
                            item.id,
                            item,
                          ]),
                        ).values(),
                      ],
                    });
                  else
                    patchState(store, {
                      catalogues,
                      targets: mergeOptions(store.targets(), result.values),
                    });
                  summarize();
                },
                error: (error: unknown) => {
                  if (expected !== generation || requests[kind] !== sequence) return;
                  const failure = toStoreError(error);
                  patchState(store, {
                    catalogues: {
                      ...store.catalogues(),
                      [kind]: { ...baseline, callState: errorCallState(failure) },
                    },
                  });
                  summarize();
                  dispatcher.dispatch(
                    interventionPlanningOptionsStoreEvents.loadFailed(
                      toStoreFailureEventPayload(
                        failure,
                        'Some planning options could not be loaded',
                      ),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      );
      /** Method initialize
       * @description Loads missing sources only, retaining selections when another form opens in the same organization.
       * @access private
       * @since 1.0.0
       * @param {string | null} org - Organization.
       * @param {readonly PlanningCatalogueKind[]} kinds - Required sources.
       * @returns {void}
       */
      const initialize = (org: string | null, kinds: readonly PlanningCatalogueKind[]): void => {
        if (org !== organization) {
          organization = org;
          generation++;
          labelsStatus = idleCallState();
          patchState(store, INITIAL_STATE);
        }
        if (!org) {
          patchState(store, { loadCallState: successCallState(null) });
          return;
        }
        const missing = kinds.filter(
          (kind) =>
            !store.catalogues()[kind] || store.catalogues()[kind]?.callState.status === 'error',
        );
        patchState(store, {
          catalogues: {
            ...store.catalogues(),
            ...Object.fromEntries(missing.map((kind) => [kind, emptyCatalogue()])),
          },
        });
        for (const kind of missing) loadPage({ kind });
        if (labelsStatus.status === 'idle' || labelsStatus.status === 'error') loadLabels(org);
      };
      /**
       * Method loadSelection
       * @description Resolves a selected site or member independently of catalogue pagination, with scoped and deduplicated requests.
       * @access private
       * @since 1.0.0
       * @param {string} iri - Selected resource in the current organization.
       * @returns {void}
       */
      const loadSelection = rxMethod<string>(
        pipe(
          mergeMap((iri) => {
            const org = organization;
            if (!org || store.selectionCallStates()[iri]?.status === 'pending') return EMPTY;
            const siteMatch = /^\/api\/facilities\/([^/]+)$/.exec(iri);
            const memberPrefix = `/api/organizations/${org}/members/`;
            const memberId = iri.startsWith(memberPrefix) ? iri.slice(memberPrefix.length) : '';
            if (!siteMatch && (!memberId || memberId.includes('/'))) return EMPTY;
            if ([...store.sites(), ...store.members()].some((option) => option.value === iri))
              return EMPTY;
            const expected = generation;
            patchState(store, {
              selectionCallStates: { ...store.selectionCallStates(), [iri]: pendingCallState() },
            });
            const source: Observable<{ site?: SelectOption; member?: MemberSelectOption }> =
              siteMatch
                ? facilities
                    .get(org, siteMatch[1])
                    .pipe(map((item) => ({ site: { value: iri, label: item.name } })))
                : members
                    .get(org, memberId)
                    .pipe(map((item) => ({ member: toMemberSelectOption(item, org) })));
            return source.pipe(
              tapResponse({
                next: ({ site, member }) => {
                  if (expected !== generation) return;
                  patchState(store, {
                    selectionCallStates: {
                      ...store.selectionCallStates(),
                      [iri]: successCallState(null),
                    },
                    ...(site && !store.sites().some((option) => option.value === iri)
                      ? { sites: mergeOptions(store.sites(), [site]) }
                      : {}),
                    ...(member && !store.members().some((option) => option.value === iri)
                      ? { members: mergeOptions(store.members(), [member]) }
                      : {}),
                  });
                },
                error: (error: unknown) => {
                  if (expected !== generation) return;
                  patchState(store, {
                    selectionCallStates: {
                      ...store.selectionCallStates(),
                      [iri]: errorCallState(toStoreError(error)),
                    },
                  });
                },
              }),
            );
          }),
        ),
      );
      const searchSequences: Partial<Record<PlanningCatalogueKind, number>> = {};
      return {
        /**
         * Method ensureSelected
         * @description Resolves existing site and member references without advancing catalogue pages or changing their totals.
         * @access public
         * @since 1.0.0
         * @param {string | null} org - Owning organization.
         * @param {readonly (string | null | undefined)[]} iris - Existing selections.
         * @returns {void}
         */
        ensureSelected(org: string | null, iris: readonly (string | null | undefined)[]): void {
          initialize(org, []);
          for (const iri of new Set(iris)) if (iri) loadSelection(iri);
        },
        /**
         * Method loadCreationOptions
         * @description Loads the independent sources needed for creation and filtering.
         * @access public
         * @since 1.0.0
         * @param {string | null} org - Organization.
         * @returns {void}
         */
        loadCreationOptions(org: string | null): void {
          initialize(org, ['sites', 'members', 'templates']);
        },
        /**
         * Method loadWorkspaceOptions
         * @description Loads preparation sources while preserving existing selections.
         * @access public
         * @since 1.0.0
         * @param {string | null} org - Organization.
         * @returns {void}
         */
        loadWorkspaceOptions(org: string | null): void {
          initialize(org, ['sites', 'members', 'facilities', 'equipment']);
        },
        /**
         * Method loadMore
         * @description Fetches the next page for the current source query.
         * @access public
         * @since 1.0.0
         * @param {PlanningCatalogueKind} kind - Source.
         * @returns {void}
         */
        loadMore(kind: PlanningCatalogueKind): void {
          loadPage({ kind });
        },
        /**
         * Method search
         * @description Debounces remote searches independently and ignores obsolete queries or organization contexts.
         * @access public
         * @since 1.0.0
         * @param {PlanningCatalogueRequest} request - Source and text.
         * @returns {void}
         */
        search: rxMethod<PlanningCatalogueRequest>(
          pipe(
            mergeMap(({ kind, search = '' }) => {
              const sequence = (searchSequences[kind] = (searchSequences[kind] ?? 0) + 1);
              const expected = generation;
              return timer(250).pipe(
                map(() => {
                  if (
                    sequence === searchSequences[kind] &&
                    expected === generation &&
                    search.trim() !== (store.catalogues()[kind]?.search ?? '')
                  )
                    loadPage({ kind, search: search.trim(), restart: true });
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
);
/**
 * Type InterventionPlanningOptionsStoreType
 * @description Injectable planning catalogue store instance.
 * @since 1.0.0
 */
export type InterventionPlanningOptionsStoreType = InstanceType<
  typeof InterventionPlanningOptionsStore
>;
