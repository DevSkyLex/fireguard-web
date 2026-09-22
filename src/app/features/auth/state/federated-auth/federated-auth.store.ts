import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { computed, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
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
import { defer, exhaustMap, of, pipe, Subject, switchMap, takeUntil, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import { FederatedAuthService } from '@features/auth/data-access';
import type {
  FederatedCompleteInput,
  FederatedConnectionsOutput,
  FederatedProvider,
  FederatedProviderOutput,
  FederatedStartOutput,
  LoginOutput,
  PasswordSetupChallengeOutput,
  PasswordSetupConfirmInput,
  PasswordSetupConfirmOutput,
} from '@features/auth/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { FederatedReturnContextService } from '@features/auth/services';
import { authStoreEvents } from '../auth';
import type { FederatedAuthState } from './models';

/**
 * Constant PROVIDERS_TRANSFER_KEY
 * @readonly
 *
 * @description
 * Small SSR handoff containing only public provider availability.
 *
 * @since 1.0.0
 * @type {StateKey<readonly FederatedProviderOutput[]>}
 */
const PROVIDERS_TRANSFER_KEY = makeStateKey<readonly FederatedProviderOutput[]>(
  'auth-federated-providers',
);

/**
 * Constant INITIAL_STATE
 * @readonly
 *
 * @description
 * Independent request states for discovery, callbacks, connection changes and
 * first-password setup.
 *
 * @since 1.0.0
 * @type {FederatedAuthState}
 */
const INITIAL_STATE: FederatedAuthState = {
  providers: [],
  connections: null,
  pendingProvider: null,
  providersCallState: idleCallState(),
  startCallState: idleCallState(),
  completeLoginCallState: idleCallState(),
  connectionsCallState: idleCallState(),
  completeLinkCallState: idleCallState(),
  disconnectCallState: idleCallState(),
  passwordSetupRequestCallState: idleCallState(),
  passwordSetupConfirmCallState: idleCallState(),
} as const;

/**
 * Store FederatedAuthStore
 *
 * @description
 * Owns provider availability, full-page redirect starts, one-time callback
 * completion, connected identities and first-password setup. Only public
 * provider availability crosses the SSR boundary. Callback completion belongs
 * to the initiating session revision and is cancelled when reset or cleared.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FederatedAuthStore = signalStore(
  { providedIn: 'root' },
  withState<FederatedAuthState>(INITIAL_STATE),
  withComputed((store) => ({
    enabledProviders: computed<readonly FederatedProvider[]>(() =>
      store
        .providers()
        .filter((item: FederatedProviderOutput) => item.enabled)
        .map((item: FederatedProviderOutput) => item.provider),
    ),
    providersLoading: computed<boolean>(() => store.providersCallState().status === 'pending'),
    startPending: computed<boolean>(() => store.startCallState().status === 'pending'),
    startUrl: computed<string | null>(() => store.startCallState().data?.authorization_url ?? null),
    completeLoginResult: computed<LoginOutput | null>(() => store.completeLoginCallState().data),
    completeLoginError: computed<StoreError | null>(() => store.completeLoginCallState().error),
    connectionsLoading: computed<boolean>(() => store.connectionsCallState().status === 'pending'),
    connectionsError: computed<StoreError | null>(() => store.connectionsCallState().error),
    completeLinkError: computed<StoreError | null>(() => store.completeLinkCallState().error),
    passwordConfigured: computed<boolean | null>(
      () => store.connections()?.password_configured ?? null,
    ),
    passwordSetupChallenge: computed<string | null>(
      () => store.passwordSetupRequestCallState().data?.challengeToken ?? null,
    ),
  })),
  withMethods(
    (
      store,
      service = inject(FederatedAuthService),
      transferState = inject(TransferState),
      platformId = inject(PLATFORM_ID),
      events = inject<Events>(Events),
      session = inject(AUTH_SESSION_PORT),
      returnContext = inject(FederatedReturnContextService),
    ) => {
      const startCancellation = new Subject<void>();
      const completionCancellation = new Subject<void>();

      return {
        loadProviders: rxMethod<void>(
          pipe(
            tap(() =>
              patchState(store, { providersCallState: pendingCallState(store.providers()) }),
            ),
            switchMap(() =>
              defer(() => {
                if (isPlatformBrowser(platformId) && transferState.hasKey(PROVIDERS_TRANSFER_KEY)) {
                  const providers = transferState.get(PROVIDERS_TRANSFER_KEY, []);
                  transferState.remove(PROVIDERS_TRANSFER_KEY);
                  return of(providers);
                }

                return service.providers().pipe(switchMap((collection) => of(collection.member)));
              }).pipe(
                tapResponse({
                  next: (providers: readonly FederatedProviderOutput[]) => {
                    if (isPlatformServer(platformId)) {
                      transferState.set(PROVIDERS_TRANSFER_KEY, providers);
                    }
                    patchState(store, {
                      providers,
                      providersCallState: successCallState(providers),
                    });
                  },
                  error: (error: unknown) =>
                    patchState(store, {
                      providersCallState: errorCallState(toStoreError(error), store.providers()),
                    }),
                }),
              ),
            ),
          ),
        ),

        startLogin: rxMethod<{ provider: FederatedProvider; returnUrl: string }>(
          pipe(
            tap(({ provider }) =>
              patchState(store, {
                pendingProvider: provider,
                startCallState: pendingCallState(),
              }),
            ),
            exhaustMap(({ provider, returnUrl }) =>
              service
                .startLogin(provider, { return_url: returnContext.resolve(returnUrl) || '/' })
                .pipe(
                  takeUntil(startCancellation),
                  tapResponse({
                    next: (result: FederatedStartOutput) =>
                      patchState(store, { startCallState: successCallState(result) }),
                    error: (error: unknown) =>
                      patchState(store, { startCallState: errorCallState(toStoreError(error)) }),
                  }),
                ),
            ),
          ),
        ),

        completeLogin: rxMethod<{ provider: FederatedProvider; input: FederatedCompleteInput }>(
          pipe(
            exhaustMap(({ provider, input }) => {
              const revision = session.sessionRevision();
              patchState(store, {
                pendingProvider: provider,
                completeLoginCallState: pendingCallState(),
              });
              return service.completeLogin(provider, input).pipe(
                takeUntil(completionCancellation),
                tapResponse({
                  next: (result: LoginOutput) => {
                    if (revision !== session.sessionRevision()) return;
                    patchState(store, { completeLoginCallState: successCallState(result) });
                  },
                  error: (error: unknown) => {
                    if (revision !== session.sessionRevision()) return;
                    patchState(store, {
                      completeLoginCallState: errorCallState(toStoreError(error)),
                    });
                  },
                }),
              );
            }),
          ),
        ),

        loadConnections: rxMethod<void>(
          pipe(
            tap(() =>
              patchState(store, {
                connectionsCallState: pendingCallState(store.connections()),
              }),
            ),
            switchMap(() =>
              service.connections().pipe(
                takeUntil(events.on(authStoreEvents.sessionEnded)),
                tapResponse({
                  next: (connections: FederatedConnectionsOutput) =>
                    patchState(store, {
                      connections,
                      connectionsCallState: successCallState(connections),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      connectionsCallState: errorCallState(
                        toStoreError(error),
                        store.connections(),
                      ),
                    }),
                }),
              ),
            ),
          ),
        ),

        startLink: rxMethod<FederatedProvider>(
          pipe(
            tap((provider) =>
              patchState(store, { pendingProvider: provider, startCallState: pendingCallState() }),
            ),
            exhaustMap((provider) =>
              service.startLink(provider).pipe(
                takeUntil(startCancellation),
                takeUntil(events.on(authStoreEvents.sessionEnded)),
                tapResponse({
                  next: (result: FederatedStartOutput) =>
                    patchState(store, { startCallState: successCallState(result) }),
                  error: (error: unknown) =>
                    patchState(store, { startCallState: errorCallState(toStoreError(error)) }),
                }),
              ),
            ),
          ),
        ),

        completeLink: rxMethod<{ provider: FederatedProvider; input: FederatedCompleteInput }>(
          pipe(
            tap(({ provider }) =>
              patchState(store, {
                pendingProvider: provider,
                completeLinkCallState: pendingCallState(store.connections()),
              }),
            ),
            exhaustMap(({ provider, input }) =>
              service.completeLink(provider, input).pipe(
                takeUntil(events.on(authStoreEvents.sessionEnded)),
                tapResponse({
                  next: (connections: FederatedConnectionsOutput) =>
                    patchState(store, {
                      connections,
                      completeLinkCallState: successCallState(connections),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      completeLinkCallState: errorCallState(
                        toStoreError(error),
                        store.connections(),
                      ),
                    }),
                }),
              ),
            ),
          ),
        ),

        disconnect: rxMethod<FederatedProvider>(
          pipe(
            tap((provider) =>
              patchState(store, {
                pendingProvider: provider,
                disconnectCallState: pendingCallState(),
              }),
            ),
            exhaustMap((provider) =>
              service.disconnect(provider).pipe(
                takeUntil(events.on(authStoreEvents.sessionEnded)),
                tapResponse({
                  next: (connections: FederatedConnectionsOutput) =>
                    patchState(store, {
                      connections,
                      connectionsCallState: successCallState(connections),
                      disconnectCallState: successCallState(connections),
                    }),
                  error: (error: unknown) =>
                    patchState(store, { disconnectCallState: errorCallState(toStoreError(error)) }),
                }),
              ),
            ),
          ),
        ),

        requestPasswordSetup: rxMethod<void>(
          pipe(
            tap(() => patchState(store, { passwordSetupRequestCallState: pendingCallState() })),
            exhaustMap(() =>
              service.requestPasswordSetup().pipe(
                takeUntil(events.on(authStoreEvents.sessionEnded)),
                tapResponse({
                  next: (result: PasswordSetupChallengeOutput) =>
                    patchState(store, {
                      passwordSetupRequestCallState: successCallState(result),
                    }),
                  error: (error: unknown) =>
                    patchState(store, {
                      passwordSetupRequestCallState: errorCallState(toStoreError(error)),
                    }),
                }),
              ),
            ),
          ),
        ),

        confirmPasswordSetup: rxMethod<PasswordSetupConfirmInput>(
          pipe(
            tap(() => patchState(store, { passwordSetupConfirmCallState: pendingCallState() })),
            exhaustMap((input) =>
              service.confirmPasswordSetup(input).pipe(
                takeUntil(events.on(authStoreEvents.sessionEnded)),
                tapResponse({
                  next: (result: PasswordSetupConfirmOutput) => {
                    patchState(store, {
                      passwordSetupConfirmCallState: successCallState(result),
                    });
                    if (result.success) {
                      const connections = store.connections();
                      patchState(store, {
                        connections: connections
                          ? { ...connections, password_configured: true }
                          : null,
                      });
                    }
                  },
                  error: (error: unknown) =>
                    patchState(store, {
                      passwordSetupConfirmCallState: errorCallState(toStoreError(error)),
                    }),
                }),
              ),
            ),
          ),
        ),

        resetStart(): void {
          startCancellation.next();
          patchState(store, { startCallState: idleCallState(), pendingProvider: null });
        },

        resetDisconnect(): void {
          patchState(store, { disconnectCallState: idleCallState(), pendingProvider: null });
        },

        resetCompleteLogin(): void {
          completionCancellation.next();
          patchState(store, { completeLoginCallState: idleCallState(), pendingProvider: null });
        },

        resetCompleteLink(): void {
          patchState(store, { completeLinkCallState: idleCallState(), pendingProvider: null });
        },

        resetPasswordSetup(): void {
          patchState(store, {
            passwordSetupRequestCallState: idleCallState(),
            passwordSetupConfirmCallState: idleCallState(),
          });
        },

        /**
         * Method clearSessionState
         * @method clearSessionState
         * @description Cancels pending redirects and purges account state and unconsumed return intent.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        clearSessionState(): void {
          completionCancellation.next();
          startCancellation.next();
          returnContext.clear();
          patchState(store, {
            connections: null,
            pendingProvider: null,
            startCallState: idleCallState(),
            completeLoginCallState: idleCallState(),
            connectionsCallState: idleCallState(),
            completeLinkCallState: idleCallState(),
            disconnectCallState: idleCallState(),
            passwordSetupRequestCallState: idleCallState(),
            passwordSetupConfirmCallState: idleCallState(),
          });
        },
      };
    },
  ),
  withHooks({
    onInit(store, events = inject<Events>(Events)): void {
      events
        .on(authStoreEvents.sessionEnded)
        .pipe(takeUntilDestroyed())
        .subscribe(() => store.clearSessionState());
    },
  }),
);

/**
 * Type FederatedAuthStore
 * @type FederatedAuthStore
 *
 * @description
 * Injectable instance type exposed by the federated authentication store.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type FederatedAuthStore = InstanceType<typeof FederatedAuthStore>;
