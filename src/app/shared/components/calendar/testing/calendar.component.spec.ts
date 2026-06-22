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
});
