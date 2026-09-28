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
  removeAllEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  debounceTime,
  defaultIfEmpty,
  defer,
  EMPTY,
  exhaustMap,
  expand,
  filter,
  forkJoin,
  pipe,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer,
  type Observable,
} from 'rxjs';
import { MercureService } from '@core/mercure';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import {
  PRESENCE_FRESHNESS_MS,
  PRESENCE_PING_BACKOFF_MS,
} from '@features/organization/constants/presence';
import { PresenceService } from '@features/organization/data-access';
import type { PresenceStatus, PresenceSubscriptionOutput } from '@features/organization/models';
import { chunkMemberIds } from '@features/organization/utils/presence';
import type { MemberPresenceEntry, MemberPresenceState } from './models/state.interface';

/**
 * Constant INITIAL_STATE
 * @description Empty session state; presence is never seeded during SSR.
 * @since 1.0.0
 * @type {MemberPresenceState}
 */
const INITIAL_STATE: MemberPresenceState = {
  organizationId: null,
  sessionRevision: -1,
  canRead: false,
  running: false,
  ownMemberId: null,
  ownFreshUntil: 0,
  watched: [],
  clock: 0,
  realtimeTopic: null,
  listCallState: idleCallState(),
  pingCallState: idleCallState(),
  subscriptionCallState: idleCallState(),
};

/**
 * Store MemberPresenceStore
 * @description Root state shared by organization surfaces. Requests and streams are cancelled before
 * context replacement; periodic reconciliation repairs missed push events and expired cache entries.
 * @since 1.0.0
 */
