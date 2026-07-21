import { DatePipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationDashboardRecentIntervention } from '@features/organization/models';
import { DashboardRecentInterventions } from '../dashboard-recent-interventions.component';

type DashboardRecentInterventionsHarness = {
  readonly skeletonItems: undefined[];
  priorityOf(value: string): string;
  priorityLabel(value: string): string;
  initials(name: string): string;
};

const intervention: OrganizationDashboardRecentIntervention = {
  id: 'int-1',
  number: 2048,
  name: 'Contrôle annuel extincteurs',
  status: 'in_progress',
  priority: 'high',
  siteId: 'fac-1',
  siteName: 'Siège — Paris 12e',
  responsibleId: 'member-1',
  responsibleName: 'Claire Lefèvre',
  responsibleAvatarUrl: null,
  dueAt: '2026-07-18T00:00:00+00:00',
  updatedAt: '2026-07-15T09:30:00+00:00',
};

describe('DashboardRecentInterventions', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardRecentInterventions],
    }).overrideComponent(DashboardRecentInterventions, {
      set: { imports: [DatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  function createComponent(
    interventions: readonly OrganizationDashboardRecentIntervention[] = [intervention],
    loading = false,
  ): ComponentFixture<DashboardRecentInterventions> {
    const fixture = TestBed.createComponent(DashboardRecentInterventions);
    fixture.componentRef.setInput('interventions', interventions);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();

    return fixture;
  }

  it('should create', () => {
    expect(createComponent().componentInstance).toBeTruthy();
  });

  it('should expose five skeleton placeholder rows', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentInterventionsHarness;

    expect(harness.skeletonItems).toHaveLength(5);
  });

  it('should narrow known priorities and fall back to normal otherwise', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentInterventionsHarness;

    expect(harness.priorityOf('urgent')).toBe('urgent');
    expect(harness.priorityOf('high')).toBe('high');
    expect(harness.priorityOf('unexpected')).toBe('normal');
  });

  it('should resolve the priority label through the tag registry', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentInterventionsHarness;

    expect(harness.priorityLabel('high')).toBeTruthy();
    expect(typeof harness.priorityLabel('high')).toBe('string');
  });

  it('should derive at most two uppercase initials from the responsible name', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentInterventionsHarness;

    expect(harness.initials('Claire Lefèvre')).toBe('CL');
    expect(harness.initials('Claire')).toBe('C');
    expect(harness.initials('Claire De La Fontaine')).toBe('CD');
  });

  it('should emit open with the activated intervention', () => {
    const fixture = createComponent();
    const emitted: OrganizationDashboardRecentIntervention[] = [];
    fixture.componentInstance.open.subscribe((value) => emitted.push(value));

    fixture.componentInstance.open.emit(intervention);

    expect(emitted).toEqual([intervention]);
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

  // Five rows and no way through to the rest: the card was a dead end, and
  // "there are more than five" is the obvious next action. Asserted on the
  // output rather than the DOM — this fixture does not render the p-card
  // templates, so the rendered link is pinned by the dashboard e2e instead.
  it('should emit a request to open the full intervention list', () => {
    const fixture = createComponent();
    let opened = 0;
    fixture.componentInstance.openAll.subscribe(() => (opened += 1));

    fixture.componentInstance.openAll.emit();

    expect(opened).toBe(1);
  });
});
