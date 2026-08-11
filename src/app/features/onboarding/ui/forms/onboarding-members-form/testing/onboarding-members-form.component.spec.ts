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

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingMembersForm);
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should submit an empty batch when nothing was staged (the step is skippable)', async () => {
    const emitted: Array<readonly SetupInviteMemberInput[]> = [];
    fixture.componentInstance.submitted.subscribe(
      (value: readonly SetupInviteMemberInput[]): void => {
        emitted.push(value);
      },
    );

    await submit();

    expect(emitted).toEqual([[]]);
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

  it('should surface the API rejection above the form', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'email', message: 'This member was already invited.' }],
    });
    await fixture.whenStable();

    expect(
      element.querySelector('[data-testid="onboarding-members-error"]')?.textContent,
    ).toContain('This member was already invited.');
  });
});
