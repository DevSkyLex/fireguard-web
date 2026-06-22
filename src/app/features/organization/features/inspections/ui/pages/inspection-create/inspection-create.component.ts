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
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import type { CreateInspectionInput } from '@features/organization/features/inspections/models';
import {
  InspectionStore,
  inspectionStoreEvents,
} from '@features/organization/features/inspections/state';
import {
  InspectionForm,
  type InspectionFormValues,
} from '@features/organization/features/inspections/ui/forms';
import { ORGANIZATION_QUOTA_RESOURCE } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationQuotaUpgradeDialog } from '@features/organization/ui/components';
import { isQuotaExceededError } from '@features/organization/utils';

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
  imports: [InspectionForm, OrganizationQuotaUpgradeDialog],
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
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
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
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);

  /**
   * Property equipmentStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  protected readonly equipmentStore: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  /**
   * Property facilityStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly facilityStore: FacilityStore = inject<FacilityStore>(FacilityStore);

  /**
   * Property checklistStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ChecklistStore}
   */
  protected readonly checklistStore: ChecklistStore = inject<ChecklistStore>(ChecklistStore);

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

  /** The capped resource governing inspection creation. */
  protected readonly quotaResource = ORGANIZATION_QUOTA_RESOURCE.INSPECTIONS;

  /** Visibility of the quota upgrade dialog shown on a 409 failure. */
  protected readonly quotaDialogVisible: WritableSignal<boolean> = signal<boolean>(false);
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
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId && isPlatformBrowser(this.platformId)) {
      this.equipmentStore.ensureInspectionCreateOptionsLoaded(organizationId);
      this.facilityStore.ensureParentOptionsLoaded(organizationId);
      this.checklistStore.ensureInspectionCreateOptionsLoaded(organizationId);
    }

    // Navigate to the inspection list on successful creation
    effect(() => {
      const operation = this.store.createCallState();
      if (operation.status === 'success' && operation.data) {
        this.messageService.add({
          severity: 'success',
          summary: $localize`:@@inspection.created.summary:Inspection created`,
          detail: $localize`:@@inspection.created.detail:The inspection has been created successfully.`,
          life: 4000,
        });
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });

    // Error feedback on create failure: route quota (409) failures to the
    // actionable upgrade dialog, everything else to a generic error toast.
    this.events
      .on(inspectionStoreEvents.createFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        if (isQuotaExceededError(payload)) {
          this.quotaStore.reload();
          this.quotaDialogVisible.set(true);
          return;
        }

        this.messageService.add({
          severity: 'error',
          summary: $localize`:@@common.error:Error`,
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
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId) return;

    const input: CreateInspectionInput = {
      equipmentId: values.equipmentId,
      result: values.result,
      performedAt: values.performedAt?.toISOString() ?? new Date().toISOString(),
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
