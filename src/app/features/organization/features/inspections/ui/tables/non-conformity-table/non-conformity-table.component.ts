import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  inspectionTagOptions,
  resolveInspectionTag,
  type NonConformityOutput,
  type NonConformityStatus,
} from '@features/organization/features/inspections/models';
import {
  NonConformityForm,
  type NonConformityFormValues,
} from '@features/organization/features/inspections/ui/forms';
import { EmptyState } from '@shared/empty-state';
import { TABLE_CARD_SHELL_PT, TABLE_CARD_SHELL_STYLE_CLASS } from '@shared/table-card-shell';
import { type TagDescriptor, type TagOption } from '@shared/tag';

/** Describes a requested non-conformity status transition. */
export interface NonConformityStatusChange {
  readonly nonConformity: NonConformityOutput;
  readonly status: NonConformityStatus;
}

/**
 * Table presenting inspection non-conformities and status actions.
 */
@Component({
  selector: 'app-non-conformity-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    FormsModule,
    NonConformityForm,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './non-conformity-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityTable {
  /** Non-conformities to display. */
  public readonly nonConformities: InputSignal<readonly NonConformityOutput[]> = input.required();
  /** Whether non-conformities are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether a non-conformity mutation is pending. */
  public readonly mutating: InputSignal<boolean> = input(false);

  /**
   * Whether an *add* is pending, as opposed to {@link mutating}, which also covers
   * updates. The form clears itself when its own submission completes, so it must
   * not be told an update finished.
   */
  public readonly submitting: InputSignal<boolean> = input(false);

  /** Last add rejection, relayed to the form so a 422 lands on its fields. */
  public readonly submitError: InputSignal<unknown> = input<unknown>(null);
  /** Whether the active member can change statuses. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Whether the active member can add non-conformities. */
  public readonly canAdd: InputSignal<boolean> = input(false);
  /** Emits valid non-conformity creation values. */
  public readonly add: OutputEmitterRef<NonConformityFormValues> = output();
  /** Emits a requested non-conformity status transition. */
  public readonly statusChange: OutputEmitterRef<NonConformityStatusChange> = output();
  /** Emits a non-conformity selected for detail display. */
  public readonly view: OutputEmitterRef<NonConformityOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
  /** Shared card-shell `styleClass` so this table reads like every other carded table. */
  protected readonly cardStyleClass: string = TABLE_CARD_SHELL_STYLE_CLASS;
  /** Shared card-shell pass-through options (flush body, bordered header row). */
  protected readonly cardPt: CardPassThroughOptions = TABLE_CARD_SHELL_PT;
  /** Localized placeholder for empty due-date cells. */
  protected readonly noneLabel: string = $localize`:@@inspection.info.none:None`;
  /** Supported non-conformity status options, resolved from the shared registry. */
  protected readonly statusOptions: TagOption[] = inspectionTagOptions('nonConformityStatus');

  /** Resolves the severity badge descriptor for a non-conformity. */
  protected severityDescriptor(severity: string): TagDescriptor {
    return resolveInspectionTag('nonConformitySeverity', severity);
  }

  /** Resolves the status badge descriptor for a non-conformity. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInspectionTag('nonConformityStatus', status);
  }
}
