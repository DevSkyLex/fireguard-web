import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import { TeamService } from '@features/organization/data-access';
import type { TeamMemberOutput, TeamOutput } from '@features/organization/models';
import { OrganizationTeamsStore } from '../organization-teams.store';

const flush = async (): Promise<void> => {
  await Promise.resolve();
};

function collection<T extends HydraItem>(member: T[]): HydraCollection<T> {
  return {
    '@id': '/api',
    '@type': 'Collection',
    totalItems: member.length,
    member,
  } as HydraCollection<T>;
}

const team = (id: string, memberCount = 0): TeamOutput =>
  ({
    id,
    organizationId: 'org-1',
    name: `Team ${id}`,
    description: '',
    memberCount,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }) as unknown as TeamOutput;

const teamMember = (memberId: string): TeamMemberOutput =>
  ({
    memberId,
    role: 'lead',
    addedAt: '2026-01-01',
  }) as unknown as TeamMemberOutput;

describe('OrganizationTeamsStore', () => {
  let store: OrganizationTeamsStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let teamService: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    listMembers: ReturnType<typeof vi.fn>;
    addMember: ReturnType<typeof vi.fn>;
    removeMember: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    dispatch = vi.fn();
    teamService = {
      list: vi.fn().mockReturnValue(of(collection([team('t1')]))),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn().mockReturnValue(of(undefined)),
      listMembers: vi.fn().mockReturnValue(of(collection([teamMember('m1')]))),
      addMember: vi.fn(),
      removeMember: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationTeamsStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: TeamService, useValue: teamService },
      ],
    });
    store = TestBed.inject(OrganizationTeamsStore);
  });

  it('starts idle with empty collections', () => {
    expect(store.teams()).toEqual([]);
    expect(store.members()).toEqual([]);
    expect(store.selectedTeamId()).toBeNull();
    expect(store.listCallState().status).toBe('idle');
  });

  it('loads teams into the entity collection', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();

    expect(store.teams().map((t) => t.id)).toEqual(['t1']);
    expect(store.listCallState().status).toBe('success');
    expect(store.isLoading()).toBe(false);
  });

  it('exposes a normalized error when the teams load fails', async () => {
    teamService.list.mockReturnValue(throwError(() => new Error('list failed')));
    store.loadTeams({ organizationId: 'org-1' });
    await flush();

    expect(store.listCallState().status).toBe('error');
    expect(store.listError()).not.toBeNull();
  });

  it('adds a created team to the collection and dispatches teamCreated', async () => {
    const created = team('t2');
    teamService.create.mockReturnValue(of(created));

    store.createTeam({ organizationId: 'org-1', input: { name: 'Team t2' } });
    await flush();

    expect(store.teams().map((t) => t.id)).toEqual(['t2']);
    expect(store.createCallState().status).toBe('success');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Organization Teams Store] teamCreated' }),
    );
  });

  it('dispatches mutationFailed when team creation fails', async () => {
    teamService.create.mockReturnValue(throwError(() => new Error('create failed')));

    store.createTeam({ organizationId: 'org-1', input: { name: 'x' } });
    await flush();

    expect(store.createCallState().status).toBe('error');
    expect(store.createError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Organization Teams Store] mutationFailed' }),
    );
  });

  it('replaces an updated team in the collection', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();
    const updated = team('t1', 3);
    teamService.update.mockReturnValue(of(updated));

    store.updateTeam({ organizationId: 'org-1', teamId: 't1', input: { name: 'Renamed' } });
    await flush();

    expect(store.teams()).toEqual([updated]);
    expect(store.updateCallState().status).toBe('success');
  });

  it('exposes a normalized error when a team update fails', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();
    teamService.update.mockReturnValue(throwError(() => new Error('update failed')));

    store.updateTeam({ organizationId: 'org-1', teamId: 't1', input: { name: 'x' } });
    await flush();

    expect(store.updateCallState().status).toBe('error');
    expect(store.updateError()).not.toBeNull();
  });

  it('removes a team from the collection and clears the member panel when it was selected', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();
    store.loadMembers({ organizationId: 'org-1', teamId: 't1' });
    await flush();
    expect(store.selectedTeamId()).toBe('t1');
    expect(store.members()).toEqual([teamMember('m1')]);

    store.removeTeam({ organizationId: 'org-1', teamId: 't1' });
    await flush();

    expect(store.teams()).toEqual([]);
    expect(store.removeCallState().status).toBe('success');
    expect(store.selectedTeamId()).toBeNull();
    expect(store.members()).toEqual([]);
  });

  it('exposes a normalized error when team removal fails', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();
    teamService.remove.mockReturnValue(throwError(() => new Error('remove failed')));

    store.removeTeam({ organizationId: 'org-1', teamId: 't1' });
    await flush();

    expect(store.removeCallState().status).toBe('error');
    expect(store.removeError()).not.toBeNull();
    expect(store.teams().map((t) => t.id)).toEqual(['t1']);
  });

  it('loads the member roster for the selected team', async () => {
    store.loadMembers({ organizationId: 'org-1', teamId: 't1' });
    await flush();

    expect(store.selectedTeamId()).toBe('t1');
    expect(store.members().map((m) => m.memberId)).toEqual(['m1']);
    expect(store.membersCallState().status).toBe('success');
    expect(teamService.listMembers).toHaveBeenCalledWith('org-1', 't1');
  });

  it('clears the roster and selection when loadMembers is called with a null team id', async () => {
    store.loadMembers({ organizationId: 'org-1', teamId: 't1' });
    await flush();

    store.loadMembers({ organizationId: 'org-1', teamId: null });
    await flush();

    expect(store.selectedTeamId()).toBeNull();
    expect(store.members()).toEqual([]);
    expect(store.membersCallState().status).toBe('idle');
  });

  it('exposes a normalized error when the member roster load fails', async () => {
    teamService.listMembers.mockReturnValue(throwError(() => new Error('members failed')));

    store.loadMembers({ organizationId: 'org-1', teamId: 't1' });
    await flush();

    expect(store.membersCallState().status).toBe('error');
    expect(store.membersError()).not.toBeNull();
  });

  it('adds a member and increments the team memberCount', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();
    const added = teamMember('m2');
    teamService.addMember.mockReturnValue(of(added));

    store.addMember({ organizationId: 'org-1', teamId: 't1', input: { memberId: 'm2' } });
    await flush();

    expect(store.members()).toEqual([added]);
    expect(store.teams().find((t) => t.id === 't1')?.memberCount).toBe(1);
    expect(store.addMemberCallState().status).toBe('success');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Organization Teams Store] teamMemberAdded' }),
    );
  });

  it('exposes a normalized error when adding a member fails', async () => {
    teamService.addMember.mockReturnValue(throwError(() => new Error('add failed')));

    store.addMember({ organizationId: 'org-1', teamId: 't1', input: { memberId: 'm2' } });
    await flush();

    expect(store.addMemberCallState().status).toBe('error');
    expect(store.addMemberError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Organization Teams Store] mutationFailed' }),
    );
  });

  it('removes a member and decrements the team memberCount, never below zero', async () => {
    store.loadTeams({ organizationId: 'org-1' });
    await flush();
    store.loadMembers({ organizationId: 'org-1', teamId: 't1' });
    await flush();

    store.removeMember({ organizationId: 'org-1', teamId: 't1', memberId: 'm1' });
    await flush();

    expect(store.members()).toEqual([]);
    expect(store.teams().find((t) => t.id === 't1')?.memberCount).toBe(0);
    expect(store.removeMemberCallState().status).toBe('success');
  });

  it('exposes a normalized error when removing a member fails', async () => {
    store.loadMembers({ organizationId: 'org-1', teamId: 't1' });
    await flush();
    teamService.removeMember.mockReturnValue(throwError(() => new Error('remove failed')));

    store.removeMember({ organizationId: 'org-1', teamId: 't1', memberId: 'm1' });
    await flush();

    expect(store.removeMemberCallState().status).toBe('error');
    expect(store.removeMemberError()).not.toBeNull();
    expect(store.members().map((m) => m.memberId)).toEqual(['m1']);
  });
});
