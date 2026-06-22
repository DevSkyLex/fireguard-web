import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID } from '@angular/core';
import type { Signal } from '@angular/core';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilityNextInspectionMetric
 * @class FacilityNextInspectionMetric
 *
 * @description
 * KPI metric card displaying the day countdown until the next upcoming
 * inspection for the active facility, with the target date as subtitle.
 * Reads from the component-scoped {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-next-inspection-metric',
  imports: [MetricCard],
  templateUrl: './facility-next-inspection-metric.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityNextInspectionMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing the next-inspection metric.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityOverviewStore}
   */
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject<FacilityOverviewStore>(FacilityOverviewStore);

  /** Active locale used to format the next-inspection date. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property description
   * @readonly
   *
   * @description
   * Localized subtitle: the formatted due date when a next inspection exists,
   * otherwise a placeholder for the absence of an upcoming date.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly description: Signal<string> = computed((): string => {
    const next: string | null = this.store.nextInspectionAt();
    if (!next) return $localize`:@@facility.metric.nextInspection.none:No upcoming date`;
    const date: string = formatDate(next, 'mediumDate', this.locale);
    return $localize`:@@facility.metric.nextInspection.due:Due ${date}:date:`;
  });
  //#endregion
}
