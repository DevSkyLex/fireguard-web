import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';

/**
 * One counter, ready to render.
 *
 * @since 1.0.0
 */
interface FleetCounter {
  readonly label: string;
  readonly value: number;
  readonly toneClass: string;
}

/**
 * Component EquipmentFleetSummary
 * @class EquipmentFleetSummary
 *
 * @description
 * A single line of fleet counters above the equipment table: total assets, how
 * many are up to date, and how many fall due soon.
 *
 * A line rather than a row of metric cards — the app reserves metric cards for
 * the dashboard, and repeating that treatment on every listing is the
 * "card-everything" layout PRODUCT.md lists as an anti-reference.
 *
 * `openNonConformities` is deliberately not shown: the backend computes it
 * organization-wide because non-conformities attach to inspections rather than
 * equipment, so beside equipment counters it would read as a per-asset figure
 * it is not.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-fleet-summary [kpis]="kpiStore.queryData()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-fleet-summary',
  templateUrl: './equipment-fleet-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentFleetSummary {
  //#region Inputs
  /**
   * Property kpis
   * @readonly
   *
   * @description
   * The counters, or `null` while they load or after a failure — the summary is
   * secondary to the table and simply stays out of the way rather than showing
   * a skeleton or an error of its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<EquipmentKpiOutput | null>}
   */
  public readonly kpis: InputSignal<EquipmentKpiOutput | null> = input<EquipmentKpiOutput | null>(
    null,
  );
  //#endregion

  //#region Properties
  /**
   * Property counters
   * @readonly
   *
   * @description
   * The counters to render, empty until they arrive.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly FleetCounter[]>}
   */
  protected readonly counters: Signal<readonly FleetCounter[]> = computed(
    (): readonly FleetCounter[] => {
      const kpis: EquipmentKpiOutput | null = this.kpis();
      if (kpis === null) return [];

      return [
        {
          label: $localize`:@@equipment.summary.total:assets`,
          value: kpis.totalAssets,
          toneClass: 'text-surface-950 dark:text-surface-50',
        },
        {
          label: $localize`:@@equipment.summary.upToDate:up to date`,
          value: kpis.compliant,
          toneClass: 'text-green-600 dark:text-green-400',
        },
        {
          label: $localize`:@@equipment.summary.dueSoon:due soon`,
          value: kpis.dueSoon,
          toneClass: 'text-amber-600 dark:text-amber-400',
        },
      ];
    },
  );
  //#endregion
}
