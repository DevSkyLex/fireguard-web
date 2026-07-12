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
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
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
import { Tag, type TagDescriptor, type TagOption } from '@shared/components';

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
    Tag,
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
