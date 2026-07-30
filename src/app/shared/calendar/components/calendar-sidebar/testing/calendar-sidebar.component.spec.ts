import { TestBed } from '@angular/core/testing';
import type { CalendarCategoryGroup, CalendarCategoryToggle } from '../../../models';
import { CalendarSidebar } from '../calendar-sidebar.component';

const GROUPS: CalendarCategoryGroup[] = [
  {
    id: 'status',
    label: 'Status',
    categories: [
      { id: 'status:planned', label: 'Planned', tone: 'info', active: true },
      { id: 'status:done', label: 'Done', tone: 'success', active: false },
    ],
  },
];

const FOCUSED_DATE: Date = new Date(2026, 5, 15);

function createFixture(categoryGroups: readonly CalendarCategoryGroup[] = []) {
  const fixture = TestBed.createComponent(CalendarSidebar);
  fixture.componentRef.setInput('focusedDate', FOCUSED_DATE);
  fixture.componentRef.setInput('today', FOCUSED_DATE);
  fixture.componentRef.setInput('categoryGroups', categoryGroups);
  fixture.detectChanges();
  return fixture;
}

describe('CalendarSidebar', () => {
  it('renders the category groups with their toggle state', () => {
    const fixture = createFixture(GROUPS);

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Status');
    expect(element.textContent).toContain('Planned');
    expect(element.textContent).toContain('Done');

    const checkboxes: NodeListOf<Element> = element.querySelectorAll('[role="checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].getAttribute('aria-checked')).toBe('true');
    expect(checkboxes[1].getAttribute('aria-checked')).toBe('false');
  });

  it('does not render a category section when no groups are configured', () => {
    const fixture = createFixture([]);

    expect(fixture.nativeElement.querySelector('[role="checkbox"]')).toBeFalsy();
  });

  it('emits a CalendarCategoryToggle when a category switch is clicked', () => {
    const fixture = createFixture(GROUPS);
    const toggles: CalendarCategoryToggle[] = [];
    fixture.componentInstance.categoryToggle.subscribe((toggle: CalendarCategoryToggle) =>
      toggles.push(toggle),
    );

    fixture.nativeElement
      .querySelectorAll('[role="checkbox"]')[1]
      .dispatchEvent(new Event('click'));

    expect(toggles).toEqual([{ groupId: 'status', categoryId: 'status:done' }]);
  });

  it('emits focusedDateChange when navigating to the previous month', () => {
    const fixture = createFixture();
    const focused: Date[] = [];
    fixture.componentInstance.focusedDateChange.subscribe((date: Date) => focused.push(date));

    fixture.nativeElement.querySelector('button[aria-label="Previous month"]')?.click();

    expect(focused).toHaveLength(1);
    expect(focused[0].getMonth()).toBe(4);
  });

  it('emits focusedDateChange when navigating to the next month', () => {
    const fixture = createFixture();
    const focused: Date[] = [];
    fixture.componentInstance.focusedDateChange.subscribe((date: Date) => focused.push(date));

    fixture.nativeElement.querySelector('button[aria-label="Next month"]')?.click();

    expect(focused).toHaveLength(1);
    expect(focused[0].getMonth()).toBe(6);
  });

  it('emits focusedDateChange when a mini-calendar day is clicked', () => {
    const fixture = createFixture();
    const focused: Date[] = [];
    fixture.componentInstance.focusedDateChange.subscribe((date: Date) => focused.push(date));

    const dayButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll(
      'button[aria-label]:not([aria-label="Previous month"]):not([aria-label="Next month"])',
    );
    dayButtons[0].click();

    expect(focused).toHaveLength(1);
  });
});
