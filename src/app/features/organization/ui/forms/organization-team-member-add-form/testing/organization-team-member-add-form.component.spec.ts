import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { AddTeamMemberInput, MemberSelectOption } from '@features/organization/models';
import { OrganizationTeamMemberAddForm } from '../organization-team-member-add-form.component';

describe('OrganizationTeamMemberAddForm', () => {
  const mobileInteractionMode = signal(false);
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView ??= (): void => {};
  });
  beforeEach(() => mobileInteractionMode.set(false));
  let fixture: ComponentFixture<OrganizationTeamMemberAddForm>;
  let submissions: AddTeamMemberInput[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector(
      '[data-testid="organization-team-member-add-submit"]',
    ) as HTMLButtonElement;
  const roleInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="organization-team-member-add-role"]') as HTMLInputElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobileInteractionMode,
            interactionMode: () => (mobileInteractionMode() ? 'mobile' : 'desktop'),
          },
        },
        provideZonelessChangeDetection(),
      ],
    });
    fixture = TestBed.createComponent(OrganizationTeamMemberAddForm);
    const candidates: readonly MemberSelectOption[] = [
      {
        value: 'member-1',
        label: 'Ada Lovelace',
        displayName: 'Ada Lovelace',
        roleLabel: 'Safety manager',
        avatarUrl: null,
        initials: 'AL',
      },
    ];
    fixture.componentRef.setInput('candidates', candidates);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it.each([
    { value: 42 },
    { value: false },
    { value: { value: 'member-1' } },
    { value: ['member-1'] },
    { value: 'missing-member' },
  ])('should reject malformed or unavailable member output $value', async ({ value }) => {
    fixture.debugElement.query(By.css('hlm-combobox')).triggerEventHandler('valueChange', value);
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(true);
    submitButton().click();
    expect(submissions).toEqual([]);
  });

  it.each([null, undefined])('should clear a member pick for empty output %s', async (value) => {
    const picker = fixture.debugElement.query(By.css('hlm-combobox'));
    picker.triggerEventHandler('valueChange', 'member-1');
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(false);
    picker.triggerEventHandler('valueChange', value);
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(true);
  });

  it('should read the native role value and submit a narrowed combobox member', async () => {
    fixture.debugElement
      .query(By.css('hlm-combobox'))
      .triggerEventHandler('valueChange', 'member-1');
    roleInput().value = '  lead  ';
    roleInput().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    submitButton().click();
    expect(submissions).toEqual([{ memberId: 'member-1', role: 'lead' }]);
  });

  it('should ignore picker output while submission is pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    fixture.debugElement
      .query(By.css('hlm-combobox'))
      .triggerEventHandler('valueChange', 'member-1');
    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(true);
    expect(submissions).toEqual([]);
  });

  it('selects from an inline mobile command list and submits the same member payload', async () => {
    mobileInteractionMode.set(true);
    await fixture.whenStable();
    expect(root().querySelector('hlm-combobox')).toBeNull();
    expect(root().querySelector('hlm-drawer')).toBeNull();
    const choice = root().querySelector(
      '[data-testid="organization-team-member-add-mobile-member-1"]',
    ) as HTMLButtonElement;
    expect(choice.textContent).toContain('Ada Lovelace');
    choice.click();
    await fixture.whenStable();
    expect(root().querySelector('output[hlmFieldDescription]')?.textContent).toContain(
      'Ada Lovelace',
    );
    submitButton().click();
    expect(submissions).toEqual([{ memberId: 'member-1' }]);
  });

  it('should filter the mobile command list through its labeled native search input', async () => {
    mobileInteractionMode.set(true);
    await fixture.whenStable();
    const search = root().querySelector<HTMLInputElement>('#organization-team-member-add-picker');
    if (!search) throw new Error('Missing member search input');
    expect(root().querySelector('label[for="organization-team-member-add-picker"]')).not.toBeNull();
    search.value = 'no-matching-member';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    const choice = root().querySelector<HTMLButtonElement>(
      '[data-testid="organization-team-member-add-mobile-member-1"]',
    );
    expect(choice?.getAttribute('data-hidden')).toBe('true');
    expect(root().textContent).toContain('No member matches.');
    search.value = 'Ada';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(choice?.hasAttribute('data-hidden')).toBe(false);
  });

  it('shows the mobile empty state only when the search has no matching members', async () => {
    mobileInteractionMode.set(true);
    await fixture.whenStable();
    const search = root().querySelector<HTMLInputElement>('#organization-team-member-add-picker');
    if (!search) throw new Error('Expected the mobile member search input');
    expect(root().querySelector('[hlmCommandEmpty]')).toBeNull();
    search.value = 'No matching person';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(root().querySelector('[hlmCommandEmpty]')?.textContent).toContain('No member matches.');
    search.value = 'Ada';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(root().querySelector('[hlmCommandEmpty]')).toBeNull();
    expect(submissions).toEqual([]);
  });

  it('preserves its selection and label draft across both interaction-mode presentations', async () => {
    const input = roleInput();
    input.value = 'lead';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.componentInstance['selectedMemberId'].set('member-1');
    mobileInteractionMode.set(true);
    await fixture.whenStable();
    mobileInteractionMode.set(false);
    await fixture.whenStable();
    expect(roleInput()).toBe(input);
    expect(roleInput().value).toBe('lead');
    expect(fixture.componentInstance['selectedMemberId']()).toBe('member-1');
    submitButton().click();
    expect(submissions).toEqual([{ memberId: 'member-1', role: 'lead' }]);
  });

  it('locks mobile choices while an add request is pending', async () => {
    mobileInteractionMode.set(true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    const choice = root().querySelector(
      '[data-testid="organization-team-member-add-mobile-member-1"]',
    ) as HTMLButtonElement;
    expect(choice.disabled).toBe(true);
    choice.click();
    expect(fixture.componentInstance['selectedMemberId']()).toBe('');
    expect(submitButton().disabled).toBe(true);
  });

  it('should render the member picker and role input', () => {
    expect(
      root().querySelector('[data-testid="organization-team-member-add-picker-input"]'),
    ).not.toBeNull();
    expect(roleInput()).not.toBeNull();
  });

  it('should keep the submit action disabled with nothing picked', () => {
    expect(submitButton().disabled).toBe(true);
  });

  it('should enable the submit action once a member is picked', async () => {
    fixture.componentInstance['selectedMemberId'].set('member-1');
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(false);
  });

  it('should disable the submit action while a request is pending, even with a pick made', async () => {
    fixture.componentInstance['selectedMemberId'].set('member-1');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit the picked member without a role when none is entered', () => {
    fixture.componentInstance['selectedMemberId'].set('member-1');
    fixture.componentInstance['submit']();

    expect(submissions).toEqual([{ memberId: 'member-1' }]);
  });

  it('should emit the trimmed role label alongside the picked member', () => {
    fixture.componentInstance['selectedMemberId'].set('member-1');
    fixture.componentInstance['roleLabel'].set('  lead  ');
    fixture.componentInstance['submit']();

    expect(submissions).toEqual([{ memberId: 'member-1', role: 'lead' }]);
  });

  it('should clear the draft after a successful submit', () => {
    fixture.componentInstance['selectedMemberId'].set('member-1');
    fixture.componentInstance['roleLabel'].set('lead');
    fixture.componentInstance['submit']();

    expect(fixture.componentInstance['selectedMemberId']()).toBe('');
    expect(fixture.componentInstance['roleLabel']()).toBe('');
  });

  it('should refuse to submit with nothing picked', () => {
    fixture.componentInstance['submit']();

    expect(submissions).toEqual([]);
  });

  it('should disable the picker once there are no candidates left to offer', async () => {
    fixture.componentRef.setInput('candidates', []);
    await fixture.whenStable();

    expect(fixture.componentInstance['hasCandidates']()).toBe(false);
  });

  it('should render nothing in the error block before a rejection', () => {
    expect(root().querySelector('[data-testid="organization-team-member-add-error"]')).toBeNull();
  });

  it('should surface the server error above the picker', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'memberId', message: 'This member is already on the team.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-team-member-add-error"]')?.textContent,
    ).toContain('This member is already on the team.');
  });

  it('should fall back to a generic failure message when the server error carries no detail', async () => {
    fixture.componentRef.setInput('serverError', {});
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-team-member-add-error"]')?.textContent,
    ).toContain('The member could not be added.');
  });
});
