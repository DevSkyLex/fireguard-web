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
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import type {
  AddAttachmentInput,
  EquipmentAttachmentOutput,
} from '@features/organization/features/equipments/models';
import { EquipmentAttachmentForm } from '@features/organization/features/equipments/ui/forms';
import { EmptyState } from '@shared/empty-state';
import { TABLE_CARD_SHELL_PT, TABLE_CARD_SHELL_STYLE_CLASS } from '@shared/table-card-shell';

/**
 * Table presenting equipment attachments and removal actions.
 */
@Component({
  selector: 'app-equipment-attachment-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    DecimalPipe,
    EmptyState,
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

  /**
   * Whether an *add* is pending, as opposed to {@link mutating}, which also covers
   * deletions. The form clears itself when its own submission completes, so it must
   * not be told a delete finished.
   */
  public readonly submitting: InputSignal<boolean> = input(false);

  /** Last add rejection, relayed to the form so a 422 lands on its fields. */
  public readonly submitError: InputSignal<unknown> = input<unknown>(null);
  /** Whether the active member can manage attachments. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Emits valid attachment creation values. */
  public readonly add: OutputEmitterRef<AddAttachmentInput> = output();
  /** Emits an attachment selected for removal. */
  public readonly remove: OutputEmitterRef<EquipmentAttachmentOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
  /** Shared card-shell `styleClass` so this table reads like every other carded table. */
  protected readonly cardStyleClass: string = TABLE_CARD_SHELL_STYLE_CLASS;
  /** Shared card-shell pass-through options (flush body, bordered header row). */
  protected readonly cardPt: CardPassThroughOptions = TABLE_CARD_SHELL_PT;
}
