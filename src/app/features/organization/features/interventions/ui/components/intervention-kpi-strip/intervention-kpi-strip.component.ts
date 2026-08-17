import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideClock } from '@ng-icons/lucide';
import type { InterventionStatisticsOutput } from '@features/organization/features/interventions/models';
import { StatTile, type StatTileTone } from '@features/organization/ui/components';

/**
 * Type InterventionKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the strip. `tone` is `destructive`
 * only for the overdue count when it is above zero — every other tile is
 * neutral, and severity is always paired with {@link icon} so it is never
 * carried by colour alone (the Glyph Rule, `DESIGN.md`).
 */
type InterventionKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly tone: StatTileTone;
};

/**
 * Component InterventionKpiStrip
 * @class InterventionKpiStrip
 *
 * @description
 * Presentational KPI strip for the interventions list: total, open work,
 * overdue, due-soon and average-publication-delay counts, each an
 * {@link StatTile} — the same tile the organization's other data-dense
 * surfaces use, rather than a hand-rolled card. Purely derived from
 * {@link statistics} and {@link loading} — it injects no store and calls no
 * service (`ARCHITECTURE.md` §10.2).
 *
 * "Open" sums `in_progress`, `planned` and `changes_requested` from
 * `byStatus` — the three statuses still awaiting forward motion, as
 * opposed to `draft` (not yet started) or the terminal `submitted` /
 * `published` / `abandoned`. The average-publication tile renders only
 * when the backend reports a value: an organization with no published
 * interventions yet has nothing to average.
 *
 * The strip's tile count therefore varies (four or five), unlike every
 * other `app-stat-tile` consumer in the app, which always renders a fixed
 * count and can size its wrapper with a plain `grid-cols-N` breakpoint
 * ladder. A fixed ladder sized for five tiles leaves one dead column
 * whenever the average-publication tile is absent, so the wrapper instead
 * uses `grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]`: populated tracks
 * always stretch to fill the row, at four tiles or five, at any width.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-kpi-strip',
  imports: [StatTile],
  providers: [provideIcons({ lucideCircleAlert, lucideClock })],
  templateUrl: './intervention-kpi-strip.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionKpiStrip {
  //#region Inputs
  /**
   * Property statistics
   * @readonly
   *
   * @description
   * The organization-wide snapshot, or `null` while it has not resolved yet
   * (before the first successful load, or after a failed one).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionStatisticsOutput | null>}
   */
  public readonly statistics: InputSignal<InterventionStatisticsOutput | null> =
    input<InterventionStatisticsOutput | null>(null);

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
   * Property averagePublicationLabel
   * @readonly
   *
   * @description
   * The average-publication tile's value, rounded to one decimal — `null`
   * when the backend reports no average, which hides the tile entirely.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly averagePublicationLabel: Signal<string | null> = computed<string | null>(
    () => {
      const days: number | null | undefined = this.statistics()?.averagePublicationDays;

      return days === null || days === undefined ? null : `${Math.round(days * 10) / 10}`;
    },
  );

  /**
   * Property tiles
   * @readonly
   *
   * @description
   * The strip's fixed-order tiles. The average-publication tile is omitted
   * rather than shown empty when the backend reports `null` — while
   * {@link loading} is true this keeps the tile count stable at the four
   * always-shown metrics, matching the strip's resolved footprint once data
   * arrives.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionKpiTile[]>}
   */
  protected readonly tiles: Signal<readonly InterventionKpiTile[]> = computed<
    readonly InterventionKpiTile[]
  >(() => {
    const data: InterventionStatisticsOutput | null = this.statistics();
    const overdue: number = data?.overdue ?? 0;
    const open: number =
      (data?.byStatus.in_progress ?? 0) +
      (data?.byStatus.planned ?? 0) +
      (data?.byStatus.changes_requested ?? 0);

    const tiles: InterventionKpiTile[] = [
      {
        id: 'total',
        label: $localize`:@@intervention.kpi.total:Total`,
        value: `${data?.total ?? 0}`,
        icon: null,
        tone: 'neutral',
      },
      {
        id: 'open',
        label: $localize`:@@intervention.kpi.open:Open`,
        value: `${open}`,
        icon: null,
        tone: 'neutral',
      },
      {
        id: 'overdue',
        label: $localize`:@@intervention.kpi.overdue:Overdue`,
        value: `${overdue}`,
        icon: 'lucideCircleAlert',
        tone: overdue > 0 ? 'destructive' : 'neutral',
      },
      {
        id: 'due-soon',
        label: $localize`:@@intervention.kpi.dueSoon:Due soon`,
        value: `${data?.dueSoon ?? 0}`,
        icon: 'lucideClock',
        tone: 'neutral',
      },
    ];

    const averagePublication: string | null = this.averagePublicationLabel();
    if (averagePublication !== null) {
      tiles.push({
        id: 'average-publication',
        label: $localize`:@@intervention.kpi.averagePublicationDays:Avg. publication`,
        value: $localize`:@@intervention.kpi.averagePublicationDaysValue:${averagePublication}:days: d`,
        icon: null,
        tone: 'neutral',
      });
    }

    return tiles;
  });
  //#endregion
}
