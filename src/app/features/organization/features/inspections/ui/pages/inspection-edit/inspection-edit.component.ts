import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  PLATFORM_ID,
  type Signal,
  untracked,
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
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization, bound from `:organizationId` by the router. The
   * parameter — not the store — is the source of truth: a page rendered under
   * this segment is, by construction, scoped to that organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** Router used after inspection update or cancellation. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative inspection routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Platform identifier used to guard browser-only reference loading. */
  private readonly platformId: object = inject<object>(PLATFORM_ID);
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
    // An effect, not a constructor call: the routed input is only bound after
    // construction, and reading it here would throw NG0950.
    effect((): void => {
      const organizationId: string = this.organizationId();

      if (!isPlatformBrowser(this.platformId)) return;

      untracked((): void => {
        this.equipmentStore.ensureInspectionCreateOptionsLoaded(organizationId);
        this.facilityStore.ensureParentOptionsLoaded(organizationId);
        this.checklistStore.ensureInspectionCreateOptionsLoaded(organizationId);
      });
    });

    effect(() => {
      if (this.store.updateCallState().status === 'success') {
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });
  }

  /** Updates the active draft inspection with valid form values. */
  protected handleSubmit(values: InspectionFormValues): void {
    const inspectionId: string | undefined = this.inspection()?.id;
    if (!inspectionId) return;

    const payload: UpdateInspectionInput = {
      equipmentId: values.equipmentId,
      result: values.result,
      performedAt: values.performedAt?.toISOString(),
      facilityId: values.facilityId || null,
      checklistId: values.checklistId || null,
      notes: values.notes || null,
      signature: values.signature || null,
    };
    this.store.update({ organizationId: this.organizationId(), inspectionId, input: payload });
  }

  /** Returns to inspection detail without updating. */
  protected handleCancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
