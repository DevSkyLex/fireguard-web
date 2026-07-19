import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { UpdateOrganizationInput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationLegalForm } from '@features/organization/ui/forms';

/**
 * Component OrganizationSettingsLegalPage
 * @class OrganizationSettingsLegalPage
 *
 * @description
 * The organization's legal identity, published by the backend since L3.1 and
 * previously unreachable from the app.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings-legal',
  imports: [OrganizationLegalForm],
  providers: [OrganizationSettingsStore],
  templateUrl: './organization-settings-legal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsLegalPage {
  //#region Properties
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationSettingsStore}
   */
  protected readonly store: OrganizationSettingsStore =
    inject<OrganizationSettingsStore>(OrganizationSettingsStore);
  //#endregion

  //#region Methods
  /**
   * Method save
   *
   * @description
   * Persists the legal profile against the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {UpdateOrganizationInput} input - The submitted legal fields.
   *
   * @returns {void}
   */
  protected save(input: UpdateOrganizationInput): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (organizationId) this.store.save({ organizationId, input });
  }
  //#endregion
}
