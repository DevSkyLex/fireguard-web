import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import type {
  AddAttachmentInput,
  EquipmentAttachmentOutput,
} from '@features/organization/features/equipments/models';
import { EquipmentAttachmentForm } from '@features/organization/features/equipments/ui/forms';

/**
 * Table presenting equipment attachments and removal actions.
 */
@Component({
  selector: 'app-equipment-attachment-table',
  imports: [
    ButtonModule,
    DatePipe,
    DecimalPipe,
    EquipmentAttachmentForm,
    SkeletonModule,
    TableModule,
  ],
  templateUrl: './equipment-attachment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentAttachmentTable {
  /** Equipment attachments to display. */
  public readonly attachments: InputSignal<readonly EquipmentAttachmentOutput[]> = input.required();
  /** Whether attachments are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether an attachment mutation is pending. */
  public readonly mutating: InputSignal<boolean> = input(false);
  /** Whether the active member can manage attachments. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Emits valid attachment creation values. */
  public readonly add: OutputEmitterRef<AddAttachmentInput> = output();
  /** Emits an attachment selected for removal. */
  public readonly remove: OutputEmitterRef<EquipmentAttachmentOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(4);
}
