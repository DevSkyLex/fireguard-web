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
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import {
  OrganizationRoleAssignmentForm,
  type OrganizationRoleAssignmentValues,
} from '@features/organization/ui/forms';

/**
 * Component OrganizationRoleAssignmentDrawer
 * @class OrganizationRoleAssignmentDrawer
 *
 * @description
 * Presentational right-side drawer hosting the {@link OrganizationRoleAssignmentForm}.
 * Owns only the drawer shell — visibility, sizing and dismiss behaviour — and
 * forwards members, roles and loading state to the form while re-emitting the
 * validated assignment values and visibility changes. All orchestration
 * (assigning, toasts, closing on success) stays with the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-role-assignment-drawer',
  imports: [DrawerModule, OrganizationRoleAssignmentForm],
  templateUrl: './organization-role-assignment-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleAssignmentDrawer {
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
   * Whether an assignment request is in flight; locks the form and the drawer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Members eligible for role assignment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OrganizationMemberOutput[]>}
   */
  public readonly members: InputSignal<readonly OrganizationMemberOutput[]> = input<
    readonly OrganizationMemberOutput[]
  >([]);

  /**
   * Property roles
   * @readonly
   *
   * @description
   * Roles available for assignment.
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
   * Emits the validated assignment values when the hosted form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationRoleAssignmentValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationRoleAssignmentValues> =
    output<OrganizationRoleAssignmentValues>();
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
