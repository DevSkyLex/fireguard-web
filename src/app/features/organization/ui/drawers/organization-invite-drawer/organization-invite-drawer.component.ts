import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { DrawerModule, type DrawerPassThroughOptions } from 'primeng/drawer';
import type {
  InviteOrganizationMemberInput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationInvitationForm } from '@features/organization/ui/forms';

/**
 * Component OrganizationInviteDrawer
 * @class OrganizationInviteDrawer
 *
 * @description
 * Presentational right-side drawer hosting the {@link OrganizationInvitationForm}.
 * Owns only the drawer shell — visibility, sizing and dismiss behaviour — and
 * forwards roles and loading state to the form while re-emitting the validated
 * invitation values and visibility changes. All orchestration (sending, toasts,
 * closing on success) stays with the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-invite-drawer',
  imports: [DrawerModule, OrganizationInvitationForm],
  templateUrl: './organization-invite-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInviteDrawer {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the drawer is currently open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether an invitation request is in flight; locks the form and the drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property roles
   * @readonly
   *
   * @description
   * Roles offered as the invitee's initial role.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OrganizationRoleOutput[]>}
   */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input<
    readonly OrganizationRoleOutput[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Emits the new visibility state when the drawer is opened or dismissed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated invitation values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InviteOrganizationMemberInput>}
   */
  public readonly submitted: OutputEmitterRef<InviteOrganizationMemberInput> =
    output<InviteOrganizationMemberInput>();
  //#endregion

  //#region Properties
  /**
   * Property drawerPt
   * @readonly
   *
   * @description
   * Drawer pass-through: full width on mobile, comfortable form width above.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DrawerPassThroughOptions}
   */
  protected readonly drawerPt: DrawerPassThroughOptions = {
    root: { class: '!w-full sm:!w-[30rem]' },
  };
  //#endregion
}
