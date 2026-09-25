import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  EMPTY,
  exhaustMap,
  last,
  map,
  pipe,
  switchMap,
  take,
  takeWhile,
  tap,
  timer,
  timeout,
} from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallSuccess,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { BillingService } from '@features/organization/data-access';
import type {
  CheckoutSessionOutput,
  InvoiceOutput,
  OrganizationSubscriptionOutput,
  PlanPricingOutput,
  PortalSessionOutput,
} from '@features/organization/models';
import { organizationBillingStoreEvents } from './events';
import type {
  BillingCheckoutExpectation,
  BillingCheckoutParams,
  OrganizationBillingState,
} from './models';

//#region Initial State
const INITIAL_STATE: OrganizationBillingState = {
  currentOrganizationId: null,
  checkoutExpectation: null,
  reconciliationCallState: idleCallState(),
  subscriptionCallState: idleCallState(),
  pricingCallState: idleCallState(),
  invoicesCallState: idleCallState(),
  checkoutCallState: idleCallState(),
  portalCallState: idleCallState(),
  cancelCallState: idleCallState(),
  resumeCallState: idleCallState(),
};
//#endregion

/**
 * Function redirectToStripe
 *
 * @description
 * Redirects the browser to a Stripe-hosted URL. SSR-safe: `defaultView` is null
 * on the server, so the navigation only happens in the browser.
 *
 * @param {Document} documentRef - The DOM document.
 * @param {string} url - The Stripe-hosted URL to navigate to.
 *
 * @returns {void}
 */
function redirectToStripe(documentRef: Document, url: string): void {
  documentRef.defaultView?.location.assign(url);
}

