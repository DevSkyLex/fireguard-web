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
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
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
  imports: [AvatarModule, ButtonModule, DatePipe, TitleCasePipe, Tag],
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
}
