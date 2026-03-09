import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { ActiveOrganizationStore } from '@core/stores/organization';
import { InspectionStore, inspectionStoreEvents } from '@core/stores/inspection';
import { EquipmentStore } from '@core/stores/equipment';
import { FacilityStore } from '@core/stores/facility';
import { ChecklistStore } from '@core/stores/checklist';
import type { CreateInspectionInput } from '@core/models/inspection';
import { InspectionForm, type InspectionFormValues } from '@features/organization/features/inspections/forms/inspection-form';

/**
 * Component InspectionCreatePage
 * @class InspectionCreatePage
 *
 * @description
 * Page for creating a new inspection within the current organization.
 * Hosts the {@link InspectionForm} in create mode, loads equipment,
 * facilities and checklists for the form dropdowns, handles store
 * interaction, error toasts and navigation on success.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-create',
  imports: [InspectionForm],
  providers: [InspectionStore, EquipmentStore, FacilityStore, ChecklistStore],
  templateUrl: './inspection-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionCreatePage {
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
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore =
    inject<InspectionStore>(InspectionStore);

  /**
   * Property equipmentStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  protected readonly equipmentStore: EquipmentStore =
    inject<EquipmentStore>(EquipmentStore);

  /**
   * Property facilityStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly facilityStore: FacilityStore =
    inject<FacilityStore>(FacilityStore);

  /**
   * Property checklistStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChecklistStore}
   */
  protected readonly checklistStore: ChecklistStore =
    inject<ChecklistStore>(ChecklistStore);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads equipment, facilities and checklists for the form
   * dropdowns, subscribes to store events for error toasts
   * and watches createOperation success for navigation.
   *
   * @since 1.0.0
   */
  public constructor() {
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.equipmentStore.load({ organizationId, options: { itemsPerPage: 200 } });
      this.facilityStore.loadFacilities({ organizationId, options: { itemsPerPage: 200 } });
      this.checklistStore.load({ organizationId, options: { itemsPerPage: 200 } });
    }

    // Navigate to the inspection list on successful creation
    effect(() => {
      const operation = this.store.createOperation();
      if (operation.status === 'success' && operation.data) {
        this.messageService.add({
          severity: 'success',
          summary: 'Inspection created',
          detail: 'The inspection has been created successfully.',
          life: 4000,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });

    // Error toast on create failure
    this.events
      .on(inspectionStoreEvents.createFailed)
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
   * Converts form values to a {@link CreateInspectionInput} and
   * dispatches a create action to the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionFormValues} values - The submitted form values.
   *
   * @returns {void}
   */
  protected handleSubmit(values: InspectionFormValues): void {
    const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId) return;

    const input: CreateInspectionInput = {
      equipmentId: values.equipmentId,
      result: values.result,
      performedAt: values.performedAt,
      inspectorType: values.inspectorType,
      inspectorName: values.inspectorName,
      ...(values.facilityId ? { facilityId: values.facilityId } : {}),
      ...(values.checklistId ? { checklistId: values.checklistId } : {}),
      ...(values.notes ? { notes: values.notes } : {}),
      ...(values.signature ? { signature: values.signature } : {}),
    };

    this.store.create({ organizationId, input });
  }

  /**
   * Method handleCancel
   * @method handleCancel
   *
   * @description
   * Navigates back to the inspection list.
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
