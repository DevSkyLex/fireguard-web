import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { TooltipModule } from 'primeng/tooltip';
import { deriveInitials } from '@shared/utils';
import type { AvatarStackPerson } from './models';

/**
 * Constant COMPACT_AVATAR_PT
 *
 * @description
 * Pass-through shrinking a `p-avatar` to the ~20px footprint used across the
 * app's compact identity rows (member lists, participant stacks), since
 * PrimeNG's own `normal` size renders larger. A stacking ring separates
 * overlapping avatars in both themes.
 *
 * @since 1.0.0
 */
const COMPACT_AVATAR_PT: AvatarPassThroughOptions = {
  root: {
    class:
      'size-5 text-[0.625rem] font-medium ring-2 ring-surface-0 bg-surface-100 text-surface-600 dark:ring-surface-950 dark:bg-surface-800 dark:text-surface-300',
  },
};

/**
 * Component AvatarStack
 * @class AvatarStack
 *
 * @description
 * Generic, domain-agnostic stack of overlapping avatars over PrimeNG's
 * `p-avatar-group`. Renders the first `max` people (image, or initials when
 * no image is given) and an overflow `+N` avatar for the rest, each with an
 * accessible tooltip so identity is never conveyed by image alone.
 *
 * @example ```html
 * <app-avatar-stack [people]="participants()" [max]="4" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-avatar-stack',
  imports: [AvatarModule, AvatarGroupModule, TooltipModule],
  templateUrl: './avatar-stack.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarStack {
  //#region Inputs
  /**
   * Property people
   * @readonly
   *
   * @description
   * People to render, in display order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly AvatarStackPerson[]>}
   */
  public readonly people: InputSignal<readonly AvatarStackPerson[]> =
    input.required<readonly AvatarStackPerson[]>();

  /**
   * Property max
   * @readonly
   *
   * @description
   * Maximum number of avatars shown before collapsing the rest into a `+N`
   * overflow avatar.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly max: InputSignal<number> = input<number>(3);

  /**
   * Property size
   * @readonly
   *
   * @description
   * Avatar size. `normal` renders at the app's compact ~20px identity
   * footprint (via pass-through, below PrimeNG's own `normal` size);
   * `large`/`xlarge` map directly to PrimeNG's built-in sizes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<'normal' | 'large' | 'xlarge'>}
   */
  public readonly size: InputSignal<'normal' | 'large' | 'xlarge'> = input<
    'normal' | 'large' | 'xlarge'
  >('normal');
  //#endregion

  //#region Properties
  /**
   * Property visiblePeople
   * @readonly
   *
   * @description
   * The first {@link max} people, rendered as individual avatars.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly AvatarStackPerson[]>}
   */
  protected readonly visiblePeople: Signal<readonly AvatarStackPerson[]> = computed(() =>
    this.people().slice(0, Math.max(0, this.max())),
  );

  /**
   * Property overflowPeople
   * @readonly
   *
   * @description
   * People beyond {@link max}, collapsed into the `+N` overflow avatar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly AvatarStackPerson[]>}
   */
  protected readonly overflowPeople: Signal<readonly AvatarStackPerson[]> = computed(() =>
    this.people().slice(Math.max(0, this.max())),
  );

  /**
   * Property overflowTooltip
   * @readonly
   *
   * @description
   * Comma-separated names of the overflow people, shown as the `+N`
   * avatar's tooltip.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly overflowTooltip: Signal<string> = computed(() =>
    this.overflowPeople()
      .map((person: AvatarStackPerson): string => person.tooltip ?? person.label)
      .join(', '),
  );

  /**
   * Property avatarPt
   * @readonly
   *
   * @description
   * Pass-through applied to every avatar. Only the `normal` size needs the
   * compact override; `large`/`xlarge` rely on PrimeNG's own sizing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<AvatarPassThroughOptions | undefined>}
   */
  protected readonly avatarPt: Signal<AvatarPassThroughOptions | undefined> = computed(() =>
    this.size() === 'normal' ? COMPACT_AVATAR_PT : undefined,
  );

  /**
   * Property avatarSize
   * @readonly
   *
   * @description
   * PrimeNG `size` prop value, omitted for `normal` since that size is
   * achieved through {@link avatarPt} instead of PrimeNG's built-in scale.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<'large' | 'xlarge' | undefined>}
   */
  protected readonly avatarSize: Signal<'large' | 'xlarge' | undefined> = computed(() => {
    const size: 'normal' | 'large' | 'xlarge' = this.size();
    return size === 'normal' ? undefined : size;
  });
  //#endregion

  //#region Methods
  /**
   * Method initialsFor
   *
   * @description
   * Derives up to two uppercase initials from a display label: the first
   * letter of the first two words, or the first two letters of a single
   * word.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} label - Display name to derive initials from.
   * @returns {string} The derived initials, or an empty string for a blank label.
   */
  protected initialsFor(label: string): string {
    return deriveInitials(label);
  }
  //#endregion
}
