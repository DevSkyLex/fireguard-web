import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import type { OnboardingPlanSelection } from '../models';
import { OnboardingPlanForm } from '../onboarding-plan-form.component';

const planOf = (key: string, name: string): PlanOutput =>
  ({
    id: key,
    key,
    name,
    description: null,
    limits: {},
    quotas: [],
    isActive: true,
    isDefault: key === 'free',
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }) as unknown as PlanOutput;

const pricingOf = (planKey: string, monthlyAmount: number | null): PlanPricingOutput =>
  ({
    id: planKey,
    planKey,
    currency: 'usd',
    monthlyAmount,
    yearlyAmount: null,
  }) as unknown as PlanPricingOutput;

describe('OnboardingPlanForm', () => {
  let fixture: ComponentFixture<OnboardingPlanForm>;
  let element: HTMLElement;

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingPlanForm);
    fixture.componentRef.setInput('plans', [planOf('free', 'Free'), planOf('pro', 'Pro')]);
    fixture.componentRef.setInput('pricing', [pricingOf('pro', 2900)]);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should render every plan with its price, defaulting an unpriced plan to Free', () => {
    const text: string | null = element.textContent;

    expect(text).toContain('Free');
    expect(text).toContain('Pro');
    expect(text).toContain('$29.00');
  });

  it('should refuse to emit while no plan is picked, and show the reason', async () => {
    const emitted: OnboardingPlanSelection[] = [];
    fixture.componentInstance.submitted.subscribe((value: OnboardingPlanSelection): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Choose a plan to continue.');
  });

  it('should emit the free plan as not requiring payment', async () => {
    const emitted: OnboardingPlanSelection[] = [];
    fixture.componentInstance.submitted.subscribe((value: OnboardingPlanSelection): void => {
      emitted.push(value);
    });

    const freeRadio: HTMLElement = element.querySelector('#onboarding-plan-free') as HTMLElement;
    freeRadio.click();
    await fixture.whenStable();

    await submit();

    expect(emitted).toEqual([{ planKey: 'free', interval: 'month', requiresPayment: false }]);
  });

  it('should emit a priced plan as requiring payment', async () => {
    const emitted: OnboardingPlanSelection[] = [];
    fixture.componentInstance.submitted.subscribe((value: OnboardingPlanSelection): void => {
      emitted.push(value);
    });

    const proRadio: HTMLElement = element.querySelector('#onboarding-plan-pro') as HTMLElement;
    proRadio.click();
    await fixture.whenStable();

    await submit();

    expect(emitted).toEqual([{ planKey: 'pro', interval: 'month', requiresPayment: true }]);
  });

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', new Error('boom'));
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="onboarding-plan-error"]')?.textContent).toContain(
      'The plan could not be confirmed.',
    );
  });
});
