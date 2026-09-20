import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { WorkloadDayOutput } from '@features/organization/features/workload/models';
import { WorkloadDayCell } from '../workload-day-cell.component';

describe('WorkloadDayCell', () => {
  let fixture: ComponentFixture<WorkloadDayCell>;
  const day: WorkloadDayOutput = {
    date: '2026-09-16',
    capacityMinutes: 420,
    actualMinutes: 120,
    remainingMinutes: 90,
    draftMinutes: 0,
    overloadMinutes: 0,
    utilizationPercent: 50,
    completeness: 'complete',
    availability: 'available',
    contributions: [],
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkloadDayCell);
    fixture.componentRef.setInput('day', day);
    fixture.componentRef.setInput('label', 'Available');
    fixture.componentRef.setInput('meter', 50);
  });

  it('renders a determinate Spartan ring with exact totals and a textual status', async () => {
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const progress = root.querySelector('brn-progress');
    expect(progress?.getAttribute('role')).toBe('progressbar');
    expect(progress?.getAttribute('aria-label')).toBe('Available');
    expect(progress?.getAttribute('aria-valuenow')).toBe('50');
    expect(progress?.getAttribute('aria-valuemax')).toBe('100');
    expect(progress?.getAttribute('aria-valuetext')).toBe('50%');
    expect(progress?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(
      root
        .querySelector('[data-testid="workload-day-ring-value"]')
        ?.getAttribute('stroke-dashoffset'),
    ).toBe('50');
    expect(root.textContent).toContain('3 h 30 min / 7 h');
    expect(root.textContent).toContain('Available');
  });

  it('leaves the ring empty at zero without displaying a misleading progress dot', async () => {
    fixture.componentRef.setInput('day', {
      ...day,
      actualMinutes: 0,
      remainingMinutes: 0,
      utilizationPercent: 0,
    });
    fixture.componentRef.setInput('meter', 0);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');
    expect(root.querySelector('[data-testid="workload-day-ring-track"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="workload-day-ring-value"]')).toBeNull();
    expect(root.textContent).toContain('0 min / 7 h');
  });

  it.each([0, null, undefined])(
    'omits the ring when capacity is %s without inventing availability',
    async (capacityMinutes) => {
      fixture.componentRef.setInput('day', { ...day, capacityMinutes });
      fixture.componentRef.setInput(
        'label',
        capacityMinutes === 0 ? 'Unavailable' : 'Capacity not configured',
      );
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[role="progressbar"]')).toBeNull();
      expect(root.textContent).toContain(
        capacityMinutes === 0 ? 'Unavailable' : 'Capacity not configured',
      );
      expect(root.textContent).toContain(
        capacityMinutes === 0 ? '3 h 30 min / 0 min' : '3 h 30 min / —',
      );
    },
  );

  it('caps only the ring while keeping overload totals and severity visible', async () => {
    fixture.componentRef.setInput('day', {
      ...day,
      remainingMinutes: 360,
      overloadMinutes: 60,
      utilizationPercent: 114,
    });
    fixture.componentRef.setInput('meter', 100);
    fixture.componentRef.setInput('label', 'Overload: 1 h');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const indicator = root.querySelector('[data-testid="workload-day-ring-value"]');
    expect(root.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('100');
    expect(indicator?.getAttribute('stroke-dashoffset')).toBe('0');
    expect(indicator?.classList.contains('stroke-destructive')).toBe(true);
    expect(root.textContent).toContain('8 h / 7 h');
    expect(root.textContent).toContain('Overload: 1 h');
  });

  it('keeps incomplete workload and drafts separate from the daily meter', async () => {
    fixture.componentRef.setInput('day', { ...day, completeness: 'partial', draftMinutes: 60 });
    fixture.componentRef.setInput('label', 'Incomplete workload');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'Incomplete workload',
    );
    expect(root.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50');
    expect(root.textContent).toContain('3 h 30 min / 7 h');
    expect(root.textContent).toContain('Draft: 1 h');
  });
});
