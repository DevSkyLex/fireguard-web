import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AddTeamMemberInput } from '@features/organization/models';
import { OrganizationTeamMemberAddForm } from '../organization-team-member-add-form.component';

describe('OrganizationTeamMemberAddForm', () => {
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
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationTeamMemberAddForm);
    fixture.componentRef.setInput('candidates', [{ memberId: 'member-1', label: 'Ada Lovelace' }]);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
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
