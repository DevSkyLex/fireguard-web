import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { MetricCard } from '@shared/components';

/**
 * One KPI card, ready to render. `value` is `null` before the first load
 * completes so `app-metric-card` renders an em dash instead of a misleading
 * zero.
 *
 * @since 2.0.0
 */
interface FleetMetric {
  readonly icon: string;
  readonly title: string;
  readonly value: number | null;
  readonly description: string;
}

/**
 * Component EquipmentFleetSummary
 * @class EquipmentFleetSummary
 *
 * @description
 * The KPI strip above the equipment table: total assets, compliant, due soon
 * and open non-conformities, rendered as a responsive row of the shared
 * `app-metric-card`.
 *
 * `openNonConformities` is backend-computed organization-wide because
 * non-conformities attach to inspections rather than equipment — there is no
 * reliable per-asset count. Labelling the card "Non-conformity" next to
 * equipment counters is a deliberate exception to that boundary, matching the
 * approved collaboration-phase prototype; the count still describes the whole
 * organization, not the assets above it.
 *
 * The "next 30 days" due-soon subtitle names the platform default reminder
 * window (`OrganizationComplianceDefaults::REMINDER_WINDOW_DAYS`); an
 * organization that customized its window (1–180 days) sees the same fixed
 * copy even though the backend counts against its own configured window.
 * `EquipmentKpiOutput` does not expose the effective window today.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-equipment-fleet-summary [kpis]="kpiStore.queryData()" [loading]="kpiStore.isQueryLoading()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-fleet-summary',
  imports: [MetricCard],
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
   * The counters, or `null` while they load or after a failure — the cards
   * render an em dash in that case rather than a misleading zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<EquipmentKpiOutput | null>}
   */
  public readonly kpis: InputSignal<EquipmentKpiOutput | null> = input<EquipmentKpiOutput | null>(
    null,
  );

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the counters are currently being fetched, forwarded to each
   * card's own skeleton state.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property metrics
   * @readonly
   *
   * @description
   * The four KPI cards to render, in prototype order: total assets,
   * compliant, due soon, non-conformity. Labels and icons are always present
   * so the strip can render as loading skeletons before {@link kpis} arrives.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly FleetMetric[]>}
   */
  protected readonly metrics: Signal<readonly FleetMetric[]> = computed(
    (): readonly FleetMetric[] => {
      const kpis: EquipmentKpiOutput | null = this.kpis();

      return [
        {
          icon: 'pi pi-box',
          title: $localize`:@@equipment.kpi.totalAssets:Total assets`,
          value: kpis?.totalAssets ?? null,
          description: '',
        },
        {
          icon: 'pi pi-check-circle',
          title: $localize`:@@equipment.kpi.compliant:Compliant`,
          value: kpis?.compliant ?? null,
          description: kpis ? EquipmentFleetSummary.compliantShare(kpis) : '',
        },
        {
          icon: 'pi pi-clock',
          title: $localize`:@@equipment.kpi.dueSoon:Due soon`,
          value: kpis?.dueSoon ?? null,
          description: $localize`:@@equipment.kpi.dueSoonSubtitle:next 30 days`,
        },
        {
          icon: 'pi pi-exclamation-triangle',
          title: $localize`:@@equipment.kpi.nonConformity:Non-conformity`,
          value: kpis?.openNonConformities ?? null,
          description: $localize`:@@equipment.kpi.nonConformitySubtitle:open`,
        },
      ];
    },
  );

  /**
   * Property hasContent
   * @readonly
   *
   * @description
   * Whether the strip has anything to show: either the counters arrived, or
   * a load is in flight and the cards should render as skeletons. Stays
   * hidden on a failed load with no cached data, matching the rest of this
   * secondary summary — it stays out of the way rather than showing a
   * permanent skeleton or an error of its own.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasContent: Signal<boolean> = computed(
    (): boolean => this.loading() || this.kpis() !== null,
  );
  //#endregion

  //#region Methods
  /**
   * Method compliantShare
   * @static
   *
   * @description
   * The compliant share of the fleet as a rounded percentage string, or an
   * empty subtitle when there are no assets to divide by.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {EquipmentKpiOutput} kpis - The loaded counters.
   *
   * @returns {string} The rounded percentage (e.g. `"92%"`), or `''`.
   */
  private static compliantShare(kpis: EquipmentKpiOutput): string {
    if (kpis.totalAssets <= 0) return '';
    return `${Math.round((kpis.compliant / kpis.totalAssets) * 100)}%`;
  }
  //#endregion
}
