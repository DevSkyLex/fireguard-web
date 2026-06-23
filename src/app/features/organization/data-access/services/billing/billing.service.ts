import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { HydraApiService, type RequestOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type {
  CheckoutSessionInput,
  CheckoutSessionOutput,
  InvoiceOutput,
  OrganizationSubscriptionOutput,
  PlanPricingOutput,
  PortalSessionOutput,
} from '@features/organization/models';

/**
 * Service BillingService
 * @class BillingService
 * @extends {HydraApiService}
 *
 * @description
 * API service for Stripe subscription billing. Starts hosted Checkout and
 * Billing Portal sessions, reads the organization's subscription state, and
 * lists plan pricing. Checkout and Portal endpoints return a URL the caller
 * redirects the browser to; the actual plan change is applied by the Stripe
 * webhook.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({
  providedIn: 'root',
})
export class BillingService extends HydraApiService {
  //#region Constants
  /**
   * Property ORGANIZATIONS_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for organization-scoped billing endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly ORGANIZATIONS_PATH: string = '/api/organizations';

  /**
   * Property PRICING_PATH
   * @readonly
   * @static
   *
   * @description
   * API path for the plan pricing catalog.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly PRICING_PATH: string = '/api/billing/pricing';
  //#endregion

  //#region Public Methods
  /**
   * Method createCheckoutSession
   * @method createCheckoutSession
   *
   * @description
   * Starts a hosted Stripe Checkout session for a paid plan and returns its URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization identifier.
   * @param {CheckoutSessionInput} input - The target plan key and billing cadence.
   *
   * @return {Observable<CheckoutSessionOutput>} An observable emitting the checkout session URL.
   */
  public createCheckoutSession(
    organizationId: string,
    input: CheckoutSessionInput,
  ): Observable<CheckoutSessionOutput> {
    return this.post<CheckoutSessionInput, CheckoutSessionOutput>(
      `${BillingService.ORGANIZATIONS_PATH}/${organizationId}/billing/checkout`,
      input,
    );
  }

  /**
   * Method createPortalSession
   * @method createPortalSession
   *
   * @description
   * Starts a hosted Stripe Billing Portal session and returns its URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization identifier.
   *
   * @return {Observable<PortalSessionOutput>} An observable emitting the portal session URL.
   */
  public createPortalSession(organizationId: string): Observable<PortalSessionOutput> {
    return this.postAction<PortalSessionOutput>(
      `${BillingService.ORGANIZATIONS_PATH}/${organizationId}/billing/portal`,
    );
  }

  /**
   * Method cancelSubscription
   * @method cancelSubscription
   *
   * @description
   * Schedules cancellation of the organization's subscription at the end of the
   * current billing period and returns the refreshed subscription state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization identifier.
   *
   * @return {Observable<OrganizationSubscriptionOutput>} An observable emitting the refreshed subscription.
   */
  public cancelSubscription(organizationId: string): Observable<OrganizationSubscriptionOutput> {
    return this.postAction<OrganizationSubscriptionOutput>(
      `${BillingService.ORGANIZATIONS_PATH}/${organizationId}/billing/cancel`,
    );
  }

  /**
   * Method resumeSubscription
   * @method resumeSubscription
   *
   * @description
   * Clears a scheduled cancellation so the subscription renews normally and
   * returns the refreshed subscription state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization identifier.
   *
   * @return {Observable<OrganizationSubscriptionOutput>} An observable emitting the refreshed subscription.
   */
  public resumeSubscription(organizationId: string): Observable<OrganizationSubscriptionOutput> {
    return this.postAction<OrganizationSubscriptionOutput>(
      `${BillingService.ORGANIZATIONS_PATH}/${organizationId}/billing/resume`,
    );
  }

  /**
   * Method getInvoices
   * @method getInvoices
   *
   * @description
   * Retrieves the organization's recent billing invoices.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization identifier.
   * @param {RequestOptions} [options] - Optional request parameters.
   *
   * @return {Observable<HydraCollection<InvoiceOutput>>} An observable emitting the invoices collection.
   */
  public getInvoices(
    organizationId: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<InvoiceOutput>> {
    return this.getCollection<InvoiceOutput>(
      `${BillingService.ORGANIZATIONS_PATH}/${organizationId}/billing/invoices`,
      options,
    );
  }

  /**
   * Method getSubscription
   * @method getSubscription
   *
   * @description
   * Retrieves the organization's current subscription state.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization identifier.
   *
   * @return {Observable<OrganizationSubscriptionOutput>} An observable emitting the subscription state.
   */
  public getSubscription(organizationId: string): Observable<OrganizationSubscriptionOutput> {
    return this.getOne<OrganizationSubscriptionOutput>(
      `${BillingService.ORGANIZATIONS_PATH}/${organizationId}/billing/subscription`,
    );
  }

  /**
   * Method getPricing
   * @method getPricing
   *
   * @description
   * Retrieves the display pricing of every payable plan.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Optional request parameters.
   *
   * @return {Observable<HydraCollection<PlanPricingOutput>>} An observable emitting the pricing collection.
   */
  public getPricing(options?: RequestOptions): Observable<HydraCollection<PlanPricingOutput>> {
    return this.getCollection<PlanPricingOutput>(BillingService.PRICING_PATH, options);
  }
  //#endregion
}
