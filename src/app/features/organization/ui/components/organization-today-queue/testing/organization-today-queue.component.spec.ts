import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { OrganizationTodayQueue } from '../organization-today-queue.component';

/**
 * Builds the minimum of an intervention this presentational component reads.
 */
function intervention(id: string, number: number, name: string): InterventionOutput {
  return { id, number, name } as InterventionOutput;
}

describe('OrganizationTodayQueue', () => {
  let fixture: ComponentFixture<OrganizationTodayQueue>;

  /**
   * The rendered rows.
   */
  function rows(): NodeListOf<HTMLButtonElement> {
    return fixture.nativeElement.querySelectorAll('li button');
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationTodayQueue);
    fixture.componentRef.setInput('label', 'Overdue');
    fixture.componentRef.setInput('total', 0);
    fixture.componentRef.setInput('interventions', []);
    await fixture.whenStable();
  });

  it('should render nothing when the queue is empty and settled', () => {
    // Four empty boxes stacked down the page say less than their absence; the
    // page's own all-clear state covers "nothing anywhere".
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('should render placeholders while the queue is resolving', async () => {
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('section')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should show the organization-wide total, not the row count', async () => {
    fixture.componentRef.setInput('total', 42);
    fixture.componentRef.setInput('interventions', [intervention('i-1', 101, 'Check the riser')]);
    await fixture.whenStable();

    expect(rows().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('42');
  });

  it('should render each intervention with its number and name', async () => {
    fixture.componentRef.setInput('total', 2);
    fixture.componentRef.setInput('interventions', [
      intervention('i-1', 101, 'Check the riser'),
      intervention('i-2', 102, 'Replace the extinguisher'),
    ]);
    await fixture.whenStable();

    expect(rows().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('FG-101');
    expect(fixture.nativeElement.textContent).toContain('Replace the extinguisher');
  });

  it('should render the note the page localized for a row', async () => {
    fixture.componentRef.setInput('total', 1);
    fixture.componentRef.setInput('interventions', [intervention('i-1', 101, 'Check the riser')]);
    fixture.componentRef.setInput('notes', { 'i-1': '3 days late' });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('3 days late');
  });

  it('should emit the intervention the operator picked', async () => {
    const picked = intervention('i-1', 101, 'Check the riser');
    const opened = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);
    fixture.componentRef.setInput('total', 1);
    fixture.componentRef.setInput('interventions', [picked]);
    await fixture.whenStable();

    rows()[0].click();
    await fixture.whenStable();

    expect(opened).toHaveBeenCalledWith(picked);
  });

  it('should omit the see-all control when the page offers no label', async () => {
    fixture.componentRef.setInput('total', 1);
    fixture.componentRef.setInput('interventions', [intervention('i-1', 101, 'Check the riser')]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('section > div button')).toBeNull();
  });

  it('should emit when the see-all control is used', async () => {
    const actioned = vi.fn();
    fixture.componentInstance.actioned.subscribe(actioned);
    fixture.componentRef.setInput('total', 1);
    fixture.componentRef.setInput('interventions', [intervention('i-1', 101, 'Check the riser')]);
    fixture.componentRef.setInput('actionLabel', 'See all');
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('section > div button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(actioned).toHaveBeenCalledTimes(1);
  });
});
