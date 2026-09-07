import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { email, form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCircle } from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import type { StoreError } from '@core/request-state';
import { PASSWORD_MIN_LENGTH } from '@features/auth/constants';
import { applyPasswordConfirmation, applyPasswordRules } from '@features/auth/validators';
import { PasswordInput } from '@shared/password-input';
import { RequiredMarker } from '@shared/required-marker';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';
import type { RegisterFormValues } from './models';

/**
 * Component RegisterForm
 * @class RegisterForm
 *
 * @description
 * The account-creation form. The password rules and the confirmation rule come
 * from the feature's shared validators, so this form cannot drift from the
 * API's policy or from the reset flow (`ARCHITECTURE.md` §10.4).
 * Password guidance is presented in a Spartan popover while the password
 * field is focused, keeping the criteria close to the value without adding a
 * second trigger control. Native Field description wiring associates persistent requirements with the input; textual criterion states and a stable live region announce policy changes without moving focus or reading password characters.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-register-form [pending]="isRegistering()" (submitted)="register($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-form',
  imports: [
    ...HlmAlertImports,
    RequiredMarker,
    FormField,
    PasswordInput,
    HlmButton,
    HlmSpinner,
    HlmInput,
    NgIcon,
    ...HlmPopoverImports,
    HlmSeparator,
    ...HlmFieldImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideCircle })],
  templateUrl: './register-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the registration request is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the store's account-creation call failed with, rendered above
   * the fields so a rejected attempt is never silent. `null` while nothing
   * has failed.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the typed values once the form is valid.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<RegisterFormValues>}
   */
  public readonly submitted: OutputEmitterRef<RegisterFormValues> = output<RegisterFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<RegisterFormValues>}
   */
  protected readonly model: WritableSignal<RegisterFormValues> = signal<RegisterFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  /**
   * Property registerForm
   * @readonly
   *
   * @description
   * The field tree and its rules.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<RegisterFormValues>}
   */
  protected readonly registerForm: FieldTree<RegisterFormValues> = form(
    this.model,
    (path): void => {
      required(path.firstName, {
        message: $localize`:@@auth.firstName.required:Enter your first name`,
      });
      required(path.lastName, {
        message: $localize`:@@auth.lastName.required:Enter your last name`,
      });
      required(path.email, { message: $localize`:@@auth.email.required:Enter your email address` });
      email(path.email, { message: $localize`:@@auth.email.invalid:Enter a valid email address` });

      applyPasswordRules(path.password);
      applyPasswordConfirmation(path.confirmPassword, path.password);
    },
  );

  /**
   * Property passwordValue
   * @readonly
   *
   * @description
   * Current password value used to update the requirement menu while typing.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly passwordValue: Signal<string> = computed((): string =>
    this.registerForm.password().value(),
  );

  /**
   * Property passwordRequirementsState
   * @readonly
   *
   * @description
   * Visibility of the requirements popover, driven by focus on the password
   * field rather than by an extra control in the form.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<BrnOverlayState>}
   */
  protected readonly passwordRequirementsState: WritableSignal<BrnOverlayState> =
    signal<BrnOverlayState>('closed');

  /**
   * Property passwordAnchorRef
   * @readonly
   *
   * @description
   * The password field wrapper used to distinguish focus inside the password
   * control from clicks elsewhere in the document.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly passwordAnchorRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('passwordAnchor');

  /**
   * Property passwordFocusSinkRef
   * @readonly
   *
   * @description
   * A script-only focus destination used while the panel closes after a click
   * on a non-focusable area. It prevents Spartan's focus restoration from
   * returning the caret to the password field.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<ElementRef<HTMLSpanElement> | undefined>}
   */
  private readonly passwordFocusSinkRef: Signal<ElementRef<HTMLSpanElement> | undefined> =
    viewChild<ElementRef<HTMLSpanElement>>('passwordFocusSink');

  /**
   * Property documentRef
   * @readonly
   *
   * @description
   * The current document used for focus checks without reading the global
   * browser document during server rendering.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Document}
   */
  private readonly documentRef: Document = inject(DOCUMENT);

  /**
   * Property passwordCriteria
   * @readonly
   *
   * @description
   * The five visible checks mirror the password policy and show which parts of
   * the value are already satisfied before the form is submitted.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {readonly { readonly id: string; readonly label: string; readonly matches: (value: string) => boolean }[]}
   */
  protected readonly passwordCriteria: readonly {
    readonly id: 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'symbol';
    readonly label: string;
    readonly matches: (value: string) => boolean;
  }[] = [
    {
      id: 'minLength',
      label: $localize`:@@auth.password.requirements.minLength:At least ${PASSWORD_MIN_LENGTH}:min: characters`,
      matches: (value: string): boolean => value.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'uppercase',
      label: $localize`:@@auth.password.requirements.uppercase:An upper case letter`,
      matches: (value: string): boolean => /[A-Z]/.test(value),
    },
    {
      id: 'lowercase',
      label: $localize`:@@auth.password.requirements.lowercase:A lower case letter`,
      matches: (value: string): boolean => /[a-z]/.test(value),
    },
    {
      id: 'digit',
      label: $localize`:@@auth.password.requirements.digit:A digit`,
      matches: (value: string): boolean => /\d/.test(value),
    },
    {
      id: 'symbol',
      label: $localize`:@@auth.password.requirements.symbol:A symbol (@$!%*?&#)`,
      matches: (value: string): boolean => /[@$!%*?&#]/.test(value),
    },
  ];

  /**
   * Property passwordRequirementsDescription
   * @readonly
   * @description Persistent native Field description associated with the password input even when the guidance popover is closed.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly passwordRequirementsDescription: string = this.passwordCriteria
    .map((criterion) => criterion.label)
    .join('. ');

  /**
   * Property requirementMetLabel
   * @readonly
   * @description Text accompanying a satisfied password criterion so its status does not rely on color or an icon.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly requirementMetLabel: string = $localize`:@@auth.password.requirements.met:Met`;

  /**
   * Property requirementNotMetLabel
   * @readonly
   * @description Text accompanying an unmet password criterion.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly requirementNotMetLabel: string = $localize`:@@auth.password.requirements.notMet:Not met`;

  /**
   * Property passwordRequirementsAnnouncement
   * @readonly
   * @description Accessible criterion statuses. The derived string changes only when a criterion changes, never for additional characters that leave the criteria unchanged; no password characters enter the live region.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly passwordRequirementsAnnouncement: Signal<string> = computed(() =>
    this.passwordCriteria
      .map(
        (criterion) =>
          `${criterion.label}: ${criterion.matches(this.passwordValue()) ? this.requirementMetLabel : this.requirementNotMetLabel}`,
      )
      .join('. '),
  );
  //#endregion

  //#region Methods
  /**
   * Method openPasswordRequirements
   * @method openPasswordRequirements
   *
   * @description
   * Opens the requirements popover as soon as focus enters the password field.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected openPasswordRequirements(): void {
    this.passwordRequirementsState.set('open');
  }

  /**
   * Method onPasswordRequirementsStateChanged
   * @method onPasswordRequirementsStateChanged
   *
   * @description
   * Keeps the focus-driven signal synchronized when the Spartan popover is
   * dismissed with Escape or closed by its own overlay lifecycle.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {BrnOverlayState} state - State emitted by the popover.
   * @returns {void}
   */
  protected onPasswordRequirementsStateChanged(state: BrnOverlayState): void {
    this.passwordRequirementsState.set(state);
  }

  /**
   * Method handleDocumentInteraction
   * @method handleDocumentInteraction
   *
   * @description
   * Closes the focus-driven panel before the browser moves focus to another
   * control. A temporary focus sink gives Spartan a connected element to keep
   * during its close animation when the click lands on a non-focusable area;
   * preventing that pointer default avoids a later focus restoration race.
   * The click listener also covers scripted or keyboard-generated clicks that
   * do not emit a pointer transition.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Event} event - The document interaction that occurred outside the
   * password field.
   * @returns {void}
   */
  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:click', ['$event'])
  protected handleDocumentInteraction(event: Event): void {
    const anchor: HTMLDivElement | undefined = this.passwordAnchorRef()?.nativeElement;
    const target: EventTarget | null = event.target;

    if (!(target instanceof Node)) return;
    if (anchor?.contains(target)) return;

    const targetElement: Element | null = target instanceof Element ? target : null;
    if (targetElement?.closest('[data-slot="popover-content"]')) return;

    const passwordLabel: HTMLLabelElement | null = targetElement?.closest('label') ?? null;
    if (passwordLabel?.htmlFor === 'register-password') return;

    if (this.passwordRequirementsState() !== 'open') return;

    if (!this.canReceiveFocus(targetElement)) {
      if (event.type === 'pointerdown') event.preventDefault();
      this.passwordFocusSinkRef()?.nativeElement.focus({ preventScroll: true });
    }

    this.passwordRequirementsState.set('closed');
  }

  /**
   * Method canReceiveFocus
   * @method canReceiveFocus
   *
   * @description
   * Identifies targets whose native pointer behavior should remain untouched,
   * allowing the browser to move focus to the requested control while the
   * popover closes.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {Element | null} target - The document event target.
   * @returns {boolean} Whether the target represents a focusable interaction.
   */
  private canReceiveFocus(target: Element | null): boolean {
    return (
      target?.closest(
        'a[href],button,input,textarea,select,[contenteditable="true"],[tabindex]:not([tabindex="-1"]),label',
      ) !== null
    );
  }

  /**
   * Method onPasswordRequirementsClosed
   * @method onPasswordRequirementsClosed
   *
   * @description
   * Releases the temporary focus sink after Spartan has completed its close
   * lifecycle. The overlay restores focus before emitting `closed`, so the
   * sink remains active long enough to block an unwanted password refocus.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected onPasswordRequirementsClosed(): void {
    const sink: HTMLSpanElement | undefined = this.passwordFocusSinkRef()?.nativeElement;
    if (sink && this.documentRef.activeElement === sink) sink.blur();
  }

  /**
   * Method closePasswordRequirements
   * @method closePasswordRequirements
   *
   * @description
   * Closes the requirements popover when focus leaves the password field. The
   * containment check keeps it open while focus moves to the reveal button
   * inside the same input group.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {FocusEvent} event - Focus transition emitted by the anchor.
   * @returns {void}
   */
  protected closePasswordRequirements(event: FocusEvent): void {
    const anchor = event.currentTarget;
    const nextTarget = event.relatedTarget;

    if (
      anchor instanceof HTMLElement &&
      nextTarget instanceof Node &&
      anchor.contains(nextTarget)
    ) {
      return;
    }

    this.passwordRequirementsState.set('closed');
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched so every failing rule becomes visible, then emits
   * only if it is valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.registerForm().markAsTouched();

    if (this.registerForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
