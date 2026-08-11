import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InviteOrganizationMemberInput } from '@features/organization/models';
import { OrganizationInviteForm } from '../organization-invite-form.component';

describe('OrganizationInviteForm', () => {
  let fixture: ComponentFixture<OrganizationInviteForm>;
  let submissions: InviteOrganizationMemberInput[];
  let cancellations: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const emailInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="organization-invite-email"]') as HTMLInputElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-invite-submit"]') as HTMLButtonElement;

  const typeEmail = async (value: string): Promise<void> => {
    emailInput().value = value;
    emailInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationInviteForm);
    await fixture.whenStable();

    submissions = [];
    cancellations = 0;
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancellations++);
  });

  it('should refuse a blank email', async () => {
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Enter an email address.');
  });

  it('should refuse a malformed email', async () => {
    await typeEmail('not-an-email');
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Enter a valid email address.');
  });

  it('should emit the trimmed email with no role when none was picked', async () => {
    await typeEmail('  amelie@example.com  ');
    await submit();

    expect(submissions).toEqual([{ email: 'amelie@example.com', roleIds: undefined }]);
  });

  it('should lock the submit control while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit cancelled without submitting anything', async () => {
    root()
      .querySelector('[data-testid="organization-invite-cancel"]')
      ?.dispatchEvent(new Event('click'));

    expect(cancellations).toBe(1);
    expect(submissions).toEqual([]);
  });

  it('should surface the constraint violation the API reported on the email field', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [
        { propertyPath: 'email', message: 'This member is already in the organization.' },
      ],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-invite-error"]')?.textContent,
    ).toContain('This member is already in the organization.');
  });

  it('should fall back to the store error message when nothing more specific is reported', async () => {
    fixture.componentRef.setInput('serverError', {
      message: 'The current plan limit of 5 members has been reached.',
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-invite-error"]')?.textContent,
    ).toContain('The current plan limit of 5 members has been reached.');
  });
});
