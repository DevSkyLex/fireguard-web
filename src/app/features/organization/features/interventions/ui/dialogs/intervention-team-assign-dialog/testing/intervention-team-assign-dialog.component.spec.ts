import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { MemberSelectOption, TeamOutput } from '@features/organization/models';
import { InterventionTeamAssignDialog } from '../intervention-team-assign-dialog.component';

const teams: readonly TeamOutput[] = [
  {
    '@id': '/api/organizations/org-1/teams/team-1',
    '@type': 'Team',
    id: 'team-1',
    organizationId: 'org-1',
    name: 'Fire safety squad',
    description: 'Handles extinguisher rounds',
    memberCount: 4,
    createdAt: '',
    updatedAt: '',
  },
];

const memberOptions: readonly MemberSelectOption[] = [
  {
    value: 'member-1',
    label: 'Ada Lovelace',
    displayName: 'Ada Lovelace',
    roleLabel: 'Inspector',
    avatarUrl: null,
    initials: 'AL',
  },
  {
    value: 'member-2',
    label: 'Grace Hopper',
    displayName: 'Grace Hopper',
    roleLabel: 'Inspector',
    avatarUrl: null,
    initials: 'GH',
  },
  {
    value: 'member-3',
    label: 'Katherine Johnson',
    displayName: 'Katherine Johnson',
    roleLabel: 'Inspector',
    avatarUrl: null,
    initials: 'KJ',
  },
  {
    value: 'member-4',
    label: 'Dorothy Vaughan',
    displayName: 'Dorothy Vaughan',
    roleLabel: 'Inspector',
    avatarUrl: null,
    initials: 'DV',
  },
];

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-team-assign-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;
const submitButton = (): HTMLButtonElement =>
  inDialog('[data-testid="intervention-team-assign-submit"]') as HTMLButtonElement;

describe('InterventionTeamAssignDialog', () => {
  let fixture: ComponentFixture<InterventionTeamAssignDialog>;
  let submitted: string[];
  let dismissed: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionTeamAssignDialog);
    fixture.componentRef.setInput('teams', teams);
    submitted = [];
    dismissed = 0;
    fixture.componentInstance.submitted.subscribe((teamId) => submitted.push(teamId));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    await fixture.whenStable();
  });

  it('should stay closed while `open` is false', () => {
    expect(content()).toBeNull();
  });

  it('should list the candidate teams with their member count', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(content().textContent).toContain('Fire safety squad');
    expect(content().textContent).toContain('4');
  });

  it('should keep team borders visible and show three avatars with an overflow count', async () => {
    fixture.componentRef.setInput('teamMemberOptions', { 'team-1': memberOptions });
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const group: HTMLElement = inDialog('[data-testid="intervention-team-assign-group"]');
    const option: HTMLElement = inDialog('[data-testid="intervention-team-assign-option-team-1"]');

    expect(group.classList.contains('p-1')).toBe(true);
    expect(option.classList.contains('border')).toBe(true);
    expect(option.classList.contains('ring-1')).toBe(false);
    expect(option.querySelectorAll('hlm-avatar')).toHaveLength(3);
    expect(
      option.querySelector('[data-testid="intervention-team-assign-overflow-team-1"]')?.textContent,
    ).toContain('+1');
  });

  it('should disable submitting until a team is picked', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit the picked team id on submit', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    fixture.componentInstance['selectedTeamId'].set('team-1');
    await fixture.whenStable();

    submitButton().click();

    expect(submitted).toEqual(['team-1']);
  });

  it('should render the caller error message', async () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('errorMessage', 'This team has no active members.');
    await fixture.whenStable();

    expect(content().textContent).toContain('This team has no active members.');
  });

  it('should reset the selection when the dialog closes', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.componentInstance['selectedTeamId'].set('team-1');

    fixture.componentRef.setInput('open', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit dismissed on Cancel without emitting submitted', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const cancelButton: HTMLButtonElement | undefined = Array.from(
      content().querySelectorAll('button'),
    ).find((button: HTMLButtonElement): boolean => button.textContent?.includes('Cancel') ?? false);
    cancelButton?.click();
    await fixture.whenStable();

    expect(dismissed).toBe(1);
    expect(submitted).toEqual([]);
  });
});
