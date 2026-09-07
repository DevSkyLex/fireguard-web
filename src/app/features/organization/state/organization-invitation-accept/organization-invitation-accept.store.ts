import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  errorFeedback,
  successFeedback,
  type CallState,
} from '@core/request-state';
import { OrganizationInvitationService } from '@features/organization/data-access';
import type {
  OrganizationInvitationPreviewOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { organizationInvitationAcceptStoreEvents } from './events';

/**
 * State owned by the invitation acceptance workflow.
 */
interface InvitationAcceptState {
  /** Request state for the public invitation preview. */
  readonly previewCallState: CallState<OrganizationInvitationPreviewOutput | null>;
  /** Request state for invitation acceptance. */
  readonly acceptCallState: CallState<OrganizationMemberOutput | null>;
}

/**
 * Store OrganizationInvitationAcceptStore
 *
 * @description
 * Page-scoped workflow store that loads a public invitation preview and accepts
 * an organization invitation token.
 *
 * @since 1.0.0
 */
export const OrganizationInvitationAcceptStore = signalStore(
  withState<InvitationAcceptState>({
    previewCallState: idleCallState(),
    acceptCallState: idleCallState(),
  }),
  withComputed((store) => ({
    /** Whether the invitation preview is loading. */
    isLoadingPreview: computed(() => store.previewCallState().status === 'pending'),
    /** The resolved invitation preview, when available. */
    preview: computed(() => store.previewCallState().data ?? null),
    /** Whether the preview request failed (invalid/unknown token). */
    isPreviewError: computed(() => store.previewCallState().status === 'error'),
    /** Whether invitation acceptance is pending. */
    isAccepting: computed(() => store.acceptCallState().status === 'pending'),
    /** Whether the invitation was accepted successfully. */
    isAccepted: computed(() => store.acceptCallState().status === 'success'),
    /**
     * Property acceptedOrganizationId
     * @readonly
     * @description Organization authorized by the accepted membership, independent of later preview updates.
     * @access public
     * @since 1.0.0
     * @type {Signal<string | null>}
     */
    acceptedOrganizationId: computed(() => store.acceptCallState().data?.organizationId ?? null),
    /** Whether invitation acceptance failed. */
    isAcceptError: computed(() => store.acceptCallState().status === 'error'),
    /** Normalized error from the last acceptance attempt. */
    acceptError: computed(() => store.acceptCallState().error),
  })),
  withMethods(
    (
      store,
      invitationService = inject<OrganizationInvitationService>(OrganizationInvitationService),
      dispatcher = inject(Dispatcher),
    ) => ({
      /** Loads the public preview for an invitation token. */
      loadPreview: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { previewCallState: pendingCallState() })),
          switchMap((token) =>
            invitationService.preview(token).pipe(
              tapResponse({
                next: (preview) =>
                  patchState(store, { previewCallState: successCallState(preview) }),
                error: (error: unknown) =>
                  patchState(store, { previewCallState: errorCallState(toStoreError(error)) }),
              }),
            ),
          ),
        ),
      ),
      /**
       * Method accept
       * @method accept
       * @description Accepts one invitation at a time and emits membership invalidation plus exactly one result toast.
       * @access public
       * @since 1.0.0
       * @param {string} token - Invitation selected explicitly by its recipient.
       * @returns {void}
       */
      accept: rxMethod<string>(
        pipe(
          exhaustMap((token) => {
            patchState(store, { acceptCallState: pendingCallState() });
            return invitationService.accept({ token }).pipe(
              tapResponse({
                next: (member) => {
                  const organizationId: string = member.organizationId;
                  if (organizationId) {
                    dispatcher.dispatch(
                      organizationInvitationAcceptStoreEvents.acceptSucceeded({ organizationId }),
                    );
                  }
                  patchState(store, { acceptCallState: successCallState(member) });
                  dispatcher.dispatch(
                    organizationInvitationAcceptStoreEvents.acceptFeedback(
                      successFeedback(
                        $localize`:@@org.invitationAccept.accepted:Invitation accepted. Welcome to the organization.`,
                      ),
                    ),
                  );
                },
                error: (error: unknown) => {
                  const normalized = toStoreError(error);
                  patchState(store, { acceptCallState: errorCallState(normalized) });
                  dispatcher.dispatch(
                    organizationInvitationAcceptStoreEvents.acceptFailed(
                      errorFeedback(
                        $localize`:@@org.invitationAccept.acceptErrorDescription:Please try again. If this invitation is no longer valid, ask your administrator for a new one.`,
                        {
                          code: normalized.code,
                          retryable: normalized.retryable,
                          summary: $localize`:@@org.invitationAccept.acceptErrorTitle:We couldn't accept this invitation`,
                        },
                      ),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
);

/**
 * Injectable instance type exposed by {@link OrganizationInvitationAcceptStore}.
 */
export type OrganizationInvitationAcceptStore = InstanceType<
  typeof OrganizationInvitationAcceptStore
>;
