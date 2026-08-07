import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  InterventionReadinessItem,
  InterventionReadinessTarget,
} from '@features/organization/features/interventions/models';
import { InterventionGettingStarted } from '../intervention-getting-started.component';

const items: readonly InterventionReadinessItem[] = [
  { id: 'site', label: 'Choose a site', done: true, target: 'site' },
  { id: 'responsible', label: 'Assign a responsible agent', done: false, target: 'responsible' },
  { id: 'schedule', label: 'Set a due date', done: false, target: 'schedule' },
  { id: 'workItems', label: 'Prepare the field work', done: false, target: 'workItems' },
];

describe('InterventionGettingStarted', () => {
  let fixture: ComponentFixture<InterventionGettingStarted>;
  let activated: InterventionReadinessTarget[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLButtonElement[] =>
    Array.from(root().querySelectorAll('[data-testid="intervention-getting-started-item"]'));

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionGettingStarted);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();

    activated = [];
    fixture.componentInstance.itemActivated.subscribe((target) => activated.push(target));
  });

  it('should list every prerequisite at once, not fold to the next one alone', () => {
    expect(rows()).toHaveLength(4);
  });

  it('should mark a satisfied prerequisite as done and disable it', () => {
    expect(rows()[0]?.disabled).toBe(true);
    expect(rows()[0]?.textContent).toContain('Choose a site');
  });

  it('should mark exactly the first unmet item as the current step', () => {
    expect(rows()[1]?.getAttribute('aria-current')).toBe('step');
    expect(rows()[2]?.getAttribute('aria-current')).toBeNull();
    expect(rows()[3]?.getAttribute('aria-current')).toBeNull();
  });

  it('should ask the page to open the editor for an unmet item', () => {
    rows()[1]?.click();

    expect(activated).toEqual(['responsible']);
  });

  it('should not activate an already-satisfied item', () => {
    rows()[0]?.click();

    expect(activated).toEqual([]);
  });
});
