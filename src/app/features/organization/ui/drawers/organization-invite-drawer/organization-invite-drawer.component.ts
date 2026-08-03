import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import type {
  InviteOrganizationMemberInput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationInvitationForm } from '@features/organization/ui/forms';
import { DRAWER_STYLE_CLASS } from '@shared/overlay-size';

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
   * Property serverError
   * @readonly
   *
   * @description
   * Last invitation failure, forwarded to the form so a 422 lands on the field the
   * server named. The drawer only relays it; it owns no error handling.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

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
   * Property drawerStyleClass
   * @readonly
   *
   * @description
   * Canonical `p-drawer` width (DESIGN.md, "Overlays — sizes"): full width on
   * mobile, a fixed comfortable form width above.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly drawerStyleClass: string = DRAWER_STYLE_CLASS;
  //#endregion
}
