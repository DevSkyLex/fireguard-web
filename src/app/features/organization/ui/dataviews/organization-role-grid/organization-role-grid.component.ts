import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
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
  lucidePlus,
  lucideShieldCheck,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { HlmLarge } from '@shared/ui/typography';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6];

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
 * The role list: one flat `hlmItemGroup` per section, mirroring the feature's
 * other collection surfaces — a trailing `…` menu carries the row actions. A
 * system role never offers the menu at all (the backend refuses every edit
 * to one) rather than showing disabled items; a custom role offers **Edit
 * permissions** and **Delete**, gated by `canManage`.
 *
 * Splits its one `items` list into two titled sections — System roles and
 * Custom roles — rather than taking two already-split inputs, so a caller
 * only ever passes the roles it loaded. When the Custom roles section is
 * empty, a manager sees {@link createRequested}'s action inline; a read-only
 * viewer sees a neutral explanation with no action at all.
 *
 * Renaming is **supported by the backend** since API lot P2.4 — the role PATCH
 * accepts `name` alongside the required `permissions` — but no control is
 * offered here yet, pending its own dialog. This is a gap in the UI, not a
 * backend limitation.
 *
 * Each row lists every one of its permission groups (by dotted-name segment)
 * as a wrapping badge row — no overflow cap, so sighted users see the same
 * information a screen reader would have to read out one badge at a time —
 * and reports `memberCount` — how many active members hold the role — which
 * only the read endpoints populate. A role that arrives from a mutation
 * response carries `0`, so the count is omitted rather than shown as zero
 * when the field is absent.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, whether the acting member may
 * manage roles at all, and what {@link createRequested} does.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-grid',
  imports: [
    NgIcon,
    ResourceIllustration,
    ...HlmEmptyImports,
    NgTemplateOutlet,
    RouterLink,
    HlmBadge,
    HlmButton,
    ...HlmItemImports,
    HlmLarge,
    HlmSkeleton,
    ...HlmDropdownMenuImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideEllipsis,
      lucidePencil,
      lucidePlus,
      lucideShieldCheck,
      lucideTrash2,
    }),
  ],
  templateUrl: './organization-role-grid.component.html',
  host: { class: 'block w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleGrid {
  /** Selects the plural form for {@link permissionCountLabelOf} and {@link memberCountLabelOf}, deciding 0 correctly for locales (French included) where it takes the singular form. */
  private readonly pluralRules: Intl.PluralRules = new Intl.PluralRules(inject(LOCALE_ID));

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

  /**
   * Property createRequested
   * @readonly
   * @description The empty Custom roles section's "New role" action was activated. The grid computes no create workflow itself — the page maps this to its own `openCreateDialog`.
   * @access public
   * @since 2.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly createRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;

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

    return this.pluralRules.select(count) === 'one'
      ? $localize`:@@org.team.permissionCountSingular:${count}:count: permission`
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

    return this.pluralRules.select(count) === 'one'
      ? $localize`:@@org.team.memberCountSingular:${count}:count: member`
      : $localize`:@@org.team.memberCountMany:${count}:count: members`;
  }

  /**
   * Method permissionGroupsOf
   * @description Every one of the role's distinct permission groups, in a stable order — no overflow cap; the row wraps.
   * @access protected
   * @since 2.0.0
   * @param {OrganizationRoleOutput} role - The role being rendered.
   * @returns {readonly string[]} The badge labels to show.
   */
  protected permissionGroupsOf(role: OrganizationRoleOutput): readonly string[] {
    const groups: readonly string[] = [
      ...new Set(role.permissions.map((permission) => permissionGroupOf(permission.name))),
    ];

    return groups.map(permissionGroupLabelOf);
  }
  //#endregion
}
