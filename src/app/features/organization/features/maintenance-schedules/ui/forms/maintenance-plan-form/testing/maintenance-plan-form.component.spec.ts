import { TestBed } from '@angular/core/testing';
import type { MaintenancePlanOutput } from '@features/organization/features/maintenance-schedules/models';
import { MaintenancePlanForm } from '../maintenance-plan-form.component';

describe('MaintenancePlanForm', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MaintenancePlanForm] }));

  it('requires an explicit calendar unit and equipment before preparation', () => {
    const fixture = TestBed.createComponent(MaintenancePlanForm);
    fixture.detectChanges();
    const emitted = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
    expect(fixture.componentInstance['planForm'].unit().invalid()).toBe(true);
    expect(fixture.componentInstance['planForm'].equipmentId().invalid()).toBe(true);
  });

  it.each(['D', 'W', 'M', 'Y'])('emits calendar unit %s without computing future dates', (unit) => {
    const fixture = TestBed.createComponent(MaintenancePlanForm);
    fixture.detectChanges();
    fixture.componentInstance['model'].set({
      equipmentId: 'equipment-1',
      name: 'Service',
      operationKind: 'maintenance',
      every: 2,
      unit,
      anchorDate: '2026-01-31',
      firstDueDate: '',
    });
    const emitted = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).toHaveBeenCalledWith({
      equipmentId: 'equipment-1',
      name: 'Service',
      operationKind: 'maintenance',
      interval: `P2${unit}`,
      anchorOn: '2026-01-31',
    });
  });

  it('keeps the entered draft after server rejection and blocks pending resubmission', () => {
    const fixture = TestBed.createComponent(MaintenancePlanForm);
    fixture.detectChanges();
    fixture.componentInstance['model'].set({
      equipmentId: 'equipment-1',
      name: 'Annual check',
      operationKind: 'control',
      every: 1,
      unit: 'Y',
      anchorDate: '2026-01-01',
      firstDueDate: '2026-04-01',
    });
    fixture.componentRef.setInput('serverError', { message: 'Rejected', code: 422 });
    fixture.detectChanges();
    expect(fixture.componentInstance['model']().firstDueDate).toBe('2026-04-01');
    expect(fixture.nativeElement.textContent).toContain('Rejected');
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();
    const emitted = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
  });

  it('rejects fractional cadence without silently rounding it', () => {
    const fixture = TestBed.createComponent(MaintenancePlanForm);
    fixture.detectChanges();
    fixture.componentInstance['model'].set({
      equipmentId: 'equipment-1',
      name: 'Service',
      operationKind: 'maintenance',
      every: 1.5,
      unit: 'M',
      anchorDate: '2026-01-31',
      firstDueDate: '',
    });
    const emitted = vi.spyOn(fixture.componentInstance.submitted, 'emit');
    fixture.componentInstance['submit'](new Event('submit'));
    expect(emitted).not.toHaveBeenCalled();
  });

  it.each(['2027-01-31T00:00:00+01:00', null])(
    'locks an open calendar and allows renaming with historical anchor %s',
    (anchorAt) => {
      const plan: MaintenancePlanOutput = {
        '@id': '/api/plans/monthly-1',
        '@type': 'MaintenancePlan',
        id: 'monthly-1',
        organizationId: 'org-1',
        equipmentId: 'equipment-1',
        equipmentType: 'fire_extinguisher',
        name: 'Monthly maintenance',
        operationKind: 'maintenance',
        interval: 'P1M',
        cadenceMode: anchorAt ? 'fixed' : 'legacy',
        calendarTimezone: 'Europe/Paris',
        anchorAt,
        nextDueAt: '2027-02-28T00:00:00+01:00',
        active: true,
        openOccurrence: {
          id: 'occurrence-1',
          dueAt: '2027-02-28T00:00:00+01:00',
          attempt: 1,
          status: 'open',
        },
      };
      const fixture = TestBed.createComponent(MaintenancePlanForm);
      fixture.componentRef.setInput('initialPlan', plan);
      fixture.detectChanges();
      const form = fixture.componentInstance['planForm'];
      expect(form.every().disabled()).toBe(true);
      expect(form.unit().disabled()).toBe(true);
      expect(form.anchorDate().disabled()).toBe(true);
      expect(form.firstDueDate().disabled()).toBe(true);
      expect(form.name().disabled()).toBe(false);
      const host: HTMLElement = fixture.nativeElement as HTMLElement;
      expect(host.querySelector<HTMLInputElement>('#maintenance-plan-anchor')?.disabled).toBe(true);
      expect(
        host.querySelector('[data-testid="maintenance-plan-calendar-locked"]')?.textContent,
      ).toContain('You can still change the operation name.');
      fixture.componentInstance['model'].update((draft) => ({
        ...draft,
        name: 'Renamed maintenance',
      }));
      const emitted = vi.spyOn(fixture.componentInstance.submitted, 'emit');
      fixture.componentInstance['submit'](new Event('submit'));
      expect(emitted).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Renamed maintenance' }),
      );
    },
  );
});
