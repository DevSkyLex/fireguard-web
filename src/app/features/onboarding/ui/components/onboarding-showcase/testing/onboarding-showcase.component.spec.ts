import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { OnboardingStepKey, OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingShowcase } from '../onboarding-showcase.component';

interface MockStore {
  steps: WritableSignal<readonly OnboardingStepOutput[]>;
  nextStep: WritableSignal<OnboardingStepKey | null>;
  progress: WritableSignal<{ done: number; total: number }>;
}

const stepWith = (key: string, status: string): OnboardingStepOutput =>
  ({ key, status }) as unknown as OnboardingStepOutput;

const progressOf = (steps: readonly OnboardingStepOutput[]): { done: number; total: number } => ({
  done: steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length,
  total: steps.length,
});

describe('OnboardingShowcase', () => {
  const setup = (steps: readonly OnboardingStepOutput[], nextStep: OnboardingStepKey | null) => {
    const store: MockStore = {
      steps: signal(steps),
      nextStep: signal(nextStep),
      progress: signal(progressOf(steps)),
    };

    TestBed.configureTestingModule({
      imports: [OnboardingShowcase],
      providers: [{ provide: OnboardingStore, useValue: store }],
    });

    const fixture = TestBed.createComponent(OnboardingShowcase);
    fixture.detectChanges();
    return { fixture, store };
  };

  it('renders the brand and the localized step rail labels', () => {
    const { fixture } = setup(
      [stepWith('create_organization', 'completed'), stepWith('select_plan', 'pending')],
      'select_plan',
    );

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fireguard');
    expect(text).toContain('Create organization');
    expect(text).toContain('Choose a plan');
  });

  it('classifies steps as done / current / todo', () => {
    const { fixture } = setup(
      [
        stepWith('create_organization', 'completed'),
        stepWith('select_plan', 'pending'),
        stepWith('invite_members', 'pending'),
      ],
      'select_plan',
    );

    const component = fixture.componentInstance;
    expect(component['statusOf'](stepWith('create_organization', 'completed'))).toBe('done');
    expect(component['statusOf'](stepWith('select_plan', 'pending'))).toBe('current');
    expect(component['statusOf'](stepWith('invite_members', 'pending'))).toBe('todo');
  });
});
