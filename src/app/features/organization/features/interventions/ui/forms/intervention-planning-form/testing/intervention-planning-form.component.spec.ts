import { TestBed } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionPlanningForm } from '../intervention-planning-form.component';

describe('InterventionPlanningForm', () => {
  it('should initialize from the intervention input', () => {
    const fixture = TestBed.createComponent(InterventionPlanningForm);
    fixture.componentRef.setInput('intervention', {
      site: '/api/facilities/site-1',
      responsible: '/api/organizations/org-1/members/member-1',
      participants: ['/api/organizations/org-1/members/member-2'],
      priority: 'high',
      plannedStartAt: '2026-06-15T08:00:00.000Z',
      dueAt: '2026-06-15T10:00:00.000Z',
    } as unknown as InterventionOutput);
    fixture.detectChanges();

    const component = fixture.componentInstance as InterventionPlanningForm & {
      form: { getRawValue(): { site: string; responsible: string; priority: string } };
    };

    expect(component.form.getRawValue()).toEqual(
      expect.objectContaining({
        site: '/api/facilities/site-1',
        responsible: '/api/organizations/org-1/members/member-1',
        priority: 'high',
      }),
    );
  });
});
