import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { defer, exhaustMap, filter, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  errorFeedback,
  successFeedback,
  type StoreError,
} from '@core/request-state';
import { EmailOwnershipService } from '@features/auth/data-access';
import type { EmailOwnershipChallengeOutput, EmailOwnershipOutput } from '@features/auth/models';
import { OnboardingService } from '@features/onboarding/data-access';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OrganizationAccessService } from '@features/organization/data-access';
import type {
  OrganizationJoinOptionsOutput,
  OrganizationAdmissionOutput,
  OrganizationJoinRequestOutput,
} from '@features/organization/models';
import { organizationMembershipEvents } from '@features/organization/setup';
import { organizationAccessErrorMessage } from '@features/organization/utils';
import { workspaceStoreEvents } from './events';
import type { WorkspaceState } from './workspace-state.interface';

/**
 * Store WorkspaceStore
 * @description Coordinates private workspace choices and explicit admission. Proof challenges remain page-local.
 * @since 1.0.0
 */
export const WorkspaceStore = signalStore(
  withState<WorkspaceState>({
    createCallState: idleCallState<OnboardingOutput>(),
    optionsCallState: idleCallState<OrganizationJoinOptionsOutput>(),
    admissionCallState: idleCallState<OrganizationAdmissionOutput>(),
    requestCallState: idleCallState<OrganizationJoinRequestOutput>(),
    cancelCallState: idleCallState<OrganizationJoinRequestOutput>(),
    challengeCallState: idleCallState<EmailOwnershipChallengeOutput>(),
    confirmCallState: idleCallState<EmailOwnershipOutput>(),
  }),
  withComputed((store) => ({
    options: computed(() => store.optionsCallState().data),
    loading: computed(() => store.optionsCallState().status === 'pending'),
    busy: computed(() =>
      [
        store.createCallState(),
        store.admissionCallState(),
        store.requestCallState(),
        store.cancelCallState(),
        store.challengeCallState(),
        store.confirmCallState(),
      ].some((state) => state.status === 'pending'),
    ),
    actionError: computed(
      () =>
        store.createCallState().error ??
        store.admissionCallState().error ??
        store.requestCallState().error ??
        store.cancelCallState().error ??
        store.challengeCallState().error,
    ),
  })),
  withMethods(
    (
      store,
      service = inject(OrganizationAccessService),
      email = inject(EmailOwnershipService),
      onboarding = inject(OnboardingService),
      dispatcher = inject(Dispatcher),
    ) => {
      /**
       * Function reportFailure
       * @description Normalizes a command failure once and publishes localized feedback through the global toast listener.
       * @access private
       * @since 1.0.0
       * @param {unknown} error - Command failure.
       * @returns {StoreError} Error retained by the command state.
       */
      const reportFailure = (error: unknown): StoreError => {
        const normalized = toStoreError(error);
        dispatcher.dispatch(
          workspaceStoreEvents.commandFailed(
            errorFeedback(
              organizationAccessErrorMessage(normalized) ??
                $localize`:@@onboarding.workspace.commandFailed:We could not complete this action. Please try again.`,
              { code: normalized.code, retryable: normalized.retryable },
            ),
          ),
        );
        return normalized;
      };
      /**
       * Function reportSuccess
       * @description Publishes one result message for a completed command.
       * @access private
       * @since 1.0.0
       * @param {string} message - Localized result.
       * @returns {void}
       */
      const reportSuccess = (message: string): void => {
        dispatcher.dispatch(workspaceStoreEvents.commandSucceeded(successFeedback(message)));
      };
      /**
       * Function resetFeedback
       * @description Keeps commands exclusive and retains only the active challenge while clearing obsolete result state.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const resetFeedback = (): void => {
        const challenge = store.challengeCallState().data;
        patchState(store, {
          createCallState: idleCallState<OnboardingOutput>(),
          admissionCallState: idleCallState<OrganizationAdmissionOutput>(),
          requestCallState: idleCallState<OrganizationJoinRequestOutput>(),
          cancelCallState: idleCallState<OrganizationJoinRequestOutput>(),
          confirmCallState: idleCallState<EmailOwnershipOutput>(),
          challengeCallState: challenge
            ? successCallState(challenge)
            : idleCallState<EmailOwnershipChallengeOutput>(),
        });
      };
      const load = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { optionsCallState: pendingCallState(store.options()) })),
          switchMap(() =>
            service.options().pipe(
              tapResponse({
                next: (result) => patchState(store, { optionsCallState: successCallState(result) }),
                error: (error: unknown) =>
                  patchState(store, {
                    optionsCallState: errorCallState(toStoreError(error), store.options()),
                  }),
              }),
            ),
          ),
        ),
      );
      return {
        /**
         * Method create
         * @method create
         * @description Starts or resumes creation only after an explicit user commitment.
         * @access public
         * @since 1.0.0
         * @returns {void} Starts the creation workflow.
         */
        create: rxMethod<void>(
          pipe(
            filter(() => !store.busy()),
            exhaustMap(() =>
              defer(() => {
                resetFeedback();
                patchState(store, { createCallState: pendingCallState() });
                return onboarding.start({ reset: false, intent: 'create' });
              }).pipe(
                tapResponse({
                  next: (result) => {
                    patchState(store, { createCallState: successCallState(result) });
                    reportSuccess(
                      $localize`:@@onboarding.workspace.createReady:Your workspace setup is ready.`,
                    );
                  },
                  error: (error: unknown) =>
                    patchState(store, { createCallState: errorCallState(reportFailure(error)) }),
                }),
              ),
            ),
          ),
        ),
        /** Method load
         * @method load
         * @description Refreshes caller-owned invitations, requests and discoverable organizations.
         * @access public
         * @since 1.0.0
         * @returns {void} Starts the query.
         */
        load,
        /** Method admit
         * @method admit
         * @description Explicitly accepts an invitation or an immediate membership offer.
         * @access public
         * @since 1.0.0
         * @param {{id: string; invitation: boolean}} input - Selected offer.
         * @returns {void} Starts the admission command.
         */
        admit: rxMethod<{ id: string; invitation: boolean }>(
          pipe(
            filter(() => !store.busy()),
            exhaustMap((input) =>
              defer(() => {
                resetFeedback();
                patchState(store, {
                  admissionCallState: pendingCallState(),
                  requestCallState: idleCallState<OrganizationJoinRequestOutput>(),
                  cancelCallState: idleCallState<OrganizationJoinRequestOutput>(),
                });
                return input.invitation
                  ? service.acceptInvitation(input.id)
                  : service.join(input.id);
              }).pipe(
                tapResponse({
                  next: (result) => {
                    dispatcher.dispatch(
                      organizationMembershipEvents.joined({
                        organizationId: result.organizationId,
                      }),
                    );
                    patchState(store, { admissionCallState: successCallState(result) });
                    reportSuccess(
                      $localize`:@@onboarding.workspace.joined:You have joined the organization.`,
                    );
                  },
                  error: (error: unknown) =>
                    patchState(store, { admissionCallState: errorCallState(reportFailure(error)) }),
                }),
              ),
            ),
          ),
        ),
        /** Method request
         * @method request
         * @description Requests admission and refreshes the pending request summary.
         * @access public
         * @since 1.0.0
         * @param {string} organizationId - Selected organization.
         * @returns {void} Starts the request command.
         */
        request: rxMethod<string>(
          pipe(
            filter(() => !store.busy()),
            exhaustMap((id) =>
              defer(() => {
                resetFeedback();
                patchState(store, {
                  requestCallState: pendingCallState(),
                  confirmCallState: idleCallState(),
                  admissionCallState: idleCallState(),
                  cancelCallState: idleCallState(),
                });
                return service.request(id);
              }).pipe(
                tapResponse({
                  next: (result) => {
                    patchState(store, { requestCallState: successCallState(result) });
                    reportSuccess(
                      $localize`:@@onboarding.workspace.requestSent:Request sent. No access has been granted yet.`,
                    );
                    load();
                  },
                  error: (error: unknown) =>
                    patchState(store, { requestCallState: errorCallState(reportFailure(error)) }),
                }),
              ),
            ),
          ),
        ),
        /** Method cancel
         * @method cancel
         * @description Cancels an owned pending request and refreshes available actions.
         * @access public
         * @since 1.0.0
         * @param {string} requestId - Owned request identifier.
         * @returns {void} Starts cancellation.
         */
        cancel: rxMethod<string>(
          pipe(
            filter(() => !store.busy()),
            exhaustMap((id) =>
              defer(() => {
                resetFeedback();
                patchState(store, {
                  cancelCallState: pendingCallState(),
                  confirmCallState: idleCallState(),
                  requestCallState: idleCallState(),
                  admissionCallState: idleCallState(),
                });
                return service.cancel(id);
              }).pipe(
                tapResponse({
                  next: (result) => {
                    patchState(store, { cancelCallState: successCallState(result) });
                    reportSuccess(
                      $localize`:@@onboarding.workspace.requestCancelled:Request cancelled.`,
                    );
                    load();
                  },
                  error: (error: unknown) =>
                    patchState(store, { cancelCallState: errorCallState(reportFailure(error)) }),
                }),
              ),
            ),
          ),
        ),
        /** Method startProof
         * @method startProof
         * @description Sends a verification code on explicit user action.
         * @access public
         * @since 1.0.0
         * @returns {void} Starts the OTP challenge.
         */
        startProof: rxMethod<void>(
          pipe(
            filter(() => !store.busy()),
            exhaustMap(() =>
              defer(() => {
                resetFeedback();
                patchState(store, {
                  challengeCallState: pendingCallState(store.challengeCallState().data),
                  requestCallState: idleCallState(),
                  cancelCallState: idleCallState(),
                  confirmCallState: idleCallState(),
                });
                return email.start();
              }).pipe(
                tapResponse({
                  next: (result) => {
                    patchState(store, { challengeCallState: successCallState(result) });
                    reportSuccess(
                      $localize`:@@onboarding.workspace.proofSent:Verification code sent. Check your inbox.`,
                    );
                  },
                  error: (error: unknown) =>
                    patchState(store, {
                      challengeCallState: errorCallState(
                        reportFailure(error),
                        store.challengeCallState().data,
                      ),
                    }),
                }),
              ),
            ),
          ),
        ),
        /** Method confirmProof
         * @method confirmProof
         * @description Confirms a user-bound mailbox challenge before refreshing discovery.
         * @access public
         * @since 1.0.0
         * @param {string} code - Submitted verification digits.
         * @returns {void} Starts the proof command.
         */
        confirmProof: rxMethod<string>(
          pipe(
            filter(() => !store.busy() && !!store.challengeCallState().data?.challengeToken),
            exhaustMap((code) =>
              defer(() => {
                resetFeedback();
                patchState(store, { confirmCallState: pendingCallState() });
                return email.confirm(store.challengeCallState().data?.challengeToken ?? '', code);
              }).pipe(
                tapResponse({
                  next: (result) => {
                    patchState(store, {
                      confirmCallState: successCallState(result),
                      challengeCallState: idleCallState(),
                    });
                    reportSuccess(
                      $localize`:@@onboarding.workspace.emailConfirmed:Email address verified. Available organizations are being refreshed.`,
                    );
                    load();
                  },
                  error: (error: unknown) =>
                    patchState(store, { confirmCallState: errorCallState(reportFailure(error)) }),
                }),
              ),
            ),
          ),
        ),
      };
    },
  ),
);
/**
 * Type WorkspaceStore
 * @type WorkspaceStore
 * @description Injectable workspace flow store instance.
 * @since 1.0.0
 */
export type WorkspaceStore = InstanceType<typeof WorkspaceStore>;
