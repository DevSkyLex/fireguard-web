import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsis, lucidePencil, lucideShieldCheck, lucideTrash2 } from '@ng-icons/lucide';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/** Placeholder cards drawn while the first page loads. */
const SKELETON_CARDS: ReadonlyArray<number> = [1, 2, 3, 4, 5, 6];

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
 * Renaming is **supported by the backend** since API lot P2.4 — the role PATCH
 * accepts `name` alongside the required `permissions` — but no control is
 * offered here yet, pending its own dialog. This is a gap in the UI, not a
 * backend limitation.
 *
 * Each card also reports `memberCount` — how many active members hold the
 * role — which only the read endpoints populate. A role that arrives from a
 * mutation response carries `0`, so the count is omitted rather than shown as
 * zero when the field is absent.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load and whether the acting member
 * may manage roles at all.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-grid',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmDropdownMenuImports,
    ...HlmEmptyImports,
  ],
  providers: [provideIcons({ lucideEllipsis, lucidePencil, lucideShieldCheck, lucideTrash2 })],
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
  //#endregion
}
