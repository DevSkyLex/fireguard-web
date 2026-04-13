import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import type { EquipmentOutput, EquipmentStatus } from '@features/organization/features/equipments/models';

/**
 * Component FacilityEquipmentTab
 * @class FacilityEquipmentTab
 *
 * @description
 * Tab content component that displays equipment assigned to a
 * facility. Provides its own {@link EquipmentStore} instance and
 * loads equipment filtered by the given `facilityId`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-equipment-tab',
  imports: [
    DatePipe,
    SkeletonModule,
  ],
  providers: [EquipmentStore],
  templateUrl: './facility-equipment-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentTab {
  //#region Inputs
  /**
   * Input facilityId
   * @readonly
   *
   * @description
   * The facility ID to filter equipment by.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  protected readonly store: EquipmentStore =
    inject<EquipmentStore>(EquipmentStore);

  protected readonly equipmentList: Signal<ReadonlyArray<EquipmentOutput>> =
    computed<ReadonlyArray<EquipmentOutput>>(() => this.store.equipmentList());

  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.store.isLoadingEquipment());

  protected readonly isEmpty: Signal<boolean> =
    computed<boolean>(() => this.store.isEmpty());

  private readonly statusColors: Record<EquipmentStatus, string> = {
    in_stock: 'bg-blue-500',
    commissioned: 'bg-green-500',
    decommissioned: 'bg-surface-400',
    under_maintenance: 'bg-orange-500',
  };

  private readonly statusLabels: Record<EquipmentStatus, string> = {
    in_stock: 'In Stock',
    commissioned: 'Commissioned',
    decommissioned: 'Decommissioned',
    under_maintenance: 'Maintenance',
  };
  //#endregion

  //#region Constructor
  public constructor() {
    effect(() => {
      const facilityId: string = this.facilityId();
      const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
      if (organizationId && facilityId) {
        this.store.load({
          organizationId,
          options: { params: { facilityId } },
        });
      }
    });
  }
  //#endregion

  //#region Methods
  protected getStatusColor(status: EquipmentStatus): string {
    return this.statusColors[status];
  }

  protected getStatusLabel(status: EquipmentStatus): string {
    return this.statusLabels[status];
  }
  //#endregion
}
