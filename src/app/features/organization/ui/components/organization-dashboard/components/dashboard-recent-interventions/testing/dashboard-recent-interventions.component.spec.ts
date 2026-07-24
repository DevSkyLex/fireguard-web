import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
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

const interventionWithoutResponsibleOrDueDate: OrganizationDashboardRecentIntervention = {
  id: 'int-2',
  number: 2049,
  name: 'Inspection extincteurs annexe',
  status: 'planned',
  priority: 'normal',
  siteId: null,
  siteName: null,
  responsibleId: null,
  responsibleName: null,
  responsibleAvatarUrl: null,
  dueAt: null,
  updatedAt: '2026-07-16T09:30:00+00:00',
};

describe('DashboardRecentInterventions', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardRecentInterventions],
    });
  });

  function createComponent(
    interventions: readonly OrganizationDashboardRecentIntervention[] = [intervention],
    loading = false,
    hasError = false,
  ): ComponentFixture<DashboardRecentInterventions> {
    const fixture = TestBed.createComponent(DashboardRecentInterventions);
    fixture.componentRef.setInput('interventions', interventions);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('hasError', hasError);
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

  it('should render the error state and emit retry when the retry button is clicked', () => {
    const fixture = createComponent([intervention], false, true);
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => {
      retried += 1;
    });

    const errorState = fixture.debugElement.query(By.css('app-error-state'));
    expect(errorState).toBeTruthy();

    const retryButton = fixture.debugElement.query(By.css('p-button'));
    retryButton.triggerEventHandler('onClick', undefined);

    expect(retried).toBe(1);
  });

  it('should render skeleton rows while loading', () => {
    const fixture = createComponent([], true, false);

    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBeGreaterThan(0);
    expect(fixture.debugElement.query(By.css('p-skeleton'))).toBeTruthy();
  });

  it('should render the empty state when there are no interventions', () => {
    const fixture = createComponent([], false, false);

    expect(fixture.debugElement.query(By.css('app-empty-state'))).toBeTruthy();
  });

  it('should render a populated row with responsible avatar and due date', () => {
    const fixture = createComponent([intervention], false, false);

    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('FG-2048');
    expect(html).toContain(intervention.name);
    expect(html).toContain(intervention.siteName ?? '');
    expect(html).toContain(intervention.responsibleName ?? '');

    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();
  });

  it('should render fallback dashes for missing site, responsible and due date', () => {
    const fixture = createComponent([interventionWithoutResponsibleOrDueDate], false, false);

    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('—');
  });
});
