import { NgClass, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import type { ToastMessageOptions } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { type TagSeverity, tagSeverityIconClass } from '../tag';

/**
 * Constant SEVERITY_TO_TAG
 *
 * @description
 * Maps a PrimeNG toast severity to the shared {@link TagSeverity} vocabulary so
 * the toast icon reuses the exact same colour roles as tags and calendar bars
 * (`error` maps to the tag `danger` role). Unknown severities fall back to info.
 *
 * @since 1.0.0
 */
const SEVERITY_TO_TAG: Readonly<Record<string, TagSeverity>> = {
  success: 'success',
  info: 'info',
  warn: 'warn',
  error: 'danger',
};

/**
 * Constant SEVERITY_TO_ICON
 *
 * @description
 * Maps a PrimeNG toast severity to its PrimeIcons glyph so each feedback type
 * carries a recognizable icon (alongside its colour), satisfying the "status
 * never conveyed by colour alone" accessibility rule. Unknown severities fall
 * back to the informational icon.
 *
 * @since 1.0.0
 */
const SEVERITY_TO_ICON: Readonly<Record<string, string>> = {
  success: 'pi-check-circle',
  info: 'pi-info-circle',
  warn: 'pi-exclamation-triangle',
  error: 'pi-times-circle',
};

/**
 * Component Toast
 * @class Toast
 *
 * @description
 * Application toast outlet. Wraps PrimeNG's `p-toast` with a headless template
 * so every feedback message renders as a neutral elevated card (no tinted
 * background): a severity-coloured dot, a bold message, an optional secondary
 * detail line and a muted relative timestamp ("now", "1m", …). Toasts stack
 * natively, auto-dismiss, and can be clicked to dismiss early.
 *
 * Mounted once in the app shell. It is driven entirely by `MessageService`
 * (through the core `FeedbackService`); it owns no business state.
 *
 * @example ```html
 * <app-toast />
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-toast',
  imports: [NgClass, ToastModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  //#region Properties
  /**
   * Property now
   * @readonly
   *
   * @description
   * Current wall-clock time (ms), refreshed every 15s on the browser so the
   * relative timestamp stays accurate for longer-lived toasts. Never ticks
   * during SSR.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly now: WritableSignal<number> = signal<number>(Date.now());
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts the browser-only relative-time ticker and clears it on destroy.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    if (isPlatformBrowser(inject<object>(PLATFORM_ID))) {
      const intervalId: ReturnType<typeof setInterval> = setInterval(
        () => this.now.set(Date.now()),
        15_000,
      );
      inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
    }
  }
  //#endregion

  //#region Methods
  /**
   * Method iconClass
   * @method iconClass
   *
   * @description
   * Resolves the full class string for the severity icon: the PrimeIcons glyph
   * for the feedback type plus the Tailwind text-colour utility matching the
   * shared severity colour roles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ToastMessageOptions} message The toast message being rendered.
   *
   * @return {string} The `pi pi-* text-*` utility classes for the icon.
   */
  protected iconClass(message: ToastMessageOptions): string {
    const severity: string = message.severity ?? 'info';
    const glyph: string = SEVERITY_TO_ICON[severity] ?? 'pi-info-circle';
    const colour: string = tagSeverityIconClass(SEVERITY_TO_TAG[severity] ?? 'info');

    return `pi ${glyph} ${colour}`;
  }

  /**
   * Method severityLabel
   * @method severityLabel
   *
   * @description
   * Resolves a localized, screen-reader-only severity label so status is never
   * conveyed by colour alone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ToastMessageOptions} message The toast message being rendered.
   *
   * @return {string} The localized severity label.
   */
  protected severityLabel(message: ToastMessageOptions): string {
    switch (message.severity) {
      case 'success':
        return $localize`:@@toast.severity.success:Success`;
      case 'warn':
        return $localize`:@@toast.severity.warn:Warning`;
      case 'error':
        return $localize`:@@toast.severity.error:Error`;
      default:
        return $localize`:@@toast.severity.info:Information`;
    }
  }

  /**
   * Method relativeLabel
   * @method relativeLabel
   *
   * @description
   * Renders the time elapsed since the toast was produced as a compact label
   * ("now" under a minute, then "Nm", then "Nh"). Reads the `createdAt`
   * timestamp set by the feedback facade.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ToastMessageOptions} message The toast message being rendered.
   *
   * @return {string} The relative-time label.
   */
  protected relativeLabel(message: ToastMessageOptions): string {
    const data: { createdAt?: number } | undefined = message.data as
      | { createdAt?: number }
      | undefined;
    const createdAt: number = typeof data?.createdAt === 'number' ? data.createdAt : this.now();
    const minutes: number = Math.floor(Math.max(0, this.now() - createdAt) / 60_000);

    if (minutes < 1) return $localize`:@@toast.time.now:now`;
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }
  //#endregion
}
