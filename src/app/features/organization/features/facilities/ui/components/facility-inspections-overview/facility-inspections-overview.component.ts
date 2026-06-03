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
import { SkeletonModule } from 'primeng/skeleton';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';

/**
 * Type InspectionOverviewFilter
 *
 * @description
 * Available client-side filters for the inspections overview list.
 */
export type InspectionOverviewFilter = 'all' | 'overdue' | 'upcoming';

/**
 * Component FacilityInspectionsOverview
 * @class FacilityInspectionsOverview
 *
 * @description
 * Overview card listing recent inspections for the active facility with
 * client-side filter pills (all, overdue, upcoming). Reads previews from
 * the component-scoped {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-inspections-overview',
  imports: [DatePipe, SkeletonModule],
  templateUrl: './facility-inspections-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInspectionsOverview {
  //#region Properties
  /**
   * Maximum number of inspections rendered in the preview list.
   */
  private static readonly PREVIEW_LIMIT: number = 6;

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing inspection previews.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityOverviewStore}
   */
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject(FacilityOverviewStore);

  /**
   * Property filter
   *
   * @description
   * Currently selected client-side filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InspectionOverviewFilter>}
   */
  protected readonly filter: WritableSignal<InspectionOverviewFilter> =
    signal<InspectionOverviewFilter>('all');

  /**
   * Property filters
   * @readonly
   *
   * @description
   * Available filter pills (value/label pairs).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ReadonlyArray<{ value: InspectionOverviewFilter; label: string }>}
   */
  protected readonly filters: ReadonlyArray<{ value: InspectionOverviewFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'upcoming', label: 'Upcoming' },
  ];

  /**
   * Property visibleInspections
   * @readonly
   *
   * @description
   * Inspections filtered by the active pill, sorted by performed date and
   * capped for preview.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<InspectionOutput>>}
   */
  protected readonly visibleInspections: Signal<ReadonlyArray<InspectionOutput>> = computed<
    ReadonlyArray<InspectionOutput>
  >(() => {
    const nowTimestamp: number = Date.now();
    const activeFilter: InspectionOverviewFilter = this.filter();

    const filtered: InspectionOutput[] = this.store.inspections().filter((inspection) => {
      const performedTimestamp: number = Date.parse(inspection.performedAt);
      switch (activeFilter) {
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
      .slice(0, FacilityInspectionsOverview.PREVIEW_LIMIT);
  });
  //#endregion

  //#region Methods
  /**
   * Returns a short label for an inspection workflow status.
   *
   * @param {InspectionStatus} status - Inspection workflow status.
   * @returns {string} Display label.
   */
  protected getStatusLabel(status: InspectionStatus): string {
    switch (status) {
      case 'draft':
        return 'To plan';
      case 'submitted':
        return 'In progress';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  }

  /**
   * Returns a compact label for an inspection result.
   *
   * @param {InspectionResult} result - Inspection result.
   * @returns {string} Display label.
   */
  protected getResultLabel(result: InspectionResult): string {
    switch (result) {
      case 'pass':
        return 'Pass';
      case 'fail':
        return 'Fail';
      case 'partial':
        return 'Partial';
      default:
        return result;
    }
  }

  /**
   * Returns the Tailwind background token for an inspection result dot.
   *
   * @param {InspectionResult} result - Inspection result.
   * @returns {string} Tailwind background color class.
   */
  protected getResultDotClass(result: InspectionResult): string {
    switch (result) {
      case 'pass':
        return 'bg-green-500';
      case 'fail':
        return 'bg-red-500';
      case 'partial':
        return 'bg-amber-500';
      default:
        return 'bg-surface-400';
    }
  }

  /**
   * Returns the display name of the embedded inspector summary.
   *
   * @param {InspectionOutput} inspection - Inspection row to format.
   * @returns {string} Inspector display name or fallback text.
   */
  protected getInspectorDisplayName(inspection: InspectionOutput): string {
    return inspection.inspector?.displayName || 'Unknown inspector';
  }
  //#endregion
}