/**
 * Store OrganizationBillingStore
 * @const OrganizationBillingStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the subscription panel. Loads the
 * current subscription and plan pricing, and starts hosted Stripe Checkout and
 * Billing Portal sessions — on success it redirects the browser to the returned
 * Stripe URL. The plan change itself is applied by the Stripe webhook, so the
 * settings page re-reads the subscription on return.
 *
 * Designed to be provided at **component level** (no `providedIn: 'root'`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationBillingStore = signalStore(
  withState<OrganizationBillingState>(INITIAL_STATE),

  withComputed((store) => ({
    subscription: computed<OrganizationSubscriptionOutput | null>(() => {
      const state = store.subscriptionCallState();
      return state.data ?? null;
    }),
    /**
     * Property awaitingCheckout
     * @readonly
     * @description Keeps an unconfirmed return visible after polling stops or connectivity fails.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    awaitingCheckout: computed<boolean>(
      () => store.checkoutExpectation() !== null && store.reconciliationCallState().data !== true,
    ),
    /**
     * Property isCheckingCheckout
     * @readonly
     * @description Indicates that the bounded server confirmation check is running.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    isCheckingCheckout: computed<boolean>(
      () => store.reconciliationCallState().status === 'pending',
    ),
    /**
     * Property checkoutConfirmed
     * @readonly
     * @description True only when the API confirms the requested active plan and billing interval.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    checkoutConfirmed: computed<boolean>(() => store.reconciliationCallState().data === true),
    isLoadingSubscription: computed<boolean>(
      () => store.subscriptionCallState().status === 'pending',
    ),
    pricing: computed<ReadonlyArray<PlanPricingOutput>>(() => {
      const state = store.pricingCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
    isLoadingPricing: computed<boolean>(() => store.pricingCallState().status === 'pending'),
    invoices: computed<ReadonlyArray<InvoiceOutput>>(() => {
      const state = store.invoicesCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
    isLoadingInvoices: computed<boolean>(() => store.invoicesCallState().status === 'pending'),
    invoicesError: computed<StoreError | null>(() => store.invoicesCallState().error),
    isStartingCheckout: computed<boolean>(() => store.checkoutCallState().status === 'pending'),
    isStartingPortal: computed<boolean>(() => store.portalCallState().status === 'pending'),
    isCanceling: computed<boolean>(() => store.cancelCallState().status === 'pending'),
    isResuming: computed<boolean>(() => store.resumeCallState().status === 'pending'),
    cancelSucceeded: computed<boolean>(() => isCallSuccess(store.cancelCallState())),
    resumeSucceeded: computed<boolean>(() => isCallSuccess(store.resumeCallState())),
    billingError: computed<StoreError | null>(
      () =>
        store.reconciliationCallState().error ??
        store.subscriptionCallState().error ??
        store.checkoutCallState().error ??
        store.portalCallState().error ??
        store.cancelCallState().error ??
        store.resumeCallState().error,
    ),
  })),

  withMethods(
    (
      store,
      billingService = inject<BillingService>(BillingService),
      documentRef = inject(DOCUMENT),
      platformId = inject(PLATFORM_ID),
      dispatcher = inject(Dispatcher),
    ) => ({
      /**
       * Method loadSubscription
       * @method loadSubscription
       *
       * @description
       * Loads the organization's current subscription state.
       *
       * @param {string | null} organizationId - The organization identifier, or null to cancel and clear.
       */
      loadSubscription: rxMethod<string | null>(
        pipe(
          tap((organizationId) => {
            let subscriptionCallState: OrganizationBillingState['subscriptionCallState'];
            if (organizationId === null) {
              subscriptionCallState = idleCallState();
            } else {
              const previous =
                organizationId === store.currentOrganizationId()
                  ? store.subscriptionCallState().data
                  : undefined;
              subscriptionCallState = pendingCallState(previous);
            }
            patchState(store, {
              currentOrganizationId: organizationId,
              subscriptionCallState,
            });
          }),
          switchMap((organizationId: string | null) =>
            organizationId === null
              ? EMPTY
              : billingService.getSubscription(organizationId).pipe(
                  tapResponse({
                    next: (subscription: OrganizationSubscriptionOutput) =>
                      patchState(store, { subscriptionCallState: successCallState(subscription) }),
                    error: (err: unknown) =>
                      patchState(store, {
                        subscriptionCallState: errorCallState(
                          toStoreError(err),
                          store.subscriptionCallState().data,
                        ),
                      }),
                  }),
                ),
          ),
        ),
      ),

      /**
       * Method watchCheckout
       * @method watchCheckout
       * @description Checks at most fifteen times, retains the latest server state and cancels obsolete checks. A missing legacy target stays unconfirmed.
       * @access public
       * @since 1.0.0
       * @param {BillingCheckoutExpectation | null} expectation - Server-provided Checkout target, or null to stop.
       * @returns {void}
       */
      watchCheckout: rxMethod<BillingCheckoutExpectation | null>(
        pipe(
          tap((expectation) =>
            patchState(store, {
              checkoutExpectation: expectation,
              reconciliationCallState: expectation === null ? idleCallState() : pendingCallState(),
              ...(expectation === null
                ? {}
                : {
                    currentOrganizationId: expectation.organizationId,
                    subscriptionCallState:
                      expectation.organizationId === store.currentOrganizationId()
                        ? store.subscriptionCallState()
                        : idleCallState(),
                  }),
            }),
          ),
          switchMap((expectation) => {
            if (expectation === null || !isPlatformBrowser(platformId)) return EMPTY;
            return timer(0, 2000).pipe(
              take(15),
              exhaustMap(() =>
                billingService.getSubscription(expectation.organizationId).pipe(timeout(10000)),
              ),
              tap((subscription) =>
                patchState(store, { subscriptionCallState: successCallState(subscription) }),
              ),
              map(
                (subscription) =>
                  subscription.organizationId === expectation.organizationId &&
                  subscription.active &&
                  expectation.planKey !== null &&
                  subscription.planKey === expectation.planKey &&
                  expectation.interval !== null &&
                  subscription.interval === expectation.interval,
              ),
              takeWhile((confirmed) => !confirmed, true),
              last(),
              tapResponse({
                next: (confirmed) => {
                  patchState(store, { reconciliationCallState: successCallState(confirmed) });
                  if (confirmed)
                    dispatcher.dispatch(
                      organizationBillingStoreEvents.checkoutReconciled({
                        organizationId: expectation.organizationId,
                      }),
                    );
                },
                error: (error: unknown) =>
                  patchState(store, {
                    reconciliationCallState: errorCallState(toStoreError(error)),
                  }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method loadPricing
       * @method loadPricing
       *
       * @description
       * Loads the display pricing of every payable plan.
       */
      loadPricing: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { pricingCallState: pendingCallState() })),
          switchMap(() =>
            billingService.getPricing().pipe(
              tapResponse({
                next: (collection: HydraCollection<PlanPricingOutput>) =>
                  patchState(store, { pricingCallState: successCallState(collection.member) }),
                error: (err: unknown) =>
                  patchState(store, { pricingCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method loadInvoices
       * @method loadInvoices
       *
       * @description
       * Loads the organization's recent billing invoices.
       *
       * @param {string} organizationId - The organization identifier.
       */
      loadInvoices: rxMethod<string>(
        pipe(
          tap(() =>
            patchState(store, {
              invoicesCallState: pendingCallState(store.invoicesCallState().data),
            }),
          ),
          switchMap((organizationId: string) =>
            billingService.getInvoices(organizationId).pipe(
              tapResponse({
                next: (collection: HydraCollection<InvoiceOutput>) =>
                  patchState(store, { invoicesCallState: successCallState(collection.member) }),
                error: (err: unknown) =>
                  patchState(store, { invoicesCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method cancelSubscription
       * @method cancelSubscription
       *
       * @description
       * Schedules cancellation at period end and applies the refreshed subscription
       * returned by the API.
       *
       * @param {string} organizationId - The organization identifier.
       */
      cancelSubscription: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { cancelCallState: pendingCallState() })),
          switchMap((organizationId: string) =>
            billingService.cancelSubscription(organizationId).pipe(
              tapResponse({
                next: (subscription: OrganizationSubscriptionOutput) =>
                  patchState(store, {
                    cancelCallState: successCallState(subscription),
                    subscriptionCallState: successCallState(subscription),
                  }),
                error: (err: unknown) =>
                  patchState(store, { cancelCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method resumeSubscription
       * @method resumeSubscription
       *
       * @description
       * Clears a scheduled cancellation and applies the refreshed subscription
       * returned by the API.
       *
       * @param {string} organizationId - The organization identifier.
       */
      resumeSubscription: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { resumeCallState: pendingCallState() })),
          switchMap((organizationId: string) =>
            billingService.resumeSubscription(organizationId).pipe(
              tapResponse({
                next: (subscription: OrganizationSubscriptionOutput) =>
                  patchState(store, {
                    resumeCallState: successCallState(subscription),
                    subscriptionCallState: successCallState(subscription),
                  }),
                error: (err: unknown) =>
                  patchState(store, { resumeCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method startCheckout
       * @method startCheckout
       *
       * @description
       * Starts a hosted Checkout session and, on success, redirects the browser
       * to Stripe.
       *
       * @param {BillingCheckoutParams} params - Organization id, plan key and cadence.
       */
      startCheckout: rxMethod<BillingCheckoutParams>(
        pipe(
          tap(() => patchState(store, { checkoutCallState: pendingCallState() })),
          switchMap(({ organizationId, planKey, interval }: BillingCheckoutParams) =>
            billingService.createCheckoutSession(organizationId, { planKey, interval }).pipe(
              tapResponse({
                next: (session: CheckoutSessionOutput) => {
                  patchState(store, { checkoutCallState: successCallState(session) });
                  redirectToStripe(documentRef, session.url);
                },
                error: (err: unknown) =>
                  patchState(store, { checkoutCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method startPortal
       * @method startPortal
       *
       * @description
       * Starts a hosted Billing Portal session and, on success, redirects the
       * browser to Stripe.
       *
       * @param {string} organizationId - The organization identifier.
       */
      startPortal: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { portalCallState: pendingCallState() })),
          switchMap((organizationId: string) =>
            billingService.createPortalSession(organizationId).pipe(
              tapResponse({
                next: (session: PortalSessionOutput) => {
                  patchState(store, { portalCallState: successCallState(session) });
                  redirectToStripe(documentRef, session.url);
                },
                error: (err: unknown) =>
                  patchState(store, { portalCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Type OrganizationBillingStore
 * @type OrganizationBillingStore
 *
 * @description
 * Instance type of the {@link OrganizationBillingStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationBillingStore = InstanceType<typeof OrganizationBillingStore>;
