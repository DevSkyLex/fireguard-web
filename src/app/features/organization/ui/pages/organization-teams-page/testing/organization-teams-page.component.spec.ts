import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import type { CallState, StoreError } from '@core/request-state';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import { ORGANIZATION_PERMISSION, type TeamOutput } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { OrganizationTeamsStore } from '@features/organization/state/organization-teams';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { OrganizationTeamsPage } from '../organization-teams-page.component';

const TEAM: TeamOutput = {
  '@id': '/api/organizations/org-1/teams/team-1',
  '@type': 'Team',
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Response team',
  description: '',
  memberCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/**
 * Full coverage — route-param orchestration, permission-gated actions,
 * loading/error/empty state derivation, dialog open/close wiring driven by
 * the store's named `CallState`s, and the delete confirm flow.
 */
describe('OrganizationTeamsPage', () => {
  let fixture: ComponentFixture<OrganizationTeamsPage>;
  let teams: WritableSignal<readonly TeamOutput[]>;
  let isLoading: WritableSignal<boolean>;
  let listCallState: WritableSignal<CallState>;
  let createCallState: WritableSignal<CallState>;
  let updateCallState: WritableSignal<CallState>;
  let removeCallState: WritableSignal<CallState>;
  let listError: WritableSignal<StoreError | null>;
  let loadTeams: ReturnType<typeof vi.fn>;
  let loadMembers: ReturnType<typeof vi.fn>;
  let createTeam: ReturnType<typeof vi.fn>;
  let updateTeam: ReturnType<typeof vi.fn>;
  let removeTeam: ReturnType<typeof vi.fn>;
  let permissions: WritableSignal<ReadonlyArray<string>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function createPage(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: OrganizationPermissionService,
          useValue: {
            permissions,
            hasPermission: (name: string): boolean => permissions().includes(name),
          },
        },
        {
          provide: OrganizationMemberService,
          useValue: { listAll: () => of([]) },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationTeamsPage, {
      remove: { providers: [OrganizationTeamsStore] },
      add: {
        providers: [
          {
            provide: OrganizationTeamsStore,
            useValue: {
              teams,
              members: signal([]),
              selectedTeamId: signal<string | null>(null),
              isLoading,
              isCreating: signal(false),
              isUpdating: signal(false),
              isRemoving: signal(false),
              isLoadingMembers: signal(false),
              isAddingMember: signal(false),
              isRemovingMember: signal(false),
              listCallState,
              createCallState,
              updateCallState,
              removeCallState,
              listError,
              createError: signal<StoreError | null>(null),
              updateError: signal<StoreError | null>(null),
              removeError: signal<StoreError | null>(null),
              membersError: signal<StoreError | null>(null),
              addMemberError: signal<StoreError | null>(null),
              removeMemberError: signal<StoreError | null>(null),
              loadTeams,
              createTeam,
              updateTeam,
              removeTeam,
              loadMembers,
              addMember: vi.fn(),
              removeMember: vi.fn(),
            },
          },
        ],
      },
    });

    fixture = TestBed.createComponent(OrganizationTeamsPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  }

  beforeEach(() => {
    teams = signal<readonly TeamOutput[]>([TEAM]);
    isLoading = signal(false);
    listCallState = signal<CallState>(idleCallState());
    createCallState = signal<CallState>(idleCallState());
    updateCallState = signal<CallState>(idleCallState());
    removeCallState = signal<CallState>(idleCallState());
    listError = signal<StoreError | null>(null);
    loadTeams = vi.fn();
    loadMembers = vi.fn();
    createTeam = vi.fn();
    updateTeam = vi.fn();
    removeTeam = vi.fn();
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.TEAMS_WRITE,
      ORGANIZATION_PERMISSION.TEAMS_MANAGE,
    ]);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should load the routed organization’s teams on init', async () => {
    await createPage();

    expect(loadTeams).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('should render the team table once teams are loaded', async () => {
    await createPage();

    expect(root().querySelector('app-organization-team-table')).not.toBeNull();
    expect(root().querySelector('[data-slot="empty"]:not([role="alert"])')).toBeNull();
  });

  it('should render the table with its loading input while the first load is pending', async () => {
    teams = signal<readonly TeamOutput[]>([]);
    isLoading = signal(true);
    await createPage();

    const table = root().querySelector('app-organization-team-table');

    expect(table).not.toBeNull();
    expect(root().querySelector('[data-slot="empty"]:not([role="alert"])')).toBeNull();
  });

  it('should render the error state and retry from it once the list call fails', async () => {
    const error: StoreError = { message: 'Network down' } as StoreError;
    listCallState = signal<CallState>(errorCallState(error));
    listError = signal<StoreError | null>(error);
    await createPage();

    const errorState = root().querySelector('[data-slot="empty"][role="alert"]');
    expect(errorState).not.toBeNull();
    expect(errorState?.textContent).toContain('Network down');

    loadTeams.mockClear();
    (
      root().querySelector('[data-testid="organization-teams-retry"]') as HTMLButtonElement
    ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(loadTeams).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('should announce the list state through the polite live region', async () => {
    isLoading = signal(true);
    await createPage();

    const region = (): HTMLElement =>
      root().querySelector('[data-testid="organization-teams-status"]') as HTMLElement;

    expect(region().getAttribute('aria-live')).toBe('polite');
    expect(region().textContent).toContain('Loading teams…');

    isLoading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(region().textContent).toContain('1 team');
  });

  it('should announce a failed list load through the live region', async () => {
    const error: StoreError = { message: 'Network down' } as StoreError;
    listCallState = signal<CallState>(errorCallState(error));
    listError = signal<StoreError | null>(error);
    await createPage();

    const region = root().querySelector('[data-testid="organization-teams-status"]');

    expect(region?.textContent).toContain('Teams could not be loaded.');
  });

  it('should render the empty state once loaded with no teams', async () => {
    teams = signal<readonly TeamOutput[]>([]);
    await createPage();

    expect(root().querySelector('[data-slot="empty"]:not([role="alert"])')).not.toBeNull();
    expect(root().querySelector('app-organization-team-table')).toBeNull();
  });

  it('should gate the empty state’s create action on TEAMS_WRITE', async () => {
    teams = signal<readonly TeamOutput[]>([]);
    permissions = signal<ReadonlyArray<string>>([]);
    await createPage();

    expect(root().querySelector('[data-slot="empty"]:not([role="alert"]) button')).toBeNull();
  });

  it('should gate the shell header’s create action on TEAMS_WRITE', async () => {
    await createPage();

    expect(fixture.componentInstance['canWrite']()).toBe(true);

    fixture.componentInstance['openCreateDialog']();
    expect(fixture.componentInstance['createDialogVisible']()).toBe(true);
  });

  it('should hide the header create action without TEAMS_WRITE', async () => {
    permissions = signal<ReadonlyArray<string>>([]);
    await createPage();

    expect(fixture.componentInstance['canWrite']()).toBe(false);
  });

  it('should open the create dialog and pass it through to createTeam', async () => {
    await createPage();

    fixture.componentInstance['openCreateDialog']();
    await fixture.whenStable();

    expect(fixture.componentInstance['createDialogVisible']()).toBe(true);

    fixture.componentInstance['createTeam']({ name: 'New team' });

    expect(createTeam).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { name: 'New team' },
    });
  });

  it('should close the create dialog once the create call succeeds', async () => {
    await createPage();
    fixture.componentInstance['openCreateDialog']();
    await fixture.whenStable();
    expect(fixture.componentInstance['createDialogVisible']()).toBe(true);

    createCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['createDialogVisible']()).toBe(false);
  });

  it('should not close the create dialog while the create call is merely pending', async () => {
    await createPage();
    fixture.componentInstance['openCreateDialog']();
    await fixture.whenStable();

    createCallState.set(pendingCallState());
    await fixture.whenStable();

    expect(fixture.componentInstance['createDialogVisible']()).toBe(true);
  });

  it('should open the edit dialog for a team and route its submit through updateTeam', async () => {
    await createPage();

    fixture.componentInstance['openEditDialog'](TEAM);
    await fixture.whenStable();

    expect(fixture.componentInstance['editingTeam']()).toBe(TEAM);

    fixture.componentInstance['updateTeam']({ name: 'Renamed' });

    expect(updateTeam).toHaveBeenCalledWith({
      organizationId: 'org-1',
      teamId: 'team-1',
      input: { name: 'Renamed' },
    });
  });

  it('should close the edit dialog once the update call succeeds', async () => {
    await createPage();
    fixture.componentInstance['openEditDialog'](TEAM);
    await fixture.whenStable();

    updateCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['editingTeam']()).toBeNull();
  });

  it('should clear the edit dialog on a plain dismissal', async () => {
    await createPage();
    fixture.componentInstance['openEditDialog'](TEAM);
    await fixture.whenStable();

    fixture.componentInstance['onEditDialogVisibleChange'](false);

    expect(fixture.componentInstance['editingTeam']()).toBeNull();
  });

  it('should request delete confirmation and call removeTeam once confirmed', async () => {
    await createPage();

    fixture.componentInstance['requestDelete'](TEAM);
    await fixture.whenStable();

    expect(fixture.componentInstance['pendingDeleteTeam']()).toBe(TEAM);

    fixture.componentInstance['confirmDelete']();

    expect(removeTeam).toHaveBeenCalledWith({ organizationId: 'org-1', teamId: 'team-1' });
  });

  it('should close the delete confirmation once the remove call succeeds', async () => {
    await createPage();
    fixture.componentInstance['requestDelete'](TEAM);
    await fixture.whenStable();

    removeCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(fixture.componentInstance['pendingDeleteTeam']()).toBeNull();
  });

  it('should not call removeTeam if confirmDelete fires with nothing pending', async () => {
    await createPage();

    fixture.componentInstance['confirmDelete']();

    expect(removeTeam).not.toHaveBeenCalled();
  });

  it('should open the members sheet with the store’s selected team', async () => {
    await createPage();

    fixture.componentInstance['openMembersSheet'](TEAM);

    expect(loadMembers).toHaveBeenCalledWith({ organizationId: 'org-1', teamId: 'team-1' });
  });

  it('should clear the selected team when the members sheet closes', async () => {
    await createPage();

    fixture.componentInstance['onMembersSheetVisibleChange'](false);

    expect(loadMembers).toHaveBeenCalledWith({ organizationId: 'org-1', teamId: null });
  });
});
