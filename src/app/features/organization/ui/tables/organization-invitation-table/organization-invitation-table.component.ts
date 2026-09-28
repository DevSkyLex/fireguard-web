import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
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
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { formatRelativeDays } from '@shared/relative-time';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { ORGANIZATION_INVITATION_STATUS_TAG_ICONS } from './constants/organization-invitation-status-tag-icons.constants';
import { ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS } from './constants/organization-invitation-status-tag-severity.constants';
import {
  resolveOrganizationInvitationStatusTag,
  type OrganizationInvitationTableRow,
} from './models';

/** One literal Tailwind width per rendered column, for the shared surface's first-load skeleton. */
const SKELETON_COLUMN_WIDTHS: ReadonlyArray<string> = [
  'w-40',
  'w-24',
  'w-20',
  'w-28',
  'w-20',
  'w-24',
  'ms-auto size-6',
];

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
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invitation-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    CollectionSurface,
    NgIcon,
    HlmBadge,
    HlmButton,
    ...HlmDropdownMenuImports,
    ...HlmItemImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
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
  /** The application's active locale, for the pending-row relative-expiry suffix. */
  private readonly locale: string = inject<string>(LOCALE_ID);

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

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, bound by the page. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
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
  /** One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows. */
  protected readonly skeletonColumnWidths: ReadonlyArray<string> = SKELETON_COLUMN_WIDTHS;

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
            expiresRelativeSuffix:
              invitation.status === 'pending' ? this.expiresRelativeSuffixOf(invitation) : null,
            acceptUrl: links[invitation.id] ?? null,
          };
        },
      );
    },
  );
  //#endregion

  //#region Internals
  /**
   * Method orgCalendarDayOf
   * @description The `YYYY-MM-DD` calendar day `instant` falls on in the organization's timezone, or `null` when the configured timezone is not a valid IANA identifier — the free-text regional setting is not validated on save.
   * @access private
   * @since 1.3.0
   * @param {Date} instant - The instant to resolve.
   * @returns {string | null} The organization-local calendar day, or null on an invalid timezone.
   */
  private orgCalendarDayOf(instant: Date): string | null {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: this.regionalFormatting().timezone })
        .format(instant)
        .slice(0, 10);
    } catch {
      return null;
    }
  }

  /**
   * Method expiresRelativeSuffixOf
   * @description A pending invitation's `expiresAt`, as a localized whole-day relative label ("in 3 days") counted from today in the organization's timezone, or `null` when the timezone cannot be resolved.
   * @access private
   * @since 1.3.0
   * @param {OrganizationInvitationOutput} invitation - The row's invitation.
   * @returns {string | null} The relative label, or null on an invalid timezone.
   */
  private expiresRelativeSuffixOf(invitation: OrganizationInvitationOutput): string | null {
    const expiresDay: string | null = this.orgCalendarDayOf(new Date(invitation.expiresAt));
    const today: string | null = this.orgCalendarDayOf(new Date());

    if (expiresDay === null || today === null) return null;

    return formatRelativeDays(expiresDay, today, this.locale);
  }
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
    return 7;
  }
  //#endregion
}
