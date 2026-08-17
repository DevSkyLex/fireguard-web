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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import type {
  OrganizationPermissionOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmSheetImports } from '@shared/ui/sheet';

/**
 * Interface PermissionDomainGroup
 *
 * @description
 * One section of the permission checklist: every catalog entry that shares
 * a domain segment (`organization.members.*` → `members`), under a
 * localized heading.
 */
interface PermissionDomainGroup {
  readonly domain: string;
  readonly label: string;
  readonly permissions: readonly OrganizationPermissionOutput[];
}

/**
 * Function permissionDomainOf
 *
 * @description
 * The domain segment of a dotted permission name (`organization.members.read`
 * → `members`), or `general` for a name with no domain segment
 * (`organization.read`, `organization.delete`, `organization.*`).
 *
 * @since 1.0.0
 *
 * @param {string} name - The permission's dotted name.
 *
 * @returns {string} The domain segment.
 */
function permissionDomainOf(name: string): string {
  const segments: readonly string[] = name.split('.');

  return segments.length >= 3 ? segments[1] : 'general';
}

/**
 * Function permissionDomainLabelOf
 *
 * @description
 * The localized heading for a permission domain segment. Every domain the
 * current catalog can produce is named explicitly; a domain introduced later
 * falls back to the general heading rather than an unlocalized string.
 *
 * @since 1.0.0
 *
 * @param {string} domain - The domain segment, as produced by {@link permissionDomainOf}.
 *
 * @returns {string} The localized heading.
 */
function permissionDomainLabelOf(domain: string): string {
  switch (domain) {
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
 * Component OrganizationRolePermissionsSheet
 * @class OrganizationRolePermissionsSheet
 *
 * @description
 * The permission editor for one custom role: the catalog grouped by domain,
 * a checkbox per permission. Chosen as a right-side sheet — the same
 * edit-in-context shape the feature already uses for a focused record edit
 * next to its list (`intervention-work-item-sheet`) — rather than a dialog
 * (too cramped for a full checklist) or a detail panel (this page has no
 * per-role route to host one against).
 *
 * A system role's permissions are canonical and merged in at read time by
 * the backend, so this sheet renders them read-only regardless of what the
 * caller passes — a second guard beside the grid only ever opening it for a
 * custom role.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): it computes the next full
 * permission list from a toggle and emits it; the page decides how to apply
 * it (`updateRole`) and owns the resulting request state.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so its footer lands in the thumb zone.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-permissions-sheet',
  imports: [HlmCheckbox, ...HlmSheetImports],
  templateUrl: './organization-role-permissions-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRolePermissionsSheet {
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
   * Property role
   * @readonly
   * @description The role being edited, or `null` while nothing is selected.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationRoleOutput | null>}
   */
  public readonly role: InputSignal<OrganizationRoleOutput | null> =
    input<OrganizationRoleOutput | null>(null);

  /**
   * Property catalog
   * @readonly
   * @description The organization's assignable permissions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationPermissionOutput[]>}
   */
  public readonly catalog: InputSignal<readonly OrganizationPermissionOutput[]> = input<
    readonly OrganizationPermissionOutput[]
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether an update request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last update failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
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
   * Property permissionsChanged
   * @readonly
   * @description The role's next full permission list, after one checklist toggle.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ReadonlyArray<string>>}
   */
  public readonly permissionsChanged: OutputEmitterRef<ReadonlyArray<string>> =
    output<ReadonlyArray<string>>();
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The panel state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 1.1.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property readOnly
   * @readonly
   * @description Whether the checklist accepts input — false for a system role or while a write is in flight.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly readOnly: Signal<boolean> = computed<boolean>(
    () => (this.role()?.isSystem ?? false) || this.pending(),
  );

  /**
   * Property domainGroups
   * @readonly
   * @description The catalog, grouped by domain segment for the checklist.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly PermissionDomainGroup[]>}
   */
  protected readonly domainGroups: Signal<readonly PermissionDomainGroup[]> = computed(
    (): readonly PermissionDomainGroup[] => {
      const groups: Map<string, OrganizationPermissionOutput[]> = new Map();

      for (const permission of this.catalog()) {
        const domain: string = permissionDomainOf(permission.name);
        const bucket: OrganizationPermissionOutput[] | undefined = groups.get(domain);

        if (bucket) bucket.push(permission);
        else groups.set(domain, [permission]);
      }

      return Array.from(groups, ([domain, permissions]) => ({
        domain,
        label: permissionDomainLabelOf(domain),
        permissions,
      }));
    },
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected update, as flat lines above the checklist.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [
          $localize`:@@org.team.permissionsSheet.updateFailed:The role's permissions could not be updated.`,
        ];
  });
  //#endregion

  //#region Methods
  /**
   * Method isChecked
   * @description Whether the given permission is currently granted by the role being edited.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The permission's dotted name.
   * @returns {boolean} `true` when granted.
   */
  protected isChecked(name: string): boolean {
    return this.role()?.permissions.some((permission) => permission.name === name) ?? false;
  }

  /**
   * Method toggle
   * @description Computes the role's next full permission list and emits it.
   * @access protected
   * @since 1.0.0
   * @param {string} name - The permission's dotted name.
   * @param {boolean} checked - The checkbox's new state.
   * @returns {void}
   */
  protected toggle(name: string, checked: boolean): void {
    const current: OrganizationRoleOutput | null = this.role();
    if (current === null || this.readOnly()) return;

    const granted: readonly string[] = current.permissions.map((permission) => permission.name);
    const next: readonly string[] = checked
      ? [...granted, name]
      : granted.filter((permission) => permission !== name);

    this.permissionsChanged.emit(next);
  }

  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal, ignoring the echo of a change the page already made.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
