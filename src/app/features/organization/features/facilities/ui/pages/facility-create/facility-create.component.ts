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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import {
  FacilityStore,
  facilityStoreEvents,
} from '@features/organization/features/facilities/state';
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
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG toast service used to display success and error
   * notifications after the create operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService = inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx Signals event bus used to subscribe to
   * {@link facilityStoreEvents.createFailed} for error toasts.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

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
   * Subscribes to store events for error toasts and watches
   * createOperation success for navigation.
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

    // Navigate to the new facility on successful creation
    effect(() => {
      const operation = this.store.createCallState();
      if (operation.status === 'success' && operation.data) {
        this.messageService.add({
          severity: 'success',
          summary: 'Facility created',
          detail: `"${operation.data.name}" has been created successfully.`,
          life: 4000,
        });
        this.router.navigate(['..', operation.data.id], { relativeTo: this.route });
      }
    });

    // Error feedback on create failure: route quota (409) failures to the
    // actionable upgrade dialog, everything else to a generic error toast.
    this.events
      .on(facilityStoreEvents.createFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (isQuotaExceededError(payload)) {
          this.quotaStore.reload();
          this.quotaDialogVisible.set(true);
          return;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: payload.message,
          life: 5000,
        });
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
