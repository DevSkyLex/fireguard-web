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
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { HlmCheckbox } from '@shared/ui/checkbox';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogDescription,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { HlmEmptyImports } from '@shared/ui/empty';
import type { OrganizationMemberRoleToggle } from './models';

/**
 * Component OrganizationMemberRolesDialog
 * @class OrganizationMemberRolesDialog
 *
 * @description
 * Assigns or removes an organization member's roles: every role the
 * organization defines, each as a checkbox pre-checked against
 * `member.roleIds`. Membership carries a set of roles rather than one, so
 * this is additive/subtractive per role rather than a single pick — the
 * store's `assignRole`/`removeRoleFromMember` are exactly that shape.
 *
 * Purely presentational: it holds no local copy of which roles are
 * assigned — it reads `member.roleIds` on every render — and emits
 * {@link roleToggled} rather than calling the store itself
 * (`ARCHITECTURE.md` §10.5). `pending` disables every checkbox while a
 * toggle from a previous change is still in flight, since the store's
 * `mutationCallState` carries no per-role request state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-member-roles-dialog',
  imports: [
    ...HlmEmptyImports,
    HlmCheckbox,
    HlmDialog,
    HlmDialogContent,
    HlmDialogDescription,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
  ],
  templateUrl: './organization-member-roles-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMemberRolesDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property member
   * @readonly
   * @description The member whose roles are being edited, or `null` when the dialog has nothing to show yet.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationMemberOutput | null>}
   */
  public readonly member: InputSignal<OrganizationMemberOutput | null> =
    input<OrganizationMemberOutput | null>(null);

  /**
   * Property roles
   * @readonly
   * @description Every role the organization defines.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input<
    readonly OrganizationRoleOutput[]
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether a role toggle is in flight, locking every checkbox.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property roleToggled
   * @readonly
   * @description A checkbox changed. The page decides whether that means `assignRole` or `removeRoleFromMember`.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationMemberRoleToggle>}
   */
  public readonly roleToggled: OutputEmitterRef<OrganizationMemberRoleToggle> =
    output<OrganizationMemberRoleToggle>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /** The currently edited member's assigned role ids, for the checkbox states. */
  protected readonly assignedRoleIds: Signal<ReadonlySet<string>> = computed<ReadonlySet<string>>(
    () => new Set(this.member()?.roleIds ?? []),
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Relays a dismissal, ignored while a toggle is in flight.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method isAssigned
   * @description Whether the current member already holds a role.
   * @access protected
   * @since 1.0.0
   * @param {string} roleId - The role to check.
   * @returns {boolean} True when assigned.
   */
  protected isAssigned(roleId: string): boolean {
    return this.assignedRoleIds().has(roleId);
  }
  //#endregion
}
