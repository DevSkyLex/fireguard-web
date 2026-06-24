import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  PLATFORM_ID,
  signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import {
  FacilityForm,
  type FacilityFormValues,
} from '@features/organization/features/facilities/ui/forms';
import { ORGANIZATION_QUOTA_RESOURCE } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationQuotaUpgradeDialog } from '@features/organization/ui/components';
import { isQuotaExceededError } from '@features/organization/utils';

/**
 * Component FacilityCreatePage
 * @class FacilityCreatePage
 *
 * @description
 * Page for creating a new facility within the current organization.
 * Hosts the {@link FacilityForm} in create mode, handles store
 * interaction, error toasts and navigation on success.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-create',
  imports: [FacilityForm, OrganizationQuotaUpgradeDialog],
  providers: [FacilityStore],
  templateUrl: './facility-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityCreatePage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate to the new facility detail
   * page after successful creation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, used as an anchor for relative
   * navigation after creation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root-scoped store providing the current organization context.
   * Used to obtain the `organizationId` required by all API calls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped FacilityStore used to dispatch the create
   * action and expose the resulting operation state to the template.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore = inject<FacilityStore>(FacilityStore);

  /**
   * Property quotaStore
   * @readonly
   *
   * @description
   * Root-provided quota store, reloaded after a quota-exceeded failure so the
   * usage meters stay in sync.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationQuotaStore}
   */
  private readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /** The capped resource governing facility creation. */
  protected readonly quotaResource = ORGANIZATION_QUOTA_RESOURCE.FACILITIES;

  /** Visibility of the quota upgrade dialog shown on a 409 failure. */
  protected readonly quotaDialogVisible: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads parent options and watches the create outcome: navigates on success
   * and routes quota (409) failures to the upgrade dialog. The success toast and
   * generic error toast are produced centrally from the store's feedback events.
   *
   * @since 1.0.0
   */
  public constructor() {
    // Load available facilities for parent selection only in the browser.
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId && isPlatformBrowser(this.platformId)) {
      this.store.ensureParentOptionsLoaded(organizationId);
    }

    // React to the create outcome: navigate on success, open the actionable
    // upgrade dialog on a quota (409) failure (which is not toasted centrally).
    effect(() => {
      const operation = this.store.createCallState();

      if (operation.status === 'success' && operation.data) {
        this.router.navigate(['..', operation.data.id], { relativeTo: this.route });
        return;
      }

      if (
        operation.status === 'error' &&
        operation.error &&
        isQuotaExceededError(operation.error)
      ) {
        this.quotaStore.reload();
        this.quotaDialogVisible.set(true);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleSubmit
   * @method handleSubmit
   *
   * @description
   * Converts form values to a {@link CreateFacilityInput} and
   * dispatches a create action to the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityFormValues} values - The submitted form values.
   *
   * @returns {void}
   */
  protected handleSubmit(values: FacilityFormValues): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId) return;

    const input: CreateFacilityInput = {
      type: values.type,
      name: values.name,
      ...(values.code ? { code: values.code } : {}),
      ...(values.address ? { address: values.address } : {}),
      ...(values.parentFacilityId ? { parentFacilityId: values.parentFacilityId } : {}),
    };

    this.store.create({ organizationId, input });
  }

  /**
   * Method handleCancel
   * @method handleCancel
   *
   * @description
   * Navigates back to the facility list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleCancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
  //#endregion
}
