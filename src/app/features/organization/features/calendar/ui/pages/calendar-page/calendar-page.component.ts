import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  PLATFORM_ID,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type {
  CalendarFeedItemOutput,
  CalendarSourceKey,
} from '@features/organization/features/calendar/models';
import {
  CalendarFeedStore,
  type CalendarFeedStoreType,
} from '@features/organization/features/calendar/state';
import { Calendar, toIsoDay, type CalendarDisplayEvent } from '@shared/calendar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * The badge tone each feed source renders with, both on the grid chips and in
 * the day panel — one glance says what kind of commitment a day carries.
 */
const SOURCE_TONE: Readonly<Record<CalendarSourceKey, CalendarDisplayEvent['tone']>> = {
  calendar_event: 'default',
  intervention: 'secondary',
  inspection: 'outline',
  maintenance: 'destructive',
};

/**
 * Component CalendarPage
 * @class CalendarPage
 *
 * @description
 * The organization's calendar: every dated commitment — standalone events,
 * inspections, interventions, preventive maintenance — on one month grid,
 * read from the backend's unified feed. The grid is the shared generic
 * `app-calendar`; this page maps feed items onto its display shape, loads a
 * window one week wider than the visible month on each side (the grid shows
 * leading and trailing filler days whose chips must not silently vanish), and
 * renders the selected day's entries as a list — an intervention entry links
 * to its workspace. Browser-only loading: the feed is a dated, authenticated
 * read that would immediately refetch after hydration (ARCHITECTURE.md
 * §12.5-3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    Calendar,
    NgIcon,
    RouterLink,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmItemImports,
  ],
  providers: [CalendarFeedStore, provideIcons({ lucideCircleAlert })],
  templateUrl: './calendar-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The organization whose calendar is shown, from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The unified feed of the displayed window. */
  protected readonly store: CalendarFeedStoreType =
    inject<CalendarFeedStoreType>(CalendarFeedStore);

  private readonly platformId: object = inject(PLATFORM_ID);

  private readonly locale: string = inject(LOCALE_ID);

  /** Anchor of the displayed month, driven two-way by the grid. */
  protected readonly month: WritableSignal<Date> = signal<Date>(new Date());

  /** The selected day (`yyyy-MM-dd`), today on arrival. */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    toIsoDay(new Date()),
  );

  /** Feed items mapped onto the shared calendar's generic chips. */
  protected readonly events: Signal<readonly CalendarDisplayEvent[]> = computed(() =>
    this.store.items().map((item: CalendarFeedItemOutput): CalendarDisplayEvent => ({
      id: `${item.sourceKey}:${item.id}`,
      date: item.startsAt,
      label: item.title,
      tone: SOURCE_TONE[item.sourceKey] ?? 'outline',
    })),
  );

  /** The selected day's entries, earliest first. */
  protected readonly dayItems: Signal<readonly CalendarFeedItemOutput[]> = computed(() => {
    const day: string | null = this.selectedDay();
    if (day === null) return [];

    return this.store
      .items()
      .filter((item) => toIsoDay(new Date(item.startsAt)) === day)
      .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  /** The selected day as a full localized heading. */
  protected readonly selectedDayLabel: Signal<string> = computed<string>(() => {
    const day: string | null = this.selectedDay();
    if (day === null) return '';

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
      new Date(`${day}T00:00:00`),
    );
  });

  /** Whether the last feed read failed. */
  protected readonly loadFailed: Signal<boolean> = computed<boolean>(
    () => this.store.queryError() !== null,
  );
  //#endregion

  //#region Constructor
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const anchor: Date = this.month();

      untracked((): void => {
        if (!isPlatformBrowser(this.platformId)) return;

        this.store.load(this.windowOf(organizationId, anchor));
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @description Re-reads the displayed window after a failure.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load(this.windowOf(this.organizationId(), this.month()));
  }

  /**
   * Method windowOf
   *
   * @description
   * The feed command covering the anchor's month plus one week each side, as
   * the full ISO datetimes with explicit offset the endpoint demands — a bare
   * `yyyy-MM-dd` is a 400.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - The organization to read.
   * @param {Date} anchor - Any date inside the displayed month.
   *
   * @returns {{ organizationId: string; from: string; to: string }} The load command.
   */
  private windowOf(
    organizationId: string,
    anchor: Date,
  ): { readonly organizationId: string; readonly from: string; readonly to: string } {
    return {
      organizationId,
      from: new Date(anchor.getFullYear(), anchor.getMonth(), 1 - 7).toISOString(),
      to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 7, 23, 59, 59).toISOString(),
    };
  }

  /**
   * Method sourceLabelOf
   * @description Names a feed source for the day panel's badge.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {string} A short localized source name.
   */
  protected sourceLabelOf(item: CalendarFeedItemOutput): string {
    switch (item.sourceKey) {
      case 'calendar_event':
        return $localize`:@@calendar.source.event:Event`;
      case 'inspection':
        return $localize`:@@calendar.source.inspection:Inspection`;
      case 'intervention':
        return $localize`:@@calendar.source.intervention:Intervention`;
      case 'maintenance':
        return $localize`:@@calendar.source.maintenance:Maintenance`;
    }
  }

  /**
   * Method toneOf
   * @description The badge tone of a feed entry, from its source.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {CalendarDisplayEvent['tone']} The `hlm-badge` variant.
   */
  protected toneOf(item: CalendarFeedItemOutput): CalendarDisplayEvent['tone'] {
    return SOURCE_TONE[item.sourceKey] ?? 'outline';
  }

  /**
   * Method timeLabelOf
   * @description The entry's time-of-day, or the localized all-day label.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {string} A short time label.
   */
  protected timeLabelOf(item: CalendarFeedItemOutput): string {
    if (item.allDay) return $localize`:@@calendar.allDay:All day`;

    return new Intl.DateTimeFormat(this.locale, { timeStyle: 'short' }).format(
      new Date(item.startsAt),
    );
  }

  /**
   * Method interventionLinkOf
   * @description The intervention workspace route for an intervention entry, null otherwise.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {readonly string[] | null} The router commands, or null.
   */
  protected interventionLinkOf(item: CalendarFeedItemOutput): readonly string[] | null {
    return item.sourceKey === 'intervention'
      ? ['/organizations', this.organizationId(), 'interventions', item.targetId]
      : null;
  }
  //#endregion
}
