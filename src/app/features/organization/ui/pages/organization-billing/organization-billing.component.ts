import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import {
  BillingPaymentMethod,
  OrganizationPlanSelector,
  OrganizationUsagePanel,
} from '@features/organization/ui/components';

/**
 * Component OrganizationBillingPage
 * @class OrganizationBillingPage
 *
 * @description
 * Everything about what the organization pays for: plan and invoices, the card
 * on file, and consumption against plan limits.
 *
 * These were three sections buried in organization settings. Billing is not a
 * setting — it is its own surface, with its own audience, and the prototype
 * gives it a top-level entry.
 *
 * ⚠️ Gated on `SETTINGS_WRITE` as an interim: the backend has no
 * `organization.billing.*` permission, so there is nothing more precise to gate
 * on yet (refonte plan, Q3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-billing',
  imports: [OrganizationPlanSelector, OrganizationUsagePanel, BillingPaymentMethod],
  providers: [OrganizationBillingStore],
  templateUrl: './organization-billing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationBillingPage {
  //#region Properties
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationBillingStore}
   */
  protected readonly store: OrganizationBillingStore =
    inject<OrganizationBillingStore>(OrganizationBillingStore);
  //#endregion

  //#region Lifecycle
  /**
   * Loads the card on file. The plan selector and usage panel own their own
   * loading; only the payment method is new to this page.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.loadPaymentMethod(
      computed((): string => this.activeOrganizationStore.selectedOrganization()?.id ?? ''),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method openPortal
   *
   * @description
   * Opens the Stripe billing portal, where card details are actually changed —
   * they never pass through this app's forms.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openPortal(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (organizationId) this.store.startPortal(organizationId);
  }
  //#endregion
}
