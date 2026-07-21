import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Calendar } from '../calendar.component';
import type { CalendarCategoryGroup, CalendarEvent, CalendarView } from '../models';

type CalendarHarness = Calendar & {
  setView(view: CalendarView): void;
  toggleCategory(toggle: { groupId: string; categoryId: string }): void;
};

const EVENT: CalendarEvent = {
  id: 'a',
  title: 'Quarterly audit',
  start: new Date(2026, 5, 15, 9, 0),
  tone: 'info',
  categoryIds: ['status:planned'],
};

const GROUPS: CalendarCategoryGroup[] = [
  {
    id: 'status',
    label: 'Status',
    categories: [{ id: 'status:planned', label: 'Planned', tone: 'info', active: true }],
  },
];

/** Text of the period summary line above the grid. */
const summary = (fixture: ComponentFixture<Calendar>): string =>
  (fixture.nativeElement as HTMLElement)
    .querySelector('[data-testid="calendar-period-summary"]')
    ?.textContent?.trim() ?? '';

/** Number of marked days in the mini-calendar. */
const dots = (fixture: ComponentFixture<Calendar>): number =>
  (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="calendar-mini-day-dot"]')
    .length;

/** Text of every rendered category count, in document order. */
const counts = (fixture: ComponentFixture<Calendar>): string[] =>
  [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid="calendar-category-count"]',
    ),
  ].map((node: Element): string => node.textContent?.trim() ?? '');

