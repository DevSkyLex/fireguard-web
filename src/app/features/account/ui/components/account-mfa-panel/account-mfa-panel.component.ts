import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormControl,
} from '@angular/forms';
import { ButtonModule, type ButtonPassThroughOptions } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { FeedbackService } from '@core/feedback';
import type { StoreError } from '@core/request-state';
import type { MfaMethodTagDescriptor } from '@features/account/models';
import { resolveMfaMethodTag } from '@features/account/models';
import { AccountTotpEnrollmentStore, UserStore } from '@features/account/state';

/**
 * Component AccountMfaPanel
 * @class AccountMfaPanel
 *
 * @description
 * Multi-factor authentication section of the account page. Shows the
 * standing sign-in verification method (email codes) and drives the full
 * authenticator app (TOTP) enrollment lifecycle: generating a pending secret,
 * confirming it with a code to activate TOTP, and disabling an active
 * enrollment with a proof-of-possession code. The authoritative enrollment
 * flag (`totpEnabled`) is read from {@link UserStore}; the workflow itself is
 * driven by the component-scoped {@link AccountTotpEnrollmentStore}. Rendered
 * first inside the "Security" tab of `AccountPage`.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-mfa-panel',
  imports: [ReactiveFormsModule, ButtonModule, MessageModule, InputOtpModule, TagModule],
  providers: [AccountTotpEnrollmentStore],
  templateUrl: './account-mfa-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMfaPanel {
  //#region Properties
  /** Toast feedback service used to confirm clipboard copies. */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /** Reactive form builder for the confirm/disable code inputs. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /** Component-scoped store driving the TOTP setup/confirm/disable calls. */
  protected readonly store: AccountTotpEnrollmentStore = inject<AccountTotpEnrollmentStore>(
    AccountTotpEnrollmentStore,
  );

  /** Authenticated-user profile store, source of truth for `totpEnabled`. */
  private readonly userStore: UserStore = inject<UserStore>(UserStore);

  /** Status descriptor for the standing email code method, always active. */
  protected readonly emailStatus: MfaMethodTagDescriptor = resolveMfaMethodTag(
    'methodStatus',
    'active',
  );

  /** Pass-through bumping a copy icon button's hit area to the 44px minimum touch target. */
  protected readonly copyButtonPt: ButtonPassThroughOptions = {
    root: { class: 'min-h-11 min-w-11' },
  };

  /**
   * Property confirmCode
   * @readonly
   *
   * @description
   * Reactive control for the 6-digit code confirming a pending TOTP secret.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly confirmCode: FormControl<string> = this.formBuilder.control<string>('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  /**
   * Property disableCode
   * @readonly
   *
   * @description
   * Reactive control for the current 6-digit code proving possession before
   * disabling an active TOTP enrollment.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormControl<string>}
   */
  protected readonly disableCode: FormControl<string> = this.formBuilder.control<string>('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  /**
   * Property confirmForm
   * @readonly
   *
   * @description
   * Form group hosting {@link confirmCode}. Binding a `FormGroup` on the
   * `<form>` attaches Angular's submit handling (`ngSubmit` + preventDefault);
   * a bare reactive control alone would let the native submit reload the page.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormGroup}
   */
  protected readonly confirmForm: FormGroup = new FormGroup({ code: this.confirmCode });

  /**
   * Property disableForm
   * @readonly
   *
   * @description
   * Form group hosting {@link disableCode}; same submit-handling rationale as
   * {@link confirmForm}.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormGroup}
   */
  protected readonly disableForm: FormGroup = new FormGroup({ code: this.disableCode });

  /**
   * Property showDisableForm
   * @readonly
   *
   * @description
   * Whether the inline "enter current code to disable" form is revealed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly showDisableForm: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property totpEnabled
   * @readonly
   *
   * @description
   * Whether the authenticated user has an active TOTP enrollment, per the
   * account-owned user profile.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly totpEnabled: Signal<boolean> = computed<boolean>(
    () => this.userStore.profile()?.totpEnabled ?? false,
  );

  /**
   * Property groupedSecret
   * @readonly
   *
   * @description
   * Latest generated secret split into 4-character groups for easier manual
   * entry into an authenticator app.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly groupedSecret: Signal<string | null> = computed<string | null>(() => {
    const secret = this.store.setupResult()?.secret;
    return secret ? (secret.match(/.{1,4}/g)?.join(' ') ?? secret) : null;
  });

  /**
   * Property totpStatus
   * @readonly
   *
   * @description
   * Status descriptor for the authenticator app method: active, pending
   * confirmation, or not set up yet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MfaMethodTagDescriptor>}
   */
  protected readonly totpStatus: Signal<MfaMethodTagDescriptor> = computed<MfaMethodTagDescriptor>(
    () => {
      if (this.totpEnabled()) return resolveMfaMethodTag('methodStatus', 'enabled');
      return resolveMfaMethodTag(
        'methodStatus',
        this.store.setupResult() ? 'pendingConfirmation' : 'notSetUp',
      );
    },
  );

  /**
   * Property confirmErrorMessage
   * @readonly
   *
   * @description
   * Human-readable message for the latest confirm failure, mapping 422/429
   * statuses to precise copy.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly confirmErrorMessage: Signal<string | null> = computed<string | null>(() =>
    this.describeCodeError(this.store.confirmError()),
  );

  /**
   * Property disableErrorMessage
   * @readonly
   *
   * @description
   * Human-readable message for the latest disable failure, mapping 422/429
   * statuses to precise copy.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly disableErrorMessage: Signal<string | null> = computed<string | null>(() =>
    this.describeCodeError(this.store.disableError()),
  );
  //#endregion

  //#region Methods
  /** Requests a new pending TOTP secret and provisioning URI. */
  protected generate(): void {
    this.store.setup();
  }

  /** Discards the pending secret and returns to the "not set up" state. */
  protected cancelSetup(): void {
    this.confirmCode.reset('');
    this.store.cancelSetup();
  }

  /** Confirms the pending secret with the entered code, activating TOTP. */
  protected confirm(): void {
    if (this.confirmCode.invalid) {
      this.confirmCode.markAsTouched();
      return;
    }
    this.store.confirm(this.confirmCode.value);
  }

  /** Reveals the inline code entry required to disable TOTP. */
  protected startDisable(): void {
    this.showDisableForm.set(true);
  }

  /** Hides the inline disable form without disabling TOTP. */
  protected cancelDisable(): void {
    this.showDisableForm.set(false);
    this.disableCode.reset('');
  }

  /** Disables TOTP using the entered current code as proof of possession. */
  protected disable(): void {
    if (this.disableCode.invalid) {
      this.disableCode.markAsTouched();
      return;
    }
    this.store.disable(this.disableCode.value);
  }

  /** Copies the manual-entry secret to the clipboard. */
  protected copySecret(): void {
    const secret = this.store.setupResult()?.secret;
    if (secret) {
      this.writeClipboard(
        secret,
        $localize`:@@account.mfa.secretCopied:Setup key copied to your clipboard.`,
      );
    }
  }

  /** Copies the otpauth:// provisioning URI to the clipboard. */
  protected copyUri(): void {
    const uri = this.store.setupResult()?.qrCodeUri;
    if (uri) {
      this.writeClipboard(
        uri,
        $localize`:@@account.mfa.uriCopied:Setup URI copied to your clipboard.`,
      );
    }
  }

  /** Writes a value to the clipboard and confirms with a toast on success. */
  private writeClipboard(value: string, successMessage: string): void {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) {
      this.feedback.error(
        $localize`:@@account.mfa.copyFailed:The value could not be copied. Copy it manually instead.`,
      );
      return;
    }
    clipboard.writeText(value).then(
      () => this.feedback.success(successMessage),
      () =>
        this.feedback.error(
          $localize`:@@account.mfa.copyFailed:The value could not be copied. Copy it manually instead.`,
        ),
    );
  }

  /** Maps a normalized store error to precise copy for the confirm/disable code forms. */
  private describeCodeError(error: StoreError | null): string | null {
    if (!error) return null;
    if (error.code === 422) {
      return $localize`:@@account.mfa.invalidCode:Invalid or expired code.`;
    }
    if (error.code === 429) {
      return $localize`:@@account.mfa.rateLimited:Too many attempts. Please wait a moment before trying again.`;
    }
    return (
      error.message ??
      $localize`:@@account.mfa.genericError:Something went wrong. Please try again.`
    );
  }
  //#endregion
}
