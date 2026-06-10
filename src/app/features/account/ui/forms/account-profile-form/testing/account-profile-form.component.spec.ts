import { TestBed } from '@angular/core/testing';
import { AccountProfileForm } from '../account-profile-form.component';

type AccountProfileFormTestApi = AccountProfileForm & {
  form: {
    setValue(value: { firstName: string; lastName: string }): void;
  };
  submit(): void;
  onAvatarUpload(event: AvatarUploadEvent, fileUpload: MockFileUpload): void;
};

interface AvatarUploadEvent {
  readonly files: File[];
}

interface MockFileUpload {
  readonly clear: ReturnType<typeof vi.fn<() => void>>;
}

describe('AccountProfileForm', () => {
  let component: AccountProfileForm;
  let formComponent: AccountProfileFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new AccountProfileForm());
    formComponent = component as unknown as AccountProfileFormTestApi;
  });

  it('should not emit invalid profile values', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    formComponent.form.setValue({
      firstName: 'A'.repeat(101),
      lastName: 'Lovelace',
    });

    formComponent.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit only changed valid profile values', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    formComponent.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    formComponent.submit();

    expect(emitSpy).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('should not emit when profile values are unchanged', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');

    formComponent.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit the selected avatar and clear the upload field', () => {
    const emitSpy = vi.spyOn(component.avatarSelected, 'emit');
    const file: File = new File(['x'], 'avatar.png', { type: 'image/png' });
    const fileUpload: MockFileUpload = { clear: vi.fn<() => void>() };

    formComponent.onAvatarUpload({ files: [file] }, fileUpload);

    expect(emitSpy).toHaveBeenCalledWith(file);
    expect(fileUpload.clear).toHaveBeenCalledTimes(1);
  });
});
