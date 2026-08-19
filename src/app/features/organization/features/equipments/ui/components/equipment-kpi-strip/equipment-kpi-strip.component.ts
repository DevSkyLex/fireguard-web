import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck, lucideClock, lucidePackage } from '@ng-icons/lucide';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { StatTile, type StatTileTone } from '@features/organization/ui/components';

/**
 * Type EquipmentKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the strip. No tile carries a
 * `link`: the list's own filters narrow by lifecycle status, not by
 * maintenance-due status or non-conformity count, so none of the four
 * counters has an exact filtered view to point at.
 */
type EquipmentKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly tone: StatTileTone;
  readonly caption: string;
};

/**
 * Component EquipmentKpiStrip
 * @class EquipmentKpiStrip
 *
 * @description
 * Presentational KPI strip for the equipment list: total assets, compliant,
 * due-soon, and organization-wide open non-conformities, each an
 * {@link StatTile} — the same tile the organization's other data-dense
 * surfaces use. Purely derived from {@link statistics} and {@link loading} —
 * it injects no store and calls no service (`ARCHITECTURE.md` §10.2).
 *
 * The open-non-conformities tile's label and caption spell out its
 * organization-wide scope explicitly: `EquipmentKpiOutput.openNonConformities`
 * counts non-conformities across every inspection in the organization, not
 * per-equipment, since non-conformities attach to inspections rather than to
 * equipment.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-kpi-strip',
  imports: [StatTile],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleCheck, lucideClock, lucidePackage })],
  templateUrl: './equipment-kpi-strip.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentKpiStrip {
  //#region Inputs
  /**
   * Property statistics
   * @readonly
   *
   * @description
   * The organization-wide KPI snapshot, or `null` while it has not resolved
   * yet (before the first successful load, or after a failed one).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<EquipmentKpiOutput | null>}
   */
  public readonly statistics: InputSignal<EquipmentKpiOutput | null> =
    input<EquipmentKpiOutput | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the snapshot is currently being fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property tiles
   * @readonly
   *
   * @description
   * The strip's fixed four tiles, in a stable order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly EquipmentKpiTile[]>}
   */
  protected readonly tiles: Signal<readonly EquipmentKpiTile[]> = computed<
    readonly EquipmentKpiTile[]
  >(() => {
    const data: EquipmentKpiOutput | null = this.statistics();
    const dueSoon: number = data?.dueSoon ?? 0;

    return [
      {
        id: 'total-assets',
        label: $localize`:@@equipment.kpi.totalAssets:Total assets`,
        value: `${data?.totalAssets ?? 0}`,
        icon: 'lucidePackage',
        tone: 'neutral',
        caption: $localize`:@@equipment.kpi.totalAssets.caption:Every recorded status`,
      },
      {
        id: 'compliant',
        label: $localize`:@@equipment.kpi.compliant:Compliant`,
        value: `${data?.compliant ?? 0}`,
        icon: 'lucideCircleCheck',
        tone: 'success',
        caption: $localize`:@@equipment.kpi.compliant.caption:Maintenance up to date`,
      },
      {
        id: 'due-soon',
        label: $localize`:@@equipment.kpi.dueSoon:Due soon`,
        value: `${dueSoon}`,
        icon: 'lucideClock',
        tone: dueSoon > 0 ? 'destructive' : 'neutral',
        caption: $localize`:@@equipment.kpi.dueSoon.caption:Maintenance approaching`,
      },
      {
        id: 'open-non-conformities',
        label: $localize`:@@equipment.kpi.openNonConformities:Open non-conformities (organization)`,
        value: `${data?.openNonConformities ?? 0}`,
        icon: 'lucideCircleAlert',
        tone: 'neutral',
        caption: $localize`:@@equipment.kpi.openNonConformities.caption:Across every inspection, not this list`,
      },
    ];
  });
  //#endregion
}
