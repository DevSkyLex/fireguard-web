import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { InputSignal, Signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideCircleCheck, lucideClock, lucideEye } from '@ng-icons/lucide';
import type { InterventionStatisticsOutput } from '@features/organization/features/interventions/models';
import {
  StatTile,
  type StatTileBadge,
  type StatTileTone,
} from '@features/organization/ui/components';

/**
 * Type InterventionKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the strip. `tone` is `destructive`
 * only for the overdue count when it is above zero — every other tile is
 * neutral, and severity is always paired with {@link icon} so it is never
 * carried by colour alone (the Glyph Rule, `DESIGN.md`). `queryParams` is set
 * only for a tile whose count exactly matches one of the filter bar's own
 * narrowings (`?due=overdue`, `?status=submitted`) — a count with no exact
 * filter equivalent (`due-soon`'s 48-hour window matches none of the named
 * presets) stays a plain, unlinked figure rather than navigate to a
 * narrowing that would show a different number. `badge` is
 * `null` when the tile has nothing honest to qualify itself with (`due-soon`)
 * rather than carry a fabricated trend. `caption` and `context` fill the
 * tile's footer zone with a stable fact about what the number means — never
 * a time-series trend the backend does not report.
 */
type InterventionKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly icon: string | null;
  readonly tone: StatTileTone;
  readonly queryParams: Readonly<Record<string, string>> | null;
  readonly badge: StatTileBadge | null;
  readonly caption: string;
  readonly context: string;
};

