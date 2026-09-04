import { NgTemplateOutlet } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideEllipsis,
  lucidePencil,
  lucideShieldCheck,
  lucideShieldPlus,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSkeleton } from '@shared/ui/skeleton';

/** Placeholder cards drawn while the first page loads. */
const SKELETON_CARDS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6];

/** How many permission-group badges a card shows before folding the rest into a "+N" badge. */
const MAX_VISIBLE_PERMISSION_GROUPS = 3;

/**
 * Type PermissionGroupsPreview
 *
 * @description
 * View-model for a card's permission-group badge row: the labels shown, and
 * how many further groups the "+N" badge folds in.
 *
 * @since 1.1.0
 */
type PermissionGroupsPreview = {
  readonly shown: readonly string[];
  readonly remaining: number;
};

/**
 * Function permissionGroupOf
 *
 * @description
 * The group segment of a dotted permission name (`organization.members.read`
 * → `members`), or `general` for a name with no group segment
 * (`organization.read`, `organization.delete`, `organization.*`). An
 * independent copy of the permission editor's own grouping
 * (`organization-role-permissions-sheet.component.ts`) — that sheet is out of
 * scope for this change, and the two consumers do not yet justify a shared
 * `utils/` extraction (rule of three).
 *
 * @since 1.1.0
 *
 * @param {string} name - The permission's dotted name.
 *
 * @returns {string} The group segment.
 */
function permissionGroupOf(name: string): string {
  const segments: readonly string[] = name.split('.');

  return segments.length >= 3 ? segments[1] : 'general';
}

/**
 * Function permissionGroupLabelOf
 *
 * @description
 * The localized label for a permission group segment, reusing the permission
 * editor's own domain labels (`org.team.domain.*`) — same concept, same
 * English text, so no new translation is needed for this second consumer.
 *
 * @since 1.1.0
 *
 * @param {string} group - The group segment, as produced by {@link permissionGroupOf}.
 *
 * @returns {string} The localized label.
 */
function permissionGroupLabelOf(group: string): string {
  switch (group) {
    case 'dashboard':
      return $localize`:@@org.team.domain.dashboard:Dashboard`;
    case 'events':
      return $localize`:@@org.team.domain.events:Events`;
    case 'members':
      return $localize`:@@org.team.domain.members:Members`;
    case 'roles':
      return $localize`:@@org.team.domain.roles:Roles`;
    case 'facilities':
      return $localize`:@@org.team.domain.facilities:Facilities`;
    case 'equipment':
      return $localize`:@@org.team.domain.equipment:Equipment`;
    case 'inspection':
      return $localize`:@@org.team.domain.inspection:Inspections`;
    case 'interventions':
      return $localize`:@@org.team.domain.interventions:Interventions`;
    case 'messaging':
      return $localize`:@@org.team.domain.messaging:Messaging`;
    case 'assistant':
      return $localize`:@@org.team.domain.assistant:Assistant`;
    case 'settings':
      return $localize`:@@org.team.domain.settings:Settings`;
    default:
      return $localize`:@@org.team.domain.general:General`;
  }
}

