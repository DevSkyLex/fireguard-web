import { DatePipe } from '@angular/common';
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
import { lucideCopy, lucideEllipsis, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import type {
  OrganizationInvitationOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { ORGANIZATION_INVITATION_STATUS_TAG_ICONS } from './constants/organization-invitation-status-tag-icons.constants';
import { ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS } from './constants/organization-invitation-status-tag-severity.constants';
import {
  resolveOrganizationInvitationStatusTag,
  type OrganizationInvitationTableRow,
} from './models';

/** Placeholder rows drawn while the collection loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3];

/**
 * Component OrganizationInvitationTable
 * @class OrganizationInvitationTable
 *
 * @description
 * The pending-invitations grid: `hlmTable` inside a bordered, scrollable
 * shell, one row per invitation, a status badge resolved through this
 * table's own invitation-status registry (`ARCHITECTURE.md` §10.10 — the
 * registry is scoped here because this table is its only render site), and
 * a trailing `…` menu carrying Copy link, Resend and Revoke.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. `canManage` hides every write action at once rather than
 * disabling it, and `pending` locks them all while any mutation from the
 * page's single `mutationCallState` is in flight, since the store carries no
 * per-invitation request state.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-table',
  imports: [
    DatePipe,
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      ...ORGANIZATION_INVITATION_STATUS_TAG_ICONS,
      lucideCopy,
      lucideEllipsis,
      lucideRotateCw,
      lucideX,
    }),
  ],
  templateUrl: './organization-invitation-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The invitations to render — the page's `activeInvitations` slice.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationInvitationOutput[]>}
   */
  public readonly items: InputSignal<readonly OrganizationInvitationOutput[]> =
    input.required<readonly OrganizationInvitationOutput[]>();

  /**
   * Property roles
   * @readonly
   * @description The organization's roles, used to resolve `roleIds` to names.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input<
    readonly OrganizationRoleOutput[]
  >([]);

  /**
   * Property links
   * @readonly
   * @description Invitation id → fresh accept link, captured this session only.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Readonly<Record<string, string>>>}
   */
  public readonly links: InputSignal<Readonly<Record<string, string>>> = input<
    Readonly<Record<string, string>>
  >({});

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canManage
   * @readonly
   * @description Whether the row menu may offer Resend/Revoke at all (`organization.members.manage`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether a mutation is in flight, locking every row action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property linkCopyRequested
   * @readonly
   * @description A row menu asked for its accept link to be copied.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly linkCopyRequested: OutputEmitterRef<string> = output<string>();

  /**
   * Property resendRequested
   * @readonly
   * @description A row menu asked for the invitation to be resent.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationInvitationOutput>}
   */
  public readonly resendRequested: OutputEmitterRef<OrganizationInvitationOutput> =
    output<OrganizationInvitationOutput>();

  /**
   * Property revokeRequested
   * @readonly
   * @description A row menu asked for the invitation to be revoked.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationInvitationOutput>}
   */
  public readonly revokeRequested: OutputEmitterRef<OrganizationInvitationOutput> =
    output<OrganizationInvitationOutput>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;

  /** Role names keyed by id, for the role-column lookup. */
  private readonly roleNameById: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.roles().map((role: OrganizationRoleOutput): [string, string] => [role.id, role.name]),
      ),
  );

  /**
   * Property rows
   * @readonly
   * @description Every invitation joined with its resolved role names, status descriptor and accept link.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OrganizationInvitationTableRow[]>}
   */
  protected readonly rows: Signal<readonly OrganizationInvitationTableRow[]> = computed(
    (): readonly OrganizationInvitationTableRow[] => {
      const names: ReadonlyMap<string, string> = this.roleNameById();
      const links: Readonly<Record<string, string>> = this.links();

      return this.items().map(
        (invitation: OrganizationInvitationOutput): OrganizationInvitationTableRow => {
          const descriptor = resolveOrganizationInvitationStatusTag(invitation.status);

          return {
            invitation,
            roleNames: invitation.roleIds
              .map((roleId: string): string | undefined => names.get(roleId))
              .filter((name: string | undefined): name is string => !!name),
            statusLabel: descriptor.label,
            statusIcon: descriptor.icon,
            statusIconClass: ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS[descriptor.severity],
            acceptUrl: links[invitation.id] ?? null,
          };
        },
      );
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.1.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 6;
  }
  //#endregion
}
