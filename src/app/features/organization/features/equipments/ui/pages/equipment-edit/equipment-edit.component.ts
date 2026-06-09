import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import type {
  EquipmentOutput,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
import {
  EquipmentForm,
  type EquipmentFormValues,
} from '@features/organization/features/equipments/ui/forms';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Page coordinating updates to the active equipment.
 */
@Component({
  selector: 'app-equipment-edit',
  imports: [EquipmentForm, SkeletonModule],
  providers: [EquipmentStore],
  templateUrl: './equipment-edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentEditPage {
  /** Router used after equipment update or cancellation. */
  private readonly router: Router = inject<Router>(Router);
  /** Active route used to build relative equipment routes. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  /** Active equipment context store populated by the route resolver. */
  private readonly activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);
  /** Page-scoped equipment workflow store. */
  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);
  /** Equipment currently selected by the route context. */
  protected readonly equipment: Signal<EquipmentOutput | null> = computed(() =>
    this.activeEquipmentStore.selectedEquipment(),
  );
  /** Whether the active equipment is loading. */
  protected readonly isLoading: Signal<boolean> = computed(() =>
    this.activeEquipmentStore.isLoadingEquipment(),
  );

  /** Observes update success and returns to equipment detail. */
  public constructor() {
    effect(() => {
      if (this.store.updateCallState().status === 'success') {
        this.router.navigate(['..'], { relativeTo: this.route });
      }
    });
  }

  /** Updates the active equipment with valid form values. */
  protected handleSubmit(values: EquipmentFormValues): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    const equipmentId: string | undefined = this.equipment()?.id;
    if (!organizationId || !equipmentId) return;

    const input: UpdateEquipmentInput = {
      type: values.type,
      subType: values.subType || null,
      brand: values.brand || null,
      model: values.model || null,
      serialNumber: values.serialNumber || null,
      locationLabel: values.locationLabel || null,
    };
    this.store.update({ organizationId, equipmentId, input });
  }

  /** Returns to equipment detail without updating. */
  protected handleCancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
