import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import type {
  InterventionPriority,
  InterventionResponsibleStatisticOutput,
  InterventionSiteStatisticOutput,
  InterventionStatisticsOutput,
} from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { InterventionTag } from '../intervention-tag';

/** The priority ladder, in the order the breakdown lists it. */
const PRIORITY_VALUES: readonly InterventionPriority[] = ['low', 'normal', 'high', 'urgent'];

/**
 * Component InterventionStatisticsAnalysis
 * @class InterventionStatisticsAnalysis
 *
 * @description
 * The list page's "Analysis" disclosure, beneath the KPI strip: the parts
 * of `InterventionStatisticsOutput` the strip's four tiles do not render —
 * `byPriority` as labeled counts, `bySite`/`byResponsible` as their top-10
 * lists, and `averagePublicationDays`. Collapsed by default, matching the
 * KPI strip's own idiom of labeled counts and short lists rather than a
 * chart.
 *
 * A `null` `siteName`/`displayName` (a since-deleted facility or member)
 * falls back to a localized "Unknown" label rather than an empty cell.
 * Sites link into the facility record; responsibles link into the
 * organization's members list — this codebase has no per-member profile
 * route yet, so that list is the closest existing surface rather than a
 * fabricated deep link.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.2): derived only from
 * {@link statistics} and {@link organizationId}, no store, no service.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-statistics-analysis',
  imports: [NgIcon, RouterLink, HlmButton, InterventionTag, ...HlmCollapsibleImports],
  providers: [provideIcons({ lucideChevronDown })],
  templateUrl: './intervention-statistics-analysis.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionStatisticsAnalysis {
  //#region Inputs
  /** The organization-wide snapshot, or `null` while it has not resolved yet. */
  public readonly statistics: InputSignal<InterventionStatisticsOutput | null> =
    input<InterventionStatisticsOutput | null>(null);

  /** The active organization, for the site/member links. */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** Whether the disclosure is expanded. Collapsed by default. */
  protected readonly expanded: WritableSignal<boolean> = signal<boolean>(false);

  /** Every priority paired with its count, zero-filled. */
  protected readonly priorityCounts: Signal<
    ReadonlyArray<{ readonly priority: InterventionPriority; readonly count: number }>
  > = computed(() => {
    const byPriority = this.statistics()?.byPriority;

    return PRIORITY_VALUES.map((priority) => ({
      priority,
      count: byPriority?.[priority] ?? 0,
    }));
  });

  /** The top-10 sites, or an empty list before the snapshot resolves. */
  protected readonly bySite: Signal<readonly InterventionSiteStatisticOutput[]> = computed(
    () => this.statistics()?.bySite ?? [],
  );

  /** The top-10 responsibles, or an empty list before the snapshot resolves. */
  protected readonly byResponsible: Signal<readonly InterventionResponsibleStatisticOutput[]> =
    computed(() => this.statistics()?.byResponsible ?? []);

  /** The formatted average publication time, or "—" when the organization has no publications. */
  protected readonly averagePublicationDaysLabel: Signal<string> = computed<string>(() => {
    const value: number | null = this.statistics()?.averagePublicationDays ?? null;

    return value === null ? '—' : value.toFixed(1);
  });

  /** Fallback for a `bySite` row whose facility no longer resolves. */
  protected readonly siteFallbackLabel: string = $localize`:@@intervention.statistics.analysis.unknownSite:Unknown`;

  /** Fallback for a `byResponsible` row whose member no longer resolves. */
  protected readonly responsibleFallbackLabel: string = $localize`:@@intervention.statistics.analysis.unknownResponsible:Unknown`;
  //#endregion
}
