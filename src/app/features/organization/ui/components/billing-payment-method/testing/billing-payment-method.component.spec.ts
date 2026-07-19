import { TestBed } from '@angular/core/testing';
import type { PaymentMethodOutput } from '@features/organization/models';
import { BillingPaymentMethod } from '../billing-payment-method.component';

const card = (overrides: Partial<PaymentMethodOutput> = {}): PaymentMethodOutput =>
  ({
    organizationId: 'org-1',
    hasPaymentMethod: true,
    brand: 'visa',
    last4: '4242',
    expMonth: 4,
    expYear: 2030,
    ...overrides,
  }) as PaymentMethodOutput;

describe('BillingPaymentMethod', () => {
  const createComponent = (method: PaymentMethodOutput | null) => {
    TestBed.configureTestingModule({ imports: [BillingPaymentMethod] });

    const fixture = TestBed.createComponent(BillingPaymentMethod);
    fixture.componentRef.setInput('method', method);
    fixture.detectChanges();
    return fixture;
  };

  it('should show the card brand and last four digits', () => {
    const text: string = createComponent(card()).nativeElement.textContent ?? '';

    expect(text).toContain('visa');
    expect(text).toContain('4242');
  });

  it('should pad a single-digit expiry month', () => {
    expect(createComponent(card()).nativeElement.textContent).toContain('04/2030');
  });

  // Stripe can report a card with no expiry; "NaN/undefined" must never reach
  // the screen.
  it('should omit the expiry when Stripe did not report one', () => {
    const text: string =
      createComponent(card({ expMonth: null, expYear: null })).nativeElement.textContent ?? '';

    expect(text).not.toContain('undefined');
    expect(text).not.toContain('NaN');
  });

  // `last4` is null both when there is no card and when Stripe withholds it, so
  // the component branches on the backend's own flag instead.
  it('should report no card from the flag, not from a missing last4', () => {
    const fixture = createComponent(card({ hasPaymentMethod: false, last4: null, brand: null }));

    expect(fixture.nativeElement.textContent).toContain('No card on file.');
  });

  it('should still offer the portal when there is no card', () => {
    const fixture = createComponent(card({ hasPaymentMethod: false }));
    let opened = 0;
    fixture.componentInstance.manage.subscribe(() => (opened += 1));

    fixture.nativeElement.querySelector('button').click();

    expect(opened).toBe(1);
  });
});
