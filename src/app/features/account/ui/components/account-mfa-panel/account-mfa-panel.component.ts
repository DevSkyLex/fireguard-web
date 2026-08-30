import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy, lucideShieldCheck, lucideSmartphone } from '@ng-icons/lucide';
import type { SetupTotpOutput } from '@features/account/models';
import { AccountOtpCodeForm } from '@features/account/ui/forms';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardTitle } from '@shared/ui/card';

/**
 * Constant QR_PIXEL_SIZE
 *
 * @description
 * Rendered QR edge in pixels. Large enough that a phone camera locks on from a
 * comfortable distance without the image dominating the panel.
 *
 * @since 1.0.0
 */
const QR_PIXEL_SIZE: number = 200;

/**
 * Constant SECRET_GROUP_SIZE
 *
 * @description
 * How many characters go between the spaces in the printed key. Four is the
 * grouping every authenticator app uses, and it is what makes a 32-character
 * base32 string transcribable by hand.
 *
 * @since 1.0.0
 */
const SECRET_GROUP_SIZE: number = 4;

/**
 * Component AccountMfaPanel
 * @class AccountMfaPanel
 *
 * @description
 * The authenticator-app section, in the three states an enrollment can be in:
 * not set up, awaiting confirmation of a pending key, and active.
 *
 * Which state shows is derived entirely from inputs — `totpEnabled` from the
 * profile and the transient `setupResult` — never from a flag this component
 * keeps. The profile is the only authority on whether two-factor is on, and a
 * local copy of that answer is a copy that can be wrong.
 *
 * The QR image is generated in the browser from the `otpauth://` URI and is a
 * convenience, not the mechanism: the key is printed beside it, so enrollment
 * still works if the image never renders.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-mfa-panel
 *   [totpEnabled]="isTotpEnabled()"
 *   [setupResult]="store.setupResult()"
 *   (setupRequested)="store.setup()"
 *   (confirmed)="store.confirm($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-mfa-panel',
  imports: [HlmCardTitle, NgIcon, AccountOtpCodeForm, HlmBadge, HlmButton],
  providers: [provideIcons({ lucideCheck, lucideCopy, lucideShieldCheck, lucideSmartphone })],
  templateUrl: './account-mfa-panel.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMfaPanel {
  //#region Inputs
  /**
   * Property totpEnabled
   * @readonly
   *
   * @description
   * Whether an authenticator app is active, read from the profile.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly totpEnabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property setupResult
   * @readonly
   *
   * @description
   * The pending key and its provisioning URI, or `null` when no enrollment is
   * in progress.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<SetupTotpOutput | null>}
   */
  public readonly setupResult: InputSignal<SetupTotpOutput | null> = input<SetupTotpOutput | null>(
    null,
  );

  /**
   * Property isSettingUp
   * @readonly
   *
   * @description
   * Whether a key is being generated.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isSettingUp: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property isConfirming
   * @readonly
   *
   * @description
   * Whether an activation code is being checked.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isConfirming: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property isDisabling
   * @readonly
   *
   * @description
   * Whether a code proving possession is being checked.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isDisabling: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property setupRequested
   * @readonly
   *
   * @description
   * Emits when the user asks for a key.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly setupRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property confirmed
   * @readonly
   *
   * @description
   * Emits the code that should activate the pending key.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly confirmed: OutputEmitterRef<string> = output<string>();

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Emits the code proving the right to switch two-factor off.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly disabled: OutputEmitterRef<string> = output<string>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the user abandons a pending enrollment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Guards the browser-only work: generating the QR and reaching the clipboard.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property disableForm
   * @readonly
   *
   * @description
   * The code field asking for proof before switching off, present only while
   * that step is open.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<AccountOtpCodeForm | undefined>}
   */
  private readonly disableForm: Signal<AccountOtpCodeForm | undefined> =
    viewChild<AccountOtpCodeForm>('disableForm');

  /**
   * Property qrDataUrl
   * @readonly
   *
   * @description
   * The rendered QR as a data URL, or `null` when there is nothing to render
   * or the render failed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly qrDataUrl: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property disarming
   * @readonly
   *
   * @description
   * Whether the "prove it, then switch off" step is open. Purely local: it is
   * an interaction state, not a fact about the account.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly disarming: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property copied
   * @readonly
   *
   * @description
   * Whether the key was just copied, which flips the control's icon.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly copied: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isPending
   * @readonly
   *
   * @description
   * Whether a key is pending confirmation: one exists, and it is not active
   * yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isPending: Signal<boolean> = computed(
    (): boolean => this.setupResult() !== null && !this.totpEnabled(),
  );

  /**
   * Property groupedSecret
   * @readonly
   *
   * @description
   * The key in blocks of four, which is what makes it transcribable when the
   * camera is not an option.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly groupedSecret: Signal<string> = computed((): string => {
    const secret: string | undefined = this.setupResult()?.secret;
    if (!secret) return '';

    return (secret.match(new RegExp(`.{1,${SECRET_GROUP_SIZE}}`, 'g')) ?? []).join(' ');
  });

  /**
   * Property confirmLabel
   * @readonly
   *
   * @description
   * What the activation control says.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly confirmLabel: string = $localize`:@@account.mfa.confirm:Turn on`;

  /**
   * Property disableLabel
   * @readonly
   *
   * @description
   * What the deactivation control says.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly disableLabel: string = $localize`:@@account.mfa.disableConfirm:Turn off`;
  //#endregion

  //#region Lifecycle
  /**
   * Property renderQr
   * @readonly
   *
   * @description
   * Renders the provisioning URI whenever a new key arrives. Browser-only and
   * dynamically imported, so the QR library never enters the server bundle for
   * a panel that is behind a click anyway.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly renderQr: EffectRef = effect((): void => {
    const result: SetupTotpOutput | null = this.setupResult();

    if (!result || !isPlatformBrowser(this.platformId)) {
      untracked((): void => this.qrDataUrl.set(null));
      return;
    }

    untracked((): void => {
      void this.generateQr(result.qrCodeUri);
    });
  });

  /**
   * Property closeOnceEnabled
   * @readonly
   *
   * @description
   * Closes the deactivation step once two-factor is actually off, so a
   * successful switch-off does not leave its own code field on screen.
   *
   * @access private
   * @since 1.0.0
   */
  private readonly closeOnceEnabled: EffectRef = effect((): void => {
    if (this.totpEnabled()) return;

    untracked((): void => this.disarming.set(false));
  });
  //#endregion

  //#region Methods
  /**
   * Method startDisarming
   * @method startDisarming
   *
   * @description
   * Opens the step that asks for a current code before switching off.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected startDisarming(): void {
    this.disarming.set(true);
  }

  /**
   * Method stopDisarming
   * @method stopDisarming
   *
   * @description
   * Abandons the switch-off, leaving two-factor on.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected stopDisarming(): void {
    this.disableForm()?.reset();
    this.disarming.set(false);
  }

  /**
   * Method copySecret
   * @method copySecret
   *
   * @description
   * Copies the key so it can be pasted into an app on the same device, which is
   * the case the QR cannot serve.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected copySecret(): void {
    const secret: string | undefined = this.setupResult()?.secret;
    if (!secret || !isPlatformBrowser(this.platformId)) return;

    void navigator.clipboard.writeText(secret).then((): void => this.copied.set(true));
  }

  /**
   * Method generateQr
   * @method generateQr
   *
   * @description
   * Draws the provisioning URI. A failure is swallowed on purpose: the key is
   * printed next to the image, so a missing QR costs convenience, not access.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} uri - The `otpauth://` provisioning URI.
   *
   * @returns {Promise<void>}
   */
  private async generateQr(uri: string): Promise<void> {
    try {
      const { toDataURL } = await import('qrcode');
      this.qrDataUrl.set(
        await toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: QR_PIXEL_SIZE }),
      );
    } catch {
      this.qrDataUrl.set(null);
    }
  }
  //#endregion
}
