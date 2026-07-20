import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InterventionReadinessChecklist } from '../intervention-readiness-checklist.component';
import type { InterventionReadinessCheck } from '../models';

/**
 * The verdict is the point: this list is read in the moment before publishing,
 * and deriving "ready" by scanning every row is work the reader should not do.
 */
describe('InterventionReadinessChecklist', () => {
  let fixture: ComponentFixture<InterventionReadinessChecklist>;

  const render = (checks: readonly InterventionReadinessCheck[]): void => {
    fixture = TestBed.createComponent(InterventionReadinessChecklist);
    fixture.componentRef.setInput('checks', checks);
    fixture.detectChanges();
  };

  const at = (testId: string): HTMLElement | null =>
    (fixture.debugElement.query(By.css(`[data-testid="${testId}"]`))?.nativeElement as
      | HTMLElement
      | undefined) ?? null;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InterventionReadinessChecklist] });
  });

  it('states the verdict once every check is done', () => {
    render([
      { label: 'Site assigned', done: true },
      { label: 'Equipment listed', done: true },
    ]);

    expect(at('readiness-all-passed')).not.toBeNull();
    expect(at('readiness-remaining')).toBeNull();
  });

  it('counts what is left rather than only marking rows', () => {
    render([
      { label: 'Site assigned', done: true },
      { label: 'Equipment listed', done: false },
      { label: 'Agent assigned', done: false },
    ]);

    expect(at('readiness-all-passed')).toBeNull();
    expect(at('readiness-remaining')?.textContent).toContain('2 checks still to pass');
  });

  it('pluralises a single remaining check', () => {
    render([
      { label: 'Site assigned', done: true },
      { label: 'Agent assigned', done: false },
    ]);

    expect(at('readiness-remaining')?.textContent).toContain('1 check still to pass');
  });

  it('says nothing at all when there is nothing to check', () => {
    // An empty list is not "passed" — nothing was verified.
    render([]);

    expect(at('readiness-all-passed')).toBeNull();
    expect(at('readiness-remaining')).toBeNull();
  });
});