export const MemberPresenceStore = signalStore(
  { providedIn: 'root' },
  withEntities({ entity: type<MemberPresenceEntry>(), collection: 'presence' }),
  withState<MemberPresenceState>(INITIAL_STATE),
  withComputed((store) => ({
    byId: computed<Readonly<Record<string, PresenceStatus>>>(() => {
      const result: Record<string, PresenceStatus> = {};
      if (!store.running()) return result;
      for (const entry of store.presenceEntities()) {
        if (entry.freshUntil > store.clock() && store.watched().includes(entry.memberId)) {
          result[entry.memberId] = entry.status;
        }
      }
      return result;
    }),
    ownStatus: computed<PresenceStatus | null>(() => {
      const memberId = store.ownMemberId();
      if (!store.organizationId() || !memberId) return null;
      if (!store.running()) return null;
      const entry = store.presenceEntityMap()[memberId];
      if (entry && entry.freshUntil > store.clock()) return entry.status;
      return store.ownFreshUntil() > store.clock() ? 'active' : null;
    }),
  })),
  withMethods(
    (
      store,
      api = inject(PresenceService),
      mercure = inject(MercureService),
      platform = inject(PLATFORM_ID),
    ) => {
      const invalidated = new Subject<void>();
      let generation = 0;
      let pingPausedUntil = 0;

      /**
       * Constant refresh
       * @description Replaces the currently watched snapshot, cancelling an older read when the set changes.
       * @since 1.0.0
       */
      const refresh = rxMethod<void>(
        pipe(
          switchMap(() => {
            const organization = store.organizationId();
            if (
              !isPlatformBrowser(platform) ||
              !store.running() ||
              !store.canRead() ||
              !organization
            )
              return EMPTY;
            const batches = chunkMemberIds(store.watched());
            if (batches.length === 0) {
              patchState(store, removeAllEntities({ collection: 'presence' }), {
                listCallState: idleCallState(),
              });
              return EMPTY;
            }
            const requestGeneration = generation;
            patchState(store, { listCallState: pendingCallState() });
            return forkJoin(batches.map((memberIds) => api.list({ organization, memberIds }))).pipe(
              takeUntil(invalidated),
              tapResponse({
                next: (responses) => {
                  if (requestGeneration !== generation) return;
                  const now = Date.now();
                  const entries = responses
                    .flatMap((response) => response.member)
                    .map((entry): MemberPresenceEntry =>
                      Object.assign({}, entry, {
                        freshUntil: now + PRESENCE_FRESHNESS_MS,
                      }),
                    );
                  patchState(
                    store,
                    setAllEntities(entries, {
                      collection: 'presence',
                      selectId: (entry) => entry.memberId,
                    }),
                    {
                      clock: now,
                      listCallState: successCallState(undefined),
                    },
                  );
                },
                error: (error: unknown) => {
                  if (requestGeneration === generation)
                    patchState(store, { listCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );

      /**
       * Constant ping
       * @description Acknowledges this member without modifying their account preference or another device's lease.
       * @since 1.0.0
       */
      const ping = rxMethod<void>(
        pipe(
          exhaustMap(() => {
            const organization = store.organizationId();
            if (
              !isPlatformBrowser(platform) ||
              !store.running() ||
              !organization ||
              Date.now() < pingPausedUntil
            )
              return EMPTY;
            const requestGeneration = generation;
            patchState(store, { pingCallState: pendingCallState() });
            return api.ping({ organization }).pipe(
              takeUntil(invalidated),
              tapResponse({
                next: (result) => {
                  if (requestGeneration !== generation) return;
                  const now = Date.now();
                  patchState(store, removeEntity(result.memberId, { collection: 'presence' }), {
                    ownMemberId: result.memberId,
                    ownFreshUntil: now + PRESENCE_FRESHNESS_MS,
                    clock: now,
                    pingCallState: successCallState(result),
                  });
                  refresh();
                },
                error: (error: unknown) => {
                  if (requestGeneration !== generation) return;
                  const failure = toStoreError(error);
                  if (failure.code === 429) pingPausedUntil = Date.now() + PRESENCE_PING_BACKOFF_MS;
                  patchState(store, { pingCallState: errorCallState(failure) });
                },
              }),
            );
          }),
        ),
      );

      /**
       * Function requestSubscription
       * @description A failed renewal emits null so the renewal loop survives while retaining the existing socket.
       * @access private
       * @since 1.0.0
       * @param {string} organization - Current organization.
       * @param {number} requestGeneration - Session and organization generation.
       * @returns {Observable<PresenceSubscriptionOutput | null>} Fresh credentials or a recoverable failure.
       */
      function requestSubscription(
        organization: string,
        requestGeneration: number,
      ): Observable<PresenceSubscriptionOutput | null> {
        return defer(() => {
          patchState(store, { subscriptionCallState: pendingCallState() });
          return api.getSubscription(organization).pipe(
            tapResponse({
              next: (result) => {
                if (generation === requestGeneration)
                  patchState(store, { subscriptionCallState: successCallState(result) });
              },
              error: (error: unknown) => {
                if (generation === requestGeneration)
                  patchState(store, { subscriptionCallState: errorCallState(toStoreError(error)) });
              },
            }),
            defaultIfEmpty(null),
          );
        });
      }

      /**
       * Constant connect
       * @description One organization stream with credential renewal; events invalidate only tracked members.
       * @since 1.0.0
       */
      const connect = rxMethod<void>(
        pipe(
          switchMap(() => {
            const organization = store.organizationId();
            if (
              !isPlatformBrowser(platform) ||
              !store.running() ||
              !store.canRead() ||
              !organization
            )
              return EMPTY;
            const requestGeneration = generation;
            return requestSubscription(organization, requestGeneration).pipe(
              expand((subscription) => {
                const expiry = subscription ? Date.parse(subscription.expiresAt) : NaN;
                const delay = Number.isFinite(expiry)
                  ? Math.max(1_000, expiry - Date.now() - 60_000)
                  : 45_000;
                return timer(delay).pipe(
                  switchMap(() => requestSubscription(organization, requestGeneration)),
                );
              }),
              filter(
                (subscription): subscription is PresenceSubscriptionOutput => subscription !== null,
              ),
              switchMap((subscription) => {
                patchState(store, { realtimeTopic: subscription.topic });
                return mercure.subscribe<unknown>(subscription.topic, subscription.token).pipe(
                  filter((frame) => {
                    if (!frame || typeof frame !== 'object') return false;
                    const event = frame as Record<string, unknown>;
                    return (
                      event['type'] === 'presence.changed' &&
                      event['organizationId'] === organization &&
                      typeof event['memberId'] === 'string' &&
                      store.watched().includes(event['memberId'])
                    );
                  }),
                  debounceTime(300),
                  tap(() => refresh()),
                );
              }),
              takeUntil(invalidated),
            );
          }),
        ),
      );

      return {
        refresh,
        ping,
        /**
         * Method configure
         * @method configure
         * @description Invalidates the old context before accepting a new session, organization or permission scope.
         * @access public
         * @since 1.0.0
         * @param {string | null} organizationId - Selected organization with verified active membership.
         * @param {number} sessionRevision - Auth session identity.
         * @param {boolean} canRead - Presence read permission.
         * @returns {void}
         */
        configure(organizationId: string | null, sessionRevision: number, canRead: boolean): void {
          if (
            store.organizationId() === organizationId &&
            store.sessionRevision() === sessionRevision &&
            store.canRead() === canRead
          )
            return;
          generation += 1;
          invalidated.next();
          pingPausedUntil = 0;
          patchState(store, removeAllEntities({ collection: 'presence' }), {
            ...INITIAL_STATE,
            organizationId,
            sessionRevision,
            canRead,
            clock: Date.now(),
          });
        },
        /**
         * Method watch
         * @method watch
         * @description Replaces the aggregate set; a consumer-specific registry lives in the coordinator.
         * @access public
         * @since 1.0.0
         * @param {readonly string[]} memberIds - Current aggregate references.
         * @returns {void}
         */
        watch(memberIds: readonly string[]): void {
          const watched = chunkMemberIds(memberIds).flat().toSorted();
          if (watched.join(',') === store.watched().join(',')) return;
          patchState(store, { watched });
          refresh();
        },
        /**
         * Method resume
         * @method resume
         * @description Starts browser work once and acknowledges presence before normal interval ticks.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        resume(): void {
          if (!isPlatformBrowser(platform) || !store.organizationId() || store.running()) return;
          patchState(store, { running: true, clock: Date.now() });
          ping();
          refresh();
          connect();
        },
        /**
         * Method pause
         * @method pause
         * @description Cancels all pending work and releases the stream without deleting a shared server heartbeat.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        pause(): void {
          if (!store.running()) return;
          generation += 1;
          invalidated.next();
          patchState(store, { running: false, realtimeTopic: null, clock: Date.now() });
        },
        /**
         * Method tick
         * @method tick
         * @description Advances freshness even when API requests fail.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        tick(): void {
          patchState(store, { clock: Date.now() });
        },
      };
    },
  ),
  withHooks((store, mercure = inject(MercureService)) => ({
    onInit(): void {
      let previous: string | null = null;
      effect(() => {
        const topic = store.realtimeTopic();
        const status = topic ? mercure.status().get(topic) : null;
        const identity = topic ? `${topic}:${status}` : null;
        if (status === 'connected' && identity !== previous) untracked(() => store.refresh());
        previous = identity;
      });
    },
    onDestroy(): void {
      store.pause();
    },
  })),
);

/**
 * Type MemberPresenceStoreType
 * @type {MemberPresenceStoreType}
 * @description Injectable member presence store instance.
 * @since 1.0.0
 */
export type MemberPresenceStoreType = InstanceType<typeof MemberPresenceStore>;
