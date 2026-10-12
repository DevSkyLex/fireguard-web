import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { computed, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
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
import { defer, of, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { PasswordPolicyService } from '@features/auth/data-access';
import type { PasswordPolicyOutput } from '@features/auth/models';

/**
 * Constant POLICY_TRANSFER_KEY
 *
 * @description
 * Identifies the public policy metadata handed from SSR to the browser.
 */
const POLICY_TRANSFER_KEY = makeStateKey<PasswordPolicyOutput | null>('auth-password-policy');

/**
 * Constant PasswordPolicyStore
 *
 * @description
 * Page-owned public policy. Every SSR request gets its own instance and no private data is
 * transferred.
 */
export const PasswordPolicyStore = signalStore(
  withState({
    policyCallState: idleCallState<PasswordPolicyOutput>() as CallState<PasswordPolicyOutput>,
  }),
  withComputed((store) => ({
    policy: computed(() =>
      store.policyCallState().status === 'success' ? store.policyCallState().data : null,
    ),
  })),
  withMethods(
    (
      store,
      service = inject(PasswordPolicyService),
      transfer = inject(TransferState),
      platform = inject(PLATFORM_ID),
    ) => ({
      load: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { policyCallState: pendingCallState() })),
          switchMap(() =>
            defer(() => {
              if (isPlatformBrowser(platform) && transfer.hasKey(POLICY_TRANSFER_KEY)) {
                const policy = transfer.get(POLICY_TRANSFER_KEY, null);
                transfer.remove(POLICY_TRANSFER_KEY);
                if (policy) return of(policy);
              }
              return service.policy();
            }).pipe(
              tapResponse({
                next: (policy) => {
                  if (isPlatformServer(platform)) transfer.set(POLICY_TRANSFER_KEY, policy);
                  patchState(store, { policyCallState: successCallState(policy) });
                },
                error: (error: unknown) =>
                  patchState(store, { policyCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
    }),
  ),
  withHooks({
    onInit(store): void {
      store.load();
    },
  }),
);
/**
 * Type PasswordPolicyStore
 *
 * @description
 * Keeps the published public password policy within the current page and SSR request.
 *
 * @type {InstanceType<typeof PasswordPolicyStore>}
 */
export type PasswordPolicyStore = InstanceType<typeof PasswordPolicyStore>;
