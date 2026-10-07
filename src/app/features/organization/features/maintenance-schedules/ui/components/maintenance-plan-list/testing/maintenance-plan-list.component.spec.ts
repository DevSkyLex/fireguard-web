import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MaintenancePlanOutput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenancePlanList } from '../maintenance-plan-list.component';

describe('MaintenancePlanList', () => {
  const plan: MaintenancePlanOutput = {
    '@id': '/api/plans/plan-1',
    '@type': 'MaintenancePlan',
    id: 'plan-1',
    organizationId: 'org-1',
    equipmentId: 'equipment-1',
    equipmentType: 'fire_extinguisher',
    name: 'Annual control',
    operationKind: 'control',
    interval: 'P1Y',
    cadenceMode: 'legacy',
    anchorAt: null,
    nextDueAt: null,
    active: true,
    openOccurrence: {
      id: 'occurrence-1',
      dueAt: '2026-01-01T00:00:00Z',
      attempt: 2,
      interventionId: 'work-1',
      status: 'open',
      retryAllowed: false,
    },
  };
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [MaintenancePlanList],
      providers: [provideRouter([])],
    }),
  );

  it('retains original deadlines, attempts and historical cadence without claiming completion', () => {
    const fixture = TestBed.createComponent(MaintenancePlanList);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('regionalFormatting', {
      dateFormat: 'yyyy-MM-dd',
      timezone: 'UTC',
    });
    fixture.componentRef.setInput('plans', [plan]);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Historical cadence retained');
    expect(root.textContent).toContain('Original deadline: 2026-01-01');
    expect(root.textContent).toContain('attempt 2');
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/organizations/org-1/equipments/equipment-1',
    );
    expect(
      root.querySelector('a[href="/organizations/org-1/interventions/work-1"]'),
    ).not.toBeNull();
    expect(root.textContent).not.toContain('Completed');
  });

  it('offers a new attempt only when the server allows it and both actions are authorized', () => {
    const fixture = TestBed.createComponent(MaintenancePlanList);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('regionalFormatting', {
      dateFormat: 'yyyy-MM-dd',
      timezone: 'UTC',
    });
    fixture.componentRef.setInput('plans', [plan]);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('canGenerate', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Start a new attempt');
    fixture.componentRef.setInput('plans', [
      { ...plan, openOccurrence: { ...plan.openOccurrence, retryAllowed: true } },
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Start a new attempt');
    fixture.componentRef.setInput('canGenerate', false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Prepare intervention',
    );
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Start a new attempt');
  });
  it.each(['2026-03-31T00:00:00Z', '2026-03-31T00:00:00+02:00', '2026-03-31T00:00:00-07:00'])(
    'keeps fixed calendar deadline %s on its server date in a negative viewer timezone',
    (date) => {
      const fixture = TestBed.createComponent(MaintenancePlanList);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.componentRef.setInput('regionalFormatting', {
        dateFormat: 'yyyy-MM-dd',
        timezone: 'America/Los_Angeles',
      });
      fixture.componentRef.setInput('plans', [
        {
          ...plan,
          cadenceMode: 'fixed',
          nextDueAt: date,
          openOccurrence: { ...plan.openOccurrence, dueAt: date },
        },
      ]);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Next due: 2026-03-31');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'Original deadline: 2026-03-31',
      );
      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('2026-03-30');
    },
  );

  it('continues to render historical deadlines as instants in the viewer organization timezone', () => {
    const fixture = TestBed.createComponent(MaintenancePlanList);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('regionalFormatting', {
      dateFormat: 'yyyy-MM-dd',
      timezone: 'America/Los_Angeles',
    });
    fixture.componentRef.setInput('plans', [
      { ...plan, nextDueAt: '2026-03-31T00:00:00+02:00', openOccurrence: null },
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Next due: 2026-03-30');
  });
});
