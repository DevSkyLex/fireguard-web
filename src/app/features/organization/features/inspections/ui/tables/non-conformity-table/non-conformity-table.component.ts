import { DatePipe, TitleCasePipe } from '@angular/common';
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
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type {
  NonConformityOutput,
  NonConformityStatus,
} from '@features/organization/features/inspections/models';
import {
  NonConformityForm,
  type NonConformityFormValues,
} from '@features/organization/features/inspections/ui/forms';

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
    DatePipe,
    FormsModule,
    NonConformityForm,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TitleCasePipe,
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
  /** Supported non-conformity status options. */
  protected readonly statusOptions: { label: string; value: NonConformityStatus }[] = [
    { label: 'Open', value: 'open' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Done', value: 'done' },
    { label: 'Waived', value: 'waived' },
  ];
}
