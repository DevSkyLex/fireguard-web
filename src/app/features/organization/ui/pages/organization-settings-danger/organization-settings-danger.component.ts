import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
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

  /**
   * Property confirmationService
   * @readonly
   *
   * @description
   * Drives the app-level confirm dialog guarding suspension.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);
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

  /**
   * Method onActiveChange
   *
   * @description
   * Confirms, then suspends or brings back the workspace. The backend has no
   * status field to PATCH: `isActive: false` is what it turns into `suspended`,
   * and `true` into `active` — the same call restores an archived workspace.
   *
   * Suspension is confirmed because it cuts off every member at once;
   * reactivation is not, because it only restores access.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {boolean} isActive - Requested activity state.
   *
   * @returns {void}
   */
  protected onActiveChange(isActive: boolean): void {
    if (isActive) {
      this.applyActive(true);
      return;
    }

    this.confirmationService.confirm({
      header: $localize`:@@org.danger.suspendHeader:Suspend organization`,
      message: $localize`:@@org.danger.suspendConfirm:Every member loses access until you reactivate it. Nothing is deleted. Continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@org.danger.suspendButton:Suspend`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => this.applyActive(false),
    });
  }

  /**
   * Method applyActive
   *
   * @description
   * Sends the activity change through the settings save path.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {boolean} isActive - Requested activity state.
   *
   * @returns {void}
   */
  private applyActive(isActive: boolean): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (organizationId) this.store.save({ organizationId, input: { isActive } });
  }
  //#endregion
}
