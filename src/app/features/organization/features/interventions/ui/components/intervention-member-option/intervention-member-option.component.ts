import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
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
  public readonly compact: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property avatarPt
   * @readonly
   *
   * @description
   * PrimeNG avatar pass-through options styling the avatar surface (neutral
   * background and foreground) and shrinking it to the compact single-line
   * footprint when {@link compact} is enabled.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<AvatarPassThroughOptions>}
   */
  protected readonly avatarPt: Signal<AvatarPassThroughOptions> =
    computed<AvatarPassThroughOptions>(() => ({
      root: {
        class:
          'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300' +
          (this.compact() ? ' size-5! text-[0.625rem]!' : ''),
      },
    }));
}
