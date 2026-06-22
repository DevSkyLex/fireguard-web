import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  type InputSignal,
  type ModelSignal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ORGANIZATION_QUOTA_RESOURCE_LABELS } from '@features/organization/constants';
import type { OrganizationQuotaResource } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component OrganizationQuotaUpgradeDialog
 * @class OrganizationQuotaUpgradeDialog
 *
 * @description
 * Organization-owned dialog shown when a create action is rejected because the
 * current plan's quota for a resource has been reached (HTTP 409). It explains
 * which limit was hit and offers a "View plans" call to action that deep-links
 * to the settings Subscription tab. The subscription link is derived from the
 * active organization context, so consuming pages only toggle `visible` and pass
 * the at-limit `resource`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-quota-upgrade-dialog',
  imports: [RouterLink, ButtonModule, DialogModule, MessageModule],
  templateUrl: './organization-quota-upgrade-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationQuotaUpgradeDialog {
  //#region Properties
  /** Active organization context, used to build the subscription deep link. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /** Two-way dialog visibility. */
  public readonly visible: ModelSignal<boolean> = model<boolean>(false);

  /** The capped resource whose plan limit was reached, or `null`. */
  public readonly resource: InputSignal<OrganizationQuotaResource | null> =
    input<OrganizationQuotaResource | null>(null);

  /** Human-readable label of the at-limit resource (falls back to "resources"). */
  protected readonly resourceLabel: Signal<string> = computed<string>(() => {
    const resource: OrganizationQuotaResource | null = this.resource();
    return resource === null ? 'resources' : ORGANIZATION_QUOTA_RESOURCE_LABELS[resource];
  });

  /** Router link to the active organization's settings page. */
  protected readonly subscriptionLink: Signal<readonly string[] | null> = computed<
    readonly string[] | null
  >(() => {
    const organizationId: string | null = this.activeOrganizationStore.selectedOrganizationId();
    return organizationId === null ? null : ['/organizations', organizationId, 'settings'];
  });

  /** Query params selecting the Subscription tab on the settings page. */
  protected readonly subscriptionQueryParams: Readonly<Record<string, string>> = {
    tab: 'subscription',
  };
  //#endregion

  //#region Methods
  /**
   * Method close
   *
   * @description
   * Closes the dialog. Invoked on cancel and after navigating to the plans.
   *
   * @access protected
   * @returns {void}
   */
  protected close(): void {
    this.visible.set(false);
  }
  //#endregion
}
