import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucidePlus, lucideUsersRound } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import { OrganizationMemberService } from '@features/organization/data-access';
import {
  ORGANIZATION_PERMISSION,
  type AddTeamMemberInput,
  type CreateTeamInput,
  type OrganizationMemberOutput,
  type TeamOutput,
  type UpdateTeamInput,
} from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { OrganizationTeamsStore } from '@features/organization/state/organization-teams';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { OrganizationTeamDeleteDialog } from '../../dialogs/organization-team-delete-dialog';
import { OrganizationTeamEditDialog } from '../../dialogs/organization-team-edit-dialog';
import { OrganizationTeamCreateSheet } from '../../sheets/organization-team-create-sheet';
import { OrganizationTeamMembersSheet } from '../../sheets/organization-team-members-sheet';
import { OrganizationTeamTable } from '../../tables/organization-team-table';

/**
 * Component OrganizationTeamsPage
 * @class OrganizationTeamsPage
 *
 * @description
 * Mounted as the "Teams" tab of `OrganizationMembersPage`
 * (`/organizations/:organizationId/members?tab=teams`, gated by
 * `organization.teams.read`; the retired `/teams` route redirects here):
 * the team grid (`OrganizationTeamTable`) with
 * create/edit/delete and a per-team member roster panel
 * (`OrganizationTeamMembersSheet`). Distinct from `OrganizationTeamPage`
 * (`/team`, RBAC roles) — see the naming disambiguation in `FEATURE.md`.
 *
 * `OrganizationTeamsStore` is component-scoped and owns teams, the selected
 * team's roster and every named mutation `CallState`. This page also
 * injects `OrganizationMemberService` directly (`ARCHITECTURE.md` §10.3: a
 * page may call a service) to preload the organization's full member
 * directory once — the member roster sheet needs it both to resolve a
 * roster row's identity (`TeamMemberOutput` carries only `memberId`) and to
 * build the add-member picker's candidate list, and no existing port
 * exposes a browsable full roster (`MemberDirectoryPort` only resolves
 * individual references on demand).
 *
 * "New team" registers on the shell header through `PageActionsService`,
 * matching `OrganizationTeamPage`/`OrganizationMembersPage` — this page
 * renders no title band of its own. Registration is gated by {@link active}:
 * the host tabs component keeps this page mounted (`hlmTabsContentLazy`)
 * once its tab has activated once, so leaving the tab does not destroy it
 * and the plain `registerPageActions` dance alone would leave a stale "New
 * team" button registered after switching to a sibling tab.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-teams-page',
  imports: [
    NgIcon,
    EmptyState,
    ErrorState,
    HlmButton,
    OrganizationTeamCreateSheet,
    OrganizationTeamDeleteDialog,
    OrganizationTeamEditDialog,
    OrganizationTeamMembersSheet,
    OrganizationTeamTable,
  ],
  providers: [
    OrganizationTeamsStore,
    provideIcons({ lucideCircleAlert, lucidePlus, lucideUsersRound }),
  ],
  templateUrl: './organization-teams-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose teams are managed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether this page's tab is the one currently showing, defaulting to
   * `true` for a standalone mount. Drives whether {@link pageActions} owns
   * the shell header's action slot — see the class `@description`.
   *
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly active: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Properties
  /** Teams, the selected team's roster and every mutation's request state. */
  protected readonly store: OrganizationTeamsStore =
    inject<OrganizationTeamsStore>(OrganizationTeamsStore);

  /** Organization permission checks gating every write this page offers. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Preloads the organization's member directory for the members sheet. */
  private readonly memberService: OrganizationMemberService = inject(OrganizationMemberService);

  /** Unsubscribes {@link loadOrgMembers}'s request on destroy. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /** The active organization's date pattern and timezone. */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New team" button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /** The organization's member directory, loaded once for the members sheet. */
  protected readonly orgMembers: WritableSignal<readonly OrganizationMemberOutput[]> = signal<
    readonly OrganizationMemberOutput[]
  >([]);

  /** Whether the create dialog is open. */
  protected readonly createDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The team open in the edit dialog, or `null` when closed. */
  protected readonly editingTeam: WritableSignal<TeamOutput | null> = signal<TeamOutput | null>(
    null,
  );

  /** The team the row menu asked to delete, pending confirmation. */
  protected readonly pendingDeleteTeam: WritableSignal<TeamOutput | null> =
    signal<TeamOutput | null>(null);

  /** Whether the acting member may create, rename or delete a team. */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.TEAMS_WRITE),
  );

  /** Whether the acting member may delete a team. */
  protected readonly canManage: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.TEAMS_MANAGE),
  );

  /** The header's count line, naming how many teams the organization has. */
  protected readonly subtitle: Signal<string> = computed<string>(() => {
    const total: number = this.store.teams().length;

    return total === 1
      ? $localize`:@@org.teams.countOne:1 team`
      : $localize`:@@org.teams.countMany:${total}:count: teams`;
  });

  /**
   * The page's screen-reader status line, announced through the template's
   * polite live region: the load in flight, the failure, or the resulting
   * team count (reusing {@link subtitle}). Mutation failures are announced
   * by each dialog/form's own `role="alert"` block; successes surface as
   * toasts through the global feedback listener.
   */
  protected readonly listAnnouncement: Signal<string> = computed<string>(() => {
    if (this.store.isLoading()) {
      return $localize`:@@org.teams.announce.loading:Loading teams…`;
    }
    if (this.store.listCallState().status === 'error') {
      return $localize`:@@org.teams.announce.loadFailed:Teams could not be loaded.`;
    }

    return this.subtitle();
  });

  /** The team currently open in the members sheet, resolved live from the store. */
  protected readonly membersSheetTeam: Signal<TeamOutput | null> = computed<TeamOutput | null>(
    () => {
      const id: string | null = this.store.selectedTeamId();
      if (id === null) return null;

      return this.store.teams().find((team) => team.id === id) ?? null;
    },
  );

  /** The edit dialog's open/closed state, derived from {@link editingTeam}. */
  protected readonly editDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.editingTeam() !== null ? 'open' : 'closed',
  );

  /** The delete confirmation's open/closed state, derived from {@link pendingDeleteTeam}. */
  protected readonly deleteDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingDeleteTeam() !== null ? 'open' : 'closed',
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads this organization's teams and its member directory once, closes
   * the create dialog, the edit dialog and the delete confirmation on their
   * own write's success — one effect per named `CallState`, since this
   * store attributes each mutation its own field rather than one shared
   * one (unlike `OrganizationTeamStore`'s single `mutationCallState`, this
   * needs no cross-surface attribution) — and registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);

    effect((): void => {
      const isActive: boolean = this.active();
      const template: TemplateRef<unknown> | undefined = this.pageActions();

      untracked((): void => {
        if (isActive && template) this.pageActionsService.register(template);
        else if (!isActive) this.pageActionsService.clear(template);
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.store.loadTeams({ organizationId });
        this.loadOrgMembers(organizationId);
      });
    });

    effect((): void => {
      const status: string = this.store.createCallState().status;

      untracked((): void => {
        if (status === 'success') this.createDialogVisible.set(false);
      });
    });

    effect((): void => {
      const status: string = this.store.updateCallState().status;

      untracked((): void => {
        if (status === 'success') this.editingTeam.set(null);
      });
    });

    effect((): void => {
      const status: string = this.store.removeCallState().status;

      untracked((): void => {
        if (status === 'success') this.pendingDeleteTeam.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @description Re-runs the teams load, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.loadTeams({ organizationId: this.organizationId() });
  }

  /**
   * Method openCreateDialog
   * @description Opens the create-team dialog.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected openCreateDialog(): void {
    this.createDialogVisible.set(true);
  }

  /**
   * Method onCreateDialogVisibleChange
   * @description Tracks the create dialog's own open/closed state, closing it on a successful create.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onCreateDialogVisibleChange(visible: boolean): void {
    this.createDialogVisible.set(visible);
  }

  /**
   * Method createTeam
   * @description Sends the validated payload from the create form. The constructor's effect closes the dialog once the store reports success.
   * @access protected
   * @since 1.0.0
   * @param {CreateTeamInput} payload - The team to create.
   * @returns {void}
   */
  protected createTeam(payload: CreateTeamInput): void {
    this.store.createTeam({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method openEditDialog
   * @description Opens the edit dialog for a team.
   * @access protected
   * @since 1.0.0
   * @param {TeamOutput} team - The row's team.
   * @returns {void}
   */
  protected openEditDialog(team: TeamOutput): void {
    this.editingTeam.set(team);
  }

  /**
   * Method onEditDialogVisibleChange
   * @description Closes the edit dialog on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onEditDialogVisibleChange(visible: boolean): void {
    if (!visible) this.editingTeam.set(null);
  }

  /**
   * Method updateTeam
   * @description Applies the edit form's payload to the team being edited. The constructor's effect closes the dialog once the store reports success.
   * @access protected
   * @since 1.0.0
   * @param {UpdateTeamInput} payload - The validated partial payload.
   * @returns {void}
   */
  protected updateTeam(payload: UpdateTeamInput): void {
    const team: TeamOutput | null = this.editingTeam();
    if (team === null) return;

    this.store.updateTeam({
      organizationId: this.organizationId(),
      teamId: team.id,
      input: payload,
    });
  }

  /**
   * Method requestDelete
   * @description Opens the delete confirmation for a team.
   * @access protected
   * @since 1.0.0
   * @param {TeamOutput} team - The row's team.
   * @returns {void}
   */
  protected requestDelete(team: TeamOutput): void {
    this.pendingDeleteTeam.set(team);
  }

  /**
   * Method confirmDelete
   * @description Sends the delete write. The constructor's effect closes the dialog once the store settles successfully.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDelete(): void {
    const team: TeamOutput | null = this.pendingDeleteTeam();
    if (team === null) return;

    this.store.removeTeam({ organizationId: this.organizationId(), teamId: team.id });
  }

  /**
   * Method onDeleteDialogVisibleChange
   * @description Clears the pending team on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The dialog's next visibility.
   * @returns {void}
   */
  protected onDeleteDialogVisibleChange(visible: boolean): void {
    if (visible) return;

    this.pendingDeleteTeam.set(null);
  }

  /**
   * Method openMembersSheet
   * @description Selects a team and loads its member roster.
   * @access protected
   * @since 1.0.0
   * @param {TeamOutput} team - The row's team.
   * @returns {void}
   */
  protected openMembersSheet(team: TeamOutput): void {
    this.store.loadMembers({ organizationId: this.organizationId(), teamId: team.id });
  }

  /**
   * Method onMembersSheetVisibleChange
   * @description Clears the selected team, closing the panel and its roster.
   * @access protected
   * @since 1.0.0
   * @param {boolean} visible - The panel's next visibility.
   * @returns {void}
   */
  protected onMembersSheetVisibleChange(visible: boolean): void {
    if (!visible) this.store.loadMembers({ organizationId: this.organizationId(), teamId: null });
  }

  /**
   * Method retryLoadMembers
   * @description Retries loading the selected team's roster.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryLoadMembers(): void {
    const teamId: string | null = this.store.selectedTeamId();
    if (teamId === null) return;

    this.store.loadMembers({ organizationId: this.organizationId(), teamId });
  }

  /**
   * Method addMember
   * @description Adds a member to the selected team.
   * @access protected
   * @since 1.0.0
   * @param {AddTeamMemberInput} payload - The picked member and optional membership label.
   * @returns {void}
   */
  protected addMember(payload: AddTeamMemberInput): void {
    const teamId: string | null = this.store.selectedTeamId();
    if (teamId === null) return;

    this.store.addMember({ organizationId: this.organizationId(), teamId, input: payload });
  }

  /**
   * Method removeMember
   * @description Removes a member from the selected team.
   * @access protected
   * @since 1.0.0
   * @param {string} memberId - The member to remove.
   * @returns {void}
   */
  protected removeMember(memberId: string): void {
    const teamId: string | null = this.store.selectedTeamId();
    if (teamId === null) return;

    this.store.removeMember({ organizationId: this.organizationId(), teamId, memberId });
  }
  //#endregion

  //#region Internals
  /**
   * Method loadOrgMembers
   * @description Preloads the organization's full member directory once, for the members sheet.
   * @access private
   * @since 1.0.0
   * @param {string} organizationId - The active organization's id.
   * @returns {void}
   */
  private loadOrgMembers(organizationId: string): void {
    this.memberService
      .listAll(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members: readonly OrganizationMemberOutput[]): void => this.orgMembers.set(members),
        error: (): void => this.orgMembers.set([]),
      });
  }
  //#endregion
}
