import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideTrash2, lucideUsersRound } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  MemberSelectOption,
  AddTeamMemberInput,
  OrganizationMemberOutput,
  TeamMemberOutput,
  TeamOutput,
} from '@features/organization/models';
import { toMemberSelectOption } from '@features/organization/utils';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { sheetSide } from '@shared/sheet-side';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSheetImports } from '@shared/ui/sheet';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { OrganizationTeamMemberAddForm } from '../../forms/organization-team-member-add-form';

/**
 * Interface OrganizationTeamRosterRow
 *
 * @description
 * One roster row's view-model: a `TeamMemberOutput` resolved against the
 * organization's member directory. `name`/`email`/`avatarUrl` fall back to a
 * generic label when the directory has no entry for `memberId` — a
 * membership row can outlive the directory snapshot the page loaded it
 * against.
 *
 * @since 1.0.0
 */
interface OrganizationTeamRosterRow {
  readonly memberId: string;
  readonly name: string;
  readonly email: string | null;
  readonly avatarUrl: string | null;
  readonly role: string | null;
  readonly addedAt: string;
}

/** Placeholder rows drawn while the roster loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3];

/**
 * Component OrganizationTeamMembersSheet
 * @class OrganizationTeamMembersSheet
 *
 * @description
 * The right-side panel for one team's member roster: the current members
 * (identity, optional free-form role label, join date) with a remove
 * action, and {@link OrganizationTeamMemberAddForm} to add another
 * organization member — offered only from {@link candidates}, which this
 * sheet computes from {@link orgMembers} minus {@link members} so an
 * already-listed member is never offered twice.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`),
 * matching `OrganizationRolePermissionsSheet`.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): it computes no membership
 * change itself — {@link memberAdded} and {@link memberRemoveRequested}
 * carry the operator's intent, and the page calls
 * `OrganizationTeamsStore.addMember`/`removeMember`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-team-members-sheet',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    OrgDatePipe,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    OrganizationTeamMemberAddForm,
    ...HlmSheetImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideTrash2, lucideUsersRound })],
  templateUrl: './organization-team-members-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamMembersSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property team
   * @readonly
   * @description The team whose roster this panel shows, or `null` while nothing is selected.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<TeamOutput | null>}
   */
  public readonly team: InputSignal<TeamOutput | null> = input<TeamOutput | null>(null);

  /**
   * Property members
   * @readonly
   * @description The selected team's current membership rows.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly TeamMemberOutput[]>}
   */
  public readonly members: InputSignal<readonly TeamMemberOutput[]> = input<
    readonly TeamMemberOutput[]
  >([]);

  /**
   * Property orgMembers
   * @readonly
   * @description The organization's member directory, preloaded by the page — resolves roster identities and feeds the add-member picker.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationMemberOutput[]>}
   */
  public readonly orgMembers: InputSignal<readonly OrganizationMemberOutput[]> = input<
    readonly OrganizationMemberOutput[]
  >([]);

  /**
   * Property loadingMembers
   * @readonly
   * @description Whether the roster is loading.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMembers: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property membersError
   * @readonly
   * @description The roster load's failure message, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly membersError: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property canWrite
   * @readonly
   * @description Whether the add-member form and each row's Remove action may render (`organization.teams.write`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property isAddingMember
   * @readonly
   * @description Whether an add-member request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly isAddingMember: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property addMemberError
   * @readonly
   * @description Whatever the last add-member attempt failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly addMemberError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property isRemovingMember
   * @readonly
   * @description Whether a remove-member request is in flight — locks every row's Remove action, the store carries no per-member request state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly isRemovingMember: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The panel wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property memberAdded
   * @readonly
   * @description The picked member and optional membership label, from the add-member form.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<AddTeamMemberInput>}
   */
  public readonly memberAdded: OutputEmitterRef<AddTeamMemberInput> = output<AddTeamMemberInput>();

  /**
   * Property memberRemoveRequested
   * @readonly
   * @description A row's Remove action was activated for this member id.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly memberRemoveRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property retryLoad
   * @readonly
   * @description The roster's error state asked to retry the load.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryLoad: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;

  /** The panel state, derived from {@link visible} so there is no second copy of the truth. */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /** The panel's side — `'bottom'` below `sm`, `'right'` at and above it. */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /** The member directory keyed by id, for resolving a roster row's identity. */
  private readonly directoryById: Signal<ReadonlyMap<string, OrganizationMemberOutput>> = computed(
    (): ReadonlyMap<string, OrganizationMemberOutput> =>
      new Map(this.orgMembers().map((member) => [member.id, member])),
  );

  /**
   * Property rosterRows
   * @readonly
   * @description The current membership rows, resolved against the directory.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OrganizationTeamRosterRow[]>}
   */
  protected readonly rosterRows: Signal<readonly OrganizationTeamRosterRow[]> = computed(
    (): readonly OrganizationTeamRosterRow[] => {
      const directory: ReadonlyMap<string, OrganizationMemberOutput> = this.directoryById();

      return this.members().map((member: TeamMemberOutput): OrganizationTeamRosterRow => {
        const directoryEntry: OrganizationMemberOutput | undefined = directory.get(member.memberId);

        return {
          memberId: member.memberId,
          name:
            directoryEntry?.displayName ??
            $localize`:@@org.teams.membersSheet.unknownMember:Member`,
          email: directoryEntry?.email ?? null,
          avatarUrl: directoryEntry?.avatarUrl ?? null,
          role: member.role ?? null,
          addedAt: member.addedAt,
        };
      });
    },
  );

  /**
   * Property candidates
   * @readonly
   * @description Organization members not already on the roster, offered to the add-member picker.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly MemberSelectOption[]>}
   */
  protected readonly candidates: Signal<readonly MemberSelectOption[]> = computed(
    (): readonly MemberSelectOption[] => {
      const rosterIds: ReadonlySet<string> = new Set(
        this.members().map((member) => member.memberId),
      );

      return this.orgMembers()
        .filter((member) => !rosterIds.has(member.id))
        .map((member): MemberSelectOption =>
          toMemberSelectOption(member, member.organizationId, member.id),
        );
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method removeLabel
   * @description The accessible name for a row's Remove action, naming the member rather than leaving every button on the page announced identically.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The row's resolved name.
   * @returns {string} The localized label.
   */
  protected removeLabel(name: string): string {
    return $localize`:@@org.teams.membersSheet.removeLabel:Remove ${name}:name:`;
  }

  /**
   * Method initialsOf
   * @description Fallback shown while a row's avatar is missing.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The row's resolved name.
   * @returns {string} Up to two uppercase initials.
   */
  protected initialsOf(name: string): string {
    return name
      .split(/\s+/)
      .filter((part: string): boolean => part.length > 0)
      .slice(0, 2)
      .map((part: string): string => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /**
   * Method onStateChanged
   * @description Relays a dismissal, ignoring the echo of a change the page already made.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The panel's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
