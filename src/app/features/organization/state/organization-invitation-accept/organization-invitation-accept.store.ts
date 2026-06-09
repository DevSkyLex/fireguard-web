import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/state/request-state';
import { OrganizationInvitationService } from '@features/organization/data-access';
import type { OrganizationMemberOutput } from '@features/organization/models';

/**
 * State owned by the invitation acceptance workflow.
 */
interface InvitationAcceptState {
  /** Request state for invitation acceptance. */
  readonly acceptCallState: CallState<OrganizationMemberOutput | null>;
}

/**
 * Store OrganizationInvitationAcceptStore
 *
 * @description
 * Page-scoped workflow store that accepts an organization invitation token.
 *
 * @since 1.0.0
 */
export const OrganizationInvitationAcceptStore = signalStore(
  withState<InvitationAcceptState>({ acceptCallState: idleCallState() }),
  withComputed((store) => ({
    /** Whether invitation acceptance is pending. */
    isAccepting: computed(() => store.acceptCallState().status === 'pending'),
  })),
  withMethods((store, invitationService = inject(OrganizationInvitationService)) => ({
    /** Accepts an organization invitation token. */
    accept: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { acceptCallState: pendingCallState() })),
        exhaustMap((token) =>
          invitationService.accept({ token }).pipe(
            tapResponse({
              next: (member) => patchState(store, { acceptCallState: successCallState(member) }),
              error: (error: unknown) =>
                patchState(store, { acceptCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),
  })),
);

/**
 * Injectable instance type exposed by {@link OrganizationInvitationAcceptStore}.
 */
export type OrganizationInvitationAcceptStore = InstanceType<
  typeof OrganizationInvitationAcceptStore
>;
