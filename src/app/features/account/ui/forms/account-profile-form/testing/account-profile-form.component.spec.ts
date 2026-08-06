import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountProfileForm } from '../account-profile-form.component';
import type { AccountProfileFormValues } from '../models';

const INITIAL: AccountProfileFormValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  locale: 'system',
};

/**
 * Types into one field and lets Signal Forms observe the change, the way a user
 * typing does.
 */
async function type(
  fixture: ComponentFixture<AccountProfileForm>,
  selector: string,
  value: string,
): Promise<void> {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await fixture.whenStable();
}

/**
 * Submits the form the way the button does.
 */
async function submit(fixture: ComponentFixture<AccountProfileForm>): Promise<void> {
  (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
    new Event('submit'),
  );
  await fixture.whenStable();
}

describe('AccountProfileForm', () => {
  let fixture: ComponentFixture<AccountProfileForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountProfileForm);
    fixture.componentRef.setInput('profile', INITIAL);
    await fixture.whenStable();
  });

  it('should seed the fields from the profile it is given', () => {
    const firstName = fixture.nativeElement.querySelector(
      '#account-first-name',
    ) as HTMLInputElement;
    const lastName = fixture.nativeElement.querySelector('#account-last-name') as HTMLInputElement;

    expect(firstName.value).toBe('Ada');
    expect(lastName.value).toBe('Lovelace');
  });

  it('should re-seed when the saved profile changes underneath it', async () => {
    fixture.componentRef.setInput('profile', { ...INITIAL, firstName: 'Grace' });
    await fixture.whenStable();

    const firstName = fixture.nativeElement.querySelector(
      '#account-first-name',
    ) as HTMLInputElement;

    // The store is the authority once a save lands; leaving the old draft on
    // screen would show the user something that is no longer true.
    expect(firstName.value).toBe('Grace');
  });

  it('should emit the edited values', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#account-first-name', 'Grace');
    await type(fixture, '#account-last-name', 'Hopper');
    await submit(fixture);

    expect(submitted).toHaveBeenCalledWith({
      firstName: 'Grace',
      lastName: 'Hopper',
      locale: 'system',
    } satisfies AccountProfileFormValues);
  });

  it('should emit with both names emptied', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#account-first-name', '');
    await type(fixture, '#account-last-name', '');
    await submit(fixture);

    // Neither name is required: the API accepts an absent one, and a user who
    // only ever had a username must still be able to save.
    expect(submitted).toHaveBeenCalledWith({
      firstName: '',
      lastName: '',
      locale: 'system',
    } satisfies AccountProfileFormValues);
  });

  it('should refuse a name longer than the column', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    await type(fixture, '#account-first-name', 'a'.repeat(101));
    await submit(fixture);

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('at most 100 characters');
  });

  it('should disable submission while a save is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});
