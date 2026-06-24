import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { OnboardingOutput, OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingWizard } from '../onboarding-wizard.component';

interface MockStore {
  isCompleted: WritableSignal<boolean>;
  onboarding: WritableSignal<OnboardingOutput | null>;
  steps: WritableSignal<readonly OnboardingStepOutput[]>;
  progress: WritableSignal<{ done: number; total: number }>;
  nextStep: WritableSignal<string | null>;
  isDismissing: WritableSignal<boolean>;
  dismiss: ReturnType<typeof vi.fn>;
  skipStep: ReturnType<typeof vi.fn>;
}

const stepWith = (key: string, status: string): OnboardingStepOutput =>
  ({ key, status }) as unknown as OnboardingStepOutput;

describe('OnboardingWizard', () => {
  const setup = () => {
    const store: MockStore = {
      isCompleted: signal(false),
      onboarding: signal<OnboardingOutput | null>(null),
      steps: signal<readonly OnboardingStepOutput[]>([]),
      progress: signal({ done: 0, total: 0 }),
      nextStep: signal<string | null>('create_organization'),
      isDismissing: signal(false),
      dismiss: vi.fn(),
      skipStep: vi.fn(),
    };
    const router = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: OnboardingStore, useValue: store },
        { provide: Router, useValue: router },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new OnboardingWizard());
    return { component, store, router };
  };

  it('shows the loading phase before data arrives', () => {
    const { component } = setup();
    expect(component['phase']()).toBe('loading');
  });

  it('shows the welcome phase for a fresh user with no progress', () => {
    const { component, store } = setup();
    store.onboarding.set({} as OnboardingOutput);
    store.steps.set([stepWith('create_organization', 'pending')]);
    store.progress.set({ done: 0, total: 1 });

    expect(component['phase']()).toBe('welcome');
  });

  it('skips the welcome phase for a returning user with progress', () => {
    const { component, store } = setup();
    store.onboarding.set({} as OnboardingOutput);
    store.steps.set([stepWith('create_organization', 'completed')]);
    store.progress.set({ done: 1, total: 2 });

    expect(component['phase']()).toBe('steps');
  });

  it('enters the steps phase after the user starts setup', () => {
    const { component, store } = setup();
    store.onboarding.set({} as OnboardingOutput);
    store.steps.set([stepWith('create_organization', 'pending')]);
    store.progress.set({ done: 0, total: 1 });

    component['startSetup']();

    expect(component['phase']()).toBe('steps');
  });

  it('shows the completion phase when onboarding is complete', () => {
    const { component, store } = setup();
    store.isCompleted.set(true);
    expect(component['phase']()).toBe('completion');
  });

  it('dismisses the flow and navigates home on "explore on my own"', () => {
    const { component, store, router } = setup();
    component['exploreOnMyOwn']();
    expect(store.dismiss).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('skips the current step by key', () => {
    const { component, store } = setup();
    store.nextStep.set('invite_members');
    component['handleSkip']();
    expect(store.skipStep).toHaveBeenCalledWith('invite_members');
  });
});
