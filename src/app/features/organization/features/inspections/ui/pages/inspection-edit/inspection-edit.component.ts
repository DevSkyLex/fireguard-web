import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityStore } from '@features/organization/features/facilities/state';
import type {
  InspectionOutput,
  UpdateInspectionInput,
} from '@features/organization/features/inspections/models';
import {
  ActiveInspectionStore,
  InspectionStore,
} from '@features/organization/features/inspections/state';
import {
  InspectionForm,
  type InspectionFormValues,
} from '@features/organization/features/inspections/ui/forms';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Page coordinating updates to the active draft inspection.
 */
@Component({
  selector: 'app-inspection-edit',
  imports: [InspectionForm, SkeletonModule],
  providers: [InspectionStore, EquipmentStore, FacilityStore, ChecklistStore],
  templateUrl: './inspection-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionEditPage {
  /** Router used after inspection update or cancellation. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative inspection routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Platform identifier used to guard browser-only reference loading. */
  private readonly platformId: object = inject<object>(PLATFORM_ID);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  /** Active inspection context store populated by the route resolver. */
  private readonly activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);
  /** Page-scoped inspection workflow store. */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);
  /** Equipment reference data store. */
  protected readonly equipmentStore: EquipmentStore = inject<EquipmentStore>(EquipmentStore);
  /** Facility reference data store. */
  protected readonly facilityStore: FacilityStore = inject<FacilityStore>(FacilityStore);
  /** Checklist reference data store. */
  protected readonly checklistStore: ChecklistStore = inject<ChecklistStore>(ChecklistStore);
  /** Inspection currently selected by the route context. */
  protected readonly inspection: Signal<InspectionOutput | null> = computed(() =>
    this.activeInspectionStore.selectedInspection(),
  );
  /** Whether the active inspection is loading. */
  protected readonly isLoading: Signal<boolean> = computed(() =>
    this.activeInspectionStore.isLoadingInspection(),
  );

  /** Loads form reference data and observes update success. */
  public constructor() {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId && isPlatformBrowser(this.platformId)) {
      this.equipmentStore.ensureInspectionCreateOptionsLoaded(organizationId);
      this.facilityStore.ensureParentOptionsLoaded(organizationId);
      this.checklistStore.ensureInspectionCreateOptionsLoaded(organizationId);
    }

    effect(() => {
      if (this.store.updateCallState().status === 'success') {
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });
  }

  /** Updates the active draft inspection with valid form values. */
  protected handleSubmit(values: InspectionFormValues): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    const inspectionId: string | undefined = this.inspection()?.id;
    if (!organizationId || !inspectionId) return;

    const input: UpdateInspectionInput = {
      equipmentId: values.equipmentId,
      result: values.result,
      performedAt: values.performedAt?.toISOString(),
      facilityId: values.facilityId || null,
      checklistId: values.checklistId || null,
      notes: values.notes || null,
      signature: values.signature || null,
    };
    this.store.update({ organizationId, inspectionId, input });
  }

  /** Returns to inspection detail without updating. */
  protected handleCancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
