import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, finalize, mergeMap, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { PresencePreferenceService } from '@features/account/data-access';
import type {
  PresencePreferenceInput,
  PresencePreferenceOutput,
} from '@features/account/models/presence-preference';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { presencePreferenceStoreEvents } from './events';
import type { PresencePreferenceState } from './models/state.interface';

/**
 * Constant INITIAL_STATE
 * @const INITIAL_STATE
 * @description No preference is inferred until the server confirms it.
 * @since 1.0.0
 * @type {PresencePreferenceState}
 */
const INITIAL_STATE: PresencePreferenceState = {
  preference: null,
  active: false,
  loadCallState: idleCallState(),
  saveCallState: idleCallState(),
  subscriptionCallState: idleCallState(),
};

/**
 * Store PresencePreferenceStore
 * @const PresencePreferenceStore
 * @description Session-scoped global NPD preference. Writes finish in their original session,
 * never optimistically change presence, and cannot overwrite a newer server revision.
 * @since 1.0.0
 */
export const PresencePreferenceStore = signalStore(
  { providedIn: 'root' },
  withState<PresencePreferenceState>(INITIAL_STATE),
  withComputed((store) => ({
    doNotDisturb: computed(() => store.preference()?.doNotDisturb ?? false),
    invisible: computed(() => store.preference()?.invisible ?? false),
    isSaving: computed(() => store.saveCallState().status === 'pending'),
    available: computed(() => store.active() && store.preference() !== null),
  })),
  withMethods(
    (
      store,
      api = inject(PresencePreferenceService),
      session = inject(AUTH_SESSION_PORT),
      dispatcher = inject(Dispatcher),
    ) => {
      let owner = session.sessionRevision();
      let generation = 0;
      let loadPausedUntil = 0;
      let subscriptionPausedUntil = 0;
      const saving = new Set<number>();

      /**
       * Function accept
       * @description Applies only forward-moving canonical revisions for this account.
       * @since 1.0.0
       * @param {Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>} value - Validated server preference.
       * @returns {void}
       */
      function accept(
        value: Pick<PresencePreferenceOutput, 'doNotDisturb' | 'revision' | 'invisible'>,
      ): void {
        if (
          !Number.isSafeInteger(value.revision) ||
          value.revision < 0 ||
          typeof value.doNotDisturb !== 'boolean' ||
          (value.invisible !== undefined && typeof value.invisible !== 'boolean')
        )
          return;
        if (value.revision < (store.preference()?.revision ?? -1)) return;
        patchState(store, {
          preference: {
            doNotDisturb: value.doNotDisturb && !value.invisible,
            revision: value.revision,
            invisible: value.invisible ?? false,
          },
        });
      }

      const load = rxMethod<void | null>(
        pipe(
          switchMap((request) => {
            if (request === null || !store.active() || Date.now() < loadPausedUntil) return EMPTY;
            const revision = owner;
            const epoch = generation;
            patchState(store, {
              loadCallState: pendingCallState(store.loadCallState().data ?? undefined),
            });
            return api.getPreference().pipe(
              tapResponse({
                next: (value) => {
                  if (revision !== session.sessionRevision() || epoch !== generation) return;
                  accept(value);
                  patchState(store, { loadCallState: successCallState(value) });
                },
                error: (error: unknown) => {
                  if (revision !== session.sessionRevision() || epoch !== generation) return;
                  const normalized = toStoreError(error);
                  if (normalized.code === 429) loadPausedUntil = Date.now() + 60_000;
                  patchState(store, {
                    loadCallState: errorCallState(
                      normalized,
                      store.loadCallState().data ?? undefined,
                    ),
                  });
                },
              }),
            );
          }),
        ),
      );

      const subscribe = rxMethod<void | null>(
        pipe(
          switchMap((request) => {
            if (request === null || !store.active() || Date.now() < subscriptionPausedUntil)
              return EMPTY;
            const revision = owner;
            const epoch = generation;
            patchState(store, {
              subscriptionCallState: pendingCallState(
                store.subscriptionCallState().data ?? undefined,
              ),
            });
            return api.getSubscription().pipe(
              tapResponse({
                next: (value) => {
                  if (revision !== session.sessionRevision() || epoch !== generation) return;
                  patchState(store, { subscriptionCallState: successCallState(value) });
                },
                error: (error: unknown) => {
                  if (revision !== session.sessionRevision() || epoch !== generation) return;
                  const normalized = toStoreError(error);
                  if (normalized.code === 429) subscriptionPausedUntil = Date.now() + 60_000;
                  patchState(store, {
                    subscriptionCallState: errorCallState(
                      normalized,
                      store.subscriptionCallState().data ?? undefined,
                    ),
                  });
                },
              }),
            );
          }),
        ),
      );

      const save = rxMethod<Partial<PresencePreferenceInput>>(
        pipe(
          mergeMap((input) => {
            const revision = session.sessionRevision();
            if (revision !== owner || !store.available() || saving.has(revision)) return EMPTY;
            saving.add(revision);
            patchState(store, { saveCallState: pendingCallState() });
            return api.updatePreference(input).pipe(
              tapResponse({
                next: (value) => {
                  if (revision !== session.sessionRevision()) return;
                  accept(value);
                  patchState(store, { saveCallState: successCallState(value) });
                },
                error: (error: unknown) => {
                  if (revision !== session.sessionRevision()) return;
                  const normalized = toStoreError(error);
                  patchState(store, { saveCallState: errorCallState(normalized) });
                  dispatcher.dispatch(
                    presencePreferenceStoreEvents.saveFailed(
                      toStoreFailureEventPayload(
                        normalized,
                        $localize`:@@account.presence.saveError:Your presence preference could not be saved.`,
                      ),
                    ),
                  );
                },
              }),
              finalize(() => saving.delete(revision)),
            );
          }),
        ),
      );

      return {
        load,
        subscribe,
        /** @description Clears both special modes in one confirmed write. */
        setActive(): void {
          save({ doNotDisturb: false, invisible: false });
        },
        /**
         * Method setContext
         * @method setContext
         * @description Cancels obsolete reads and forgets all private state on session replacement.
         * @access public
         * @since 1.0.0
         * @param {number} revision - Local authenticated session revision.
         * @param {boolean} active - Browser is hydrated, authenticated, visible and online.
         * @returns {void}
         */
        setContext(revision: number, active: boolean): void {
          if (owner !== revision) {
            owner = revision;
            generation += 1;
            load(null);
            subscribe(null);
            loadPausedUntil = 0;
            subscriptionPausedUntil = 0;
            patchState(store, INITIAL_STATE);
          }
          if (store.active() === active) return;
          generation += 1;
          patchState(store, { active });
          if (!active) {
            load(null);
            subscribe(null);
            patchState(store, {
              loadCallState: idleCallState(),
              subscriptionCallState: idleCallState(),
            });
          }
        },
        /**
         * Method applyRealtime
         * @method applyRealtime
         * @description Accepts a validated private preference frame only for its live session.
         * @access public
         * @since 1.0.0
         * @param {unknown} frame - Parsed Mercure frame.
         * @param {number} revision - Session that subscribed.
         * @returns {void}
         */
        applyRealtime(frame: unknown, revision: number): void {
          if (revision !== owner || revision !== session.sessionRevision() || !store.active())
            return;
          if (
            typeof frame !== 'object' ||
            frame === null ||
            !('type' in frame) ||
            frame.type !== 'presence.preference.changed'
          )
            return;
          if (
            !('doNotDisturb' in frame) ||
            typeof frame.doNotDisturb !== 'boolean' ||
            !('revision' in frame) ||
            typeof frame.revision !== 'number'
          )
            return;
          if ('invisible' in frame && typeof frame.invisible !== 'boolean') return;
          accept({
            doNotDisturb: frame.doNotDisturb,
            revision: frame.revision,
            invisible: 'invisible' in frame ? (frame.invisible as boolean) : false,
          });
        },
        /**
         * Method setDoNotDisturb
         * @method setDoNotDisturb
         * @description Saves one confirmed boolean, with an independent in-flight gate per session.
         * @access public
         * @since 1.0.0
         * @param {boolean} doNotDisturb - Desired global preference.
         * @returns {void}
         */
        setDoNotDisturb(doNotDisturb: boolean): void {
          save(doNotDisturb ? { doNotDisturb: true, invisible: false } : { doNotDisturb: false });
        },
        /**
         * Method setInvisible
         * @method setInvisible
         * @description Activating visibility mode disables NPD in the same confirmed write.
         * @access public
         * @since 1.0.0
         * @param {boolean} invisible - Whether to appear offline.
         * @returns {void}
         */
        setInvisible(invisible: boolean): void {
          save(invisible ? { invisible: true, doNotDisturb: false } : { invisible: false });
        },
      };
    },
  ),
);

/**
 * Type PresencePreferenceStore
 * @type PresencePreferenceStore
 * @description Injectable account preference store instance.
 * @since 1.0.0
 */
export type PresencePreferenceStore = InstanceType<typeof PresencePreferenceStore>;
