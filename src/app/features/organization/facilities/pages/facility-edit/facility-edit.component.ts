import { ChangeDetectionStrategy, Component, computed, effect, inject, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { ActiveOrganizationStore } from '@core/stores/organization';
import { ActiveFacilityStore, FacilityStore, facilityStoreEvents } from '@core/stores/facility';
import type { FacilityOutput, UpdateFacilityInput } from '@core/models/facility';
import { FacilityForm, type FacilityFormValues } from '@features/organization/facilities/forms/facility-form';

/**
 * Component FacilityEditPage
 * @class FacilityEditPage
 *
 * @description
 * Page for editing an existing facility. The facility is resolved
 * by the parent route's {@link facilityResolver} and read from
 * {@link ActiveFacilityStore}. Hosts the {@link FacilityForm} in
 * edit mode.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-edit',
  imports: [FacilityForm, SkeletonModule],
  providers: [FacilityStore],
  templateUrl: './facility-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEditPage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router =
    inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute =
    inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property messageService
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events =
    inject<Events>(Events);

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
   * Property activeFacilityStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveFacilityStore}
   */
  private readonly activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore =
    inject<FacilityStore>(FacilityStore);

  /**
   * Property facility
   * @readonly
   *
   * @description
   * The currently resolved facility from the active store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<FacilityOutput | null>}
   */
  protected readonly facility: Signal<FacilityOutput | null> =
    computed<FacilityOutput | null>(() => this.activeFacilityStore.selectedFacility());

  /**
   * Property isLoading
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.activeFacilityStore.isLoadingFacility());
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Subscribes to store events for error toasts and watches
   * updateOperation success for navigation.
   *
   * @since 1.0.0
   */
  public constructor() {
    // Navigate back to facility detail on successful update
    effect(() => {
      const operation = this.store.updateOperation();
      if (operation.status === 'success' && operation.data) {
        this.messageService.add({
          severity: 'success',
          summary: 'Facility updated',
          detail: `"${operation.data.name}" has been updated successfully.`,
          life: 4000,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });

    // Error toast on update failure
    this.events
      .on(facilityStoreEvents.updateFailed)
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
   * Converts form values to an {@link UpdateFacilityInput} and
   * dispatches an update action to the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityFormValues} values - The submitted form values.
   *
   * @returns {void}
   */
  protected handleSubmit(values: FacilityFormValues): void {
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    const facilityId: string | undefined = this.facility()?.id;
    if (!organizationId || !facilityId) return;

    const input: UpdateFacilityInput = {
      name: values.name,
      ...(values.code !== undefined ? { code: values.code || null } : {}),
      ...(values.address !== undefined ? { address: values.address || null } : {}),
    };

    this.store.update({ organizationId, facilityId, input });
  }

  /**
   * Method handleCancel
   * @method handleCancel
   *
   * @description
   * Navigates back to the facility detail page.
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
