import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';

/**
 * Component PersonOption
 * @class PersonOption
 * @description
 * A person as a picker row: a small avatar (picture or initials), the name,
 * and one muted qualifier such as a role. Every input is a primitive and it
 * names no business concept, so a member, an assignee and a new owner all
 * read the same inside a combobox — the point being that no picker ever
 * shows a bare string, let alone an id, for a person (`ARCHITECTURE.md`
 * §6.4). The compact sibling of `app-identity-summary`.
 * @version 1.0.0
 * @example
 * ```html
 * <app-person-option [name]="option.displayName" [secondary]="option.roleLabel" [avatarUrl]="option.avatarUrl" [initials]="option.initials" />
 * ```
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-person-option',
  imports: [HlmAvatar, HlmAvatarFallback, HlmAvatarImage],
  templateUrl: './person-option.component.html',
  host: { class: 'flex min-w-0 items-center gap-2' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonOption {
  //#region Inputs
  /**
   * Property name
   * @readonly
   * @description What to call the person.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input.required<string>();

  /**
   * Property initials
   * @readonly
   * @description Avatar fallback, shown whenever no picture resolves.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly initials: InputSignal<string> = input<string>('');

  /**
   * Property avatarUrl
   * @readonly
   * @description The picture, or `null` to fall back to the initials.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly avatarUrl: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property secondary
   * @readonly
   * @description One muted line under the name — a role, a team. Omitted when empty.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly secondary: InputSignal<string | null> = input<string | null>(null);
  //#endregion
}
