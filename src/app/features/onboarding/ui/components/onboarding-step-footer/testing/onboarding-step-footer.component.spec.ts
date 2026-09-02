import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OnboardingStepFooter } from '../onboarding-step-footer.component';

describe('OnboardingStepFooter', () => {
  let fixture: ComponentFixture<OnboardingStepFooter>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingStepFooter);
    fixture.componentRef.setInput('label', 'Create facility');
    fixture.componentRef.setInput('pendingLabel', 'Saving…');
    fixture.componentRef.setInput('submitTestId', 'onboarding-facilities-submit');
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should render the named primary action only, when the step cannot be skipped', () => {
    const buttons: NodeListOf<HTMLButtonElement> = element.querySelectorAll('button');

    expect(buttons.length).toBe(1);
    expect(buttons[0].getAttribute('data-testid')).toBe('onboarding-facilities-submit');
    expect(buttons[0].textContent).toContain('Create facility');
  });

  it('should add the skip control on the left when the step is skippable', async () => {
    const skipped = vi.fn();
    fixture.componentInstance.skipped.subscribe(skipped);
    fixture.componentRef.setInput('skippable', true);
    await fixture.whenStable();

    const skip: HTMLButtonElement | null = element.querySelector(
      '[data-testid="onboarding-wizard-skip"]',
    );
    expect(skip).not.toBeNull();
    skip?.click();

    expect(skipped).toHaveBeenCalledTimes(1);
  });

  it('should swap to the pending label and lock both controls while persisting', async () => {
    fixture.componentRef.setInput('skippable', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const buttons: HTMLButtonElement[] = Array.from(element.querySelectorAll('button'));

    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(element.textContent).toContain('Saving…');
  });

  it('should close the primary action and name the reason when gated', async () => {
    fixture.componentRef.setInput('gateReason', 'Add at least one email, or skip this step.');
    await fixture.whenStable();

    const submit: HTMLButtonElement = element.querySelector(
      '[data-testid="onboarding-facilities-submit"]',
    ) as HTMLButtonElement;
    const reason: HTMLElement = element.querySelector(
      '[data-testid="onboarding-step-gate-reason"]',
    ) as HTMLElement;

    expect(submit.disabled).toBe(true);
    expect(reason.textContent).toContain('Add at least one email, or skip this step.');
    expect(submit.getAttribute('aria-describedby')).toBe(reason.id);
  });
});
