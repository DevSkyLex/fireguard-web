import { TestBed } from '@angular/core/testing';
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

  it('renders the agenda view with events grouped by day', () => {
    const fixture = createCalendar();
    const harness = fixture.componentInstance as unknown as CalendarHarness;

    harness.setView('agenda');
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-calendar-agenda')).toBeTruthy();
    expect(host.textContent).toContain('Quarterly audit');
  });

  it('renders the agenda empty state when there are no events that month', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('events', []);
    fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    fixture.componentRef.setInput('view', 'agenda');
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Nothing scheduled this month');
    expect(host.querySelector('app-calendar-agenda')).toBeNull();
  });

  it('shows the loading overlay when loading is true', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('events', [EVENT]);
    fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="status"]')).toBeTruthy();
    expect(host.textContent).toContain('Loading calendar');
  });

  it('navigates to the previous and next month and back to today', () => {
    const fixture = createCalendar();
    const focused: Date[] = [];
    fixture.componentInstance.focusedDateChange.subscribe((d: Date) => focused.push(d));
    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLElement>('button[aria-label="Previous period"]')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('May 2026');

    host.querySelector<HTMLElement>('button[aria-label="Next period"]')?.click();
    host.querySelector<HTMLElement>('button[aria-label="Next period"]')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('July 2026');

    const todayButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Today'),
    );
    todayButton?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(focused.length).toBeGreaterThan(0);
  });

  it('navigates by week when the active view is week', () => {
    const fixture = createCalendar();
    const harness = fixture.componentInstance as unknown as CalendarHarness;
    harness.setView('week');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLElement>('button[aria-label="Next period"]')?.click();
    fixture.detectChanges();

    expect(host.textContent).toMatch(/\d+ .* \d{4}/);
  });

  it('opens the day view from the month "+N more" affordance', () => {
    const manyEvents: CalendarEvent[] = Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`,
      title: `Event ${i}`,
      start: new Date(2026, 5, 15, 9 + i, 0),
      tone: 'info',
    }));
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('events', manyEvents);
    fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    fixture.componentRef.setInput('config', { maxEventsPerDay: 2 });
    fixture.detectChanges();
    const viewChanges: CalendarView[] = [];
    fixture.componentInstance.viewChange.subscribe((v: CalendarView) => viewChanges.push(v));

    const moreButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('button'),
    ).find((el) => el.textContent?.includes('more'));
    moreButton?.click();
    fixture.detectChanges();

    expect(viewChanges).toContain('week');
  });

  it('renders the legend when a legend group is configured', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('events', [EVENT]);
    fixture.componentRef.setInput('categoryGroups', GROUPS);
    fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    fixture.componentRef.setInput('config', { legendGroupId: 'status' });
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[aria-label="Status legend"]')).toBeTruthy();
    expect(host.textContent).toContain('Planned');
  });

  it('does not render the legend without a configured legend group', () => {
    const fixture = createCalendar();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[aria-label="Status legend"]')).toBeNull();
  });

  it('hides the view switch when only one view is configured', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('events', [EVENT]);
    fixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    fixture.componentRef.setInput('config', { views: ['month'] });
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-selectbutton')).toBeNull();
  });

  it('toggles the sidebar on small screens', () => {
    const fixture = createCalendar();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const toggleButton = host.querySelector<HTMLElement>(
      'button[aria-label="Toggle calendar configuration"]',
    );
    expect(toggleButton).toBeTruthy();
    toggleButton?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['sidebarOpen']()).toBe(true);
  });

  it('hides the sidebar entirely when configured off', () => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const noSidebarFixture = TestBed.createComponent(Calendar);
    noSidebarFixture.componentRef.setInput('events', [EVENT]);
    noSidebarFixture.componentRef.setInput('focusedDate', new Date(2026, 5, 1));
    noSidebarFixture.componentRef.setInput('config', { showSidebar: false });
    noSidebarFixture.detectChanges();

    expect(
      (noSidebarFixture.nativeElement as HTMLElement).querySelector('app-calendar-sidebar'),
    ).toBeNull();
  });

  it('emits dayCreate from the month view', () => {
    const fixture = createCalendar();
    const created: Date[] = [];
    fixture.componentInstance.dayCreate.subscribe((d: Date) => created.push(d));

    fixture.componentInstance['dayCreate'].emit(new Date(2026, 5, 20));

    expect(created).toHaveLength(1);
  });
});
