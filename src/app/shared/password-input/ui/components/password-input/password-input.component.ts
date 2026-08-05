import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormField, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import {
  HlmInputGroup,
  HlmInputGroupAddon,
  HlmInputGroupButton,
  HlmInputGroupInput,
} from '@shared/ui/input-group';

/**
 * Component PasswordInput
 * @class PasswordInput
 *
 * @description
 * A password field with a reveal control. Generic by design: it binds whatever
 * `FieldTree<string>` it is handed and knows no domain (`ARCHITECTURE.md` §6.4).
 *
 * Built on spartan's `input-group`, which is its sanctioned way to seat a
 * control inside a field: the group owns the border and the focus ring, and the
 * addon takes real layout space so a long value scrolls beside the button
 * rather than under it.
 *
 * The toggle stays in the tab order: it is a functional control, and removing
 * keyboard access to shorten the tab path would trade accessibility for
 * convenience. Its accessible name states the action it will perform and flips
 * with the state, because a control whose label never moves cannot tell a
 * screen reader what it just did.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-password-input
 *   inputId="login-password"
 *   autocomplete="current-password"
 *   [field]="loginForm.password"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-password-input',
  imports: [
    FormField,
    NgIcon,
    HlmInputGroup,
    HlmInputGroupAddon,
    HlmInputGroupButton,
    HlmInputGroupInput,
  ],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './password-input.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordInput {
  //#region Inputs
  /**
   * Property field
   * @readonly
   *
   * @description
   * The Signal Forms field this input edits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FieldTree<string>>}
   */
  public readonly field: InputSignal<FieldTree<string>> = input.required<FieldTree<string>>();

  /**
   * Property inputId
   * @readonly
   *
   * @description
   * The DOM id, so the caller's own `<label for>` still points at the input.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input.required<string>();

  /**
   * Property autocomplete
   * @readonly
   *
   * @description
   * `current-password` when signing in, `new-password` when setting one — the
   * distinction is what tells a password manager whether to offer or to store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly autocomplete: InputSignal<string> = input<string>('current-password');

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Hint shown while the field is empty.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input<string>('');
  //#endregion

  //#region Properties
  /**
   * Property revealed
   * @readonly
   *
   * @description
   * Whether the characters are currently legible.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly revealed: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property toggleLabel
   * @readonly
   *
   * @description
   * Accessible name of the reveal control, which names the action it will
   * perform rather than the current state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly toggleLabel: Signal<string> = computed((): string =>
    this.revealed()
      ? $localize`:@@shared.passwordInput.hide:Hide password`
      : $localize`:@@shared.passwordInput.show:Show password`,
  );
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Flips between the masked and the legible rendering.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected toggle(): void {
    this.revealed.update((revealed: boolean): boolean => !revealed);
  }
  //#endregion
}
