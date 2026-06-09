import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DataViewModule, type DataViewPassThroughOptions } from 'primeng/dataview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';

/**
 * Type InspectionOverviewFilter
 *
 * @description
 * Client-side filters for the facility inspections DataView.
 */
export type InspectionOverviewFilter = 'all' | 'overdue' | 'upcoming';

/**
 * Component FacilityInspectionDataview
 * @class FacilityInspectionDataview
 *
 * @description
 * Facility overview inspections list rendered with PrimeNG DataView.
 * Includes a PrimeNG SelectButton filter and status/result tags.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-inspection-dataview',
  imports: [
    DatePipe,
    FormsModule,
    CardModule,
    DataViewModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './facility-inspection-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInspectionDataview {
  //#region Properties
  private static readonly PREVIEW_LIMIT: number = 6;

  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject(FacilityOverviewStore);

  protected readonly filter: WritableSignal<InspectionOverviewFilter> =
    signal<InspectionOverviewFilter>('all');

  protected readonly filterOptions: Array<{
    label: string;
    value: InspectionOverviewFilter;
  }> = [
    { label: 'All', value: 'all' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Upcoming', value: 'upcoming' },
  ];

  protected readonly inspections: Signal<ReadonlyArray<InspectionOutput>> = computed<
    ReadonlyArray<InspectionOutput>
  >(() => {
    const nowTimestamp: number = Date.now();

    const filtered: ReadonlyArray<InspectionOutput> = this.store
      .inspections()
      .filter((inspection) => {
        const performedTimestamp: number = Date.parse(inspection.performedAt);

        switch (this.filter()) {
          case 'overdue':
            return (
              inspection.status !== 'closed' &&
              Number.isFinite(performedTimestamp) &&
              performedTimestamp < nowTimestamp
            );
          case 'upcoming':
            return Number.isFinite(performedTimestamp) && performedTimestamp >= nowTimestamp;
          default:
            return true;
        }
      });

    return filtered
      .toSorted((left, right) => Date.parse(left.performedAt) - Date.parse(right.performedAt))
      .slice(0, FacilityInspectionDataview.PREVIEW_LIMIT);
  });

  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1',
    },
    footer: {
      class:
        'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 rounded-b-md',
    },
  };

  protected readonly dataviewPt: DataViewPassThroughOptions = {
    root: { class: 'flex min-h-0 flex-1 flex-col bg-surface-0 dark:bg-surface-950' },
    content: { class: 'flex-1 bg-surface-0 dark:bg-surface-950' },
    emptyMessage: { class: 'hidden' },
  };

  private readonly resultSeverities: Record<InspectionResult, 'success' | 'danger' | 'warn'> = {
    pass: 'success',
    fail: 'danger',
    partial: 'warn',
  };

  private readonly statusSeverities: Record<InspectionStatus, 'secondary' | 'info' | 'success'> = {
    draft: 'secondary',
    submitted: 'info',
    closed: 'success',
  };

  private readonly statusLabels: Record<InspectionStatus, string> = {
    draft: 'To plan',
    submitted: 'In progress',
    closed: 'Closed',
  };

  private readonly resultLabels: Record<InspectionResult, string> = {
    pass: 'Pass',
    fail: 'Fail',
    partial: 'Partial',
  };
  //#endregion

  //#region Methods
  protected getResultLabel(result: InspectionResult): string {
    return this.resultLabels[result];
  }

  protected getStatusLabel(status: InspectionStatus): string {
    return this.statusLabels[status];
  }

  protected getResultSeverity(result: InspectionResult): 'success' | 'danger' | 'warn' {
    return this.resultSeverities[result];
  }

  protected getStatusSeverity(status: InspectionStatus): 'secondary' | 'info' | 'success' {
    return this.statusSeverities[status];
  }

  protected getInspectorDisplayName(inspection: InspectionOutput): string {
    return inspection.inspector?.displayName || 'Unknown inspector';
  }
  //#endregion
}
