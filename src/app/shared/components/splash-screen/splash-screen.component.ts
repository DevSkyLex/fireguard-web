import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SPLASH_SCREEN_PORT, type SplashScreenPort } from '@core/ports/splash-screen';

/**
 * Constant FADE_DURATION_MS
 * @const FADE_DURATION_MS
 *
 * @description
 * Fade-out duration in milliseconds — must match
 * Tailwind `duration-300`.
 *
 * @type {number}
 */
const FADE_DURATION_MS: number = 300;

/**
 * Component SplashScreen
 * @class SplashScreen
 *
 * @description
 * Full-viewport overlay displayed during application boot
 * and lazy-loaded route transitions. Theme-aware via the
 * `data-theme` attribute already applied on `<html>`: a clean
 * white surface in light mode, a deep surface in dark mode,
 * both fronted by the brand lockup and a slim indeterminate
 * boot indicator.
 *
 * Uses a CSS opacity transition (Tailwind) instead of
 * `@angular/animations` to drive the fade-out effect.
 * Visibility and boot phase are consumed through a neutral splash
 * port so the component stays decoupled from core implementations.
 * The brand badge sits inside a circular progress ring with a phase
 * title and detail line; a stalled boot swaps the ring for a retry
 * affordance.
 *
 * @version 1.3.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-splash-screen',
  imports: [ButtonModule],
  templateUrl: './splash-screen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashScreen {
  //#region Properties
  /**
   * Property splashScreenPort
   * @readonly
   *
   * @description
   * Injects the neutral splash screen port to
   * react to visibility changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {SplashScreenPort}
   */
  private readonly splashScreenPort: SplashScreenPort =
    inject<SplashScreenPort>(SPLASH_SCREEN_PORT);

  /**
   * Property rendered
   * @readonly
   *
   * @description
   * True if the splash screen should be
   * rendered in the DOM.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly rendered: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property hiding
   * @readonly
   *
   * @description
   * Whether the overlay is currently
   * fading out (opacity-0).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly hiding: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property statusMessage
   * @readonly
   *
   * @description
   * Phase-appropriate boot status surfaced under the wordmark. Derived
   * from the splash port phase so the wording stays in the component
   * while the lifecycle stays in core.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly statusTitle: Signal<string> = computed<string>(() => {
    switch (this.splashScreenPort.phase()) {
      case 'session':
        return 'Restoring your session';
      case 'stalled':
        return "Can't reach the server";
      default:
        return 'Loading';
    }
  });

  /**
   * Property statusDetail
   * @readonly
   *
   * @description
   * Secondary, phase-appropriate line shown under the title to explain
   * what is happening (or how to recover) without overloading the title.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<string>}
   */
  protected readonly statusDetail: Signal<string> = computed<string>(() => {
    switch (this.splashScreenPort.phase()) {
      case 'session':
        return 'Securing your workspace and syncing your latest data…';
      case 'stalled':
        return 'Check your connection, then try again.';
      default:
        return 'This will only take a moment…';
    }
  });

  /**
   * Property stalled
   * @readonly
   *
   * @description
   * True when the boot has stalled, so the template swaps the progress
   * indicator for a retry affordance.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly stalled: Signal<boolean> = computed<boolean>(
    () => this.splashScreenPort.phase() === 'stalled',
  );

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers an effect that reacts to the splash screen port visibility
   * signal. When the splash becomes visible the overlay is restored
   * immediately. When it becomes hidden an opacity fade-out is started
   * and the overlay is removed from the DOM after the transition
   * completes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    effect(() => {
      const visible: boolean = this.splashScreenPort.visible();

      if (visible) {
        if (fadeTimer !== null) {
          clearTimeout(fadeTimer);
          fadeTimer = null;
        }
        this.hiding.set(false);
        this.rendered.set(true);
        return;
      }

      this.hiding.set(true);
      fadeTimer = setTimeout(() => {
        this.rendered.set(false);
        this.hiding.set(false);
        fadeTimer = null;
      }, FADE_DURATION_MS);
    });
  }
  //#endregion

  //#region Public Methods
  /**
   * Method retry
   *
   * @description
   * Delegates a stalled-boot retry to the splash screen port, giving the
   * user a way out of an otherwise indefinite wait.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.splashScreenPort.retry();
  }
  //#endregion
}
