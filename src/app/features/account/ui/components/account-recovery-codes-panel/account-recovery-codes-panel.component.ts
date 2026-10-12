import { DatePipe } from '@angular/common';
import type { Signal, AfterRenderRef, InputSignal, OutputEmitterRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { CallState } from '@core/request-state';
import type { RecoveryCodesStatusOutput } from '@features/account/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { AccountOtpCodeForm } from '../../forms/account-otp-code-form';

/**
 * Component AccountRecoveryCodesPanel
 * @class AccountRecoveryCodesPanel
 *
 * @description
 * Presents recovery status and one-time generation values supplied by the page.
 */
@Component({
  selector: 'app-account-recovery-codes-panel',
  imports: [DatePipe, HlmButton, AccountOtpCodeForm, ...HlmAlertImports],
  templateUrl: './account-recovery-codes-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountRecoveryCodesPanel {
  /**
   * Property savedButton
   * @readonly
   *
   * @description
   * Button focused after generated recovery codes become visible.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly savedButton: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('savedButton');
  /**
   * Property generateButton
   * @readonly
   *
   * @description
   * Button focused after one-time recovery codes are dismissed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly generateButton: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('generateButton');
  /**
   * Property showedCodes
   *
   * @description
   * Whether the previous rendered view contained generated values.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private showedCodes: boolean = false;
  /**
   * Property focusOutcome
   * @readonly
   *
   * @description
   * Restores keyboard focus when one-time recovery values open or close.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AfterRenderRef}
   */
  private readonly focusOutcome: AfterRenderRef = afterRenderEffect(() => {
    const showing = this.codes().length > 0;
    if (showing && !this.showedCodes) this.savedButton()?.nativeElement.focus();
    if (!showing && this.showedCodes) this.generateButton()?.nativeElement.focus();
    this.showedCodes = showing;
  });
  /**
   * Property status
   * @readonly
   *
   * @description
   * Current recovery metadata request outcome.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<CallState<RecoveryCodesStatusOutput>>}
   */
  public readonly status: InputSignal<CallState<RecoveryCodesStatusOutput>> =
    input.required<CallState<RecoveryCodesStatusOutput>>();
  /**
   * Property codes
   * @readonly
   *
   * @description
   * Transient values displayed once in the current page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly codes: InputSignal<readonly string[]> = input<readonly string[]>([]);
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the current operation is pending.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property failed
   * @readonly
   *
   * @description
   * Whether the current operation failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly failed: InputSignal<boolean> = input(false);
  /**
   * Property proofVisible
   * @readonly
   *
   * @description
   * Whether the current TOTP proof entry is visible.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly proofVisible: InputSignal<boolean> = input(false);
  /**
   * Property generated
   * @readonly
   *
   * @description
   * Emits the entered current TOTP proof for generation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly generated: OutputEmitterRef<string> = output<string>();
  /**
   * Property retried
   * @readonly
   *
   * @description
   * Requests another attempt to load public metadata.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();
  /**
   * Property opened
   * @readonly
   *
   * @description
   * Requests the current TOTP generation proof form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly opened: OutputEmitterRef<void> = output<void>();
  /**
   * Property closed
   * @readonly
   *
   * @description
   * Requests that one-time recovery values be cleared.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output<void>();
  /**
   * Property generateLabel
   * @readonly
   *
   * @description
   * Localized action label for recovery code generation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly generateLabel: string = $localize`:@@account.recovery.generate:Generate recovery codes`;
}
