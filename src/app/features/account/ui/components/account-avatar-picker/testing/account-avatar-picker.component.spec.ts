import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountAvatarPicker } from '../account-avatar-picker.component';

/**
 * Puts a file on the input and fires the change event a real pick would.
 */
async function pick(
  fixture: ComponentFixture<AccountAvatarPicker>,
  file: File,
): Promise<HTMLInputElement> {
  const input = fixture.nativeElement.querySelector(
    '[data-testid="account-avatar-input"]',
  ) as HTMLInputElement;

  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await fixture.whenStable();

  return input;
}

function imageOf(type: string, bytes: number): File {
  const file = new File(['x'], 'avatar', { type });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

describe('AccountAvatarPicker', () => {
  let fixture: ComponentFixture<AccountAvatarPicker>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountAvatarPicker);
    await fixture.whenStable();
  });

  it('should draw no avatar of its own', () => {
    // The picture belongs to the identity block above it; two components
    // rendering the same face would eventually disagree about which is current.
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-avatar')).toBeNull();
  });

  it('should emit an accepted image', async () => {
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);

    const file = imageOf('image/png', 1_000);
    await pick(fixture, file);

    expect(selected).toHaveBeenCalledWith(file);
  });

  it('should refuse a format the endpoint does not store', async () => {
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);

    await pick(fixture, imageOf('application/pdf', 1_000));

    expect(selected).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('JPEG, PNG, WebP or GIF');
  });

  it('should refuse an image over the cap without uploading it', async () => {
    const selected = vi.fn();
    fixture.componentInstance.selected.subscribe(selected);

    await pick(fixture, imageOf('image/png', 6 * 1024 * 1024));

    // Checked here so an oversized file fails instantly instead of after the
    // upload round trip.
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('under 5 MB');
  });

  it('should clear a refusal once an acceptable file is chosen', async () => {
    await pick(fixture, imageOf('application/pdf', 1_000));
    expect(fixture.nativeElement.textContent).toContain('Choose a JPEG');

    await pick(fixture, imageOf('image/png', 1_000));

    expect(fixture.nativeElement.textContent).not.toContain('Choose a JPEG');
  });

  it('should clear the input so the same file can be chosen again', async () => {
    const input = await pick(fixture, imageOf('image/png', 1_000));

    // Without this, re-picking the same file after a failed upload fires no
    // change event at all.
    expect(input.value).toBe('');
  });

  it('should disable the control while an upload is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});
