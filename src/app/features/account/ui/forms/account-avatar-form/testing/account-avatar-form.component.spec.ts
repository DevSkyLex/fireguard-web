import { TestBed } from '@angular/core/testing';
import { AccountAvatarForm } from '../account-avatar-form.component';

type AccountAvatarFormTestApi = AccountAvatarForm & {
  onAvatarUpload(event: AvatarUploadEvent, fileUpload: MockFileUpload): void;
};

interface AvatarUploadEvent {
  readonly files: File[];
}

interface MockFileUpload {
  readonly clear: ReturnType<typeof vi.fn<() => void>>;
}

describe('AccountAvatarForm', () => {
  let component: AccountAvatarForm;
  let avatarComponent: AccountAvatarFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new AccountAvatarForm());
    avatarComponent = component as unknown as AccountAvatarFormTestApi;
  });

  it('should emit the selected avatar and clear the upload field', () => {
    const emitSpy = vi.spyOn(component.avatarSelected, 'emit');
    const file: File = new File(['x'], 'avatar.png', { type: 'image/png' });
    const fileUpload: MockFileUpload = { clear: vi.fn<() => void>() };

    avatarComponent.onAvatarUpload({ files: [file] }, fileUpload);

    expect(emitSpy).toHaveBeenCalledWith(file);
    expect(fileUpload.clear).toHaveBeenCalledTimes(1);
  });

  it('should not emit when no file was selected', () => {
    const emitSpy = vi.spyOn(component.avatarSelected, 'emit');
    const fileUpload: MockFileUpload = { clear: vi.fn<() => void>() };

    avatarComponent.onAvatarUpload({ files: [] }, fileUpload);

    expect(emitSpy).not.toHaveBeenCalled();
    expect(fileUpload.clear).toHaveBeenCalledTimes(1);
  });
});
