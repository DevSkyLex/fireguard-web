import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import type { MemberSelectOption } from '@features/organization/features/interventions/models';

/**
 * Component InterventionMemberOption
 * @class InterventionMemberOption
 *
 * @description
 * Renders a member identity inside intervention selectors.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-member-option',
  imports: [AvatarModule],
  templateUrl: './intervention-member-option.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionMemberOption {
  /**
   * Input option
   * @readonly
   *
   * @description
   * Member identity displayed by the component.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MemberSelectOption>}
   */
  public readonly option: InputSignal<MemberSelectOption> = input.required<MemberSelectOption>();

  /**
   * Input compact
   * @readonly
   *
   * @description
   * Whether the member identity uses the compact single-line layout.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compact: InputSignal<boolean> = input(false);
}
