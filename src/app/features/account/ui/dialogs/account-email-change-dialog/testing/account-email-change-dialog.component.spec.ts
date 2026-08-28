import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AccountEmailChangeFormValues } from '../../../forms/account-email-change-form';
import { AccountEmailChangeDialog } from '../account-email-change-dialog.component';

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="account-email-change-dialog"]');

describe('AccountEmailChangeDialog', () => {
  let fixture: ComponentFixture<AccountEmailChangeDialog>;
  let submissions: AccountEmailChangeFormValues[];
  let visibilityChanges: boolean[];

  const emailInput = (): HTMLInputElement =>
    content()?.querySelector('[data-testid="account-email-change-new"]') as HTMLInputElement;

  const passwordInput = (): HTMLInputElement =>
    content()?.querySelector('#account-email-change-password') as HTMLInputElement;

  const submitButton = (): HTMLButtonElement =>
    content()?.querySelector('[data-testid="account-email-change-submit"]') as HTMLButtonElement;

  const setVisible = async (value: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', value);
    await fixture.whenStable();
  };

  const fill = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountEmailChangeDialog);
    await fixture.whenStable();

    submissions = [];
    visibilityChanges = [];
    fixture.componentInstance.submitted.subscribe((values) => submissions.push(values));
    fixture.componentInstance.visibleChange.subscribe((value) => visibilityChanges.push(value));
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should state that nothing changes until the link is opened', async () => {
    await setVisible(true);

    expect(content()?.textContent).toContain('confirmation link');
    expect(content()?.textContent).toContain('only changes once you open it');
  });

  it('should forward the validated payload untouched', async () => {
    await setVisible(true);

    await fill(emailInput(), 'new@example.com');
    await fill(passwordInput(), 'Secret123!');
    submitButton().click();
    await fixture.whenStable();

    expect(submissions).toEqual([{ newEmail: 'new@example.com', currentPassword: 'Secret123!' }]);
  });

  it('should not emit while the form is invalid', async () => {
    await setVisible(true);

    await fill(emailInput(), 'not-an-address');
    await fill(passwordInput(), 'Secret123!');
    submitButton().click();
    await fixture.whenStable();

    expect(submissions).toEqual([]);
  });

  it('should prefill the pending address on the resend path, asking only for the password', async () => {
    fixture.componentRef.setInput('initialEmail', 'pending@example.com');
    await setVisible(true);

    expect(emailInput().value).toBe('pending@example.com');
    expect(passwordInput().value).toBe('');
  });

  it('should report a dismissal via Cancel without emitting a submission', async () => {
    await setVisible(true);

    const cancelButton: HTMLButtonElement | null =
      content()?.querySelector('[data-testid="account-email-change-cancel"]') ?? null;
    cancelButton?.click();
    await fixture.whenStable();

    expect(visibilityChanges).toEqual([false]);
    expect(submissions).toEqual([]);
  });

  it('should lock the submit control while the request is in flight', async () => {
    await setVisible(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute('aria-busy')).toBe('true');
    expect(submitButton().textContent).toContain('Sending…');
  });
});
