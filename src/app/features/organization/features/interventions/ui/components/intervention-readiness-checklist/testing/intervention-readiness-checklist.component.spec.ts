import { TestBed } from '@angular/core/testing';
import { InterventionReadinessChecklist } from '../intervention-readiness-checklist.component';
import type { InterventionReadinessCheck } from '../models';

describe('InterventionReadinessChecklist', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionReadinessChecklist],
    });
  });

  function createComponent(
    checks: readonly InterventionReadinessCheck[],
  ): ReturnType<typeof TestBed.createComponent<InterventionReadinessChecklist>> {
    const fixture = TestBed.createComponent(InterventionReadinessChecklist);
    fixture.componentRef.setInput('checks', checks);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = createComponent([{ label: 'Site assigned', done: true }]);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one list item per check, in order', () => {
    const checks: readonly InterventionReadinessCheck[] = [
      { label: 'Site assigned', done: true },
      { label: 'Responsible assigned', done: false },
      { label: 'Schedule set', done: false },
    ];
    const fixture = createComponent(checks);

    const items = fixture.nativeElement.querySelectorAll('li');

    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('Site assigned');
    expect(items[1].textContent).toContain('Responsible assigned');
    expect(items[2].textContent).toContain('Schedule set');
  });

  it('should render a filled check icon for a done condition', () => {
    const fixture = createComponent([{ label: 'Site assigned', done: true }]);

    const icon = fixture.nativeElement.querySelector('li i');

    expect(icon.classList.contains('pi-check-circle')).toBe(true);
    expect(icon.classList.contains('pi-exclamation-circle')).toBe(false);
  });

  it('should render a hollow exclamation icon for a pending condition', () => {
    const fixture = createComponent([{ label: 'Responsible assigned', done: false }]);

    const icon = fixture.nativeElement.querySelector('li i');

    expect(icon.classList.contains('pi-exclamation-circle')).toBe(true);
    expect(icon.classList.contains('pi-check-circle')).toBe(false);
  });

  it('should render an empty list when no checks are provided', () => {
    const fixture = createComponent([]);

    const items = fixture.nativeElement.querySelectorAll('li');

    expect(items.length).toBe(0);
  });
});
