import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { FormControl } from '@angular/forms';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionPlanningGuide } from '../intervention-planning-guide.component';
import type { InterventionPlanningGuideStep, InterventionPlanningGuideValues } from '../models';

type InterventionPlanningGuideHarness = {
  readonly activeStep: {
    (): InterventionPlanningGuideStep;
    set(value: InterventionPlanningGuideStep): void;
  };
  readonly completion: () => Readonly<Record<InterventionPlanningGuideStep, boolean>>;
  readonly allComplete: () => boolean;
  readonly siteControl: FormControl<string | null>;
  readonly descriptionControl: FormControl<string>;
  readonly responsibleControl: FormControl<string | null>;
  readonly plannedStartAtControl: FormControl<Date | null>;
  readonly dueAtControl: FormControl<Date | null>;
  continueStep(): void;
  requestPlan(): void;
};

function makeIntervention(overrides: Partial<InterventionOutput> = {}): InterventionOutput {
  return {
    id: 'i-1',
    name: 'Quarterly check',
    description: null,
    site: null,
    responsible: null,
    participants: [],
    priority: 'normal',
    plannedStartAt: null,
    dueAt: null,
    status: 'draft',
    ...overrides,
  } as InterventionOutput;
}

describe('InterventionPlanningGuide', () => {
  let fixture: ComponentFixture<InterventionPlanningGuide>;

  function build(intervention: InterventionOutput): InterventionPlanningGuideHarness {
    fixture = TestBed.createComponent(InterventionPlanningGuide);
    fixture.componentRef.setInput('intervention', intervention);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as InterventionPlanningGuideHarness;
  }

  it('should derive step completion from the persisted intervention', () => {
    const harness = build(
      makeIntervention({ site: '/api/facilities/f-1', responsible: '/api/members/m-1' }),
    );

    expect(harness.completion()).toEqual({
      context: true,
      scope: true,
      team: true,
      schedule: false,
    });
    expect(harness.allComplete()).toBe(false);
  });

  it('should open on the first incomplete step', () => {
    expect(build(makeIntervention()).activeStep()).toBe('scope');
    expect(build(makeIntervention({ site: '/api/facilities/f-1' })).activeStep()).toBe('team');
    expect(
      build(
        makeIntervention({
          site: '/api/facilities/f-1',
          responsible: '/api/members/m-1',
        }),
      ).activeStep(),
    ).toBe('schedule');
  });

  it('should emit only the dirty fields of a step and advance on continue', () => {
    const harness = build(makeIntervention({ name: 'Quarterly check' }));
    const emitted: InterventionPlanningGuideValues[] = [];
    fixture.componentInstance.stepSaved.subscribe((values) => emitted.push(values));

    harness.activeStep.set('scope');
    harness.siteControl.setValue('/api/facilities/f-1');
    harness.siteControl.markAsDirty();
    harness.continueStep();

    expect(emitted).toEqual([{ site: '/api/facilities/f-1' }]);
    expect(harness.activeStep()).toBe('team');
  });

  it('should block continue on an invalid required field without emitting', () => {
    const harness = build(makeIntervention());
    const emitted: InterventionPlanningGuideValues[] = [];
    fixture.componentInstance.stepSaved.subscribe((values) => emitted.push(values));

    harness.activeStep.set('team');
    harness.responsibleControl.setValue(null);
    harness.continueStep();

    expect(emitted).toEqual([]);
    expect(harness.activeStep()).toBe('team');
    expect(harness.responsibleControl.touched).toBe(true);
  });

  it('should preserve dirty edits when the same intervention refreshes', () => {
    const harness = build(makeIntervention());
    harness.descriptionControl.setValue('Notes typed while a save is in flight');
    harness.descriptionControl.markAsDirty();

    fixture.componentRef.setInput(
      'intervention',
      makeIntervention({ site: '/api/facilities/f-1' }),
    );
    fixture.detectChanges();

    expect(harness.descriptionControl.value).toBe('Notes typed while a save is in flight');
    expect(harness.siteControl.value).toBe('/api/facilities/f-1');
  });

  it('should reseed every control when a different intervention loads', () => {
    const harness = build(makeIntervention());
    harness.descriptionControl.setValue('Stale draft');
    harness.descriptionControl.markAsDirty();

    fixture.componentRef.setInput(
      'intervention',
      makeIntervention({ id: 'i-2', description: 'Persisted description' }),
    );
    fixture.detectChanges();

    expect(harness.descriptionControl.value).toBe('Persisted description');
  });

  it('should reject a due date earlier than the planned start', () => {
    const harness = build(
      makeIntervention({ site: '/api/facilities/f-1', responsible: '/api/members/m-1' }),
    );
    let planRequests = 0;
    fixture.componentInstance.planRequested.subscribe(() => planRequests++);

    harness.activeStep.set('schedule');
    harness.dueAtControl.setValue(new Date('2026-07-14T08:00:00Z'));
    harness.dueAtControl.markAsDirty();
    harness.plannedStartAtControl.setValue(new Date('2026-07-15T08:00:00Z'));
    harness.plannedStartAtControl.markAsDirty();
    harness.requestPlan();

    expect(harness.dueAtControl.hasError('dueBeforeStart')).toBe(true);
    expect(planRequests).toBe(0);
  });

  it('should autosave select and picker fields shortly after a change', async () => {
    const harness = build(makeIntervention());
    const emitted: InterventionPlanningGuideValues[] = [];
    fixture.componentInstance.stepSaved.subscribe((values) => emitted.push(values));

    harness.siteControl.setValue('/api/facilities/f-1');
    harness.siteControl.markAsDirty();
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(emitted).toEqual([{ site: '/api/facilities/f-1' }]);
    expect(harness.siteControl.dirty).toBe(false);
  });

  it('should only request planning once every step is complete', () => {
    const incomplete = build(makeIntervention({ site: '/api/facilities/f-1' }));
    let planRequests = 0;
    fixture.componentInstance.planRequested.subscribe(() => planRequests++);

    incomplete.requestPlan();
    expect(planRequests).toBe(0);

    const complete = build(
      makeIntervention({
        site: '/api/facilities/f-1',
        responsible: '/api/members/m-1',
        plannedStartAt: '2026-07-12T08:00:00Z',
        dueAt: '2026-07-15T17:00:00Z',
      }),
    );
    fixture.componentInstance.planRequested.subscribe(() => planRequests++);

    complete.requestPlan();
    expect(planRequests).toBe(1);
  });
});
