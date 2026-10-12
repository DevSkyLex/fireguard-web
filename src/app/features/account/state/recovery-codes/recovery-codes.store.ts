import { computed, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, takeUntil, tap } from 'rxjs';
import {
  WriteOperationService,
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type WriteOperation,
} from '@core/request-state';
import { TotpService } from '@features/account/data-access';
import type { RecoveryCodesStatusOutput } from '@features/account/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { authStoreEvents } from '@features/auth/state';

/**
 * Constant RecoveryCodesStore
 *
 * @description
 * Page-scoped recovery workflow. Code values never enter events, TransferState or browser storage.
 */
export const RecoveryCodesStore = signalStore(
  withState({
    statusCallState: idleCallState<RecoveryCodesStatusOutput>(),
    generateCallState: idleCallState<void>(),
    codes: [] as readonly string[],
  }),
  withComputed((store) => ({
    pending: computed(() => store.generateCallState().status === 'pending'),
  })),
  withMethods(
    (
      store,
      service = inject(TotpService),
      operations = inject(WriteOperationService),
      session = inject(AUTH_SESSION_PORT),
      events = inject(Events),
    ) => {
      let displayRevision = 0;
      let attempt: { code: string; scope: number; operation: WriteOperation } | null = null;
      return {
        load: rxMethod<void>(
          pipe(
            tap(() => patchState(store, { statusCallState: pendingCallState() })),
            switchMap(() =>
              service.recoveryStatus().pipe(
                takeUntil(
                  events.on(authStoreEvents.sessionEnded, authStoreEvents.sessionInvalidated),
                ),
                tapResponse({
                  next: (status) =>
                    patchState(store, { statusCallState: successCallState(status) }),
                  error: (error: unknown) =>
                    patchState(store, { statusCallState: errorCallState(toStoreError(error)) }),
                }),
              ),
            ),
          ),
        ),
        generate: rxMethod<string>(
          pipe(
            exhaustMap((code) => {
              const currentDisplay = displayRevision;
              const currentSession = session.sessionRevision();
              if (!attempt || attempt.code !== code || attempt.scope !== currentSession)
                attempt = { code, scope: currentSession, operation: operations.create() };
              patchState(store, { codes: [], generateCallState: pendingCallState() });
              return service
                .generateRecoveryCodes(code, { idempotencyKey: attempt.operation.idempotencyKey })
                .pipe(
                  takeUntil(
                    events.on(authStoreEvents.sessionEnded, authStoreEvents.sessionInvalidated),
                  ),
                  tapResponse({
                    next: (result) => {
                      if (
                        displayRevision !== currentDisplay ||
                        session.sessionRevision() !== currentSession
                      )
                        return;
                      attempt = null;
                      patchState(store, {
                        codes: result.codes,
                        generateCallState: successCallState(undefined),
                        statusCallState: successCallState({
                          '@id': result['@id'],
                          '@type': result['@type'],
                          remainingCount: result.codes.length,
                          generatedAt: result.generatedAt,
                        }),
                      });
                    },
                    error: (error: unknown) => {
                      if (
                        displayRevision !== currentDisplay ||
                        session.sessionRevision() !== currentSession
                      )
                        return;
                      patchState(store, {
                        codes: [],
                        generateCallState: errorCallState(toStoreError(error)),
                      });
                    },
                  }),
                );
            }),
          ),
        ),
        clear(): void {
          displayRevision++;
          attempt = null;
          patchState(store, {
            codes: [],
            generateCallState: idleCallState(),
            statusCallState: idleCallState(),
          });
        },
      };
    },
  ),
  withHooks({
    onInit(store, events = inject(Events), session = inject(AUTH_SESSION_PORT)): void {
      let observedRevision = session.sessionRevision();
      effect(() => {
        const revision = session.sessionRevision();
        if (revision === observedRevision) return;
        observedRevision = revision;
        untracked(() => store.clear());
      });
      events
        .on(authStoreEvents.sessionEnded, authStoreEvents.sessionInvalidated)
        .pipe(takeUntilDestroyed())
        .subscribe(() => store.clear());
    },
    onDestroy(store): void {
      store.clear();
    },
  }),
);
/**
 * Type RecoveryCodesStore
 *
 * @description
 * Keeps recovery metadata and one-time generated codes within the current security page.
 *
 * @type {InstanceType<typeof RecoveryCodesStore>}
 */
export type RecoveryCodesStore = InstanceType<typeof RecoveryCodesStore>;
