import { provideZonelessChangeDetection, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { SetupInviteMemberInput } from '@features/organization/setup';
import type { OnboardingMemberDraft } from '../models';
import { OnboardingMembersForm } from '../onboarding-members-form.component';

describe('OnboardingMembersForm', () => {
  let fixture: ComponentFixture<OnboardingMembersForm>;
  let element: HTMLElement;

  const submit = async (): Promise<void> => {
    element.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  const setDraft = async (draft: OnboardingMemberDraft): Promise<void> => {
    (
      fixture.componentInstance as unknown as { model: WritableSignal<OnboardingMemberDraft> }
    ).model.set(draft);
    await fixture.whenStable();
  };

  const addDraft = async (email: string, roleId = ''): Promise<void> => {
    await setDraft({ email, roleId });
    element.querySelector<HTMLButtonElement>('[data-testid="onboarding-member-add"]')?.click();
    await fixture.whenStable();
  };

  const prepareBatch = (count: number): Promise<void> =>
    Array.from({ length: count }, (_, index) => `member${index}@example.com`).reduce(
      async (previous, address) => {
        await previous;
        await addDraft(address);
      },
      Promise.resolve(),
    );

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingMembersForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('does not submit an empty batch when the server requires invitations', async () => {
    const emitted: Array<readonly SetupInviteMemberInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupInviteMemberInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([]);
    expect(element.textContent).toContain('Add at least one email.');
  });

  it('should close the send and name the way out while skippable with nothing typed or staged', async () => {
    fixture.componentRef.setInput('skippable', true);
    await fixture.whenStable();

    const submitButton: HTMLButtonElement = element.querySelector(
      '[data-testid="onboarding-members-submit"]',
    ) as HTMLButtonElement;

    expect(submitButton.disabled).toBe(true);
    expect(element.textContent).toContain('Add at least one email, or skip this step.');
    expect(element.querySelector('[data-testid="onboarding-wizard-skip"]')).not.toBeNull();
  });

  it('should reopen the send as soon as an address is typed', async () => {
    fixture.componentRef.setInput('skippable', true);
    await fixture.whenStable();
    await setDraft({ email: 'jordan@example.com', roleId: '' });

    const submitButton: HTMLButtonElement = element.querySelector(
      '[data-testid="onboarding-members-submit"]',
    ) as HTMLButtonElement;

    expect(submitButton.disabled).toBe(false);
  });

  it('should stage a valid draft row automatically when the operator continues', async () => {
    await setDraft({ email: 'jordan@example.com', roleId: '' });

    const emitted: Array<readonly SetupInviteMemberInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupInviteMemberInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([[{ email: 'jordan@example.com', roleIds: undefined }]]);
  });

  it('should block the continue while a typed draft row is invalid', async () => {
    await setDraft({ email: 'not-an-email', roleId: '' });

    const emitted: Array<readonly SetupInviteMemberInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupInviteMemberInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([]);
  });

  it('should disable the add control until the email is valid', async () => {
    const addButton: HTMLButtonElement = element.querySelector(
      '[data-testid="onboarding-member-add"]',
    ) as HTMLButtonElement;

    expect(addButton.disabled).toBe(true);

    await setDraft({ email: 'not-an-email', roleId: '' });
    expect(addButton.disabled).toBe(true);

    await setDraft({ email: 'jordan@example.com', roleId: '' });
    expect(addButton.disabled).toBe(false);
  });

  it('should stage a row without a role, clear the draft, and submit the batch', async () => {
    await setDraft({ email: 'jordan@example.com', roleId: '' });

    (element.querySelector('[data-testid="onboarding-member-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(
      element.querySelector('[data-testid="onboarding-members-staged"]')?.textContent,
    ).toContain('jordan@example.com');

    const emitted: Array<readonly SetupInviteMemberInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupInviteMemberInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([[{ email: 'jordan@example.com', roleIds: undefined }]]);
  });

  it('should remove a staged row', async () => {
    await setDraft({ email: 'jordan@example.com', roleId: '' });
    (element.querySelector('[data-testid="onboarding-member-add"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    (
      element.querySelector('[data-testid="onboarding-members-remove-0"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="onboarding-members-staged"]')).toBeNull();
  });

  it('shows selected and default roles with native item separators between prepared rows', async () => {
    fixture.componentRef.setInput('roles', [{ id: 'reviewer', name: 'Reviewer' }]);
    await addDraft('reviewer@example.com', 'reviewer');
    await addDraft('member@example.com');
    const list = element.querySelector('[data-testid="onboarding-members-staged"]');
    expect(list?.textContent).toContain('Reviewer');
    expect(list?.textContent).toContain('Default role');
    expect(list?.querySelectorAll('[hlmItemSeparator]').length).toBe(1);
  });

  it('blocks a duplicate on add and on submit after trimming and ignoring case', async () => {
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await addDraft('Jordan@example.com');
    await setDraft({ email: '  JORDAN@EXAMPLE.COM  ', roleId: '' });
    expect(
      element.querySelector<HTMLButtonElement>('[data-testid="onboarding-member-add"]')?.disabled,
    ).toBe(true);
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(element.textContent).toContain('This email is already in this invitation batch.');
    expect(
      element.querySelectorAll('[data-testid="onboarding-members-staged"] [hlmItem]').length,
    ).toBe(1);
  });

  it('rejects an edited row changed to another prepared address without losing either draft', async () => {
    await addDraft('first@example.com');
    await addDraft('second@example.com');
    element.querySelector<HTMLButtonElement>('[aria-label="Edit first@example.com"]')?.click();
    await fixture.whenStable();
    await setDraft({ email: 'SECOND@example.com', roleId: '' });
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    expect(
      element.querySelector('[data-testid="onboarding-members-staged"]')?.textContent,
    ).toContain('second@example.com');
    expect(
      element.querySelector<HTMLInputElement>('[data-testid="onboarding-member-email"]')?.value,
    ).toBe('SECOND@example.com');
    await setDraft({ email: 'updated@example.com', roleId: '' });
    await submit();
    expect(submitted).toHaveBeenCalledWith([
      { email: 'second@example.com', roleIds: undefined },
      { email: 'updated@example.com', roleIds: undefined },
    ]);
  });

  it('does not replace an existing draft or remove a row when editing would stage a duplicate', async () => {
    await addDraft('first@example.com');
    await addDraft('second@example.com');
    await setDraft({ email: 'FIRST@example.com', roleId: '' });
    element.querySelector<HTMLButtonElement>('[aria-label="Edit second@example.com"]')?.click();
    await fixture.whenStable();
    expect(
      element.querySelectorAll('[data-testid="onboarding-members-staged"] [hlmItem]').length,
    ).toBe(2);
    expect(
      element.querySelector<HTMLInputElement>('[data-testid="onboarding-member-email"]')?.value,
    ).toBe('FIRST@example.com');
  });

  it('allows five invitations including the current draft but rejects a sixth at submission', async () => {
    await prepareBatch(4);
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await setDraft({ email: 'member4@example.com', roleId: '' });
    await submit();
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(submitted.mock.calls[0][0]).toHaveLength(5);
    expect(element.querySelector('[data-testid="onboarding-member-email"]')).toBeNull();
    expect(
      element.querySelector('[data-testid="onboarding-members-capacity"]')?.textContent,
    ).toContain('5 invitations');
    await setDraft({ email: 'member5@example.com', roleId: '' });
    await submit();
    expect(submitted).toHaveBeenCalledTimes(1);
    expect(
      element.querySelector<HTMLButtonElement>('[data-testid="onboarding-member-add"]')?.disabled,
    ).toBe(true);
  });

  it('counts persisted successes and keeps them immutable when parent objects are recreated', async () => {
    await prepareBatch(5);
    fixture.componentRef.setInput('completed', [
      { email: 'MEMBER0@example.com' },
      { email: 'member1@example.com' },
    ]);
    await fixture.whenStable();
    expect(
      element.querySelector<HTMLButtonElement>('[data-testid="onboarding-members-remove-0"]')
        ?.disabled,
    ).toBe(true);
    expect(
      element.querySelector<HTMLButtonElement>('[aria-label="Edit member0@example.com"]')?.disabled,
    ).toBe(true);
    element
      .querySelector<HTMLButtonElement>('[data-testid="onboarding-members-remove-4"]')
      ?.click();
    await fixture.whenStable();
    await setDraft({ email: 'member0@EXAMPLE.COM', roleId: '' });
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await submit();
    expect(submitted).not.toHaveBeenCalled();
    await setDraft({ email: 'replacement@example.com', roleId: '' });
    await submit();
    expect(submitted.mock.calls[0][0]).toHaveLength(5);
  });

  it('counts completed invitations even when they are no longer present in local prepared rows', async () => {
    fixture.componentRef.setInput(
      'completed',
      Array.from({ length: 4 }, (_, i) => ({ email: `sent${i}@example.com` })),
    );
    await addDraft('last@example.com');
    expect(element.querySelector('[data-testid="onboarding-member-email"]')).toBeNull();
    expect(element.querySelector('[data-testid="onboarding-members-capacity"]')).not.toBeNull();
  });

  it('trims surrounding whitespace before validating and sending the current draft', async () => {
    await setDraft({ email: '  member@example.com  ', roleId: '' });
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    await submit();
    expect(submitted).toHaveBeenCalledWith([{ email: 'member@example.com', roleIds: undefined }]);
  });
});