/**
 * Component InterventionKpiStrip
 * @class InterventionKpiStrip
 *
 * @description
 * Presentational KPI strip for the interventions list: open work, overdue,
 * due-soon, and awaiting-review counts, each an {@link StatTile} — the same
 * tile the organization's other data-dense surfaces use, rather than a
 * hand-rolled card. Purely derived from {@link statistics}, {@link loading}
 * and {@link baseRoute} — it injects no store and calls no service
 * (`ARCHITECTURE.md` §10.2).
 *
 * A plain total count is deliberately not a tile: the strip reports the
 * work still awaiting action, and a grand total says nothing about what to
 * do next. The count line that used to sit above the strip was removed with
 * it, so no surface states the total any more. "Open" sums `in_progress`,
 * `planned` and `changes_requested` from `byStatus` — the three statuses
 * still awaiting forward motion, as opposed to `draft` (not yet started) or
 * the terminal `submitted` / `published` / `abandoned`.
 *
 * The overdue and awaiting-review tiles carry a {@link StatTile.link} into
 * the interventions list, narrowed — one click from a glanced-at count to
 * the filtered list behind it, through the same `?due=`/`?status=` query
 * params `InterventionsPage.filters` already parses off the URL.
 *
 * The strip always renders exactly four tiles, so the wrapper sizes its
 * columns with `grid-cols-2 lg:grid-cols-4`: two even columns on narrow
 * viewports, four on a row once there is width for all of them, rather than
 * the `auto-fit` track-filling the strip needed while its tile count varied.
 *
 * Each tile's footer states a stable fact about what its number means —
 * never a fabricated time-series trend, which the statistics endpoint does
 * not report. The overdue and awaiting-review badges read the same counts
 * the tile itself displays; the open tile's badge is its share of
 * {@link InterventionStatisticsOutput.total}, omitted rather than divided
 * by zero when the organization has no interventions yet.
 *
 * Each grid cell's wrapper `div` and the `app-stat-tile` it holds are both
 * `h-full`, propagating the row's stretched height (the grid's default
 * `align-items: stretch`) down to the card so every tile's footer lands on
 * the same bottom edge, whatever its caption or context line's length.
 *
 * @version 1.7.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-kpi-strip',
  imports: [StatTile],
  providers: [provideIcons({ lucideCircleAlert, lucideCircleCheck, lucideClock, lucideEye })],
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

  /**
   * Property baseRoute
   * @readonly
   *
   * @description
   * The interventions list route, for the overdue and awaiting-review
   * tiles' {@link StatTile.link} — the same commands
   * `InterventionsPage.detailRouteBase` already computes, passed through
   * rather than rebuilt here so the strip stays free of route-string
   * knowledge of its own.
   *
   * @access public
   * @since 1.3.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly baseRoute: InputSignal<readonly string[]> = input.required<readonly string[]>();
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
   * @type {Signal<readonly InterventionKpiTile[]>}
   */
  protected readonly tiles: Signal<readonly InterventionKpiTile[]> = computed<
    readonly InterventionKpiTile[]
  >(() => {
    const data: InterventionStatisticsOutput | null = this.statistics();
    const total: number = data?.total ?? 0;
    const overdue: number = data?.overdue ?? 0;
    const open: number =
      (data?.byStatus.in_progress ?? 0) +
      (data?.byStatus.planned ?? 0) +
      (data?.byStatus.changes_requested ?? 0);
    const awaitingReview: number = data?.byStatus.submitted ?? 0;

    const openSharePercent: number | null = total > 0 ? Math.round((open / total) * 100) : null;

    const tiles: InterventionKpiTile[] = [
      {
        id: 'open',
        label: $localize`:@@intervention.kpi.open:Open`,
        value: `${open}`,
        icon: null,
        tone: 'neutral',
        queryParams: null,
        badge:
          openSharePercent === null
            ? null
            : {
                label: $localize`:@@intervention.kpi.open.badge:${openSharePercent}:percent:% of total`,
                icon: null,
                tone: 'neutral',
              },
        caption: $localize`:@@intervention.kpi.open.caption:In progress work`,
        context: $localize`:@@intervention.kpi.open.context:Planned, in progress, or sent back for changes`,
      },
      {
        id: 'overdue',
        label: $localize`:@@intervention.kpi.overdue:Overdue`,
        value: `${overdue}`,
        icon: 'lucideCircleAlert',
        tone: overdue > 0 ? 'destructive' : 'neutral',
        queryParams: { due: 'overdue' },
        badge:
          overdue > 0
            ? {
                label: $localize`:@@intervention.kpi.overdue.badge.needsAttention:Needs attention`,
                icon: 'lucideCircleAlert',
                tone: 'destructive',
              }
            : {
                label: $localize`:@@intervention.kpi.overdue.badge.onTrack:On track`,
                icon: 'lucideCircleCheck',
                tone: 'neutral',
              },
        caption:
          overdue > 0
            ? $localize`:@@intervention.kpi.overdue.caption.pastDue:Past due date`
            : $localize`:@@intervention.kpi.overdue.caption.none:Nothing overdue`,
        context: $localize`:@@intervention.kpi.overdue.context:Not yet submitted after their due date`,
      },
      {
        id: 'due-soon',
        label: $localize`:@@intervention.kpi.dueSoon:Due soon`,
        value: `${data?.dueSoon ?? 0}`,
        icon: 'lucideClock',
        tone: 'neutral',
        queryParams: null,
        badge: null,
        caption: $localize`:@@intervention.kpi.dueSoon.caption:Due within 48h`,
        context: $localize`:@@intervention.kpi.dueSoon.context:Still open and approaching their due date`,
      },
      {
        id: 'awaiting-review',
        label: $localize`:@@intervention.kpi.awaitingReview:Awaiting review`,
        value: `${awaitingReview}`,
        icon: 'lucideEye',
        tone: 'neutral',
        queryParams: { status: 'submitted' },
        badge:
          awaitingReview > 0
            ? {
                label: $localize`:@@intervention.kpi.awaitingReview.badge.toReview:To review`,
                icon: 'lucideEye',
                tone: 'neutral',
              }
            : {
                label: $localize`:@@intervention.kpi.awaitingReview.badge.none:Nothing pending`,
                icon: null,
                tone: 'neutral',
              },
        caption: $localize`:@@intervention.kpi.awaitingReview.caption:Submitted for review`,
        context: $localize`:@@intervention.kpi.awaitingReview.context:Waiting on your decision before publication`,
      },
    ];

    return tiles;
  });
  //#endregion
}
