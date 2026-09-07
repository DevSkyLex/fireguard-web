import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
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

  it('should render every plan with its price, showing Free only for the explicit free offer', () => {
    const text: string | null = element.textContent;

    expect(text).toContain('Free');
    expect(text).toContain('Pro');
    expect(text).toContain('$29.00');
  });

  it('should refuse to emit while no plan is picked, and show the reason', async () => {
    fixture.componentRef.setInput('plans', [planOf('pro', 'Pro')]);
    (
      fixture.componentInstance as unknown as { model: WritableSignal<{ planKey: string }> }
    ).model.set({ planKey: '' });
    await fixture.whenStable();

    const emitted: OnboardingPlanSelection[] = [];
    fixture.componentInstance.submitted.subscribe((value: OnboardingPlanSelection): void => {
      emitted.push(value);
    });

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Choose a plan to continue.');
  });

  it('should pre-select the default plan and mark it as the current one', async () => {
    const card: HTMLElement = element.querySelector(
      '[data-testid="onboarding-plan-card-free"]',
    ) as HTMLElement;

    expect(card.getAttribute('data-selected')).toBe('true');
    expect(card.textContent).toContain('Current plan');
    expect(element.querySelector('[data-testid="onboarding-plan-submit"]')?.textContent).toContain(
      'Confirm plan',
    );
  });

  it('should name the payment on the primary action once a priced plan is picked', async () => {
    (element.querySelector('#onboarding-plan-pro') as HTMLElement).click();
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="onboarding-plan-submit"]')?.textContent).toContain(
      'Continue to payment',
    );
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

    expect(emitted).toEqual([{ planKey: 'free', interval: 'month', pricingState: 'free' }]);
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

    expect(emitted).toEqual([{ planKey: 'pro', interval: 'month', pricingState: 'priced' }]);
  });
  it.each([undefined, null])(
    'disables a commercial offer without a monthly price (%s)',
    async (amount) => {
      fixture.componentRef.setInput(
        'pricing',
        amount === undefined ? [] : [pricingOf('pro', amount)],
      );
      await fixture.whenStable();
      const radio = element.querySelector('#onboarding-plan-pro') as HTMLElement;
      expect(radio.getAttribute('aria-disabled')).toBe('true');
      expect(
        element.querySelector('[data-testid="onboarding-plan-card-pro"]')?.textContent,
      ).toContain('Monthly price unavailable');
      const emitted = vi.fn();
      fixture.componentInstance.submitted.subscribe(emitted);
      (
        fixture.componentInstance as unknown as { model: WritableSignal<{ planKey: string }> }
      ).model.set({ planKey: 'pro' });
      await fixture.whenStable();
      await submit();
      expect(emitted).not.toHaveBeenCalled();
      expect(
        (element.querySelector('[data-testid="onboarding-plan-submit"]') as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    },
  );

  it('keeps a commercial zero price on the Billing path', async () => {
    fixture.componentRef.setInput('pricing', [pricingOf('pro', 0)]);
    await fixture.whenStable();
    (element.querySelector('#onboarding-plan-pro') as HTMLElement).click();
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(emitted);
    await submit();
    expect(emitted).toHaveBeenCalledWith({
      planKey: 'pro',
      interval: 'month',
      pricingState: 'priced',
    });
    expect(
      element.querySelector('[data-testid="onboarding-plan-card-pro"]')?.textContent,
    ).toContain('$0.00/month');
  });
});
