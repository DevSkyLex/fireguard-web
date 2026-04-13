import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
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
import { ActiveOrganizationStore } from '@features/organization/state';

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
  imports: [FacilityForm],
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
    // Load available facilities for parent selection
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.loadFacilities({ organizationId, options: { itemsPerPage: 200 } });
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

    // Error toast on create failure
    this.events
      .on(facilityStoreEvents.createFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
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
