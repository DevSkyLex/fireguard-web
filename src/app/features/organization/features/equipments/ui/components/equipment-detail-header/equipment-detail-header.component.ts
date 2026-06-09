import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';

/**
 * Header presenting equipment identity, status and lifecycle actions.
 */
@Component({
  selector: 'app-equipment-detail-header',
  imports: [AvatarModule, ButtonModule, DatePipe, TagModule, TitleCasePipe],
  templateUrl: './equipment-detail-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailHeader {
  /** Equipment presented by the header. */
  public readonly equipment: InputSignal<EquipmentOutput> = input.required();
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
}