describe('Calendar', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });
  });

  function createCalendar() {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('events', [EVENT]);
    fixture.componentRef.setInput('categoryGroups', GROUPS);
    fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    fixture.componentRef.setInput('view', 'month');
    fixture.detectChanges();
    return fixture;
  }

  /**
   * The summary is bounded exactly like the grid it sits above; a figure that
   * disagrees with what is plotted is worse than no figure at all.
   */
  describe('period summary', () => {
    it('counts the events inside the focused month', () => {
      expect(summary(createCalendar())).toBe('1 event');
    });

    it('says so when the period holds nothing', () => {
      const fixture = createCalendar();
      fixture.componentRef.setInput('events', []);
      fixture.detectChanges();

      expect(summary(fixture)).toBe('No events');
    });

    it('excludes events outside the focused month', () => {
      const fixture = createCalendar();
      fixture.componentRef.setInput('events', [
        EVENT,
        { ...EVENT, id: 'b', start: new Date(2026, 6, 2, 9, 0) },
      ]);
      fixture.detectChanges();

      expect(summary(fixture)).toBe('1 event');
    });

    it('re-bounds to the focused week when the week view is active', () => {
      // 15 June 2026 is a Monday; the 2nd is three weeks earlier, so it counts
      // for the month but must drop out of the week.
      const fixture = createCalendar();
      fixture.componentRef.setInput('events', [
        EVENT,
        { ...EVENT, id: 'b', start: new Date(2026, 5, 2, 9, 0) },
      ]);
      fixture.detectChanges();
      expect(summary(fixture)).toBe('2 events');

      (fixture.componentInstance as unknown as CalendarHarness).setView('week');
      fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 15));
      fixture.detectChanges();

      expect(summary(fixture)).toBe('1 event');
    });

    it('counts only what the active categories leave visible', () => {
      const fixture = createCalendar();
      const harness = fixture.componentInstance as unknown as CalendarHarness;

      harness.toggleCategory({ groupId: 'status', categoryId: 'status:planned' });
      fixture.detectChanges();

      expect(summary(fixture)).toBe('No events');
    });
  });

  /**
   * Only the "+N more" overflow could open a day before; a day holding two
   * events — or none — had no target at all.
   */
  describe('opening a day', () => {
    it('opens the focused day in the week view from its date number', () => {
      const fixture = createCalendar();
      const views: CalendarView[] = [];
      fixture.componentInstance.viewChange.subscribe((view: CalendarView) => views.push(view));

      const day: HTMLButtonElement | null = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="calendar-day-select"]',
      );
      day?.click();
      fixture.detectChanges();

      expect(views).toContain('week');
    });

    it('gives every day cell its own target, not just the overflowing ones', () => {
      const fixture = createCalendar();

      // A month grid is 42 cells; each must be reachable, including the empty
      // ones, or "click the day" is a promise the grid only sometimes keeps.
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '[data-testid="calendar-day-select"]',
        ).length,
      ).toBe(42);
    });
  });

  /**
   * The count is what makes an unchecked category worth re-checking. Computed
   * by the calendar rather than by each consumer, so a caller cannot forget to
   * fill it and render a misleading zero.
   */
  /**
   * The mini-calendar previously built its grid with an empty event array, so
   * it could never mark anything — the data simply never reached it.
   */
  describe('mini-calendar day marks', () => {
    it('marks the day holding an event', () => {
      expect(dots(createCalendar())).toBe(1);
    });

    it('marks nothing when there is nothing to plot', () => {
      const fixture = createCalendar();
      fixture.componentRef.setInput('events', []);
      fixture.detectChanges();

      expect(dots(fixture)).toBe(0);
    });

    it('follows the category filters', () => {
      // A dot on a day whose only event is filtered out would send the reader
      // to a month view showing nothing.
      const fixture = createCalendar();
      const harness = fixture.componentInstance as unknown as CalendarHarness;

      harness.toggleCategory({ groupId: 'status', categoryId: 'status:planned' });
      fixture.detectChanges();

      expect(dots(fixture)).toBe(0);
    });
  });

  describe('category counts', () => {
    it('counts the events carrying each category', () => {
      const fixture = createCalendar();

      expect(counts(fixture)).toEqual(['1']);
    });

    it('keeps a category counted once it is switched off', () => {
      // Counting the *visible* events would zero this the moment it is
      // unchecked, and the number would stop answering its own question.
      const fixture = createCalendar();
      const harness = fixture.componentInstance as unknown as CalendarHarness;

      harness.toggleCategory({ groupId: 'status', categoryId: 'status:planned' });
      fixture.detectChanges();

      expect(counts(fixture)).toEqual(['1']);
    });

    it('renders no count for a category no event carries', () => {
      const fixture = createCalendar();
      fixture.componentRef.setInput('events', []);
      fixture.detectChanges();

      expect(counts(fixture)).toEqual([]);
    });
  });

  it('renders the month period and plots events', () => {
    const fixture = createCalendar();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('June 2026');
    expect(text).toContain('Quarterly audit');
  });

  it('switches view and emits the change', () => {
    const fixture = createCalendar();
    const harness = fixture.componentInstance as unknown as CalendarHarness;
    const views: CalendarView[] = [];
    fixture.componentInstance.viewChange.subscribe((v: CalendarView) => views.push(v));

    harness.setView('week');
    fixture.detectChanges();

    expect(views).toEqual(['week']);
    expect(fixture.nativeElement.textContent).toContain('all-day');
  });

  it('hides events of a switched-off category and announces the change', () => {
    const fixture = createCalendar();
    const harness = fixture.componentInstance as unknown as CalendarHarness;
    let emitted = 0;
    fixture.componentInstance.categoriesChange.subscribe(() => (emitted += 1));

    harness.toggleCategory({ groupId: 'status', categoryId: 'status:planned' });
    fixture.detectChanges();

    expect(emitted).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Quarterly audit');
  });

  it('emits the clicked event', () => {
    const fixture = createCalendar();
    const clicked: CalendarEvent[] = [];
    fixture.componentInstance.eventClick.subscribe((e: CalendarEvent) => clicked.push(e));

    const button: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[aria-label="Open Quarterly audit"]',
    );
    button?.click();

    expect(clicked.map((e) => e.id)).toEqual(['a']);
  });
});
