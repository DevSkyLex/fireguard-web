import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationDangerZone } from '@features/organization/ui/components';
import { OrganizationDeleteDialog } from '@features/organization/ui/dialogs/organization-delete-dialog';

/**
 * Component OrganizationSettingsDangerPage
 * @class OrganizationSettingsDangerPage
 *
 * @description
 * The settings danger zone: permanent deletion of the organization.
 *
 * A route of its own rather than a `?tab=` section, so
 * `organizationPermissionGuard([DELETE])` actually runs. As a query param the
 * URL was only softly hidden by an `@if`, and `canActivate` does not re-run on
 * a query-param change — the section would stay reachable by typing the URL.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings-danger',
  imports: [OrganizationDangerZone, OrganizationDeleteDialog],
  providers: [OrganizationSettingsStore],
  templateUrl: './organization-settings-danger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsDangerPage {
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

  /**
   * Property deleteDialogVisible
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly deleteDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);
  //#endregion

  //#region Lifecycle
  /**
   * Leaves for the root once the organization is gone: the shell cannot render
   * settings for an organization that no longer exists. Root forwards to the
   * next remaining organization (or onboarding), and `organizationGuard`
   * invalidates the stale last-organization cookie.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (this.store.deleteSucceeded()) {
        this.deleteDialogVisible.set(false);
        this.activeOrganizationStore.clear();
        void this.router.navigate(['/']);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method openDeleteDialog
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openDeleteDialog(): void {
    this.deleteDialogVisible.set(true);
  }

  /**
   * Method confirmDelete
   *
   * @description
   * Deletes the organization, forwarding the slug the user retyped — the
   * backend enforces it as a `slug` query parameter and rejects the call
   * without it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} slugConfirmation - The slug retyped in the dialog.
   *
   * @returns {void}
   */
  protected confirmDelete(slugConfirmation: string): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (organizationId) this.store.deleteOrganization({ organizationId, slugConfirmation });
  }
  //#endregion
}
