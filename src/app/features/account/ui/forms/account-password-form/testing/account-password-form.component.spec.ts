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
});
