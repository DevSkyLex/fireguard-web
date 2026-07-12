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
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import {
  resolveInspectionTag,
  type InspectionOutput,
} from '@features/organization/features/inspections/models';
import { Tag, type TagDescriptor } from '@shared/components';

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
    Tag,
  ],
  templateUrl: './facility-inspection-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInspectionDataview {
  //#region Properties
  private static readonly PREVIEW_LIMIT: number = 6;

  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject<FacilityOverviewStore>(FacilityOverviewStore);

  protected readonly filter: WritableSignal<InspectionOverviewFilter> =
    signal<InspectionOverviewFilter>('all');

  protected readonly filterOptions: Array<{
    label: string;
    value: InspectionOverviewFilter;
  }> = [
    { label: $localize`:@@facility.inspFilter.all:All`, value: 'all' },
    { label: $localize`:@@facility.inspFilter.overdue:Overdue`, value: 'overdue' },
    { label: $localize`:@@facility.inspFilter.upcoming:Upcoming`, value: 'upcoming' },
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

  //#endregion

  //#region Methods
  /**
   * Resolves the result badge descriptor for an inspection row.
   *
   * @param {string} result - Inspection result.
   * @returns {TagDescriptor} Matching result descriptor.
   */
  protected resultDescriptor(result: string): TagDescriptor {
    return resolveInspectionTag('result', result);
  }

  /**
   * Resolves the status badge descriptor for an inspection row.
   *
   * @param {string} status - Inspection status.
   * @returns {TagDescriptor} Matching status descriptor.
   */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInspectionTag('status', status);
  }

  protected getInspectorDisplayName(inspection: InspectionOutput): string {
    return (
      inspection.inspector?.displayName || $localize`:@@facility.unknownInspector:Unknown inspector`
    );
  }
  //#endregion
}
