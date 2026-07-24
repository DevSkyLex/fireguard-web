import { TestBed } from '@angular/core/testing';
import { AccountPasswordForm } from '../account-password-form.component';

type AccountPasswordFormTestApi = AccountPasswordForm & {
  requestForm: {
    setValue(value: { currentPassword: string }): void;
  };
  confirmForm: {
    setValue(value: { code: string; newPassword: string; confirmPassword: string }): void;
  };
  submitRequest(): void;
  submitConfirm(): void;
};

describe('AccountPasswordForm', () => {
  let component: AccountPasswordForm;
  let formComponent: AccountPasswordFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new AccountPasswordForm());
    formComponent = component as unknown as AccountPasswordFormTestApi;
  });

  it('should not emit when the current password is missing', () => {
    const emitSpy = vi.spyOn(component.requested, 'emit');

    formComponent.submitRequest();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit the current password on request submit', () => {
    const emitSpy = vi.spyOn(component.requested, 'emit');
    formComponent.requestForm.setValue({ currentPassword: 'CurrentP@ssw0rd!' });

    formComponent.submitRequest();

    expect(emitSpy).toHaveBeenCalledWith('CurrentP@ssw0rd!');
  });

  it('should not emit when the new password does not meet complexity requirements', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');
    formComponent.confirmForm.setValue({
      code: '123456',
      newPassword: 'weakpassword',
      confirmPassword: 'weakpassword',
    });

    formComponent.submitConfirm();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should not emit when passwords do not match', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');
    formComponent.confirmForm.setValue({
      code: '123456',
      newPassword: 'NewP@ssw0rd!',
      confirmPassword: 'OtherP@ssw0rd!',
    });

    formComponent.submitConfirm();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit the code and new password on confirm submit', () => {
    const emitSpy = vi.spyOn(component.confirmed, 'emit');
    formComponent.confirmForm.setValue({
      code: '123456',
      newPassword: 'NewP@ssw0rd!',
      confirmPassword: 'NewP@ssw0rd!',
    });

    formComponent.submitConfirm();

    expect(emitSpy).toHaveBeenCalledWith({ code: '123456', newPassword: 'NewP@ssw0rd!' });
  });

  it('should render the request step by default', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-button')).toBeTruthy();
  });

  it('should render the collapsed request step with a change-password action', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="account-password-expand"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="account-password-request-form"]')).toBeNull();
  });

  it('should expand the request form when the change-password action is clicked', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const expandButton = host.querySelector<HTMLElement>(
      '[data-testid="account-password-expand"] button',
    );

    expandButton?.click();
    fixture.detectChanges();

    expect(host.querySelector('[data-testid="account-password-request-form"]')).toBeTruthy();
  });

  it('should collapse the request form when cancel is clicked', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    const instance = fixture.componentInstance as unknown as { expanded: { set(v: boolean): void } };
    instance.expanded.set(true);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const cancelButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Cancel'),
    );

    cancelButton?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(host.querySelector('[data-testid="account-password-expand"]')).toBeTruthy();
  });

  it('should render the request error message when hasRequestError is true', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    const instance = fixture.componentInstance as unknown as { expanded: { set(v: boolean): void } };
    fixture.componentRef.setInput('hasRequestError', true);
    instance.expanded.set(true);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="account-password-request-form"] p-message')).toBeTruthy();
  });

  it('should render the verify step form when the step input is "verify"', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'verify');
    fixture.componentRef.setInput('maskedRecipient', 'a***@example.com');

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('a***@example.com');
  });

  it('should render the default masked recipient fallback when null', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'verify');
    fixture.componentRef.setInput('maskedRecipient', null);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('your email address');
  });

  it('should render the confirm error message when hasConfirmError is true', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'verify');
    fixture.componentRef.setInput('hasConfirmError', true);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="account-password-confirm-form"] p-message')).toBeTruthy();
  });

  it('should show the confirming loading state on the confirm submit button', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'verify');
    fixture.componentRef.setInput('confirming', true);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const submitButton = host.querySelector('[data-testid="account-password-confirm-submit"] button');
    expect(submitButton?.hasAttribute('disabled')).toBe(true);
  });

  it('should emit cancelled when start over is clicked on the verify step', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'verify');
    fixture.detectChanges();
    const cancelledSpy = vi.fn();
    fixture.componentInstance.cancelled.subscribe(cancelledSpy);
    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const startOverButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Start over'),
    );

    startOverButton?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(cancelledSpy).toHaveBeenCalled();
  });

  it('should render the success step message', () => {
    const fixture = TestBed.createComponent(AccountPasswordForm);
    fixture.componentRef.setInput('step', 'success');

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="account-password-success"]')).toBeTruthy();
  });
});
