import { DOCUMENT } from '@angular/common';
import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import {
  errorCallState,
  idleCallState,
  isCallSuccess,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
} from '@core/state/request-state';
import { BillingService } from '@features/organization/data-access';
import type {
  CheckoutSessionOutput,
  InvoiceOutput,
  OrganizationSubscriptionOutput,
  PlanPricingOutput,
  PortalSessionOutput,
} from '@features/organization/models';
import type { BillingCheckoutParams, OrganizationBillingState } from './models';

//#region Initial State
const INITIAL_STATE: OrganizationBillingState = {
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
      return isCallSuccess(state) ? state.data : null;
    }),
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
        store.subscriptionCallState().error ??
        store.checkoutCallState().error ??
        store.portalCallState().error ??
        store.cancelCallState().error ??
        store.resumeCallState().error,
    ),
  })),

  withMethods((store, billingService = inject(BillingService), documentRef = inject(DOCUMENT)) => ({
    /**
     * Method loadSubscription
     * @method loadSubscription
     *
     * @description
     * Loads the organization's current subscription state.
     *
     * @param {string} organizationId - The organization identifier.
     */
    loadSubscription: rxMethod<string>(
      pipe(
        tap(() =>
          patchState(store, {
            subscriptionCallState: pendingCallState(store.subscriptionCallState().data),
          }),
        ),
        switchMap((organizationId: string) =>
          billingService.getSubscription(organizationId).pipe(
            tapResponse({
              next: (subscription: OrganizationSubscriptionOutput) =>
                patchState(store, { subscriptionCallState: successCallState(subscription) }),
              error: (err: unknown) =>
                patchState(store, {
                  subscriptionCallState: errorCallState(toStoreError(err)),
                }),
            }),
          ),
        ),
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
  })),
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
