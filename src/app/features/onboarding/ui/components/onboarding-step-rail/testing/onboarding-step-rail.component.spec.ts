import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStepRail } from '../onboarding-step-rail.component';

const stepOf = (
  key: OnboardingStepOutput['key'],
  status: OnboardingStepOutput['status'],
): OnboardingStepOutput =>
  ({
    key,
    label: key,
    status,
    required: true,
    available: true,
    reason: null,
    actionMethod: null,
    actionPath: null,
    rollbackAvailable: false,
    rollbackMethod: null,
    rollbackPath: null,
    skippable: false,
    skipAvailable: false,
    skipMethod: null,
    skipPath: null,
    completedAt: null,
  }) as OnboardingStepOutput;

describe('OnboardingStepRail', () => {
  let fixture: ComponentFixture<OnboardingStepRail>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingStepRail);
    element = fixture.nativeElement as HTMLElement;
  });

  it('should render one row per step, in order', async () => {
    fixture.componentRef.setInput('steps', [
      stepOf('create_organization', 'completed'),
      stepOf('select_plan', 'pending'),
    ]);
    await fixture.whenStable();

    const rows: NodeListOf<HTMLLIElement> = element.querySelectorAll('li');

    expect(rows.length).toBe(2);
    expect(element.textContent).toContain('Create organization');
    expect(element.textContent).toContain('Choose a plan');
  });

  it('should mark the active step with aria-current="step"', async () => {
    fixture.componentRef.setInput('steps', [
      stepOf('create_organization', 'completed'),
      stepOf('select_plan', 'pending'),
    ]);
    fixture.componentRef.setInput('activeStepKey', 'select_plan');
    await fixture.whenStable();

    const rows: HTMLLIElement[] = Array.from(element.querySelectorAll('li'));

    expect(rows[0].getAttribute('aria-current')).toBeNull();
    expect(rows[1].getAttribute('aria-current')).toBe('step');
  });

  it('should render the completed-of-total readout from the progress input', async () => {
    fixture.componentRef.setInput('progress', { done: 1, total: 5 });
    await fixture.whenStable();

    expect(element.textContent).toContain('1');
    expect(element.textContent).toContain('5');
    expect(element.textContent).toContain('completed');
  });

  it('should label every step status so it never depends on colour alone', async () => {
    fixture.componentRef.setInput('steps', [stepOf('create_organization', 'blocked')]);
    await fixture.whenStable();

    expect(element.textContent).toContain('Blocked');
  });
});
