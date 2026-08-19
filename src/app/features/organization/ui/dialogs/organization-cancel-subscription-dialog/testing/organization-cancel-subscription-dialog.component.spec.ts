import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationCancelSubscriptionDialog } from '../organization-cancel-subscription-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-cancel-subscription-dialog"]');

describe('OrganizationCancelSubscriptionDialog', () => {
  let fixture: ComponentFixture<OrganizationCancelSubscriptionDialog>;
  let confirmations: number;
  let visibilityChanges: boolean[];

  const confirmButton = (): HTMLButtonElement =>
    content()?.querySelector(
      '[data-testid="organization-cancel-subscription-confirm"]',
    ) as HTMLButtonElement;

  const setVisible = async (value: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationCancelSubscriptionDialog);
    await fixture.whenStable();

    confirmations = 0;
    visibilityChanges = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmations++);
    fixture.componentInstance.visibleChange.subscribe((value) => visibilityChanges.push(value));
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should state the period-end date when known', async () => {
    fixture.componentRef.setInput('renewalDate', 'January 1, 2027');
    await setVisible(true);

    expect(content()?.textContent).toContain('January 1, 2027');
  });

  it('should fall back to a dateless period-end message', async () => {
    await setVisible(true);

    expect(content()?.textContent).toContain('current billing period');
  });

  it('should emit confirmed on the primary action', async () => {
    await setVisible(true);

    confirmButton().click();

    expect(confirmations).toBe(1);
  });

  it('should lock the confirm action while pending', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().textContent).toContain('Canceling…');
  });

  it('should surface the store error', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('error', 'The subscription could not be canceled.');
    await fixture.whenStable();

    expect(
      content()?.querySelector('[data-testid="organization-cancel-subscription-error"]')
        ?.textContent,
    ).toContain('The subscription could not be canceled.');
  });

  it('should report a dismissal via "Keep subscription" without emitting confirmed', async () => {
    await setVisible(true);

    const keepButton: HTMLButtonElement | undefined = Array.from(
      content()?.querySelectorAll('button') ?? [],
    ).find(
      (button: HTMLButtonElement): boolean =>
        button.textContent?.includes('Keep subscription') ?? false,
    );
    keepButton?.click();
    await fixture.whenStable();

    expect(visibilityChanges).toEqual([false]);
    expect(confirmations).toBe(0);
  });
});
