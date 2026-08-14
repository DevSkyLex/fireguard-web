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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideCircleAlert } from '@ng-icons/lucide';
import { SOURCE_TONE } from '@features/organization/features/calendar/constants';
import type {
  CalendarFeedItemOutput,
  CalendarSourceKey,
} from '@features/organization/features/calendar/models';
import {
  CalendarFeedStore,
  type CalendarFeedStoreType,
} from '@features/organization/features/calendar/state';
import { Calendar, toIsoDay, type CalendarDisplayEvent } from '@shared/calendar';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { CalendarEntryList } from '../../components/calendar-entry-list';

/**
 * Type CalendarPageAgendaGroup
 *
 * @description
 * One day's worth of the agenda the page renders below `md` — the same
 * window the month grid shows above it, grouped by local day since the
 * shrunken grid does not render there (`FEATURE.md`).
 *
 * @since 1.1.0
 */
type CalendarPageAgendaGroup = {
  readonly day: string;
  readonly label: string;
  readonly items: readonly CalendarFeedItemOutput[];
};

/**
 * Component CalendarPage
 * @class CalendarPage
 *
 * @description
 * The organization's calendar: every dated commitment — standalone events,
 * inspections, interventions, preventive maintenance — read from the
 * backend's unified feed. A full-height console: a page-level toolbar band
 * (Today, prev/next month, the current period label) drives the page's own
 * `month`/`selectedDay` state — the shared `app-calendar` widget renders with
 * its own built-in toolbar hidden (`showToolbar="false"`) so the two never
 * duplicate — and the grid fills the remaining height, scrolling internally
 * if a month overflows. At `md` and below, the shrunken grid gives way to an
 * agenda: the same window's entries grouped by day, since a month grid is
 * unusable at phone width. The grid's own day panel and the agenda's day
 * groups both render through `CalendarEntryList`, the single row renderer for
 * a feed entry — an intervention entry links to its workspace. Browser-only
 * loading: the feed is a dated, authenticated read that would immediately
 * refetch after hydration (ARCHITECTURE.md §12.5-3).
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    Calendar,
    CalendarEntryList,
    NgIcon,
    HlmButton,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmEmptyImports,
  ],
  providers: [
    CalendarFeedStore,
    provideIcons({ lucideChevronLeft, lucideChevronRight, lucideCircleAlert }),
  ],
  templateUrl: './calendar-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
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

  /** Anchor of the displayed month, driven two-way by the grid and by the toolbar. */
  protected readonly month: WritableSignal<Date> = signal<Date>(new Date());

  /** The selected day (`yyyy-MM-dd`), today on arrival. */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    toIsoDay(new Date()),
  );

  /** Feed items mapped onto the shared calendar's generic chips. */
  protected readonly events: Signal<readonly CalendarDisplayEvent[]> = computed(() =>
    this.store.items().map((item: CalendarFeedItemOutput): CalendarDisplayEvent => {
      const key: CalendarSourceKey = item.sourceKey;

      return {
        id: `${item.sourceKey}:${item.id}`,
        date: item.startsAt,
        label: item.title,
        tone: SOURCE_TONE[key] ?? 'outline',
      };
    }),
  );

  /**
   * Property periodLabel
   * @readonly
   * @description The toolbar's "Month Year" label — the grid's own title, hidden, mirrors it.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly periodLabel: Signal<string> = computed<string>(() =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.month()),
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

  /**
   * Property agendaGroups
   * @readonly
   *
   * @description
   * The loaded window's entries grouped by local day, earliest day and
   * earliest entry first — the agenda's day sections below `md`, where the
   * shrunken month grid does not render.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly CalendarPageAgendaGroup[]>}
   */
  protected readonly agendaGroups: Signal<readonly CalendarPageAgendaGroup[]> = computed(() => {
    const grouped = new Map<string, CalendarFeedItemOutput[]>();
    for (const item of this.store.items()) {
      const day: string = toIsoDay(new Date(item.startsAt));
      const bucket: CalendarFeedItemOutput[] = grouped.get(day) ?? [];
      bucket.push(item);
      grouped.set(day, bucket);
    }

    return [...grouped.entries()]
      .toSorted(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .map(([day, items]): CalendarPageAgendaGroup => ({
        day,
        label: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
          new Date(`${day}T00:00:00`),
        ),
        items: items.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
      }));
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
   * Method goToday
   * @description Re-anchors the toolbar on the current month and selects today.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected goToday(): void {
    const today: Date = new Date();
    this.month.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.selectedDay.set(toIsoDay(today));
  }

  /**
   * Method stepMonth
   * @description Moves the toolbar's anchor one month backwards or forwards.
   * @access protected
   * @since 1.1.0
   * @param {number} offset - `-1` or `1`.
   * @returns {void}
   */
  protected stepMonth(offset: number): void {
    const current: Date = this.month();
    this.month.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
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
  //#endregion
}
