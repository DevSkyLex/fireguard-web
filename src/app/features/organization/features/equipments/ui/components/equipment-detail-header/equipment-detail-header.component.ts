import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import {
  resolveEquipmentTag,
  type EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { Tag, type TagDescriptor } from '@shared/components';

/**
 * Header presenting equipment identity, status and lifecycle actions.
 */
@Component({
  selector: 'app-equipment-detail-header',
  imports: [ButtonModule, SplitButtonModule, DatePipe, TitleCasePipe, Tag],
  templateUrl: './equipment-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailHeader {
  /** Equipment presented by the header. */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required();
  /** Human-readable equipment type (underscores replaced), title-cased in the template. */
  public readonly typeLabel: Signal<string> = computed((): string =>
    this.equipment().type.replace(/_/g, ' '),
  );
  /** Whether the active member can mutate equipment. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether a lifecycle transition is pending. */
  public readonly lifecycleLoading: InputSignal<boolean> = input(false);
  /** Emits an equipment edit request. */
  public readonly edit: OutputEmitterRef<void> = output();
  /** Emits an equipment commission request. */
  public readonly commission: OutputEmitterRef<void> = output();
  /** Emits an equipment maintenance request. */
  public readonly maintenance: OutputEmitterRef<void> = output();
  /** Emits an equipment decommission request. */
  public readonly decommission: OutputEmitterRef<void> = output();

  /** Resolves the status badge descriptor for the equipment. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveEquipmentTag('status', status);
  }

  /**
   * Property overflowItems
   * @readonly
   *
   * @description
   * The lifecycle actions, under the Edit split button's caret: Resume
   * service/Commission, Maintenance and Decommission are situational status
   * transitions, not the routine action a reader reaches for every visit —
   * four flat buttons gave Decommission the same weight as Edit.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly overflowItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const equipment: EquipmentOutput = this.equipment();
    const items: MenuItem[] = [];

    if (equipment.status === 'under_maintenance') {
      items.push({
        label: $localize`:@@equipment.resumeService:Resume service`,
        icon: 'pi pi-check',
        command: (): void => this.commission.emit(),
      });
    } else if (equipment.status !== 'operational' && equipment.status !== 'decommissioned') {
      items.push({
        label: $localize`:@@equipment.commission:Commission`,
        icon: 'pi pi-check',
        disabled: !equipment.facilityId,
        command: (): void => this.commission.emit(),
      });
    }

    if (equipment.status === 'operational') {
      items.push({
        label: $localize`:@@equipment.maintenance:Maintenance`,
        icon: 'pi pi-wrench',
        command: (): void => this.maintenance.emit(),
      });
    }

    if (equipment.status !== 'decommissioned') {
      items.push({
        label: $localize`:@@equipment.decommission:Decommission`,
        icon: 'pi pi-ban',
        styleClass: 'text-red-500',
        command: (): void => this.decommission.emit(),
      });
    }

    return items;
  });
}
