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
import { type TagSeverity, tagSeverityDotClass } from '../tag';

/**
 * Constant SEVERITY_TO_TAG
 *
 * @description
 * Maps a PrimeNG toast severity to the shared {@link TagSeverity} vocabulary so
 * the toast status dot reuses the exact same colour roles as tags and calendar
 * bars: `success` stays green, `error` maps to the `danger` red, and neutral
 * feedback (`info`) maps to the `secondary` surface/grey role. Unknown
 * severities fall back to the neutral role.
 *
 * @since 1.0.0
 */
const SEVERITY_TO_TAG: Readonly<Record<string, TagSeverity>> = {
  success: 'success',
  info: 'secondary',
  warn: 'warn',
  error: 'danger',
};

/**
 * Component Toast
 * @class Toast
 *
 * @description
 * Application toast outlet. Wraps PrimeNG's `p-toast` with a headless template
 * so every feedback message renders as a neutral elevated card (no tinted
 * background): a severity-coloured dot (no icon), a bold message, an optional
 * secondary detail line and a muted relative timestamp ("now", "1m", …). Anchored
 * bottom-center on every viewport. Toasts stack natively, auto-dismiss, and can
 * be clicked to dismiss early.
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
   * Method dotClass
   * @method dotClass
   *
   * @description
   * Resolves the Tailwind background-colour utility for the status dot: green
   * for success, red for errors and the neutral surface/grey role for neutral
   * feedback, reusing the shared severity colour roles. Unknown severities fall
   * back to the neutral role.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ToastMessageOptions} message The toast message being rendered.
   *
   * @return {string} The `bg-*` utility class string for the dot.
   */
  protected dotClass(message: ToastMessageOptions): string {
    const severity: string = message.severity ?? 'info';

    return tagSeverityDotClass(SEVERITY_TO_TAG[severity] ?? 'secondary');
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