/**
 * Component OrganizationRoleGrid
 * @class OrganizationRoleGrid
 *
 * @description
 * The role grid: one `hlmCard` per role, mirroring the feature's other
 * record grid (`FacilityGrid`) — a card-corner `…` menu carries the row
 * actions. A system role never offers the menu at all (the backend refuses
 * every edit to one) rather than showing disabled items; a custom role offers
 * **Edit permissions** and **Delete**, gated by `canManage`.
 *
 * Splits its one `items` list into two titled sections — System roles and
 * Custom roles, separated by `hlm-separator` — rather than taking two
 * already-split inputs, so a caller only ever passes the roles it loaded.
 * When the Custom roles section is empty, it shows a single, button-less
 * empty state (`canManage` only): the page header's persistent "New role"
 * action is this feature's only create entry point, so the empty state does
 * not repeat it.
 *
 * Renaming is **supported by the backend** since API lot P2.4 — the role PATCH
 * accepts `name` alongside the required `permissions` — but no control is
 * offered here yet, pending its own dialog. This is a gap in the UI, not a
 * backend limitation.
 *
 * Each card previews its permission groups (by dotted-name segment, capped at
 * {@link MAX_VISIBLE_PERMISSION_GROUPS} with a "+N" overflow badge) and
 * reports `memberCount` — how many active members hold the role — which only
 * the read endpoints populate. A role that arrives from a mutation response
 * carries `0`, so the count is omitted rather than shown as zero when the
 * field is absent.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load and whether the acting member
 * may manage roles at all.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-grid',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    RouterLink,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmDropdownMenuImports,
    ...HlmSeparatorImports,
  ],
  providers: [
    provideIcons({
      lucideEllipsis,
      lucidePencil,
      lucideShieldCheck,
      lucideShieldPlus,
      lucideTrash2,
    }),
  ],
  templateUrl: './organization-role-grid.component.html',
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleGrid {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The roles to render, system and custom alike.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly items: InputSignal<readonly OrganizationRoleOutput[]> =
    input.required<readonly OrganizationRoleOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder cards instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canManage
   * @readonly
   * @description Whether a custom role's card may offer its menu at all.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property membersRouteBase
   * @readonly
   *
   * @description
   * Where a role's member count links to, as route segments supplied by the
   * page — the grid stays route-agnostic. Empty by default, which renders the
   * count as plain text: the count existed here long before anything could act
   * on it, and `/team` and `/members` were two orthogonal cuts of the same
   * population with no bridge between them.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly membersRouteBase: InputSignal<readonly string[]> = input<readonly string[]>([]);
  //#endregion

  //#region Outputs
  /**
   * Property editPermissionsRequested
   * @readonly
   * @description A card's menu asked to open the permission editor for a custom role.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationRoleOutput>}
   */
  public readonly editPermissionsRequested: OutputEmitterRef<OrganizationRoleOutput> =
    output<OrganizationRoleOutput>();

  /**
   * Property deleteRequested
   * @readonly
   * @description A card's menu asked to delete a custom role.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationRoleOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<OrganizationRoleOutput> =
    output<OrganizationRoleOutput>();
  //#endregion

  //#region Properties
  /** Placeholder cards for the loading render. */
  protected readonly skeletonCards: ReadonlyArray<number> = SKELETON_CARDS;

  /** This section's built-in roles, always read-only. */
  protected readonly systemItems: Signal<readonly OrganizationRoleOutput[]> = computed(
    (): readonly OrganizationRoleOutput[] => this.items().filter((item) => item.isSystem),
  );

  /** This section's custom roles, the only ones a manager can edit or delete. */
  protected readonly customItems: Signal<readonly OrganizationRoleOutput[]> = computed(
    (): readonly OrganizationRoleOutput[] => this.items().filter((item) => !item.isSystem),
  );

  /**
   * Property systemRolesHeading
   * @readonly
   * @description The System roles section's heading, naming how many built-in roles exist.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly systemRolesHeading: Signal<string> = computed<string>(() => {
    const total: number = this.systemItems().length;

    return $localize`:@@org.team.systemRolesHeadingCount:System roles (${total}:count:)`;
  });

  /**
   * Property customRolesHeading
   * @readonly
   * @description The Custom roles section's heading, naming how many roles the organization has defined.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly customRolesHeading: Signal<string> = computed<string>(() => {
    const total: number = this.customItems().length;

    return $localize`:@@org.team.customRolesHeadingCount:Custom roles (${total}:count:)`;
  });
  //#endregion

  //#region Methods
  /**
   * Method permissionCountLabelOf
   * @description The role's permission count, correctly pluralized.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationRoleOutput} role - The role being rendered.
   * @returns {string} The localized count label.
   */
  protected permissionCountLabelOf(role: OrganizationRoleOutput): string {
    const count: number = role.permissions.length;

    return count === 1
      ? $localize`:@@org.team.permissionCountOne:1 permission`
      : $localize`:@@org.team.permissionCountMany:${count}:count: permissions`;
  }

  /**
   * Method memberCountLabelOf
   * @description How many active members hold the role, correctly pluralized, or `null` when the payload carries no count.
   * @access protected
   * @since 1.1.0
   * @param {OrganizationRoleOutput} role - The role being rendered.
   * @returns {string | null} The localized count label, or null.
   */
  protected memberCountLabelOf(role: OrganizationRoleOutput): string | null {
    const count: number | undefined = role.memberCount;

    if (count === undefined) return null;

    return count === 1
      ? $localize`:@@org.team.memberCountOne:1 member`
      : $localize`:@@org.team.memberCountMany:${count}:count: members`;
  }

  /**
   * Method permissionGroupsOf
   * @description The role's distinct permission groups, capped at {@link MAX_VISIBLE_PERMISSION_GROUPS} for the card's badge row, with the rest folded into a count.
   * @access protected
   * @since 1.1.0
   * @param {OrganizationRoleOutput} role - The role being rendered.
   * @returns {PermissionGroupsPreview} The badge labels to show and how many groups remain.
   */
  protected permissionGroupsOf(role: OrganizationRoleOutput): PermissionGroupsPreview {
    const groups: readonly string[] = [
      ...new Set(role.permissions.map((permission) => permissionGroupOf(permission.name))),
    ];
    const labels: readonly string[] = groups.map(permissionGroupLabelOf);

    return {
      shown: labels.slice(0, MAX_VISIBLE_PERMISSION_GROUPS),
      remaining: Math.max(0, labels.length - MAX_VISIBLE_PERMISSION_GROUPS),
    };
  }

  /**
   * Method remainingGroupsLabelOf
   * @description The accessible name for the "+N" overflow badge, since the badge itself shows only the bare number.
   * @access protected
   * @since 1.2.0
   * @param {number} remaining - How many further permission groups the badge folds in.
   * @returns {string} A sentence naming the remaining group count.
   */
  protected remainingGroupsLabelOf(remaining: number): string {
    return $localize`:@@org.team.permissionGroupsRemaining:+${remaining}:count: more`;
  }
  //#endregion
}
