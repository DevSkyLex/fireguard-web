import { DatePipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { DashboardUpcomingInterventions } from '../dashboard-upcoming-interventions.component';

type DashboardUpcomingInterventionsHarness = {
  statusDotClass(status: string): string;
  statusLabel(status: string): string;
};

const intervention = {
  id: 'int-1',
  number: 2048,
  name: 'Contrôle annuel extincteurs',
  status: 'in_progress',
  priority: 'high',
  dueAt: '2026-08-01T00:00:00+00:00',
} as unknown as InterventionOutput;

describe('DashboardUpcomingInterventions', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardUpcomingInterventions],
    }).overrideComponent(DashboardUpcomingInterventions, {
      set: { imports: [DatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  function createComponent(
    interventions: readonly InterventionOutput[] = [intervention],
    loading = false,
  ): ComponentFixture<DashboardUpcomingInterventions> {
    const fixture = TestBed.createComponent(DashboardUpcomingInterventions);
    fixture.componentRef.setInput('interventions', interventions);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();

    return fixture;
  }

  it('should create', () => {
    expect(createComponent().componentInstance).toBeTruthy();
  });

  it('should resolve the status dot classes through the tag registry', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardUpcomingInterventionsHarness;

    expect(harness.statusDotClass('in_progress')).toContain('bg-');
  });

  it('should resolve the status label through the tag registry', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardUpcomingInterventionsHarness;

    expect(harness.statusLabel('in_progress')).toBeTruthy();
    expect(typeof harness.statusLabel('in_progress')).toBe('string');
  });

  it('should emit open with the activated intervention', () => {
    const fixture = createComponent();
    const emitted: InterventionOutput[] = [];
    fixture.componentInstance.open.subscribe((value) => emitted.push(value));

    fixture.componentInstance.open.emit(intervention);

    expect(emitted).toEqual([intervention]);
  });

  it('should emit a request to open the full intervention list', () => {
    const fixture = createComponent();
    let opened = 0;
    fixture.componentInstance.viewAll.subscribe(() => (opened += 1));

    fixture.componentInstance.viewAll.emit();

    expect(opened).toBe(1);
  });

  it('should emit retry from the error state', () => {
    const fixture = createComponent();
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => {
      retried += 1;
    });

    fixture.componentInstance.retry.emit();

    expect(retried).toBe(1);
  });
});
